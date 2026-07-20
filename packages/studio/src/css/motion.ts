export const CSS_TRANSITION_PROPERTY_OPTIONS = [
  ['movimento e tamanho visual', 'transform'],
  ['transparência', 'opacity'],
  ['cor de fundo', 'background-color'],
  ['cor do texto', 'color'],
] as const

export type CSSTransitionProperty = (typeof CSS_TRANSITION_PROPERTY_OPTIONS)[number][1]

export function normalizeCSSTransitionProperty(value: string): CSSTransitionProperty {
  switch (value) {
    case 'opacity':
    case 'background-color':
    case 'color':
      return value
    default:
      return 'transform'
  }
}
