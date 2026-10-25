/** Read-only transport. Mutations deliberately keep their existing single-attempt path. */
export class RailwayReadError extends Error {
  constructor(code, httpStatus) {
    super(`Railway read failed: ${code}`)
    this.code = code
    if (Number.isInteger(httpStatus)) this.httpStatus = httpStatus
  }
}

export function retryAfterMs(value, wallNow = Date.now()) {
  if (typeof value !== 'string' || !value.trim()) return 0
  if (/^\d+(?:\.\d+)?$/.test(value.trim())) {
    const delay = Number(value) * 1000
    return Number.isFinite(delay) ? delay : Number.POSITIVE_INFINITY
  }
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - wallNow) : 0
}

export async function railwayReadQuery(query, variables, options) {
  if (typeof query !== 'string' || !/^query\b/.test(query))
    throw new RailwayReadError('read-query-required')
  const {
    token,
    deadline,
    fetch: doFetch = fetch,
    now = () => performance.now(),
    wallNow = Date.now,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    log = () => {},
  } = options
  if (!token || !Number.isFinite(deadline)) throw new RailwayReadError('read-context-invalid')
  let failures = 0
  const checkTime = () => {
    if (now() >= deadline) throw new RailwayReadError('read-deadline')
  }
  for (;;) {
    checkTime()
    const signal = AbortSignal.timeout(Math.max(1, Math.min(15_000, Math.floor(deadline - now()))))
    let response
    let failure
    let delay = 0
    try {
      response = await doFetch('https://backboard.railway.com/graphql/v2', {
        method: 'POST',
        redirect: 'error',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ query, variables }),
        signal,
      })
      checkTime()
      if (!response.ok) {
        const code =
          response.status === 429
            ? 'api-rate-limited'
            : [401, 403].includes(response.status)
              ? 'api-authorization-rejected'
              : [408, 504].includes(response.status)
                ? 'api-timeout'
                : response.status >= 500
                  ? 'api-provider-unavailable'
                  : 'api-http-rejected'
        failure = new RailwayReadError(code, response.status)
        if (response.status === 429)
          delay = retryAfterMs(response.headers?.get('retry-after'), wallNow())
      } else {
        let result
        try {
          result = await response.json()
        } catch {
          failure = new RailwayReadError('api-response-invalid', response.status)
        }
        checkTime()
        if (!failure) {
          if (!result || typeof result !== 'object' || Array.isArray(result))
            failure = new RailwayReadError('api-response-invalid', response.status)
          else if (result.errors) {
            const messages = Array.isArray(result.errors)
              ? result.errors.map((e) => e?.message)
              : []
            throw new RailwayReadError(
              messages.includes('Not Authorized')
                ? 'api-authorization-rejected'
                : 'api-operation-rejected',
              response.status,
            )
          } else if (!result.data || typeof result.data !== 'object' || Array.isArray(result.data))
            failure = new RailwayReadError('api-response-invalid', response.status)
          else return result.data
        }
      }
    } catch (error) {
      if (error instanceof RailwayReadError) throw error
      failure = new RailwayReadError(signal.aborted ? 'api-timeout' : 'api-network-failed')
    } finally {
      // Non-success bodies are unused. Release them before a potentially long rate-limit wait.
      if (response?.body && !response.bodyUsed) await response.body.cancel().catch(() => {})
    }
    checkTime()
    const retryable = [
      'api-rate-limited',
      'api-timeout',
      'api-provider-unavailable',
      'api-response-invalid',
      'api-network-failed',
    ].includes(failure.code)
    failures++
    if (!retryable || (failure.code !== 'api-rate-limited' && failures >= 5)) throw failure
    delay = Math.max(delay, Math.min(60_000, 5000 * 2 ** Math.min(failures - 1, 4)))
    log({
      stage: 'railway-read-backoff',
      reason: failure.code,
      waitMs: Math.min(delay, deadline - now()),
    })
    if (delay >= deadline - now()) {
      await sleep(Math.max(0, deadline - now()))
      throw new RailwayReadError('read-deadline')
    }
    await sleep(delay)
  }
}
