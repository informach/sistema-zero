/** Payload-budgeted LRU. The budget is conservative accounting, not a heap measurement. */
export class ByteLru<Key, Value> {
  private entries = new Map<Key, { value: Value; bytes: number }>()
  private retainedBytes = 0

  constructor(
    private readonly options: {
      maxBytes: number
      maxEntries: number
      sizeOf: (key: Key, value: Value) => number
    },
  ) {
    if (
      !Number.isSafeInteger(options.maxBytes) ||
      options.maxBytes < 0 ||
      !Number.isSafeInteger(options.maxEntries) ||
      options.maxEntries < 0
    )
      throw new RangeError('Invalid cache budget')
  }

  get bytes(): number {
    return this.retainedBytes
  }
  get size(): number {
    return this.entries.size
  }

  get(key: Key): Value | undefined {
    const entry = this.entries.get(key)
    if (!entry) return undefined
    this.entries.delete(key)
    this.entries.set(key, entry)
    return entry.value
  }

  set(key: Key, value: Value): void {
    const bytes = this.options.sizeOf(key, value)
    if (!Number.isSafeInteger(bytes) || bytes < 0) throw new RangeError('Invalid cache entry size')
    this.delete(key)
    if (bytes > this.options.maxBytes || this.options.maxEntries === 0) return
    while (
      this.retainedBytes + bytes > this.options.maxBytes ||
      this.entries.size >= this.options.maxEntries
    ) {
      const oldest = this.entries.keys().next()
      if (oldest.done) break
      this.delete(oldest.value)
    }
    this.entries.set(key, { value, bytes })
    this.retainedBytes += bytes
  }

  delete(key: Key): void {
    const entry = this.entries.get(key)
    if (!entry) return
    this.retainedBytes -= entry.bytes
    this.entries.delete(key)
  }

  clear(): void {
    this.entries.clear()
    this.retainedBytes = 0
  }
}
