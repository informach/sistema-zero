import { z } from 'zod'

export const COMMERCE_REF_PATTERN = '^[a-zA-Z0-9][a-zA-Z0-9-]{0,139}$'
export const CAMPAIGN_CODE_PATTERN = '^[a-z0-9-]{4,32}$'
const offerRef = z.string().regex(new RegExp(COMMERCE_REF_PATTERN))
const campaignCode = z.string().regex(new RegExp(CAMPAIGN_CODE_PATTERN))
const presentation = {
  title: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(600).optional(),
  buttonLabel: z.string().trim().min(1).max(80).optional(),
}
export const CommerceBlockSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('gift'), campaignCode, ...presentation }),
  z.strictObject({ kind: z.literal('purchase'), offerRef, ...presentation }),
])
export type CommerceBlock = z.infer<typeof CommerceBlockSchema>
export type GiftBlock = Extract<CommerceBlock, { kind: 'gift' }>
export type PurchaseBlock = Extract<CommerceBlock, { kind: 'purchase' }>

export const memberPromotionSchema = z
  .strictObject({
    enabled: z.boolean(),
    mode: z.enum(['gift', 'purchase']),
    campaignCode: campaignCode.optional(),
    location: z.enum(['parent_home', 'manual']).default('parent_home'),
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().max(600).default(''),
    buttonLabel: z.string().trim().min(1).max(80).optional(),
    imageUrl: z
      .url()
      .refine((url) => /^https?:\/\//.test(url))
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.mode === 'gift' && !value.campaignCode)
      ctx.addIssue({
        code: 'custom',
        path: ['campaignCode'],
        message: 'Escolha a campanha do presente.',
      })
  })
export type MemberPromotion = z.infer<typeof memberPromotionSchema>
export const CheckoutTermsSchema = z.strictObject({
  url: z.url().refine((url) => /^https?:\/\//.test(url)),
  version: z.string().trim().min(1).max(100),
})
export type CheckoutTerms = z.infer<typeof CheckoutTermsSchema>

export const CommerceOriginSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('community') }),
  z.strictObject({
    kind: z.literal('lesson'),
    courseSlug: offerRef,
    lessonId: z.uuid(),
    blockId: z.uuid(),
  }),
  z.strictObject({ kind: z.literal('promotion'), offerRef }),
  // A página de um curso na área dos pais (25/11/2026): a oferta é a principal do produto ou uma
  // marcada "Pode ser vendida na página do produto". O lugar do botão (`place`) viaja AO LADO da
  // origem, nunca dentro dela: a origem identifica a compra, o lugar só alimenta a Origem das vendas.
  z.strictObject({ kind: z.literal('offer'), offerRef }),
])
export type CommerceOrigin = z.infer<typeof CommerceOriginSchema>
export interface CommerceContact {
  nome: string
  email: string
  cpf: string
  telefone: string
}
export interface CommerceOffer {
  id: string
  slug: string
  name: string
  priceCents: number
  pricingMode: 'one_time' | 'subscription'
  billingIntervalMonths: number | null
  installmentsMax: number | null
  accessMode: string
  accessDurationValue: number | null
  accessDurationUnit: string | null
  maxProfiles: number | null
}

export const CommerceCatalogOfferSchema = z.object({
  id: z.uuid(),
  slug: offerRef,
  name: z.string(),
  status: z.string(),
  isAvailable: z.boolean(),
  priceCents: z.number().int().nonnegative(),
  pricingMode: z.enum(['one_time', 'subscription']),
  billingIntervalMonths: z.number().int().nullable(),
  installmentsMax: z.number().int().nullable(),
  accessMode: z.string(),
  accessDurationValue: z.number().int().nullable(),
  accessDurationUnit: z.string().nullable(),
  guaranteeDays: z.number().int().nonnegative().nullable().optional(),
  product: z.object({
    id: z.uuid(),
    audience: z.enum(['kids', 'adult']),
    sku: z.string(),
    name: z.string(),
    status: z.string(),
    /** O tipo do produto no catálogo (`course`, `bundle`, `tool`...); ausente na resposta antiga. */
    kind: z.string().optional(),
  }),
  content: z
    .object({
      maxProfiles: z.number().int().optional(),
      memberPromotion: memberPromotionSchema.optional(),
      checkoutTerms: CheckoutTermsSchema.optional(),
      altOffer: z.object({ slug: offerRef, label: z.string().optional() }).optional(),
      allowsCoupon: z.boolean().optional(),
      pageSellable: z.boolean().optional(),
    })
    .nullable(),
  includes: z.array(z.object({ productId: z.uuid(), name: z.string(), isPrimary: z.boolean() })),
})
export type CommerceCatalogOffer = z.infer<typeof CommerceCatalogOfferSchema>
