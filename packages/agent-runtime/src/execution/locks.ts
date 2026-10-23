export class Locks {
  private tails = new Map<string, Promise<void>>()
  async with<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const prior = this.tails.get(key) ?? Promise.resolve()
    let release!: () => void
    const next = new Promise<void>((resolve) => {
      release = resolve
    })
    this.tails.set(key, next)
    await prior
    try {
      return await operation()
    } finally {
      release()
      if (this.tails.get(key) === next) this.tails.delete(key)
    }
  }
}
