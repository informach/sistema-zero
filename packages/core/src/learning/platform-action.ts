export const PLATFORM_ACTIONS = ['customize-avatar', 'customize-room', 'change-theme'] as const
export type PlatformAction = (typeof PLATFORM_ACTIONS)[number]
export const KIDS_THEMES = ['padrao', 'pink'] as const
export type KidsTheme = (typeof KIDS_THEMES)[number]
export const PLATFORM_ACTION_LABELS: Record<PlatformAction, string> = {
  'customize-avatar': 'Personalizar o avatar',
  'customize-room': 'Personalizar o quarto',
  'change-theme': 'Mudar o tema do Kids',
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
  theme?: KidsTheme
}
