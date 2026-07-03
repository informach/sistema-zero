import { createHash } from 'node:crypto'

// ── Gamificação do Pensa: source_id determinístico das ETAPAS ───────────────
// O ledger `xp_events` deduplica por UNIQUE (user_id, source_type, source_id) e
// `source_id` é uuid — a etapa concluída precisa de um uuid ESTÁVEL derivado de
// (cycleId, stage) p/ o replay do award nunca duplicar e z/e/r não colidirem
// entre si nem entre ciclos. (O ciclo completo usa o próprio cycleId.)

/** Etapas que geram `pensa_stage_complete` (o→done gera `pensa_cycle_complete`). */
export type PensaXpStage = 'z' | 'e' | 'r'

/**
 * Namespace FIXO (uuid sorteado uma vez, nunca mudar) do uuid v5-like das
 * etapas — separa este espaço de ids de qualquer outro uuid do sistema.
 */
export const PENSA_STAGE_SOURCE_NAMESPACE = '8f2b5c1e-9d47-4a63-b0a9-6e5d21c7f384'

/**
 * uuid v5-like DETERMINÍSTICO de (cycleId, stage): sha1(namespace + nome) com
 * os nibbles de version (5) e variant (RFC 4122) forçados. Puro e estável —
 * mesma entrada, mesmo uuid; entradas distintas, uuids distintos.
 */
export function pensaStageSourceId(cycleId: string, stage: PensaXpStage): string {
  const hex = createHash('sha1')
    .update(PENSA_STAGE_SOURCE_NAMESPACE)
    .update(`${cycleId}:${stage}`)
    .digest('hex')
  // Layout 8-4-4-4-12: version = 1º nibble do 3º grupo; variant = 1º do 4º.
  const variantNibble = ((Number.parseInt(hex.charAt(16), 16) & 0x3) | 0x8).toString(16)
  return (
    `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-` +
    `${variantNibble}${hex.slice(17, 20)}-${hex.slice(20, 32)}`
  )
}
