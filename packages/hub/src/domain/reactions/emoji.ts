import type { Audience } from '../space/space'

/**
 * Lista curada de emojis liberados para CRIANÇAS (vitrine kids). Reagir é livre
 * (sem moderação), mas a expressão é limitada a um conjunto seguro. Adultos podem
 * reagir com qualquer emoji curto (a validação de "ser emoji de verdade" fica no
 * front; aqui limitamos só o tamanho para não virar texto).
 */
export const KIDS_EMOJI_ALLOWLIST = [
  '👍',
  '❤️',
  '😂',
  '😮',
  '😢',
  '👏',
  '🎉',
  '🔥',
  '⭐',
  '🤩',
  '🙌',
  '✅',
] as const

const MAX_EMOJI_LEN = 16

export function isAllowedEmoji(emoji: string, audience: Audience): boolean {
  const e = emoji.trim()
  if (e.length === 0 || e.length > MAX_EMOJI_LEN) return false
  if (audience === 'kids') return (KIDS_EMOJI_ALLOWLIST as readonly string[]).includes(e)
  return true
}
