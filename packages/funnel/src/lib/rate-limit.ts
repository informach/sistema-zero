// Rate limit best-effort em memória (janela fixa, por instância). A defesa de
// borda real é do api-gateway/CDN; isto é só uma rede contra abuso trivial dos
// endpoints públicos de escrita (leads/eventos/contato/checkout). NÃO sobrevive
// a reinícios nem é compartilhado entre instâncias — mantenha o limite generoso.

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

// Teto DURO de memória: botnet com IPs reais distintos numa mesma janela não
// cresce o Map sem limite (~50k buckets ≈ poucos MB). Cheio = FAIL-OPEN p/
// chaves novas — o limiter é best-effort; negar tráfego legítimo por estado
// interno seria pior que deixar passar.
const MAX_BUCKETS = 50_000
// Sweep no máximo a cada 30s: varrer o Map inteiro A CADA inserção sob carga
// (size > 5000) viraria custo quadrático.
const SWEEP_MIN_INTERVAL_MS = 30_000
let lastSweepAt = 0

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
    if (buckets.size > 5000 && now - lastSweepAt >= SWEEP_MIN_INTERVAL_MS) {
      sweep(now)
      lastSweepAt = now
    }
    // Cheio E chave nova → fail-open sem inserir (re-uso de chave existente
    // expirada não cresce o Map, então segue normal).
    if (!bucket && buckets.size >= MAX_BUCKETS) {
      return { allowed: true, retryAfterSeconds: 0 }
    }
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
  lastSweepAt = 0
}
