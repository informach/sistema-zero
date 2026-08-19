import type { CreationTool } from '../../domain/creations/creation'

/**
 * Cache CURTO da posse por (conta, ferramenta): a reserva roda a cada autosave (10 s no
 * Estúdio, 2 s no Pinta) e consultava os entitlements toda vez. 60 s de memória por
 * processo: perder a posse demora no máximo 1 min para valer na RESERVA (listar/baixar/
 * apagar nunca exigiram posse) — e quem REBAIXA uma matrícula (webhook de assinatura,
 * painel admin) INVALIDA na hora (`invalidateToolOwnership`). Só o resultado POSITIVO é
 * guardado — uma recusa volta a consultar (a criança acabou de comprar e tenta de novo).
 */
const TOOL_OWNERSHIP_TTL_MS = 60_000
const cache = new Map<string, number>()

const keyOf = (accountId: string, tool: CreationTool) => `${accountId}:${tool}`

export function toolOwnershipCached(accountId: string, tool: CreationTool, now: number): boolean {
  const until = cache.get(keyOf(accountId, tool))
  return until !== undefined && until > now
}

export function rememberToolOwned(accountId: string, tool: CreationTool, now: number): void {
  cache.set(keyOf(accountId, tool), now + TOOL_OWNERSHIP_TTL_MS)
  // Sem crescer sem fim (contas que nunca voltam): poda ocasional das vencidas.
  if (cache.size > 5_000) {
    for (const [key, expiry] of cache) if (expiry <= now) cache.delete(key)
  }
}

/**
 * A posse da conta MUDOU (matrícula revogada/expirada pelo webhook ou pelo admin; conta
 * em exclusão): esquece o que estava guardado para ela — a próxima reserva volta a
 * consultar. Idempotente; contas sem entrada não fazem nada.
 */
export function invalidateToolOwnership(accountIds: string | readonly string[]): void {
  for (const accountId of typeof accountIds === 'string' ? [accountIds] : accountIds) {
    cache.delete(keyOf(accountId, 'studio'))
    cache.delete(keyOf(accountId, 'pinta'))
  }
}

export function resetToolOwnershipCacheForTests(): void {
  cache.clear()
}
