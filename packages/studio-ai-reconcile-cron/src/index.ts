const ORIGINS = {
  staging: 'https://community-kids-staging.up.railway.app',
  production: 'https://kids.sistemazero.com.br',
} as const
const ROUTE = '/api/internal/studio-ai/reconcile'
const TIMEOUT_MS = 25_000
const MAX_RESPONSE_BYTES = 4096

type Environment = keyof typeof ORIGINS
type Configuration = Partial<Record<keyof Env, string>>
type Fetch = (input: string, init: RequestInit) => Promise<Response>
interface Counts {
  confirmed: number
  pending: number
  expiredBuilderJobs: number | null
}
export type ReconciliationResult = { environment: Environment | 'unconfigured' } & (
  | { state: 'skipped'; reason: 'configuration' | 'secret' }
  | { state: 'http-error'; status: number }
  | { state: 'invalid-response' }
  | { state: 'unconfirmed'; reason: 'timeout' | 'transport' }
  | ({ state: 'reconciled' | 'pending' } & Counts)
)

function counts(value: unknown): Counts | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  if (Object.keys(value).length !== 3) return null
  if (!('confirmed' in value && 'pending' in value && 'expiredBuilderJobs' in value)) return null
  const bounded = (v: unknown, max: number): v is number =>
    typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max
  if (
    !bounded(value.confirmed, 4) ||
    !bounded(value.pending, 4) ||
    value.confirmed + value.pending > 4 ||
    !(value.expiredBuilderJobs === null || bounded(value.expiredBuilderJobs, 100))
  )
    return null
  return {
    confirmed: value.confirmed,
    pending: value.pending,
    expiredBuilderJobs: value.expiredBuilderJobs,
  }
}

async function readCounts(response: Response, signal: AbortSignal): Promise<Counts | null> {
  const mime = response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase()
  if (mime !== 'application/json' || !response.body) {
    await response.body?.cancel()
    return null
  }
  const reader = response.body.getReader()
  const cancel = () => {
    void reader.cancel().catch(() => {})
  }
  signal.addEventListener('abort', cancel, { once: true })
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const chunk = await reader.read()
      if (signal.aborted) throw new Error('aborted')
      if (chunk.done) break
      size += chunk.value.byteLength
      if (size > MAX_RESPONSE_BYTES) {
        await reader.cancel()
        return null
      }
      if (chunk.value.byteLength) chunks.push(chunk.value)
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.byteLength
    }
    try {
      return counts(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)))
    } catch {
      return null
    }
  } finally {
    signal.removeEventListener('abort', cancel)
    reader.releaseLock()
  }
}

/** One bounded POST. An uncertain response never causes an immediate retry. */
export async function runReconciliation(
  env: Configuration,
  fetchImpl: Fetch = fetch,
  timeoutMs = TIMEOUT_MS,
): Promise<ReconciliationResult> {
  const environment =
    env.ENVIRONMENT === 'staging' || env.ENVIRONMENT === 'production'
      ? env.ENVIRONMENT
      : 'unconfigured'
  if (
    environment === 'unconfigured' ||
    env.KIDS_ORIGIN !== ORIGINS[environment] ||
    !Number.isInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > TIMEOUT_MS
  )
    return { environment, state: 'skipped', reason: 'configuration' }
  const secret = env.STUDIO_AI_RECONCILE_CRON_SECRET
  if (!secret || secret.length < 24 || secret.trim() !== secret || /\s/.test(secret))
    return { environment, state: 'skipped', reason: 'secret' }

  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort()
      reject(new Error('deadline'))
    }, timeoutMs)
  })
  const operation = async (): Promise<ReconciliationResult> => {
    const response = await fetchImpl(`${ORIGINS[environment]}${ROUTE}`, {
      method: 'POST',
      // workerd accepts manual/follow only. Keep redirects as non-200 failures
      // so the bearer is never forwarded to another destination.
      redirect: 'manual',
      headers: {
        Authorization: `Bearer ${secret}`,
        'User-Agent': 'sistemazero-studio-ai-reconcile',
      },
      signal: controller.signal,
    })
    if (response.status !== 200) {
      await response.body?.cancel()
      return { environment, state: 'http-error', status: response.status }
    }
    const result = await readCounts(response, controller.signal)
    if (!result) return { environment, state: 'invalid-response' }
    return {
      environment,
      state: result.pending || result.expiredBuilderJobs === null ? 'pending' : 'reconciled',
      ...result,
    }
  }
  try {
    return await Promise.race([operation(), deadline])
  } catch {
    return {
      environment,
      state: 'unconfirmed',
      reason: controller.signal.aborted ? 'timeout' : 'transport',
    }
  } finally {
    clearTimeout(timer)
    controller.abort()
  }
}

export function logResult(result: ReconciliationResult): void {
  const record = JSON.stringify({ event: 'studio-ai-reconcile', ...result })
  if (result.state === 'reconciled') console.info(record)
  else console.warn(record)
}

export default {
  scheduled(_event: ScheduledController, env: Env, ctx: Pick<ExecutionContext, 'waitUntil'>) {
    ctx.waitUntil(runReconciliation(env).then(logResult))
  },
  async fetch() {
    return new Response('not found', { status: 404, headers: { 'Cache-Control': 'no-store' } })
  },
} satisfies ExportedHandler<Env>
