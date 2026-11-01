/**
 * Temas de "unidade" (cores SÓ da marca): seções da trilha e cards alternam
 * azul → laranja → rosa → verde → gradiente (a paleta kids nova, a mesma do
 * Funil Kids). As classes setam --unit/--unit-fg/--unit-bg no globals.css; o
 * mapa é LITERAL de propósito (nunca montar classe por template string —
 * scanner do Tailwind/legibilidade). Os nomes `cyan`/`lime` são históricos do
 * contrato de classes: hoje apontam para azul/laranja.
 */
export type UnitTheme = 'cyan' | 'lime' | 'rosa' | 'verde' | 'grad'

export const UNIT_THEMES: readonly UnitTheme[] = ['cyan', 'lime', 'rosa', 'verde', 'grad'] as const

export const UNIT_THEME_CLASS: Record<UnitTheme, string> = {
  cyan: 'kids-unit-cyan',
  lime: 'kids-unit-lime',
  rosa: 'kids-unit-rosa',
  verde: 'kids-unit-verde',
  grad: 'kids-unit-grad',
}

export function unitThemeAt(index: number): UnitTheme {
  return UNIT_THEMES[index % UNIT_THEMES.length] as UnitTheme
}
