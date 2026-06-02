import type { ProductAggregate } from '../product/product.aggregate'
import type { EntitlementNode } from '../services/resolve-entitlements'
import type { ListQuery, Page } from './list'

/**
 * Porta de persistência de produtos. Consultas retornam `null` quando não existe.
 * `findNodesByIds` serve à resolução de entitlements (grafo leve: produto + componentes).
 */
export interface ProductRepository {
  findById(id: string): Promise<ProductAggregate | null>
  findBySlug(slug: string): Promise<ProductAggregate | null>
  findBySku(sku: string): Promise<ProductAggregate | null>
  /** Lista produtos paginados (admin), filtro opcional por status/busca. */
  list(query: ListQuery): Promise<Page<ProductAggregate>>
  /** Carrega os nós (produto + componentes) dos ids dados — para a expansão de combos. */
  findNodesByIds(ids: string[]): Promise<EntitlementNode[]>
  /**
   * Insere um produto (+ componentes). Em violação de unicidade (sku/slug) lança
   * `DuplicateProductError`.
   */
  create(product: ProductAggregate): Promise<void>
  /**
   * Atualiza um produto (+ componentes) com concorrência otimista (WHERE version).
   * Em conflito lança `ConcurrencyConflictError`; em unicidade, `DuplicateProductError`.
   */
  update(product: ProductAggregate): Promise<void>
}
