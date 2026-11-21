/**
 * O retrato oferece consulta e iteração sem prometer os métodos novos do Set no ESNext.
 * O callback de forEach recebe este mesmo contrato; herdar a assinatura do ReadonlySet
 * exigiria operações que o retrato não implementa e quebraria o typecheck do Members.
 */
export type ReadonlyNames<T = string> = Pick<
  ReadonlySet<T>,
  'has' | 'size' | 'entries' | 'keys' | 'values' | typeof Symbol.iterator
> & {
  forEach(callback: (value: T, key: T, set: ReadonlyNames<T>) => void, thisArg?: unknown): void
}

/**
 * A lexical-scope snapshot. Forking shares read-only storage; the first actual
 * mutation detaches it. Unlike a parent-linked scope, later parent writes cannot
 * become visible in an earlier snapshot. Iteration reads the captured storage.
 */
export class SymbolNames<T = string> implements ReadonlyNames<T> {
  private storage: { values: Set<T>; shared: boolean }

  constructor(values?: Iterable<T>, storage?: { values: Set<T>; shared: boolean }) {
    this.storage = storage ?? { values: new Set(values), shared: false }
  }

  fork(): SymbolNames<T> {
    this.storage.shared = true
    return new SymbolNames(undefined, this.storage)
  }

  private writable(): Set<T> {
    if (this.storage.shared) this.storage = { values: new Set(this.storage.values), shared: false }
    return this.storage.values
  }

  add(value: T): this {
    if (!this.has(value)) this.writable().add(value)
    return this
  }

  delete(value: T): boolean {
    return this.has(value) && this.writable().delete(value)
  }

  clear(): void {
    if (this.size) this.storage = { values: new Set(), shared: false }
  }

  get size(): number {
    return this.storage.values.size
  }

  has(value: T): boolean {
    return this.storage.values.has(value)
  }

  entries() {
    return this.storage.values.entries()
  }

  keys() {
    return this.storage.values.keys()
  }

  values() {
    return this.storage.values.values()
  }

  [Symbol.iterator]() {
    return this.values()
  }

  forEach(callback: (value: T, key: T, set: SymbolNames<T>) => void, thisArg?: unknown): void {
    this.storage.values.forEach((value) => {
      callback.call(thisArg, value, value, this)
    })
  }
}
