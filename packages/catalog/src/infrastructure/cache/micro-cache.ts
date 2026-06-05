/**
 * Micro-cache TTL em memória para as leituras PÚBLICAS quentes (oferta/produto
 * por slug — toda renderização da página de vendas no funil dispara 6–8 queries).
 * Dados de marketing toleram staleness de segundos; a `quote` (gate autoritativo
 * de cobrança) NUNCA passa por aqui.
 *
 * - Por réplica (sem invalidação cross-réplica): o TTL é o teto da staleness.
 * - Cacheia também os misses (`null`): enumeração de slug 404 não martela o banco.
 * - Eviction FIFO com teto de entradas: memória limitada sob slug-spam (pior caso
 *   degrada para o comportamento sem cache — miss → banco).
 * - `ttlMs <= 0` desliga o cache (get sempre miss, set no-op) — default fora de
 *   produção, para o admin/dev verem edição refletida na hora.
 */
interface Entry<V> {
  value: V
  expiresAt: number
}

export class MicroCache<V> {
  private readonly entries = new Map<string, Entry<V>>()

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 1000,
  ) {}

  /** `undefined` = miss. Um `null` CACHEADO retorna `null` (negative cache). */
  get(key: string): V | undefined {
    if (this.ttlMs <= 0) return undefined
    const entry = this.entries.get(key)
    if (!entry) return undefined
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key)
      return undefined
    }
    return entry.value
  }

  set(key: string, value: V): void {
    if (this.ttlMs <= 0) return
    // Re-inserção move a chave para o fim do Map (ordem de inserção = fila FIFO).
    this.entries.delete(key)
    if (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value
      if (oldest !== undefined) this.entries.delete(oldest)
    }
    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs })
  }
}
