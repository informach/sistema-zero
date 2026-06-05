import { envelope } from '@sistemazero/core/http'
import { Elysia } from 'elysia'
import type { GetProductService } from '../../../application/get-product/get-product.service'
import type { ListCouponsService } from '../../../application/list-coupons/list-coupons.service'
import type { ListOffersService } from '../../../application/list-offers/list-offers.service'
import type { ListProductsService } from '../../../application/list-products/list-products.service'
import { assertInternalCaller, requireAdmin } from '../auth'
import { ListCouponsQuery, ListOffersQuery, ListProductsQuery } from '../dtos'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface AdminReadRoutesDeps {
  requireAdminEnabled: boolean
  /** Token interno do gateway (defesa em profundidade). Vazio em dev → checagem desligada. */
  internalToken?: string
  listProducts: ListProductsService
  getProduct: GetProductService
  listOffers: ListOffersService
  listCoupons: ListCouponsService
}

/**
 * Rotas de LEITURA admin (listagens paginadas de produtos/ofertas/cupons). O RBAC
 * real é do gateway (JWT + role admin/staff); aqui conferimos os headers
 * `X-Auth-User-*` confiáveis (defesa em profundidade) e exigimos o
 * `x-internal-token` (header-inject do gateway — prova de origem, como na escrita).
 * Caminho `/catalog/admin/*` distinto das rotas públicas `/:slug` para gating
 * inequívoco no gateway.
 */
export function adminReadRoutes(deps: AdminReadRoutesDeps) {
  return (
    new Elysia({ prefix: '/catalog/admin' })
      .onBeforeHandle(({ headers }) =>
        assertInternalCaller(headers['x-internal-token'], deps.internalToken),
      )
      .get(
        '/products',
        async ({ query, headers }) => {
          requireAdmin(headers, deps.requireAdminEnabled)
          return deps.listProducts.execute({
            q: query.q,
            status: query.status,
            limit: clampLimit(query.limit),
            offset: query.offset ?? 0,
          })
        },
        { query: ListProductsQuery },
      )
      // GET-one por id (página de edição do painel: deep-link/refresh). A view
      // completa traz `fulfillment` + `components` — ok aqui (rota admin gated).
      // Non-UUID → 404 direto (não existe; evita erro da coluna uuid virar 500).
      .get('/products/:id', async ({ params, headers, set }) => {
        requireAdmin(headers, deps.requireAdminEnabled)
        const product = UUID_RE.test(params.id) ? await deps.getProduct.getById(params.id) : null
        if (!product) {
          set.status = 404
          return envelope('PRODUCT_NOT_FOUND', 'Produto não encontrado')
        }
        return product
      })
      .get(
        '/offers',
        async ({ query, headers }) => {
          requireAdmin(headers, deps.requireAdminEnabled)
          return deps.listOffers.execute({
            q: query.q,
            status: query.status,
            productId: query.productId,
            limit: clampLimit(query.limit),
            offset: query.offset ?? 0,
          })
        },
        { query: ListOffersQuery },
      )
      .get(
        '/coupons',
        async ({ query, headers }) => {
          requireAdmin(headers, deps.requireAdminEnabled)
          return deps.listCoupons.execute({
            q: query.q,
            status: query.status,
            limit: clampLimit(query.limit),
            offset: query.offset ?? 0,
          })
        },
        { query: ListCouponsQuery },
      )
  )
}

function clampLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_LIMIT
  return Math.min(Math.max(1, limit), MAX_LIMIT)
}
