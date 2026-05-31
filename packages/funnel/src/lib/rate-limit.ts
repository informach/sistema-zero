// Rate limit best-effort em memória (janela fixa, por instância). A defesa de
// borda real é do api-gateway/CDN; isto é só uma rede contra abuso trivial dos
// endpoints públicos de escrita (leads/eventos/contato/checkout). NÃO sobrevive
// a reinícios nem é compartilhado entre instâncias — mantenha o limite generoso.

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds: number
}

function sweep(now: number): void {
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key)
  }
}

/** Janela fixa: até `limit` requisições por `windowMs` para a chave dada. */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number,
): RateLimitResult {
  const bucket = buckets.get(key)
  if (!bucket || now >= bucket.resetAt) {
    if (buckets.size > 5000) sweep(now)
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterSeconds: 0 }
  }
  bucket.count++
  if (bucket.count > limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) }
  }
  return { allowed: true, retryAfterSeconds: 0 }
}

/** Apenas para testes (zera o estado em memória). */
export function resetRateLimit(): void {
  buckets.clear()
}
