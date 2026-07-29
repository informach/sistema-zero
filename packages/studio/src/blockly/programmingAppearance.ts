import { ensureWhiteTextContrast } from './colorShades'

/**
 * Contrato visual da categoria Programação.
 *
 * O renderer Zelos usa texto branco nos blocos. Mantemos a identidade
 * laranja/âmbar da categoria, mas normalizamos cada tom para contraste AA com
 * uma pequena margem para diferenças de renderização entre navegadores.
 */
const MINIMUM_WHITE_TEXT_CONTRAST = 4.8

const DESIRED_PROGRAMMING_COLORS = {
  js: '#f97316',
  math: '#ff9a3d',
  values: '#f0a52a',
  dom: '#e08a14',
  events: '#ffc266',
  objects: '#ff8757',
  functions: '#fb6e2e',
  classes: '#e8820c',
} as const

export const PROGRAMMING_CATEGORY_COLORS = Object.fromEntries(
  Object.entries(DESIRED_PROGRAMMING_COLORS).map(([key, colour]) => [
    key,
    ensureWhiteTextContrast(colour, MINIMUM_WHITE_TEXT_CONTRAST),
  ]),
) as { readonly [Key in keyof typeof DESIRED_PROGRAMMING_COLORS]: string }
