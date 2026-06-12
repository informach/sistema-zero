/**
 * Temas de "unidade" (cores SÓ da marca): seções da trilha e cards alternam
 * cyan → lime → gradiente. As classes setam --unit/--unit-fg/--unit-bg no
 * globals.css; o mapa é LITERAL de propósito (nunca montar classe por
 * template string — scanner do Tailwind/legibilidade).
 */
export type UnitTheme = 'cyan' | 'lime' | 'grad'

export const UNIT_THEMES: readonly UnitTheme[] = ['cyan', 'lime', 'grad'] as const

export const UNIT_THEME_CLASS: Record<UnitTheme, string> = {
  cyan: 'kids-unit-cyan',
  lime: 'kids-unit-lime',
  grad: 'kids-unit-grad',
}

export function unitThemeAt(index: number): UnitTheme {
  return UNIT_THEMES[index % UNIT_THEMES.length] as UnitTheme
}
