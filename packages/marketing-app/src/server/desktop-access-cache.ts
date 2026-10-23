import { createHash } from 'node:crypto'

export type DesktopAccess =
  | { ok: true; accessToken: string; tokenType: 'Bearer'; expiresIn: number }
  | { ok: false; status: number; retryAfterMs?: number }
type Entry = { flight: Promise<DesktopAccess>; until: number }
/** Caches issuance only. The gateway still checks the device and active user on EVERY request. */
export class DesktopAccessCache {
  private readonly entries = new Map<string, Entry>()
  constructor(
    private readonly now: () => number = () => performance.now(),
    private readonly capacity = 256,
  ) {}
  private key(origin: string, credential: string) {
    return createHash('sha256')
      .update(JSON.stringify([origin, credential]))
      .digest('hex')
  }
  forget(origin: string, credential: string) {
    this.entries.delete(this.key(origin, credential))
  }
  get(
    origin: string,
    credential: string,
    issue: () => Promise<DesktopAccess>,
  ): Promise<DesktopAccess> {
    const key = this.key(origin, credential),
      before = this.entries.get(key)
    if (before && before.until > this.now()) return before.flight
    if (before) this.entries.delete(key)
    if (this.entries.size >= this.capacity) {
      const oldest = this.entries.keys().next().value
      if (oldest) this.entries.delete(oldest)
    }
    const started = this.now()
    const entry: Entry = {
      until: Infinity,
      flight: Promise.resolve()
        .then(issue)
        .then(
          (value) => {
            if (this.entries.get(key) === entry) {
              // Bound retention independently of issuer TTL and leave a network/clock margin.
              entry.until =
                started +
                (value.ok ? Math.max(0, Math.min(120000, value.expiresIn * 1000 - 30000)) : 0)
              if (entry.until <= this.now()) this.entries.delete(key)
            }
            return value
          },
          (error) => {
            if (this.entries.get(key) === entry) this.entries.delete(key)
            throw error
          },
        ),
    }
    this.entries.set(key, entry)
    return entry.flight
  }
}
