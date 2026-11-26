import { describe, expect, test } from 'bun:test'
import {
  CommerceBlockSchema,
  CommerceCatalogOfferSchema,
  CommerceOriginSchema,
  memberPromotionSchema,
} from './index'

describe('configuração comercial na plataforma', () => {
  test('o presente usa campanha e a compra usa oferta, sem preço editável', () => {
    expect(
      CommerceBlockSchema.parse({ kind: 'gift', campaignCode: 'vilao-em-aliado-cade' }),
    ).toEqual({
      kind: 'gift',
      campaignCode: 'vilao-em-aliado-cade',
    })
    expect(
      CommerceBlockSchema.parse({ kind: 'purchase', offerRef: 'comunidade-mensal' }).kind,
    ).toBe('purchase')
    expect(CommerceBlockSchema.safeParse({ kind: 'gift', campaignCode: '' }).success).toBe(false)
    expect(CommerceBlockSchema.safeParse({ kind: 'purchase', offerRef: '../outra' }).success).toBe(
      false,
    )
    expect(
      CommerceBlockSchema.safeParse({ kind: 'purchase', offerRef: 'curso', price: 1 }).success,
    ).toBe(false)
  })
  test('a apresentação de presente exige campanha e preserva as condições de exibição', () => {
    expect(
      memberPromotionSchema.safeParse({ enabled: true, mode: 'gift', title: 'Presente' }).success,
    ).toBe(false)
    expect(
      memberPromotionSchema.parse({
        enabled: true,
        mode: 'purchase',
        title: 'Comunidade',
        description: 'Crie em família',
        location: 'parent_home',
      }).location,
    ).toBe('parent_home')
  })
  test('a origem da página de um curso leva só a oferta; o lugar fica fora dela', () => {
    expect(CommerceOriginSchema.parse({ kind: 'offer', offerRef: 'guia-pais-1-ano' })).toEqual({
      kind: 'offer',
      offerRef: 'guia-pais-1-ano',
    })
    expect(
      CommerceOriginSchema.safeParse({ kind: 'offer', offerRef: 'guia', place: 'pais-inicio' })
        .success,
    ).toBe(false)
    expect(CommerceOriginSchema.safeParse({ kind: 'offer', offerRef: '../x' }).success).toBe(false)
  })
  test('a oferta lida do catálogo traz cupom, venda na página e garantia', () => {
    const parsed = CommerceCatalogOfferSchema.parse({
      id: '20000000-0000-4000-8000-000000000001',
      slug: 'guia-pais-1-ano',
      name: 'Guia',
      status: 'active',
      isAvailable: true,
      priceCents: 2700,
      pricingMode: 'one_time',
      billingIntervalMonths: null,
      installmentsMax: 3,
      accessMode: 'fixed',
      accessDurationValue: 12,
      accessDurationUnit: 'months',
      guaranteeDays: 7,
      product: {
        id: '30000000-0000-4000-8000-000000000001',
        audience: 'kids',
        sku: 'GUIA',
        name: 'Guia',
        status: 'active',
      },
      content: { allowsCoupon: true, pageSellable: true },
      includes: [],
    })
    expect(parsed.guaranteeDays).toBe(7)
    expect(parsed.content).toMatchObject({ allowsCoupon: true, pageSellable: true })
  })
})
