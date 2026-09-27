import type { MtlMaterial, MtlProperty } from './mtlTypes'
import { ObjInputError, requireObj } from './objInput'

export type MtlRepeatedPropertyPolicy = 'reject' | 'first' | 'last'
export interface MtlPropertyChoice {
  slot: string
  first: number
  last: number
  kept: number
  ignored: number
}
/** Aliases share a slot; reflection statements remain separate until their environment roles are interpreted. */
function slot(property: MtlProperty, index: number): string {
  switch (property.keyword) {
    case 'map_Bump':
    case 'map_bump':
      return 'bump'
    case 'map_disp':
    case 'map_Disp':
      return 'disp'
    case 'refl':
      return `refl:${index}`
    default:
      return property.keyword
  }
}
/** Source indices only: retained properties keep authored order; no values, buffers or source objects escape. */
export function selectMtlProperties(
  material: MtlMaterial,
  policy: MtlRepeatedPropertyPolicy = 'reject',
) {
  requireObj(
    policy === 'reject' || policy === 'first' || policy === 'last',
    'options.repeatedProperties',
    'Escolha como tratar propriedades repetidas.',
  )
  const slots = new Map<string, { first: number; last: number; count: number }>()
  material.properties.forEach((property, i) => {
    const key = slot(property, i),
      existing = slots.get(key)
    if (existing) {
      existing.last = i
      existing.count++
    } else slots.set(key, { first: i, last: i, count: 1 })
  })
  const indices: number[] = [],
    choices: MtlPropertyChoice[] = []
  for (const [slot, entry] of slots) {
    if (entry.count > 1 && policy === 'reject')
      throw new ObjInputError(
        'unsupported',
        `lines[${material.properties[entry.last]!.line}]`,
        `A propriedade ${slot} foi declarada mais de uma vez. Escolha qual valor usar.`,
      )
    const kept = policy === 'last' ? entry.last : entry.first
    indices.push(kept)
    if (entry.count > 1)
      choices.push({ slot, first: entry.first, last: entry.last, kept, ignored: entry.count - 1 })
  }
  indices.sort((a, b) => a - b)
  return { indices, choices }
}

export type MtlEffectiveProperties = ReturnType<typeof selectMtlProperties>
