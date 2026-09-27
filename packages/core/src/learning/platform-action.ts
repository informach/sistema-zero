import type { Palette } from '../palette/palette'

/**
 * ⚠️⚠️ Id de ação NÃO muda: ele viaja dentro do conteúdo de aula PUBLICADO
 * (`lesson_blocks.content`). `change-theme` continua `change-theme` ainda que o gesto que ele
 * pede tenha deixado de ser "alternar tema" e passado a ser "escolher a sua cor" — o que muda é
 * o rótulo e o critério, nunca o id.
 */
export const PLATFORM_ACTIONS = ['customize-avatar', 'customize-room', 'change-theme'] as const
export type PlatformAction = (typeof PLATFORM_ACTIONS)[number]

export const PLATFORM_ACTION_LABELS: Record<PlatformAction, string> = {
  'customize-avatar': 'Personalizar o avatar',
  'customize-room': 'Personalizar o quarto',
  'change-theme': 'Escolher a minha cor',
}
export function isPlatformAction(value: unknown): value is PlatformAction {
  return PLATFORM_ACTIONS.some((action) => action === value)
}
export interface PlatformActionResult {
  action: PlatformAction
  passed: boolean
  feedback: string
  /** Canonical saved slots, so the preview never substitutes a stale photo. */
  avatarSlots?: Record<string, { asset: string; color?: string }>
  /** A cor escolhida, quando houve escolha. Ausente = a pessoa ainda não escolheu nenhuma. */
  palette?: Palette
}
