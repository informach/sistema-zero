import 'server-only'
import type { CouponView, OfferListItem, Paginated, ProductView } from '@/lib/types'
import { type GatewayResponse, gatewayFetch } from './gateway'

export interface ListParams {
  q?: string
  status?: string
  limit?: number
  offset?: number
  productId?: string
}

function listQuery(p: ListParams): Record<string, string | number | undefined> {
  return { q: p.q, status: p.status, limit: p.limit, offset: p.offset, productId: p.productId }
}

// ── Produtos ──
export function listProducts(p: ListParams): Promise<GatewayResponse<Paginated<ProductView>>> {
  return gatewayFetch('/catalog/admin/products', { query: listQuery(p) })
}
export function createProduct(body: unknown): Promise<GatewayResponse<ProductView>> {
  return gatewayFetch('/catalog/products', { method: 'POST', body })
}
export function updateProduct(id: string, body: unknown): Promise<GatewayResponse<ProductView>> {
  return gatewayFetch(`/catalog/products/${encodeURIComponent(id)}`, { method: 'PATCH', body })
}

// ── Ofertas ──
export function listOffers(p: ListParams): Promise<GatewayResponse<Paginated<OfferListItem>>> {
  return gatewayFetch('/catalog/admin/offers', { query: listQuery(p) })
}
export function createOffer(body: unknown): Promise<GatewayResponse<unknown>> {
  return gatewayFetch('/catalog/offers', { method: 'POST', body })
}
export function updateOffer(id: string, body: unknown): Promise<GatewayResponse<unknown>> {
  return gatewayFetch(`/catalog/offers/${encodeURIComponent(id)}`, { method: 'PATCH', body })
}

// ── Cupons ──
export function listCoupons(p: ListParams): Promise<GatewayResponse<Paginated<CouponView>>> {
  return gatewayFetch('/catalog/admin/coupons', { query: listQuery(p) })
}
export function createCoupon(body: unknown): Promise<GatewayResponse<CouponView>> {
  return gatewayFetch('/catalog/coupons', { method: 'POST', body })
}
export function updateCoupon(id: string, body: unknown): Promise<GatewayResponse<CouponView>> {
  return gatewayFetch(`/catalog/coupons/${encodeURIComponent(id)}`, { method: 'PATCH', body })
}
