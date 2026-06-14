/**
 * Cache TTL minimalista por processo (FIFO com teto). TTL 0 = desligado (sempre
 * recalcula). Usado para o resultado do access-check do members no caminho de
 * leitura da comunidade — evita martelar o members a cada navegação.
 */
export class MicroCache<T> {
  private readonly store = new Map<string, { value: T; expiresAt: number }>()

  constructor(
    private readonly ttlMs: number,
    private readonly now: () => number = () => Date.now(),
    private readonly maxEntries = 5_000,
  ) {}

  get(key: string): T | undefined {
    if (this.ttlMs <= 0) return undefined
    const hit = this.store.get(key)
    if (!hit) return undefined
    if (hit.expiresAt <= this.now()) {
      this.store.delete(key)
      return undefined
    }
    return hit.value
  }

  set(key: string, value: T): void {
    if (this.ttlMs <= 0) return
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value
      if (oldest !== undefined) this.store.delete(oldest)
    }
    this.store.set(key, { value, expiresAt: this.now() + this.ttlMs })
  }

  /** Invalida todas as entradas de um usuário (prefixo `userId|`). */
  invalidateUser(userId: string): void {
    const prefix = `${userId}|`
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key)
    }
  }
}
