import { CREATION_TOOLS, type CreationTool } from '../../domain/creations/creation'

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

/**
 * Sobe a cada invalidação. Uma checagem que leu a posse ANTES de uma revogação e só terminou
 * DEPOIS dela regravaria o "pode" por mais 60 s (full review de 11/10/2026: a revogação chegava
 * entre as consultas da checagem). Quem guarda resultado compara a geração do começo com a de
 * agora e, se mudou, não guarda: a próxima reserva consulta de novo. Um contador global basta,
 * porque invalidação é rara e o custo de uma consulta a mais é nenhum.
 */
let generation = 0

export function toolOwnershipGeneration(): number {
  return generation
}

const keyOf = (accountId: string, tool: CreationTool, audience: 'adult' | 'kids' = 'kids') =>
  `${accountId}:${audience}:${tool}`

export function toolOwnershipCached(
  accountId: string,
  tool: CreationTool,
  now: number,
  audience: 'adult' | 'kids' = 'kids',
): boolean {
  const until = cache.get(keyOf(accountId, tool, audience))
  return until !== undefined && until > now
}

export function rememberToolOwned(
  accountId: string,
  tool: CreationTool,
  now: number,
  /** A geração lida ANTES da consulta: mudou no meio, a resposta é velha e não é guardada. */
  since: number,
  audience: 'adult' | 'kids' = 'kids',
): void {
  if (since !== generation) return
  cache.set(keyOf(accountId, tool, audience), now + TOOL_OWNERSHIP_TTL_MS)
  // Sem crescer sem fim (contas que nunca voltam): poda ocasional das vencidas.
  if (cache.size > 5_000) {
    for (const [key, expiry] of cache) if (expiry <= now) cache.delete(key)
  }
}

const ownershipListeners = new Set<(accountIds: readonly string[]) => void>()

/**
 * A posse da conta MUDOU (matrícula revogada/expirada pelo webhook ou pelo admin): esquece o
 * que estava guardado para ela — a próxima reserva volta a consultar. Idempotente; contas sem
 * entrada não fazem nada. (A conta em exclusão não passa por aqui: a cerca durável da exclusão
 * é quem a barra.)
 */
export function invalidateToolOwnership(accountIds: string | readonly string[]): void {
  const contas = typeof accountIds === 'string' ? [accountIds] : accountIds
  generation += 1
  // TODAS as ferramentas, derivadas da lista: uma listada à mão ficava de fora e a
  // matrícula revogada seguia reservando por até 60 s nela.
  for (const accountId of contas) {
    for (const tool of CREATION_TOOLS) {
      cache.delete(keyOf(accountId, tool, 'kids'))
      cache.delete(keyOf(accountId, tool, 'adult'))
    }
  }
  for (const listener of ownershipListeners) listener(contas)
}

/**
 * Outros caches de acesso às criações ouvem a mesma invalidação. Hoje é o do rascunho da fase
 * (`LessonDraftAccessService`), que confere a matrícula do CURSO: sem isto ele seguia aceitando a
 * reserva por até 60 s depois da revogação. Devolve o desligar.
 */
export function onToolOwnershipInvalidated(
  listener: (accountIds: readonly string[]) => void,
): () => void {
  ownershipListeners.add(listener)
  return () => {
    ownershipListeners.delete(listener)
  }
}

export function resetToolOwnershipCacheForTests(): void {
  cache.clear()
  generation = 0
  // Cada app de teste registra o próprio ouvinte: os dos apps anteriores saem com o cache.
  ownershipListeners.clear()
}
