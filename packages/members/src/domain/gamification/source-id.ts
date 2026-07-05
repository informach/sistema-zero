import { createHash } from 'node:crypto'

/**
 * UUID v5-like DETERMINÍSTICO (namespace + name → hash sha1 formatado como uuid).
 * `xp_events.source_id` é coluna `uuid`, então um id NATURAL não-uuid (slug de item
 * do quarto/avatar, ex.: `hair-01`) precisa virar um uuid estável para entrar no
 * ledger — e estável garante a idempotência (comprar o MESMO item 2× = mesmo
 * sourceId = 1 marco). Mesmo molde do `challengeSourceId`/`pensaStageSourceId`.
 */
export function deterministicSourceId(namespace: string, name: string): string {
  const hex = createHash('sha1').update(namespace).update(name).digest('hex')
  const variantNibble = ((Number.parseInt(hex.charAt(16), 16) & 0x3) | 0x8).toString(16)
  return (
    `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-` +
    `${variantNibble}${hex.slice(17, 20)}-${hex.slice(20, 32)}`
  )
}

// Namespaces FIXOS (sorteados uma vez, NUNCA mudar — mudar veria itens antigos como
// novos e refarmaria a missão). Um por escopo de item cosmético.
const ROOM_ITEM_NAMESPACE = '7b1f9a2c-6d84-4e13-b0a5-2f8c9e14d6b3'
const AVATAR_PART_NAMESPACE = 'c4e28d17-3a95-4f60-8b12-9d7e6a03f5c8'

/** sourceId do marco `room_item_buy` (1 por item do quarto). */
export function roomItemSourceId(itemId: string): string {
  return deterministicSourceId(ROOM_ITEM_NAMESPACE, itemId)
}

/** sourceId do marco `avatar_part_buy` (1 por peça do avatar). */
export function avatarPartSourceId(partId: string): string {
  return deterministicSourceId(AVATAR_PART_NAMESPACE, partId)
}
