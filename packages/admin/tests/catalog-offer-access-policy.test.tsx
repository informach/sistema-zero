import { describe, expect, test } from 'bun:test'
import {
  offerAccessSummary,
  validateOfferAccessPolicyForm,
} from '../src/app/admin/catalogo/ofertas/offers-client'

describe('política de acesso da oferta no admin', () => {
  test.each([
    [
      {
        pricingMode: 'one_time' as const,
        accessMode: 'lifetime' as const,
        accessDurationValue: null,
        accessDurationUnit: null,
      },
      'Vitalício',
    ],
    [
      {
        pricingMode: 'one_time' as const,
        accessMode: 'fixed' as const,
        accessDurationValue: 30,
        accessDurationUnit: 'days' as const,
      },
      '30 dias',
    ],
    [
      {
        pricingMode: 'subscription' as const,
        accessMode: 'billing_cycle' as const,
        accessDurationValue: null,
        accessDurationUnit: null,
      },
      'Enquanto a assinatura estiver ativa',
    ],
  ])('resume o acesso da listagem como %s', (offer, expected) => {
    expect(offerAccessSummary(offer)).toBe(expected)
  })

  test('monta payload vitalício sem duração', () => {
    expect(
      validateOfferAccessPolicyForm({
        pricingMode: 'one_time',
        accessMode: 'lifetime',
        accessDurationValue: '30',
        accessDurationUnit: 'days',
        status: 'active',
      }),
    ).toEqual({
      payload: {
        accessMode: 'lifetime',
        accessDurationValue: null,
        accessDurationUnit: null,
      },
      errors: {},
    })
  })

  test('monta payload de 30 dias e de assinatura', () => {
    expect(
      validateOfferAccessPolicyForm({
        pricingMode: 'one_time',
        accessMode: 'fixed',
        accessDurationValue: '30',
        accessDurationUnit: 'days',
        status: 'active',
      }).payload,
    ).toEqual({
      accessMode: 'fixed',
      accessDurationValue: 30,
      accessDurationUnit: 'days',
    })
    expect(
      validateOfferAccessPolicyForm({
        pricingMode: 'subscription',
        accessMode: '',
        accessDurationValue: '30',
        accessDurationUnit: 'days',
        status: 'active',
      }).payload,
    ).toEqual({
      accessMode: 'billing_cycle',
      accessDurationValue: null,
      accessDurationUnit: null,
    })
  })

  test('rascunho fixed pode ficar incompleto; active associa erros aos campos certos', () => {
    expect(
      validateOfferAccessPolicyForm({
        pricingMode: 'one_time',
        accessMode: 'fixed',
        accessDurationValue: '',
        accessDurationUnit: '',
        status: 'draft',
      }),
    ).toEqual({
      payload: {
        accessMode: 'fixed',
        accessDurationValue: null,
        accessDurationUnit: null,
      },
      errors: {},
    })

    const active = validateOfferAccessPolicyForm({
      pricingMode: 'one_time',
      accessMode: 'fixed',
      accessDurationValue: '',
      accessDurationUnit: '',
      status: 'active',
    })
    expect(active.payload).toBeNull()
    expect(active.errors.accessDurationValue).toContain('duração')
    expect(active.errors.accessDurationUnit).toContain('dias ou meses')
  })

  test('rejeita valor fracionário e unidade ausente', () => {
    const result = validateOfferAccessPolicyForm({
      pricingMode: 'one_time',
      accessMode: 'fixed',
      accessDurationValue: '1.5',
      accessDurationUnit: '',
      status: 'draft',
    })
    expect(result.payload).toBeNull()
    expect(result.errors.accessDurationValue).toContain('inteira')
    expect(result.errors.accessDurationUnit).toContain('dias ou meses')
  })

  test('ao voltar de assinatura para compra única exige escolha explícita', () => {
    const result = validateOfferAccessPolicyForm({
      pricingMode: 'one_time',
      accessMode: '',
      accessDurationValue: '',
      accessDurationUnit: '',
      status: 'draft',
    })
    expect(result.payload).toBeNull()
    expect(result.errors.accessMode).toContain('Vitalício ou Prazo fixo')
  })
})
