import type {
  CommerceBlock,
  CommerceCatalogOffer,
  CommerceContact,
  CommerceOrigin,
  MemberPromotion,
} from '@sistemazero/core/commerce'
import type { ReferralGiftOfferView } from '@sistemazero/core/referrals'
import type { SubscriptionCardConfigView } from './subscription-card'

export interface CommerceAddress {
  street: string
  number: string
  neighborhood: string
  zipcode: string
  city: string
  state: string
  complement?: string
}
export interface PendingPurchaseView {
  checkoutId: string
  origin: CommerceOrigin
  title: string
}
export interface PurchaseView {
  mode: 'purchase'
  checkoutId: string
  origin: CommerceOrigin
  offer: CommerceCatalogOffer
  contact: CommerceContact
  birth: string
  address: CommerceAddress | null
  status:
    | 'READY'
    | 'PENDING'
    | 'PAID'
    | 'PROCESSING'
    | 'FAILED'
    | 'EXPIRED'
    | 'CANCELED'
    | 'REFUNDED'
  accessGranted: boolean
  payment: {
    status: string
    pix?: { copiaECola: string; imagemQrcodeBase64?: string; expiresAt: string | null } | null
  } | null
  cardConfig?: SubscriptionCardConfigView
  termsUrl: string
  privacyUrl: string
  termsVersion: string
  config: CommerceBlock
}
export type CommerceView =
  | PurchaseView
  | {
      mode: 'gift'
      gift: ReferralGiftOfferView
      state: string
      config: CommerceBlock
      redemption?: { status: string; expiresAt: string | null; canResume: boolean } | null
    }
  | { mode: 'manage'; manageUrl: string; message: string }
export interface PromotionCardView {
  origin?: CommerceOrigin
  offerRef: string
  promotion: MemberPromotion
  decision: { kind: string; giftEndsAt?: string | null; manageUrl?: string }
}
