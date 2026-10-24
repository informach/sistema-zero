import { describe, expect, test } from 'bun:test'
import { mapCobStatus, reaisStringToCents } from '../../src/infrastructure/gateways/efi/efi.mapper'
import {
  centsToBigInt,
  mapCobrancasStatus,
  parseCardDetailCharge,
  parseDetailCharge,
  parseNotification,
} from '../../src/infrastructure/gateways/efi/efi-cobrancas.mapper'

describe('motivo de recusa do cartão na Efí', () => {
  const reason = 'Falha no pagamento - 54 - Cartão vencido ou data de expiração inválida.'

  test('conserva o motivo do histórico sem confundir a falha com cancelamento da assinatura', () => {
    const charge = parseCardDetailCharge(
      {
        data: {
          charge_id: 123,
          status: 'unpaid',
          total: 9700,
          payment: { message: null },
          history: [{ message: 'Cobrança criada' }, { message: reason }],
        },
      },
      '123',
    )
    expect(charge.failureReason).toBe(reason)
    expect(charge.status).toBe('FAILED')
  })

  test('pagamento confirmado não reutiliza a recusa de uma tentativa anterior', () => {
    const charge = parseCardDetailCharge(
      {
        data: {
          charge_id: 123,
          status: 'paid',
          total: 9700,
          history: [{ message: reason }, { message: 'Pagamento aprovado' }],
        },
      },
      '123',
    )
    expect(charge.failureReason).toBeUndefined()
  })

  test('histórico sem motivo conhecido não transforma uma anotação em diagnóstico', () => {
    const charge = parseCardDetailCharge(
      {
        data: {
          charge_id: 123,
          status: 'unpaid',
          total: 9700,
          history: [{ message: 'Cliente pediu para conversar com a equipe' }],
        },
      },
      '123',
    )
    expect(charge.failureReason).toBeUndefined()
  })

  test('não propaga dados de cliente ou do titular junto ao texto da operadora', () => {
    const charge = parseCardDetailCharge(
      {
        data: {
          charge_id: 123,
          status: 'unpaid',
          total: 9700,
          customer: { name: 'Pessoa Exemplo', email: 'pessoa@example.test', cpf: '52998224725' },
          history: [{ message: `${reason} Pessoa Exemplo pessoa@example.test 52998224725` }],
        },
      },
      '123',
    )
    expect(charge.failureReason).toContain('Cartão vencido')
    expect(charge.failureReason).not.toContain('Pessoa Exemplo')
    expect(charge.failureReason).not.toContain('pessoa@example.test')
    expect(charge.failureReason).not.toContain('52998224725')
  })

  test.each([
    'payment_token=token-qa',
    'CVV=000',
    'x'.repeat(2049),
  ])('descarta diagnóstico inseguro ou sem limite: %s', (message) => {
    const charge = parseCardDetailCharge(
      {
        data: {
          charge_id: 123,
          status: 'unpaid',
          total: 9700,
          payment: { message },
        },
      },
      '123',
    )
    expect(charge.failureReason).toBeUndefined()
    expect(charge.status).toBe('FAILED')
  })

  test('normaliza mensagem estruturada sem copiar o objeto de pagamento', () => {
    const charge = parseCardDetailCharge(
      {
        data: {
          charge_id: 123,
          status: 'unpaid',
          total: 9700,
          payment: { message: { message: `${reason}\nConsulte o emissor.` }, ignored: 'dado-qa' },
        },
      },
      '123',
    )
    expect(charge.failureReason).toBe(`${reason} Consulte o emissor.`)
    expect(charge.failureReason).not.toContain('dado-qa')
  })
})

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

  test('parseDetailCharge rejeita data com componentes civis impossíveis', () => {
    const parsed = parseDetailCharge(
      {
        data: {
          charge_id: 2,
          status: 'paid',
          items: [{ value: 1000 }],
          paid_at: '2026-99-99 25:61:00',
        },
      },
      'fb',
    )
    expect(parsed.paidAt).toBeUndefined()

    const fevereiro = parseDetailCharge(
      {
        data: {
          charge_id: 3,
          status: 'paid',
          items: [{ value: 1000 }],
          paid_at: '2026-02-29 10:00:00',
        },
      },
      'fb',
    )
    expect(fevereiro.paidAt).toBeUndefined()
  })

  // Payload REAL da cobrança 1049600345 (produção, 08/2026), reduzido: é o ciclo
  // de assinatura que ficou dias sem ser registrado no incidente do notification_url.
  const CARTAO_PAGO_REAL = {
    data: {
      charge_id: 1049600345,
      status: 'paid',
      total: 9700,
      paid_value: 9700,
      items: [{ name: 'Assinatura', value: 9700, amount: 1 }],
      created_at: '2026-08-14 03:03:16',
      payment: { method: 'credit_card', created_at: '2026-08-14 03:03:16' },
      history: [
        {
          created_at: '2026-08-14 03:03:16',
          message: 'Pagamento via cartão aguardando confirmação',
        },
        {
          created_at: '2026-08-14 03:04:05',
          message: 'Pagamento de R$ 97,00 efetuado em 14/08/2026',
        },
      ],
    },
  }

  test('⭐ parseCardDetailCharge acha a data do pagamento no payload REAL da Efí', () => {
    // Antes deste conserto o `find` procurava `h.status` — que NÃO existe no
    // history do detalhe — e a data saía indefinida, fazendo o markPaid carimbar
    // a hora do processamento (no incidente, 3 dias depois do pagamento).
    const parsed = parseCardDetailCharge(CARTAO_PAGO_REAL, 'fb')
    expect(parsed.status).toBe('PAID')
    expect(parsed.amountInCents).toBe(9700n)
    // ⭐⭐ ANTI-VÁCUO DO FUSO: a Efí manda hora de SÃO PAULO sem offset. Ler como
    // UTC (ou como hora local do container) daria 03:03Z e adiantaria o pagamento
    // em 3 horas.
    expect(parsed.paidAt?.toISOString()).toBe('2026-08-14T06:03:16.000Z')
  })

  test('parseCardDetailCharge cai no ÚLTIMO evento do histórico quando não há payment', () => {
    const parsed = parseCardDetailCharge(
      {
        data: {
          charge_id: 5,
          status: 'paid',
          items: [{ value: 100 }],
          history: [
            { created_at: '2026-08-14 03:03:16', message: 'aguardando' },
            { created_at: '2026-08-14 03:04:05', message: 'efetuado' },
          ],
        },
      },
      'fb',
    )
    expect(parsed.paidAt?.toISOString()).toBe('2026-08-14T06:04:05.000Z')
  })

  test('parseCardDetailCharge respeita `paid_at` ISO (com Z) sem reinterpretar o fuso', () => {
    const parsed = parseCardDetailCharge(
      {
        data: {
          charge_id: 6,
          status: 'approved',
          items: [{ value: 100 }],
          paid_at: '2026-01-02T10:00:00Z',
          payment: { created_at: '2026-01-02 05:00:00' },
        },
      },
      'fb',
    )
    expect(parsed.paidAt?.toISOString()).toBe('2026-01-02T10:00:00.000Z')
  })

  test('parseCardDetailCharge sem nenhuma data devolve undefined', () => {
    const parsed = parseCardDetailCharge(
      { data: { charge_id: 9, status: 'unpaid', total: 100 } },
      'fb',
    )
    expect(parsed.paidAt).toBeUndefined()
  })

  test('parseDetailCharge (boleto) também trata a data ingênua como São Paulo', () => {
    const parsed = parseDetailCharge(
      {
        data: {
          charge_id: 8,
          status: 'paid',
          items: [{ value: 1000 }],
          history: [{ status: 'paid', created_at: '2026-08-14 03:03:16' }],
        },
      },
      'fb',
    )
    expect(parsed.paidAt?.toISOString()).toBe('2026-08-14T06:03:16.000Z')
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
