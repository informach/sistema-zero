/**
 * Leitura do header `Retry-After` de um 503 (pura, testada). Só a forma em
 * SEGUNDOS interessa aqui (é o que o BFF emite quando a fila da marca d'água
 * está cheia — incidente 07/09); data HTTP, ausência ou lixo caem no default.
 * O teto evita que um valor exagerado prenda o livro 3D em "preparando" —
 * o cliente tenta UMA vez e, se ainda estiver cheio, mostra o recado.
 */
export const RETRY_AFTER_DEFAULT_MS = 8_000
export const RETRY_AFTER_CAP_MS = 20_000

export function retryAfterMs(
  header: string | null | undefined,
  opts: { defaultMs?: number; capMs?: number } = {},
): number {
  const fallback = opts.defaultMs ?? RETRY_AFTER_DEFAULT_MS
  const cap = opts.capMs ?? RETRY_AFTER_CAP_MS
  const raw = header?.trim() ?? ''
  if (!/^\d+$/.test(raw)) return Math.min(fallback, cap)
  const seconds = Number(raw)
  if (!Number.isFinite(seconds)) return Math.min(fallback, cap)
  return Math.min(seconds * 1000, cap)
}
