import type { Palette } from '../palette/palette'

/**
 * ⚠️⚠️ Id de ação NÃO muda: ele viaja dentro do conteúdo de aula PUBLICADO
 * (`lesson_blocks.content`). `change-theme` continua `change-theme` ainda que o gesto que ele
 * pede tenha deixado de ser "alternar tema" e passado a ser "escolher a sua cor" — o que muda é
 * o rótulo e o critério, nunca o id.
 */
export const PLATFORM_ACTIONS = ['customize-avatar', 'customize-room', 'change-theme'] as const
export type PlatformAction = (typeof PLATFORM_ACTIONS)[number]

/**
 * O interruptor de dois estados do tema kids. ⚠️ LEGADO: sai na etapa de limpeza, junto com a
 * rota `/members/preferences/kids`. O vocabulário vivo é `PALETTES`, em `@sistemazero/core/palette`.
 */
export const KIDS_THEMES = ['padrao', 'pink'] as const
export type KidsTheme = (typeof KIDS_THEMES)[number]

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
