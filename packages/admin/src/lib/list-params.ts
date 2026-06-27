/** Maior `limit` que qualquer tela do painel pede hoje (catálogo/moderação/etc.). */
const DEFAULT_MAX_LIMIT = 100

function parseNonNegativeInt(value: string | null): number | undefined {
  if (!value) return undefined
  const n = Number(value)
  return Number.isInteger(n) && n >= 0 ? n : undefined
}

/**
 * `limit` de listagem vindo do query string do client. Inteiro ≥ 0 com TETO
 * (default 100). Sem o teto, um `?limit=1000000` chegaria ao gateway/serviço e
 * pediria uma página praticamente ilimitada (amplificação). Achado do 3º full review.
 */
export function parseLimit(value: string | null, max = DEFAULT_MAX_LIMIT): number | undefined {
  const n = parseNonNegativeInt(value)
  return n === undefined ? undefined : Math.min(n, max)
}

/** `offset` de listagem: inteiro ≥ 0 (sem teto — a paginação avança livremente). */
export function parseOffset(value: string | null): number | undefined {
  return parseNonNegativeInt(value)
}
