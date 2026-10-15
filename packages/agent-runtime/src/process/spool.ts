import { mkdir, opendir, stat, unlink } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { Locks } from '../execution/locks'

const identity = /^[a-f0-9-]{36}\.log$/
const quota = 1024 ** 3
const retainedMs = 30 * 86400000
const profiles = new Map<
  string,
  { used: number; initialized: boolean; active: Set<string>; locks: Locks }
>()
/** One supervisor owns a profile. Count retained bytes as well as concurrent reservations. */
export class Spool {
  private state
  private directory: string
  constructor(directory: string) {
    this.directory = resolve(directory, 'logs')
    let state = profiles.get(this.directory)
    if (!state) {
      state = { used: 0, initialized: false, active: new Set<string>(), locks: new Locks() }
      profiles.set(this.directory, state)
    }
    this.state = state
  }
  private async scan() {
    await mkdir(this.directory, { recursive: true, mode: 0o700 })
    let used = 0,
      files = 0
    for await (const entry of await opendir(this.directory)) {
      if (!identity.test(entry.name) || !entry.isFile()) continue
      if (++files > 100000) throw new Error('Process log inventory exceeds limit; archive old logs')
      const file = join(this.directory, entry.name)
      const info = await stat(file)
      if (!this.state.active.has(entry.name) && Date.now() - info.mtimeMs > retainedMs)
        await unlink(file)
      else used += info.size
    }
    return used
  }
  async reserve(name: string, bytes: number) {
    if (!identity.test(name) || !Number.isSafeInteger(bytes) || bytes < 1 || bytes > 16_000_000)
      throw new Error('Invalid process log reservation')
    return this.state.locks.with('quota', async () => {
      if (!this.state.initialized) {
        this.state.used = await this.scan()
        this.state.initialized = true
      }
      if (this.state.used + bytes > quota)
        throw new Error(
          'Process log quota reached (1 GiB per profile, 30 days retention); archive retained logs before starting another process',
        )
      this.state.used += bytes
      this.state.active.add(name)
      let released = false
      return async (written: number) =>
        this.state.locks.with('quota', async () => {
          if (released) return
          released = true
          this.state.active.delete(name)
          this.state.used -= bytes - Math.min(bytes, Math.max(0, written))
        })
    })
  }
  async collect() {
    return this.state.locks.with('quota', async () => {
      // Active reservations include bytes not yet written, so recount only when drained.
      if (!this.state.active.size) {
        this.state.used = await this.scan()
        this.state.initialized = true
      }
      return { bytes: this.state.used, quotaBytes: quota, active: this.state.active.size }
    })
  }
}
