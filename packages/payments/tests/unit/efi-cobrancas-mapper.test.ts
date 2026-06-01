import { describe, expect, test } from 'bun:test'
import { EfiGatewayError } from '../../src/infrastructure/gateways/efi/efi.errors'
import {
  centsToBigInt,
  mapCobrancasStatus,
  mapSubscriptionStatus,
  parseCreatePlanResponse,
  parseCreateSubscriptionResponse,
  parseNotification,
  parseNotificationEntries,
  parseOneStepResponse,
} from '../../src/infrastructure/gateways/efi/efi-cobrancas.mapper'

describe('efi-cobrancas.mapper', () => {
  test('mapCobrancasStatus traduz os status da Efí', () => {
    expect(mapCobrancasStatus('paid')).toBe('PAID')
    expect(mapCobrancasStatus('settled')).toBe('PAID')
    expect(mapCobrancasStatus('canceled')).toBe('EXPIRED')
    expect(mapCobrancasStatus('expired')).toBe('EXPIRED')
    expect(mapCobrancasStatus('unpaid')).toBe('FAILED')
    expect(mapCobrancasStatus('refunded')).toBe('REFUNDED')
    expect(mapCobrancasStatus('waiting')).toBe('PENDING')
    expect(mapCobrancasStatus(undefined)).toBe('PENDING')
  })

  test('centsToBigInt converte inteiro em centavos defensivamente', () => {
    expect(centsToBigInt(5000)).toBe(5000n)
    expect(centsToBigInt('100')).toBe(100n)
    expect(centsToBigInt(undefined)).toBe(0n)
    expect(centsToBigInt('abc')).toBe(0n)
  })

  test('parseOneStepResponse extrai os campos (formato data{})', () => {
    const parsed = parseOneStepResponse({
      data: {
        charge_id: 123,
        status: 'waiting',
        barcode: '34191.7900',
        pdf: { charge: 'https://efi/x.pdf' },
        expire_at: '2026-06-10',
        total: 5000,
      },
    })
    expect(parsed.chargeId).toBe('123')
    expect(parsed.barcode).toBe('34191.7900')
    expect(parsed.pdfUrl).toBe('https://efi/x.pdf')
    expect(parsed.totalInCents).toBe(5000n)
  })

  test('parseOneStepResponse tolera nomes alternativos (id/billet_link)', () => {
    const parsed = parseOneStepResponse({
      id: 9,
      status: 'new',
      barcode: 'X',
      billet_link: 'https://efi/b',
    })
    expect(parsed.chargeId).toBe('9')
    expect(parsed.pdfUrl).toBe('https://efi/b')
  })

  test('parseOneStepResponse lê a forma aninhada do detalhe (payment.banking_billet)', () => {
    const parsed = parseOneStepResponse({
      data: {
        charge_id: 50,
        status: 'waiting',
        total: 100,
        payment: {
          banking_billet: {
            barcode: '34191.7900',
            pdf: { charge: 'https://efi/d.pdf' },
            link: 'https://efi/d',
            expire_at: '2026-07-01',
          },
        },
      },
    })
    expect(parsed.chargeId).toBe('50')
    expect(parsed.barcode).toBe('34191.7900')
    expect(parsed.pdfUrl).toBe('https://efi/d.pdf')
    expect(parsed.expiresAt?.toISOString().slice(0, 10)).toBe('2026-07-01')
  })

  test('parseOneStepResponse lança sem charge_id', () => {
    expect(() => parseOneStepResponse({ data: { status: 'new' } })).toThrow(EfiGatewayError)
  })

  test('parseOneStepResponse lança boleto sem nada pagável', () => {
    expect(() => parseOneStepResponse({ data: { charge_id: 1, status: 'new' } })).toThrow(
      EfiGatewayError,
    )
  })

  test('parseNotification extrai charge_ids únicos', () => {
    const ids = parseNotification({
      data: [
        { identifiers: { charge_id: 10 }, status: { current: 'paid' } },
        { identifiers: { charge_id: 10 }, status: { current: 'settled' } },
        { charge_id: 11 },
      ],
    })
    expect(ids.sort()).toEqual(['10', '11'])
  })

  test('mapSubscriptionStatus traduz os status da assinatura', () => {
    expect(mapSubscriptionStatus('active')).toBe('ACTIVE')
    expect(mapSubscriptionStatus('canceled')).toBe('CANCELED')
    expect(mapSubscriptionStatus('expired')).toBe('EXPIRED')
    expect(mapSubscriptionStatus('finished')).toBe('EXPIRED')
    expect(mapSubscriptionStatus('new')).toBe('PENDING')
    expect(mapSubscriptionStatus(undefined)).toBe('PENDING')
  })

  test('parseCreatePlanResponse extrai plan_id (e lança sem ele)', () => {
    expect(parseCreatePlanResponse({ data: { plan_id: 77 } }).planId).toBe('77')
    expect(() => parseCreatePlanResponse({ data: {} })).toThrow(EfiGatewayError)
  })

  test('parseCreateSubscriptionResponse extrai subscription_id, status e 1ª cobrança', () => {
    const parsed = parseCreateSubscriptionResponse({
      data: {
        subscription_id: 500,
        status: 'active',
        charge: { charge_id: 900, status: 'approved' },
      },
    })
    expect(parsed.subscriptionId).toBe('500')
    expect(parsed.status).toBe('ACTIVE')
    expect(parsed.firstChargeId).toBe('900')
    expect(parsed.firstChargeStatus).toBe('PAID')
  })

  test('parseCreateSubscriptionResponse sem 1ª cobrança → firstCharge undefined', () => {
    const parsed = parseCreateSubscriptionResponse({ data: { subscription_id: 1, status: 'new' } })
    expect(parsed.subscriptionId).toBe('1')
    expect(parsed.status).toBe('PENDING')
    expect(parsed.firstChargeId).toBeUndefined()
  })

  test('parseCreateSubscriptionResponse lança sem subscription_id', () => {
    expect(() => parseCreateSubscriptionResponse({ data: { status: 'active' } })).toThrow(
      EfiGatewayError,
    )
  })

  test('parseNotificationEntries separa ciclos de assinatura de cobranças avulsas', () => {
    const entries = parseNotificationEntries({
      data: [
        { identifiers: { charge_id: 10, subscription_id: 500 } },
        { identifiers: { charge_id: 11 } },
        { identifiers: { charge_id: 10, subscription_id: 500 } }, // duplicado
      ],
    })
    expect(entries).toHaveLength(2)
    expect(entries).toContainEqual({ chargeId: '10', subscriptionId: '500' })
    expect(entries).toContainEqual({ chargeId: '11', subscriptionId: undefined })
  })
})
