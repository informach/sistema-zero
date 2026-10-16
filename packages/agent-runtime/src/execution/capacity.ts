/** FIFO, abortable admission. Reservations are released even when an operation throws. */
export class Capacity {
  private active = 0
  private waiting: { grant: () => void; signal: AbortSignal; abort: () => void }[] = []
  constructor(
    private limit: number,
    private queueLimit = 64,
  ) {}
  async acquire(signal: AbortSignal): Promise<() => void> {
    signal.throwIfAborted()
    if (this.active < this.limit) this.active++
    else {
      if (this.waiting.length >= this.queueLimit) throw new Error('Tool capacity queue is full')
      await new Promise<void>((resolve, reject) => {
        const entry = {
          signal,
          grant: () => {
            signal.removeEventListener('abort', entry.abort)
            resolve()
          },
          abort: () => {
            const index = this.waiting.indexOf(entry)
            if (index !== -1) this.waiting.splice(index, 1)
            reject(signal.reason ?? new Error('Canceled while waiting for tool capacity'))
          },
        }
        this.waiting.push(entry)
        signal.addEventListener('abort', entry.abort, { once: true })
        if (signal.aborted) entry.abort()
      })
    }
    let released = false
    return () => {
      if (released) return
      released = true
      const next = this.waiting.shift()
      if (next) next.grant()
      else this.active--
    }
  }
}
