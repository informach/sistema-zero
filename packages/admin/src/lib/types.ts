/**
 * Contratos compartilhados entre o BFF e os componentes do painel. Espelham as
 * views do @sistemazero/catalog e o UserView do @sistemazero/auth (type-only —
 * seguro p/ Client Components).
 */

export interface SessionUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  status: string
}

/** Papéis com acesso ao painel admin. */
export const ADMIN_ROLES = ['superadmin', 'admin', 'staff'] as const
export type AdminRole = (typeof ADMIN_ROLES)[number]

export function isAdminRole(role: string): role is AdminRole {
  return (ADMIN_ROLES as readonly string[]).includes(role)
}

export interface Paginated<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

// ── Catálogo (espelha os mappers do @sistemazero/catalog) ──

export type ProductStatus = 'draft' | 'active' | 'archived'
export type OfferStatus = 'draft' | 'active' | 'paused' | 'archived'
export type CouponStatus = 'active' | 'inactive' | 'archived'
export type ProductKind =
  | 'ebook'
  | 'course'
  | 'template_kit'
  | 'community'
  | 'service'
  | 'bundle'
  | 'other'
export type PricingMode = 'one_time' | 'subscription'
export type CouponType = 'percent' | 'fixed'

export interface ProductView {
  id: string
  version: number
  sku: string
  slug: string
  name: string
  kind: string
  status: string
  sellable: boolean
  description: string | null
  currency: string
  createdAt: string
  updatedAt: string
}

export interface OfferListItem {
  id: string
  code: string
  slug: string
  name: string
  status: string
  priceCents: number
  compareAtPriceCents: number | null
  currency: string
  pricingMode: string
  installmentsMax: number | null
  trialDays: number | null
  guaranteeDays: number | null
  availableFrom: string | null
  availableUntil: string | null
  isAvailable: boolean
  productId: string
  productName: string | null
  createdAt: string
  updatedAt: string
}

export interface CouponView {
  id: string
  version: number
  code: string
  type: string
  percentOff: number | null
  amountOffCents: number | null
  currency: string
  status: string
  appliesToAll: boolean
  minPurchaseCents: number | null
  maxRedemptions: number | null
  timesRedeemed: number
  validFrom: string | null
  validUntil: string | null
  offerIds: string[]
  createdAt: string
  updatedAt: string
}
