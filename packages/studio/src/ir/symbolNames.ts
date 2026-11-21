/**
 * Um conjunto de nomes só para leitura: `has`, `size` e a iteração do `ReadonlySet`. O Members
 * compila o Estúdio com o lib ESNext, cujo `ReadonlySet` pede também `union`, `intersection` e os
 * outros métodos novos de conjunto, que um retrato nunca usa: declarar `ReadonlySet` reprovava o
 * typecheck de lá (escondido de 18 a 20/11/2026 pelo lint vermelho, que pulava o typecheck).
 * O `forEach` também fica de fora: o do `ReadonlySet` entrega o próprio conjunto ao retorno de
 * chamada COMO `ReadonlySet`, e no ESNext um retrato não é um. Quem lê só pergunta `has`.
 */
export type ReadonlyNames<T = string> = Pick<
  ReadonlySet<T>,
  'has' | 'size' | 'entries' | 'keys' | 'values' | typeof Symbol.iterator
>

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
