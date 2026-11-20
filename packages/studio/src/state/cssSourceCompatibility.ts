import { cssDeclarationEntries, hasDuplicateCSSDeclarations } from '#ir'
import { parseCSS } from '../parsers/css'

/** Conservative comparison for ordinary rules; unknown forms are not optimized. */
export function cssSourceCompatible(previous: string, generated: string): boolean {
  if (previous === generated) return true
  const before = parseCSS(previous),
    after = parseCSS(generated)
  if (!before.length || before.length !== after.length) return false
  return before.every((rule, index) => {
    const next = after[index]
    if (!next || 'type' in rule || 'type' in next || rule.selector !== next.selector) return false
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
    // Only commute explicitly disjoint property families. Unknown properties,
    // aliases, logical edges, `all`, and custom properties retain their order.
    // This deliberately does not attempt to implement the browser's cascade.
    const family = (property: string): string | undefined => {
      if (/^(margin|padding)(-(top|right|bottom|left))?$/.test(property))
        return property.split('-')[0]
      if (
        /^background(-color|-image|-position|-size|-repeat|-origin|-clip|-attachment)?$/.test(
          property,
        )
      )
        return 'background'
      if (property === 'color' || property === 'opacity') return property
      return undefined
    }
    const positions = new Map(b.map((item, i) => [item.property, i]))
    for (let i = 0; i < a.length; i++) {
      for (let j = i + 1; j < a.length; j++) {
        if (positions.get(a[i]!.property)! < positions.get(a[j]!.property)!) continue
        const left = family(a[i]!.property),
          right = family(a[j]!.property)
        if (!left || !right || left === right) return false
      }
    }
    return true
  })
}
