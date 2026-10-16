/** Retry-After from the server is advisory timing, never a reason to replay an arbitrary failure. */
export function retryAfterMilliseconds(value: string | null, now = Date.now()): number | undefined {
  if (!value) return undefined
  const text = value.trim()
  if (/^\d+$/.test(text)) {
    const milliseconds = Number(text) * 1000
    return Number.isSafeInteger(milliseconds) ? milliseconds : undefined
  }
  if (!/^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(text))
    return undefined
  const timestamp = Date.parse(text)
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - now) : undefined
}
export function retryAfterHeaders(retryAfterMs: number | undefined): Record<string, string> {
  return retryAfterMs !== undefined && Number.isSafeInteger(retryAfterMs) && retryAfterMs >= 0
    ? { 'retry-after': String(Math.ceil(retryAfterMs / 1000)) }
    : {}
}

/** A server-imposed pause shared by one authenticated client's requests. It
 * never retries a write, extends itself from local rejections or hides errors. */
export class HttpCooldown {
  private until = 0
  constructor(private readonly now: () => number = Date.now) {}
  observe(status: number, retryAfterMs: number | undefined) {
    if (
      status === 429 &&
      retryAfterMs !== undefined &&
      Number.isSafeInteger(retryAfterMs) &&
      retryAfterMs >= 0 &&
      retryAfterMs <= 120000
    )
      this.until = Math.max(this.until, this.now() + retryAfterMs)
  }
  remainingMilliseconds() {
    return Math.max(0, this.until - this.now())
  }
  reset() {
    this.until = 0
  }
}
