import { readFile } from 'node:fs/promises'
import { type Browser, chromium } from 'playwright'
import { Sandbox, SandboxNotFoundError } from 'railway'
import { validBrowserLease } from './browser-lease'

export interface RecordingBrowser {
  browser: Browser
  renew(leaseEndsAt: number): Promise<void>
  close(): Promise<void>
}
export type OpenRecordingBrowser = (
  leaseEndsAt: number,
  hardEndsAt: number,
) => Promise<RecordingBrowser>

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
async function bounded<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Browser operation timed out')), ms)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

async function destroyConfirmed(sandbox: Sandbox) {
  await bounded(sandbox.destroy(), 5000)
  const deadline = Date.now() + 7000
  while (Date.now() < deadline) {
    try {
      await bounded(sandbox.refresh(), 3000)
      if (sandbox.status === 'DESTROYED') return
    } catch (error) {
      if (error instanceof SandboxNotFoundError) return
      throw error
    }
    await wait(250)
  }
  throw new Error('Browser VM termination not confirmed')
}

export function recordingBrowserFactory(
  env: NodeJS.ProcessEnv = process.env,
): OpenRecordingBrowser {
  if (
    env.LIVE_BROWSER_MODE === 'local' ||
    (!env.LIVE_BROWSER_MODE && env.NODE_ENV !== 'production')
  )
    return async () => {
      const browser = await chromium.launch({
        headless: true,
        chromiumSandbox: true,
        args: ['--autoplay-policy=no-user-gesture-required'],
      })
      return { browser, renew: async () => {}, close: () => browser.close() }
    }
  if (env.LIVE_BROWSER_MODE !== 'railway-sandbox')
    throw new Error('LIVE_BROWSER_MODE must be configured')
  const token = env.LIVE_BROWSER_RAILWAY_TOKEN,
    environmentId = env.RAILWAY_ENVIRONMENT_ID,
    checkpoint = env.LIVE_BROWSER_CHECKPOINT
  if (!token || !environmentId || !checkpoint)
    throw new Error('Browser VM configuration incomplete')
  const fetchRailway = ((input, init) =>
    fetch(input, { ...init, signal: AbortSignal.timeout(10_000) })) as typeof fetch
  return async (leaseEndsAt, hardEndsAt) => {
    if (!validBrowserLease(leaseEndsAt, hardEndsAt)) throw new Error('Browser lease expired')
    const sandbox = await Sandbox.create(checkpoint, {
      token,
      authType: 'project-token',
      environmentId,
      fetch: fetchRailway,
      networkIsolation: 'PRIVATE',
      idleTimeoutMinutes: 10,
      resources: { cpu: 1, memoryGB: 2 },
    })
    console.info('Recording browser VM created', sandbox.id)
    let browser: Browser | undefined
    try {
      // Base image has only Node/Playwright. Upload these versioned control files at launch.
      await Promise.all(
        ['railway-browser-host.mjs', 'browser-lease.ts'].map(async (name) =>
          sandbox.files.write(
            `/opt/live-browser/${name}`,
            await readFile(new URL(name, import.meta.url)),
          ),
        ),
      )
      const response = await fetchRailway('https://backboard.railway.com/graphql/v2', {
        method: 'POST',
        headers: { 'Project-Access-Token': token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query:
            'query($id:String!,$environmentId:String!){sandbox(id:$id,environmentId:$environmentId){privateDomain}}',
          variables: { id: sandbox.id, environmentId },
        }),
      })
      const result = (await response.json()) as { data?: { sandbox?: { privateDomain?: string } } }
      const host = result.data?.sandbox?.privateDomain
      if (!response.ok || !host || !/^[\w.-]+\.railway\.internal$/.test(host))
        throw new Error('Browser private network unavailable')
      let resolveEndpoint!: (endpoint: string) => void
      let rejectEndpoint!: (error: unknown) => void
      const endpoint = new Promise<string>((resolve, reject) => {
        resolveEndpoint = resolve
        rejectEndpoint = reject
      })
      let pending = ''
      const handle = sandbox.exec(
        'runuser -u recorder -- /opt/live-browser/node /opt/live-browser/railway-browser-host.mjs',
        {
          stdin: true,
          captureOutput: false,
          env: {
            PLAYWRIGHT_BROWSERS_PATH: '/opt/live-browser/browsers',
            LIVE_BROWSER_LEASE_ENDS_AT: String(leaseEndsAt),
            LIVE_BROWSER_HARD_ENDS_AT: String(hardEndsAt),
          },
          onStdout(chunk) {
            pending += chunk
            if (pending.length > 8192) {
              rejectEndpoint(new Error('Invalid browser control output'))
              return
            }
            const lines = pending.split('\n')
            pending = lines.pop()!
            for (const line of lines) {
              try {
                const message = JSON.parse(line)
                if (typeof message.endpoint === 'string') resolveEndpoint(message.endpoint)
              } catch {
                rejectEndpoint(new Error('Invalid browser control message'))
              }
            }
          },
        },
      )
      const completion = handle.result()
      void completion.then(() => rejectEndpoint(new Error('Browser host exited')), rejectEndpoint)
      const address = new URL(await bounded(endpoint, 12_000))
      if (
        address.protocol !== 'ws:' ||
        address.port !== '9222' ||
        !/^\/[a-f\d-]+$/.test(address.pathname)
      )
        throw new Error('Invalid browser endpoint')
      address.hostname = host
      browser = await chromium.connect(address.toString(), { timeout: 7000 })
      let closeInFlight: Promise<void> | null = null
      let closed = false
      const close = async () => {
        if (closed) return
        if (closeInFlight) return closeInFlight
        closeInFlight = (async () => {
          // Disconnect alone is insufficient. Destruction is independently confirmed below.
          await bounded(handle.stdin.write(`${JSON.stringify({ type: 'close' })}\n`), 2000).catch(
            () => {},
          )
          await bounded(completion, 3000).catch(() => {})
          await destroyConfirmed(sandbox)
          await browser!.close().catch(() => {})
          closed = true
        })()
        try {
          await closeInFlight
        } finally {
          closeInFlight = null
        }
      }
      return {
        browser,
        async renew(nextLease) {
          if (closed || !validBrowserLease(nextLease, hardEndsAt))
            throw new Error('Browser lease invalid')
          await bounded(
            handle.stdin.write(`${JSON.stringify({ type: 'renew', leaseEndsAt: nextLease })}\n`),
            2000,
          )
        },
        close,
      }
    } catch (error) {
      await destroyConfirmed(sandbox).catch(() =>
        console.error('Browser VM cleanup pending', sandbox.id),
      )
      await browser?.close().catch(() => {})
      throw error
    }
  }
}
