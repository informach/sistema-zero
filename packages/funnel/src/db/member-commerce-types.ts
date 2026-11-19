import type { CheckoutTerms, CommerceCatalogOffer } from '@sistemazero/core/commerce'
import type { z } from 'zod'
import type {
  CardChargeSchema,
  PixChargeSchema,
  SubscriptionChargeSchema,
} from '../lib/checkout-schema'
export interface MemberCheckoutPresentation {
  offer: CommerceCatalogOffer
  terms: CheckoutTerms
}
/** Token do provedor, nunca PAN/CVV. Mantido só até registrar o resultado da cobrança. */
export interface PreparedMemberCharge {
  method: 'pix' | 'card' | 'subscription'
  body:
    | z.infer<typeof PixChargeSchema>
    | z.infer<typeof CardChargeSchema>
    | z.infer<typeof SubscriptionChargeSchema>
  termsVersion: string
  expectedPriceCents: number
}
