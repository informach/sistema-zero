import { Elysia } from 'elysia'
import type { ListCouponsService } from '../../../application/list-coupons/list-coupons.service'
import type { ListOffersService } from '../../../application/list-offers/list-offers.service'
import type { ListProductsService } from '../../../application/list-products/list-products.service'
import { requireAdmin } from '../auth'
import { ListCouponsQuery, ListOffersQuery, ListProductsQuery } from '../dtos'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export interface AdminReadRoutesDeps {
  requireAdminEnabled: boolean
  listProducts: ListProductsService
  listOffers: ListOffersService
  listCoupons: ListCouponsService
}

/**
 * Rotas de LEITURA admin (listagens paginadas de produtos/ofertas/cupons). O RBAC
 * real é do gateway (JWT + role admin/staff); aqui conferimos os headers
 * `X-Auth-User-*` confiáveis (defesa em profundidade). Caminho `/catalog/admin/*`
 * distinto das rotas públicas `/:slug` para gating inequívoco no gateway.
 */
export function adminReadRoutes(deps: AdminReadRoutesDeps) {
  return new Elysia({ prefix: '/catalog/admin' })
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
}

function clampLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_LIMIT
  return Math.min(Math.max(1, limit), MAX_LIMIT)
}
