import type { OfferAggregate } from '../../domain/offer/offer.aggregate'
import type { ProductRepository } from '../../domain/ports/product-repository.port'
import {
  type EntitlementNode,
  type ResolvedEntitlement,
  resolveEntitlements,
} from '../../domain/services/resolve-entitlements'

const MAX_CLOSURE_ROUNDS = 8

/**
 * Resolve os entitlements de uma oferta: carrega o FECHAMENTO do grafo de produtos
 * (produto principal + itens + componentes, transitivamente) e roda o resolvedor
 * de domínio (puro). Limita rodadas de carga (guarda anti-loop).
 */
export class ResolveOfferEntitlementsService {
  constructor(private readonly products: ProductRepository) {}

  async execute(offer: OfferAggregate): Promise<ResolvedEntitlement[]> {
    const closure = await this.loadClosure([
      offer.productId,
      ...offer.items.map((item) => item.productId),
    ])
    return resolveEntitlements({
      offerProductId: offer.productId,
      offerItemProductIds: offer.items.map((item) => item.productId),
      lookup: (id) => closure.get(id),
    })
  }

  /** Carrega iterativamente os nós alcançáveis (produto + componentes). */
  private async loadClosure(rootIds: string[]): Promise<Map<string, EntitlementNode>> {
    const closure = new Map<string, EntitlementNode>()
    let frontier = dedupe(rootIds)

    for (let round = 0; round < MAX_CLOSURE_ROUNDS && frontier.length > 0; round++) {
      const pending = frontier.filter((id) => !closure.has(id))
      if (pending.length === 0) break
      const nodes = await this.products.findNodesByIds(pending)
      const next: string[] = []
      for (const node of nodes) {
        closure.set(node.productId, node)
        for (const c of node.components) {
          if (!closure.has(c.productId)) next.push(c.productId)
        }
      }
      frontier = dedupe(next)
    }

    return closure
  }
}

function dedupe(ids: string[]): string[] {
  return [...new Set(ids)]
}
