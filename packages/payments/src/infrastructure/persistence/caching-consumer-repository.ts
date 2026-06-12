import type { Consumer, ConsumerRepository } from '../../domain/ports/consumer-repository.port'

/**
 * Decorator de cache (TTL curto, em memória) sobre o `ConsumerRepository`.
 *
 * O consumer é consultado em TODA requisição autenticada (auth HMAC) e em toda
 * entrega de webhook de saída — 1 round-trip de banco por operação para um
 * conjunto minúsculo e quase estático (sistemas internos cadastrados via
 * db:seed). O TTL limita a janela de staleness (ex.: desativar um consumer vale
 * em ≤ TTL).
 *
 * Só cacheia acertos (consumer EXISTENTE): o `X-Consumer-Id` é controlado pelo
 * cliente — cachear misses permitiria inflar o Map com chaves arbitrárias.
 * O tamanho fica naturalmente limitado ao nº de consumers reais (o clear() é só
 * um fusível para o caso patológico).
 */
export class CachingConsumerRepository implements ConsumerRepository {
  private readonly cache = new Map<string, { value: Consumer; expiresAt: number }>()

  constructor(
    private readonly inner: ConsumerRepository,
    private readonly ttlMs = 30_000,
  ) {}

  async findById(consumerId: string): Promise<Consumer | null> {
    const now = Date.now()
    const hit = this.cache.get(consumerId)
    if (hit && hit.expiresAt > now) return hit.value
    if (hit) this.cache.delete(consumerId)

    const value = await this.inner.findById(consumerId)
    if (value) {
      if (this.cache.size >= 1000) this.cache.clear() // fusível anti-crescimento
      this.cache.set(consumerId, { value, expiresAt: now + this.ttlMs })
    }
    return value
  }

  // Subscribers por evento (fan-out): consultado a cada evento publicado. Aqui
  // PODE cachear lista vazia — o eventName vem do NOSSO código (nomes fixos de
  // eventos de domínio), não do cliente, então não infla o Map.
  private readonly subscribersCache = new Map<string, { value: Consumer[]; expiresAt: number }>()

  async findSubscribers(eventName: string): Promise<Consumer[]> {
    const now = Date.now()
    const hit = this.subscribersCache.get(eventName)
    if (hit && hit.expiresAt > now) return hit.value
    if (hit) this.subscribersCache.delete(eventName)

    const value = await this.inner.findSubscribers(eventName)
    this.subscribersCache.set(eventName, { value, expiresAt: now + this.ttlMs })
    return value
  }
}
