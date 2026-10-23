import { z } from 'zod'

interface RequestOptions {
  method?: 'GET' | 'POST'
  body?: unknown
  token?: string
  signal?: AbortSignal
  headers?: Record<string, string>
  maxBytes?: number
  timeoutMs?: number
  readOnly?: boolean
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(`Service request failed (${status}, ${code})`)
  }
}
export function serviceOrigin(raw: string) {
  const url = new URL(raw)
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    (url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && ['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname)))
  )
    throw new Error('Use an HTTPS origin or an explicit local development origin')
  return url.origin
}
export class JsonService {
  readonly origin: string
  private failures = 0
  private blockedUntil = 0
  constructor(
    origin: string,
    private fetchImpl: typeof fetch = fetch,
  ) {
    this.origin = serviceOrigin(origin)
  }
  async request(
    path: string,
    options: RequestOptions = {},
  ): Promise<{ status: number; value: unknown }> {
    try {
      return await this.once(path, options)
    } catch (error) {
      if (
        !(error instanceof ApiError) ||
        ![502, 503, 504].includes(error.status) ||
        error.code === 'CIRCUIT_OPEN' ||
        (options.method === 'POST' && !options.readOnly)
      )
        throw error
      // One bounded retry, only for reads, and never for single-use authentication.
      await new Promise<void>((resolve, reject) => {
        const abort = () => {
          clearTimeout(timer)
          reject(new ApiError(0, 'INTERRUPTED'))
        }
        const timer = setTimeout(() => {
          options.signal?.removeEventListener('abort', abort)
          resolve()
        }, 150)
        options.signal?.addEventListener('abort', abort, { once: true })
        if (options.signal?.aborted) abort()
      })
      return this.once(path, options)
    }
  }
  private async once(path: string, options: RequestOptions) {
    if (
      !path.startsWith('/') ||
      path.startsWith('//') ||
      new URL(path, this.origin).origin !== this.origin
    )
      throw new Error('Service path escaped configured origin')
    if (Date.now() < this.blockedUntil) throw new ApiError(503, 'CIRCUIT_OPEN')
    const signal = AbortSignal.any([
      AbortSignal.timeout(Math.min(65000, options.timeoutMs ?? 20000)),
      ...(options.signal ? [options.signal] : []),
    ])
    const headers = new Headers({ accept: 'application/json', ...options.headers })
    if (options.body !== undefined) headers.set('content-type', 'application/json')
    if (options.token) headers.set('authorization', `Bearer ${options.token}`)
    try {
      const response = await this.fetchImpl(new URL(path, this.origin), {
        method: options.method ?? 'GET',
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal,
        redirect: 'error',
      })
      const reader = response.body?.getReader()
      let bytes = 0
      const chunks: Uint8Array[] = []
      try {
        if (reader)
          for (;;) {
            const part = await reader.read()
            if (part.done) break
            bytes += part.value.byteLength
            if (bytes > Math.min(8_000_000, options.maxBytes ?? 2_000_000))
              throw new ApiError(response.status, 'RESPONSE_TOO_LARGE')
            chunks.push(part.value)
          }
      } finally {
        await reader?.cancel().catch(() => undefined)
        reader?.releaseLock()
      }
      const raw: unknown = bytes ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : null
      if (!response.ok) {
        const error = z
          .object({
            error: z.object({
              code: z
                .string()
                .max(80)
                .regex(/^[A-Z0-9_]+$/),
            }),
          })
          .safeParse(raw)
        throw new ApiError(response.status, error.success ? error.data.error.code : 'HTTP_ERROR')
      }
      this.failures = 0
      return { status: response.status, value: raw }
    } catch (error) {
      if (!(error instanceof ApiError) || error.status >= 500) {
        if (++this.failures >= 3) this.blockedUntil = Date.now() + 30000
      }
      if (error instanceof ApiError) throw error
      throw new ApiError(0, signal.aborted ? 'INTERRUPTED' : 'TRANSPORT_OR_RESPONSE_UNKNOWN')
    }
  }
}
