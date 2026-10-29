import { describe, expect, test } from 'bun:test'
import {
  type CollectionMemoryRule,
  evaluatesChangedGamePosition,
  evaluatesCollectionMemory,
} from './collection-memory'

const rule: CollectionMemoryRule = {
  type: 'collectionMemory',
  dimension: '2d',
  actor: 'p',
  item: 'item',
  destination: 'destino',
}
function fixture(name = 'lembrete', invert = false) {
  const start = { type: 'var', name, value: { type: 'bool', value: false } }
  const reaction = { type: 'g2d:setImage', spriteVar: 'destino', image: 'aberta' }
  const decision: { type: string; cond: unknown; then: unknown[]; else: unknown[] } = {
    type: 'if',
    cond: invert
      ? {
          type: 'binop',
          op: '===',
          left: { type: 'var', name },
          right: { type: 'bool', value: false },
        }
      : { type: 'var', name },
    // biome-ignore lint/suspicious/noThenProperty: campo da árvore de instruções SZIR.
    then: invert ? [] : [reaction],
    else: invert ? [reaction] : [],
  }
  const collection = {
    type: 'g2d:onOverlap',
    aVar: 'p',
    bVar: 'item',
    body: [{ type: 'assign', name, value: { type: 'bool', value: true } }],
  }
  return {
    start,
    collection,
    decision,
    project: {
      ir: {
        behavior: {
          start: [start],
          events: [
            collection,
            { type: 'g2d:onOverlap', aVar: 'p', bVar: 'destino', body: [decision] },
          ],
        },
      },
    },
  }
}
describe('memória ligada à coleta e à decisão', () => {
  test('aceita nome alternativo e condição invertida com os ramos trocados', () => {
    expect(evaluatesCollectionMemory(rule, fixture('pegou').project)).toBe(true)
    expect(evaluatesCollectionMemory(rule, fixture('pegou', true).project)).toBe(true)
    const negated = fixture('pegou', true)
    negated.decision.cond = { type: 'logicalNot', value: { type: 'var', name: 'pegou' } }
    expect(evaluatesCollectionMemory(rule, negated.project)).toBe(true)
  })
  test('recusa outra informação, início verdadeiro e escrita fora da coleta', () => {
    const a = fixture()
    a.decision.cond = { type: 'var', name: 'outra' }
    expect(evaluatesCollectionMemory(rule, a.project)).toBe(false)
    const b = fixture()
    b.start.value.value = true
    expect(evaluatesCollectionMemory(rule, b.project)).toBe(false)
    const c = fixture()
    c.collection.bVar = 'outro'
    expect(evaluatesCollectionMemory(rule, c.project)).toBe(false)
  })
  test('condição constante ou reação nos dois ramos não comprova decisão', () => {
    const a = fixture()
    a.decision.cond = { type: 'bool', value: true }
    expect(evaluatesCollectionMemory(rule, a.project)).toBe(false)
    const b = fixture()
    b.decision.else = b.decision.then
    expect(evaluatesCollectionMemory(rule, b.project)).toBe(false)
  })
  test('posição exige mudança finita em pelo menos um eixo do chão', () => {
    const r = {
      type: 'changedGamePosition' as const,
      dimension: '3d' as const,
      object: 'item',
      initial: [-4, -2] as [number, number],
    }
    const p = (x: number, y: number, z: number) => ({
      ir: {
        behavior: {
          start: [
            {
              type: 'g3d:setPosition',
              objVar: 'item',
              x: { type: 'num', value: x },
              y: { type: 'num', value: y },
              z: { type: 'num', value: z },
            },
          ],
        },
      },
    })
    expect(evaluatesChangedGamePosition(r, p(-4, 6, -2))).toBe(false)
    expect(evaluatesChangedGamePosition(r, p(-4, 1, 0))).toBe(true)
    expect(evaluatesChangedGamePosition(r, p(Number.NaN, 1, 0))).toBe(false)
    const overwritten = p(-3, 1, 0)
    overwritten.ir.behavior.start.push(...p(-4, 1, -2).ir.behavior.start)
    expect(evaluatesChangedGamePosition(r, overwritten)).toBe(false)
  })
})
