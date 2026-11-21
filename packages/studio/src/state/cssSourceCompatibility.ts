import { cssDeclarationEntries, hasDuplicateCSSDeclarations } from '#ir'
import { parseCSS } from '../parsers/css'

/**
 * Raízes que se sobrepõem por atalho, apelido ou lado lógico/físico (`place-items` cobre
 * `align-items` e `justify-items`; `inline-size` é a `width` horizontal; `font` reescreve
 * `line-height`; `word-wrap` é apelido de `overflow-wrap`; `white-space` cobre `text-wrap`...).
 */
const RELATED_ROOTS: readonly (readonly string[])[] = [
  ['width', 'height', 'inline', 'block'],
  ['gap', 'row', 'column', 'columns'],
  ['font', 'line'],
  ['overflow', 'word'],
  ['white', 'text'],
  ['page', 'break'],
  ['box', 'flex'],
]

function overlapRoot(property: string): string {
  // Propriedade personalizada só conflita com ela mesma (o nome diferencia maiúsculas).
  if (property.startsWith('--')) return property
  const name = property.toLowerCase().replace(/^-(webkit|moz|ms|o)-/, '')
  // `place-items` = `align-items` + `justify-items` (idem content e self): o par conta junto,
  // mas `align-items` e `justify-content` são independentes.
  const alignment = /^(?:place|align|justify)-(.+)$/.exec(name)
  if (alignment) return `place-${alignment[1]}`
  // Os apelidos antigos `grid-gap`, `grid-row-gap` e `grid-column-gap` são o `gap`.
  if (/^grid-(?:row-|column-)?gap$/.test(name)) return 'gap'
  const first = name.split('-')[0] ?? name
  return RELATED_ROOTS.find((roots) => roots.includes(first))?.[0] ?? first
}

/**
 * Duas declarações só dependem da ordem quando mexem na MESMA propriedade, direto ou por um
 * atalho/apelido. A mesma raiz (`margin` e `margin-left`, `border` e `border-left-color`) ou um
 * grupo de `RELATED_ROOTS` conta como sobreposição, de forma conservadora; `all` sobrepõe tudo.
 */
export function cssPropertiesOverlap(a: string, b: string): boolean {
  const left = overlapRoot(a),
    right = overlapRoot(b)
  if (left === 'all' || right === 'all' || left === right) return true
  // `inset` (e `inset-*`, os lados lógicos) cobre os quatro lados; dois lados são independentes.
  if ((left === 'inset' && SIDES.has(right)) || (right === 'inset' && SIDES.has(left))) return true
  // O atalho `grid` sozinho também zerava o antigo `grid-gap`.
  const shorthand = (name: string) => name.toLowerCase().replace(/^-(webkit|moz|ms|o)-/, '')
  return (shorthand(a) === 'grid' && right === 'gap') || (shorthand(b) === 'grid' && left === 'gap')
}

const SIDES = new Set(['top', 'right', 'bottom', 'left'])

/** Conservative comparison for ordinary rules; unknown forms are not optimized. */
export function cssSourceCompatible(previous: string, generated: string): boolean {
  if (previous === generated) return true
  const before = parseCSS(previous),
    after = parseCSS(generated)
  if (!before.length || before.length !== after.length) return false
  return before.every((rule, index) => {
    const next = after[index]
    if (!next) return false
    // Regra especial (`@keyframes`, `@media`...): só vale se for idêntica nos dois lados.
    if ('type' in rule || 'type' in next) return JSON.stringify(rule) === JSON.stringify(next)
    if (rule.selector !== next.selector) return false
    const a = cssDeclarationEntries(rule.declarations),
      b = cssDeclarationEntries(next.declarations)
    if (a.length !== b.length || a.length > 128) return false
    if (
      hasDuplicateCSSDeclarations(rule.declarations) ||
      hasDuplicateCSSDeclarations(next.declarations)
    )
      return a.every((item, i) => item.property === b[i]?.property && item.value === b[i]?.value)
    const values = new Map(a.map((item) => [item.property, item.value]))
    if (!b.every((item) => values.has(item.property) && values.get(item.property) === item.value))
      return false
    const positions = new Map(b.map((item, i) => [item.property, i]))
    for (let i = 0; i < a.length; i++) {
      for (let j = i + 1; j < a.length; j++) {
        if (positions.get(a[i]!.property)! < positions.get(a[j]!.property)!) continue
        if (cssPropertiesOverlap(a[i]!.property, a[j]!.property)) return false
      }
    }
    return true
  })
}
