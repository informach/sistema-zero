import { describe, expect, it } from 'bun:test'
import {
  type EntitlementNode,
  resolveEntitlements,
} from '../../src/domain/services/resolve-entitlements'

// Helpers para montar o grafo de nós.
function leaf(id: string): EntitlementNode {
  return {
    productId: id,
    sku: id,
    name: id,
    kind: 'ebook',
    status: 'active',
    fulfillment: null,
    components: [],
  }
}
function bundle(
  id: string,
  components: { productId: string; sortOrder: number; isPrimary: boolean }[],
): EntitlementNode {
  return {
    productId: id,
    sku: id,
    name: id,
    kind: 'bundle',
    status: 'active',
    fulfillment: null,
    components,
  }
}
function lookupFrom(nodes: EntitlementNode[]) {
  const map = new Map(nodes.map((n) => [n.productId, n]))
  return (id: string) => map.get(id)
}

describe('resolveEntitlements', () => {
  it('produto único: entrega o próprio produto e marca como principal', () => {
    const lookup = lookupFrom([leaf('p1')])
    const result = resolveEntitlements({ offerProductId: 'p1', offerItemProductIds: [], lookup })
    expect(result).toHaveLength(1)
    expect(result[0]?.productId).toBe('p1')
    expect(result[0]?.isPrimary).toBe(true)
  })

  it('combo simples: expande para as folhas e marca o componente is_primary como principal', () => {
    const nodes = [
      bundle('combo', [
        { productId: 'main', sortOrder: 1, isPrimary: true },
        { productId: 'x', sortOrder: 2, isPrimary: false },
        { productId: 'y', sortOrder: 3, isPrimary: false },
      ]),
      leaf('main'),
      leaf('x'),
      leaf('y'),
    ]
    const result = resolveEntitlements({
      offerProductId: 'combo',
      offerItemProductIds: [],
      lookup: lookupFrom(nodes),
    })
    const ids = result.map((r) => r.productId).sort()
    expect(ids).toEqual(['main', 'x', 'y'])
    // O combo (container) NÃO é entregue, só as folhas.
    expect(result.find((r) => r.productId === 'combo')).toBeUndefined()
    const primary = result.filter((r) => r.isPrimary)
    expect(primary).toHaveLength(1)
    expect(primary[0]?.productId).toBe('main')
  })

  it('combo aninhado: expande recursivamente e acha o principal descendo pelo is_primary', () => {
    const nodes = [
      bundle('combo', [
        { productId: 'sub', sortOrder: 1, isPrimary: true },
        { productId: 'z', sortOrder: 2, isPrimary: false },
      ]),
      bundle('sub', [
        { productId: 'deep', sortOrder: 1, isPrimary: true },
        { productId: 'w', sortOrder: 2, isPrimary: false },
      ]),
      leaf('deep'),
      leaf('w'),
      leaf('z'),
    ]
    const result = resolveEntitlements({
      offerProductId: 'combo',
      offerItemProductIds: [],
      lookup: lookupFrom(nodes),
    })
    const ids = result.map((r) => r.productId).sort()
    expect(ids).toEqual(['deep', 'w', 'z'])
    expect(result.find((r) => r.isPrimary)?.productId).toBe('deep')
  })

  it('itens de oferta: concede produtos extras (variação por oferta), sem marcar como principal', () => {
    const nodes = [leaf('main'), leaf('extra')]
    const result = resolveEntitlements({
      offerProductId: 'main',
      offerItemProductIds: ['extra'],
      lookup: lookupFrom(nodes),
    })
    const ids = result.map((r) => r.productId).sort()
    expect(ids).toEqual(['extra', 'main'])
    expect(result.find((r) => r.productId === 'main')?.isPrimary).toBe(true)
    expect(result.find((r) => r.productId === 'extra')?.isPrimary).toBe(false)
  })

  it('item de oferta que é combo: expande o item também', () => {
    const nodes = [
      leaf('main'),
      bundle('extraCombo', [{ productId: 'a', sortOrder: 1, isPrimary: false }]),
      leaf('a'),
    ]
    const result = resolveEntitlements({
      offerProductId: 'main',
      offerItemProductIds: ['extraCombo'],
      lookup: lookupFrom(nodes),
    })
    const ids = result.map((r) => r.productId).sort()
    expect(ids).toEqual(['a', 'main'])
  })

  it('deduplica produtos alcançados por mais de um caminho', () => {
    const nodes = [
      bundle('combo', [
        { productId: 'shared', sortOrder: 1, isPrimary: true },
        { productId: 'shared', sortOrder: 2, isPrimary: false },
      ]),
      leaf('shared'),
    ]
    // 'shared' aparece via componente duplicado (o agregado proíbe, mas o resolvedor é robusto).
    const result = resolveEntitlements({
      offerProductId: 'combo',
      offerItemProductIds: ['shared'],
      lookup: lookupFrom(nodes),
    })
    expect(result.filter((r) => r.productId === 'shared')).toHaveLength(1)
  })

  it('guarda de ciclo: combos que se referenciam não causam loop infinito', () => {
    const nodes = [
      bundle('a', [{ productId: 'b', sortOrder: 1, isPrimary: true }]),
      bundle('b', [{ productId: 'a', sortOrder: 1, isPrimary: true }]),
    ]
    const result = resolveEntitlements({
      offerProductId: 'a',
      offerItemProductIds: [],
      lookup: lookupFrom(nodes),
      maxDepth: 16,
    })
    // Sem folhas reais → conjunto vazio, mas SEM travar.
    expect(result).toHaveLength(0)
  })

  it('ignora produtos referenciados ausentes (integridade tratada na aplicação)', () => {
    const nodes = [
      bundle('combo', [
        { productId: 'present', sortOrder: 1, isPrimary: true },
        { productId: 'missing', sortOrder: 2, isPrimary: false },
      ]),
      leaf('present'),
    ]
    const result = resolveEntitlements({
      offerProductId: 'combo',
      offerItemProductIds: [],
      lookup: lookupFrom(nodes),
    })
    expect(result.map((r) => r.productId)).toEqual(['present'])
  })
})
