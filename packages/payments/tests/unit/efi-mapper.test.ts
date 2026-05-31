import { describe, expect, test } from 'bun:test'
import { mapCobStatus, reaisStringToCents } from '../../src/infrastructure/gateways/efi/efi.mapper'
import {
  centsToBigInt,
  mapCobrancasStatus,
  parseDetailCharge,
  parseNotification,
} from '../../src/infrastructure/gateways/efi/efi-cobrancas.mapper'

describe('efi.mapper (Pix) — crítico para dinheiro/status', () => {
  test('mapCobStatus mapeia o vocabulário BACEN', () => {
    expect(mapCobStatus('CONCLUIDA')).toBe('PAID')
    expect(mapCobStatus('ATIVA')).toBe('PENDING')
    expect(mapCobStatus('REMOVIDA_PELO_USUARIO_RECEBEDOR')).toBe('EXPIRED')
    expect(mapCobStatus('REMOVIDA_PELO_PSP')).toBe('EXPIRED')
    expect(mapCobStatus('STATUS_DESCONHECIDO')).toBe('PENDING')
    expect(mapCobStatus(undefined)).toBe('PENDING')
  })

  test('reaisStringToCents converte reais (string) em centavos sem perder precisão', () => {
    expect(reaisStringToCents('10.00')).toBe(1000n)
    expect(reaisStringToCents('0.01')).toBe(1n)
    expect(reaisStringToCents('19.99')).toBe(1999n)
    expect(reaisStringToCents('100')).toBe(10000n)
    expect(reaisStringToCents(5)).toBe(500n)
    expect(reaisStringToCents(undefined)).toBe(0n)
    expect(reaisStringToCents('não-numérico')).toBe(0n)
  })
})

describe('efi-cobrancas.mapper (Boleto)', () => {
  test('mapCobrancasStatus traduz os status da API Cobranças', () => {
    expect(mapCobrancasStatus('paid')).toBe('PAID')
    expect(mapCobrancasStatus('settled')).toBe('PAID')
    expect(mapCobrancasStatus('canceled')).toBe('EXPIRED')
    expect(mapCobrancasStatus('expired')).toBe('EXPIRED')
    expect(mapCobrancasStatus('unpaid')).toBe('FAILED')
    expect(mapCobrancasStatus('refunded')).toBe('REFUNDED')
    expect(mapCobrancasStatus('new')).toBe('PENDING')
    expect(mapCobrancasStatus(undefined)).toBe('PENDING')
  })

  test('centsToBigInt é defensivo', () => {
    expect(centsToBigInt(1000)).toBe(1000n)
    expect(centsToBigInt('1000')).toBe(1000n)
    expect(centsToBigInt(undefined)).toBe(0n)
    expect(centsToBigInt(null)).toBe(0n)
    expect(centsToBigInt('xyz')).toBe(0n)
  })

  test('parseDetailCharge compara o PRINCIPAL (itens), não o total com encargos', () => {
    // Boleto pago em atraso: total (1200) = principal (1000) + multa/juros (200).
    // O amount tem que ser o principal, senão a verificação de valor rejeitaria
    // um pagamento legítimo e o deixaria PENDING para sempre.
    const parsed = parseDetailCharge(
      {
        data: {
          charge_id: 42,
          status: 'paid',
          total: 1200,
          value: 1000,
          items: [{ value: 1000, amount: 1 }],
          paid_at: '2026-01-02T10:00:00Z',
        },
      },
      'fallback',
    )
    expect(parsed.amountInCents).toBe(1000n)
    expect(parsed.status).toBe('PAID')
    expect(parsed.providerPaymentId).toBe('42')
    expect(parsed.paidAt?.toISOString()).toBe('2026-01-02T10:00:00.000Z')
  })

  test('parseDetailCharge usa `value` quando não há itens', () => {
    const parsed = parseDetailCharge({ data: { charge_id: 7, status: 'new', value: 5000 } }, 'fb')
    expect(parsed.amountInCents).toBe(5000n)
  })

  test('parseDetailCharge descarta paidAt inválido (não vira Invalid Date)', () => {
    const parsed = parseDetailCharge(
      { data: { charge_id: 1, status: 'paid', items: [{ value: 1000 }], paid_at: 'lixo' } },
      'fb',
    )
    expect(parsed.paidAt).toBeUndefined()
  })

  test('parseNotification ignora subscription_id (namespace distinto de charge_id)', () => {
    const ids = parseNotification({
      data: [
        { identifiers: { subscription_id: 999 } }, // NÃO deve virar charge_id
        { identifiers: { charge_id: 123 } },
        { charge_id: 456 },
      ],
    })
    expect(ids).toContain('123')
    expect(ids).toContain('456')
    expect(ids).not.toContain('999')
  })
})
