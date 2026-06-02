import type { FulfillmentSpec } from '../product/fulfillment'
import type { ProductKind } from '../product/product.kind'
import { ValidationError } from '../shared/errors'

/**
 * Nó do grafo de produtos para a resolução de entitlements. Um produto com
 * `components` vazio é uma FOLHA (entregável); com componentes é um combo
 * (container — expande, mas não é entregue como item próprio).
 */
export interface EntitlementNode {
  productId: string
  sku: string
  name: string
  kind: ProductKind
  fulfillment: FulfillmentSpec | null
  components: { productId: string; sortOrder: number; isPrimary: boolean }[]
}

/** Item entregável resolvido — "exatamente o que a oferta libera". */
export interface ResolvedEntitlement {
  productId: string
  sku: string
  name: string
  kind: ProductKind
  fulfillment: FulfillmentSpec | null
  /** O "principal" (destacado na página de vendas). Exatamente um, quando há. */
  isPrimary: boolean
}

export interface ResolveEntitlementsInput {
  /** Produto principal da oferta. */
  offerProductId: string
  /** Produtos adicionais concedidos pela oferta (variação por oferta). */
  offerItemProductIds: string[]
  /** Carregador do grafo (a aplicação pré-carrega o fechamento). */
  lookup: (productId: string) => EntitlementNode | undefined
  /** Profundidade máxima de aninhamento de combos (guarda anti-loop). */
  maxDepth?: number
}

const DEFAULT_MAX_DEPTH = 8

/**
 * Resolve o conjunto achatado e deduplicado de produtos entregáveis de uma oferta:
 * expande o produto principal (e seus combos) + os itens adicionais. Combos são
 * containers (expandem para as folhas, não são entregues). Marca o "principal".
 *
 * Puro e determinístico — testável sem banco. Guarda de ciclo + profundidade máxima.
 */
export function resolveEntitlements(input: ResolveEntitlementsInput): ResolvedEntitlement[] {
  const maxDepth = input.maxDepth ?? DEFAULT_MAX_DEPTH
  const items = new Map<string, ResolvedEntitlement>()

  collect(input.offerProductId, input.lookup, items, maxDepth)
  for (const id of input.offerItemProductIds) collect(id, input.lookup, items, maxDepth)

  const principalId = findPrincipal(input.offerProductId, input.lookup, maxDepth)
  if (principalId) {
    const principal = items.get(principalId)
    if (principal) principal.isPrimary = true
  }

  return [...items.values()]
}

/** Coleta as folhas entregáveis alcançáveis a partir de `rootId`. */
function collect(
  rootId: string,
  lookup: (id: string) => EntitlementNode | undefined,
  items: Map<string, ResolvedEntitlement>,
  maxDepth: number,
): void {
  const visit = (id: string, depth: number, path: Set<string>): void => {
    if (depth > maxDepth) {
      throw new ValidationError('Profundidade máxima de combo excedida (possível ciclo)')
    }
    if (path.has(id)) return // guarda de ciclo
    const node = lookup(id)
    if (!node) return // produto referenciado ausente — ignora (integridade tratada na app)

    if (node.components.length === 0) {
      if (!items.has(id)) {
        items.set(id, {
          productId: node.productId,
          sku: node.sku,
          name: node.name,
          kind: node.kind,
          fulfillment: node.fulfillment,
          isPrimary: false,
        })
      }
      return
    }

    const nextPath = new Set(path)
    nextPath.add(id)
    const sorted = [...node.components].sort((a, b) => a.sortOrder - b.sortOrder)
    for (const c of sorted) visit(c.productId, depth + 1, nextPath)
  }

  visit(rootId, 0, new Set())
}

/**
 * Determina a folha "principal" a partir do produto da oferta: desce escolhendo o
 * componente `isPrimary` (ou o primeiro por ordem) até chegar numa folha.
 */
function findPrincipal(
  offerProductId: string,
  lookup: (id: string) => EntitlementNode | undefined,
  maxDepth: number,
): string | undefined {
  let id = offerProductId
  const path = new Set<string>()
  for (let depth = 0; depth <= maxDepth; depth++) {
    const node = lookup(id)
    if (!node) return undefined
    if (node.components.length === 0) return id // folha → principal
    if (path.has(id)) return undefined // ciclo
    path.add(id)
    const sorted = [...node.components].sort((a, b) => a.sortOrder - b.sortOrder)
    const primary = sorted.find((c) => c.isPrimary) ?? sorted[0]
    if (!primary) return undefined
    id = primary.productId
  }
  return undefined
}
