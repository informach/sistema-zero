import type { StoreMutation } from '../store/client'
import type { Supervisor } from '../supervisor'

/** Coalesces durable mutations; control transitions do not occupy agent executor slots. */
export class JournalDriver {
  private dirty = false
  private closed = false
  private debounce?: ReturnType<typeof setTimeout>
  private wake?: ReturnType<typeof setTimeout>
  private running?: Promise<void>
  private changed = (mutation: StoreMutation) => {
    if (this.relevant(mutation)) this.request()
  }
  constructor(
    private supervisor: Supervisor,
    private advance: () => Promise<number | undefined>,
    private relevant: (mutation: StoreMutation) => boolean = (mutation) =>
      mutation.op !== 'event.append',
  ) {}
  start() {
    this.supervisor.changes.on('changed', this.changed)
    this.request()
  }
  request() {
    if (this.closed) return
    this.dirty = true
    if (this.debounce || this.running) return
    this.debounce = setTimeout(() => {
      this.debounce = undefined
      this.dirty = false
      this.running = (
        this.supervisor.readiness === 'ready'
          ? this.advance()
          : Promise.resolve(
              this.supervisor.readiness === 'recovering' ? Date.now() + 1000 : undefined,
            )
      )
        .then((next) => {
          clearTimeout(this.wake)
          if (!this.closed && next !== undefined)
            this.wake = setTimeout(
              () => this.request(),
              Math.min(2147483647, Math.max(1, next - Date.now())),
            )
        })
        .catch((error) => {
          console.error('Journal coordinator failed', String(error))
          this.supervisor.fail(
            new Error(`Journal coordinator failed: ${String(error)}`, { cause: error }),
          )
        })
        .finally(() => {
          this.running = undefined
          if (this.dirty) this.request()
        })
    }, 20)
  }
  async close() {
    this.closed = true
    clearTimeout(this.debounce)
    clearTimeout(this.wake)
    this.supervisor.changes.off('changed', this.changed)
    await this.running
  }
}
