import { describe, expect, test } from 'bun:test'
import { SubscriptionActivationRejectedError } from '../../src/domain/subscription/activation-rejected.error'
import { Money } from '../../src/domain/value-objects/money'
import type { EfiClient } from '../../src/infrastructure/gateways/efi/efi.client'
import { EfiGatewayError } from '../../src/infrastructure/gateways/efi/efi.errors'
import { EfiPaymentGateway } from '../../src/infrastructure/gateways/efi/efi.gateway'
import type { EfiCobrancasClient } from '../../src/infrastructure/gateways/efi/efi-cobrancas.client'

const PAYMENT_ID = 'c73280a9-7ddd-457a-82c3-d65283171237'
const TXID = 'c73280a97ddd457a82c3d65283171237'

function mockClient(over: Partial<EfiClient>): EfiClient {
  return {
    createCharge: async () => ({
      txid: TXID,
      loc: { id: 1 },
      pixCopiaECola: '00020101-COPIA-E-COLA',
      calendario: { expiracao: 3600, criacao: '2026-01-01T00:00:00Z' },
    }),
    detailCharge: async () => ({
      txid: TXID,
      loc: { id: 1 },
      pixCopiaECola: '00020101-COPIA-E-COLA',
      calendario: { expiracao: 3600, criacao: '2026-01-01T00:00:00Z' },
    }),
    generateQrCode: async () => ({
      qrcode: '00020101-QR',
      imagemQrcode: 'data:image/png;base64,QQ==',
    }),
    ...over,
  } as unknown as EfiClient
}

const input = {
  paymentId: PAYMENT_ID,
  amount: Money.fromCents(100),
  pixKey: 'chave@loja.com',
  idempotencyKey: 'idem-12345678',
}

const subscriptionInput = {
  subscriptionId: PAYMENT_ID,
  planId: '42',
  amount: Money.fromCents(4850),
  itemName: 'Assinatura',
  paymentToken: 'qa-token',
  customer: {
    name: 'Pessoa de Teste',
    cpf: '52998224725',
    email: 'qa@example.test',
    phone: '11999999999',
    birth: '1990-05-10',
  },
  billingAddress: {
    street: 'Rua A',
    number: '100',
    neighborhood: 'Centro',
    zipcode: '01001000',
    city: 'São Paulo',
    state: 'SP',
  },
}

test.each([
  400, 422, 429, 500,
])('ativação distingue recusa definitiva de resposta ambígua: HTTP %s', async (status) => {
  const gateway = new EfiPaymentGateway(
    mockClient({}),
    mockCobrancas({
      activateSubscription: async () => {
        throw new EfiGatewayError('provider', 'error', undefined, status)
      },
    }),
  )
  await expect(gateway.activateCardSubscription('42', subscriptionInput)).rejects.toBeInstanceOf(
    status === 400 || status === 422 ? SubscriptionActivationRejectedError : EfiGatewayError,
  )
})

test('primeira cobrança prepara sem token e atualização afeta itens, sem desconto recorrente', async () => {
  let prepared: unknown, activated: unknown, updated: unknown
  const gateway = new EfiPaymentGateway(
    mockClient({}),
    mockCobrancas({
      prepareSubscription: async (_id, body) => {
        prepared = body
        return { data: { subscription_id: 42, charges: [{ charge_id: 43 }] } }
      },
      activateSubscription: async (_id, payment) => {
        activated = payment
        return {
          data: {
            subscription_id: 42,
            status: 'active',
            charge: { charge_id: 43, status: 'paid' },
          },
        }
      },
      updateSubscriptionItems: async (_id, items) => {
        updated = items
        return {}
      },
    }),
  )
  expect(await gateway.prepareCardSubscription(subscriptionInput)).toEqual({
    providerSubscriptionId: '42',
    firstChargeId: '43',
  })
  expect(prepared).toMatchObject({ items: [{ value: 4850, amount: 1 }] })
  expect(JSON.stringify(prepared)).not.toContain('qa-token')
  await gateway.activateCardSubscription('42', subscriptionInput)
  expect(activated).toMatchObject({ credit_card: { payment_token: 'qa-token' } })
  expect(JSON.stringify(activated)).not.toContain('discount')
  await gateway.updateSubscriptionAmount('42', Money.fromCents(9700), 'Assinatura')
  expect(updated).toEqual([{ name: 'Assinatura', value: 9700, amount: 1 }])
})

describe('EfiPaymentGateway.createPixCharge', () => {
  test('cria a cobrança com txid determinístico e retorna copia-e-cola/QR', async () => {
    const gw = new EfiPaymentGateway(mockClient({}))
    const out = await gw.createPixCharge(input)
    expect(out.txid).toBe(TXID)
    expect(out.copiaECola).toBe('00020101-QR')
    expect(out.imagemQrcodeBase64).toBeDefined()
  })

  test('txid_duplicado (retry após resposta perdida) → busca a cobrança existente, sem duplicar', async () => {
    let putCalls = 0
    let detailCalls = 0
    const gw = new EfiPaymentGateway(
      mockClient({
        createCharge: (async () => {
          putCalls++
          throw new EfiGatewayError(
            'Campo txid informado já foi utilizado',
            'txid_duplicado',
            undefined,
            409,
          )
        }) as EfiClient['createCharge'],
        detailCharge: (async () => {
          detailCalls++
          return {
            txid: TXID,
            loc: { id: 1 },
            pixCopiaECola: '00020101-EXISTENTE',
            calendario: { expiracao: 3600 },
          }
        }) as EfiClient['detailCharge'],
      }),
    )

    const out = await gw.createPixCharge(input)
    expect(out.txid).toBe(TXID) // reusa o mesmo txid
    expect(putCalls).toBe(1)
    expect(detailCalls).toBe(1) // buscou a existente em vez de falhar
  })

  test('com customer → envia devedor {cpf, nome} (CPF = 11 dígitos, sem máscara)', async () => {
    let sentBody: Record<string, unknown> | undefined
    const gw = new EfiPaymentGateway(
      mockClient({
        createCharge: (async (_txid: string, body: Record<string, unknown>) => {
          sentBody = body
          return {
            txid: TXID,
            loc: { id: 1 },
            pixCopiaECola: '00020101-COPIA-E-COLA',
            calendario: { expiracao: 3600 },
          }
        }) as EfiClient['createCharge'],
      }),
    )
    await gw.createPixCharge({
      ...input,
      customer: { name: 'João da Silva', document: '529.982.247-25' },
    })
    expect(sentBody?.devedor).toEqual({ cpf: '52998224725', nome: 'João da Silva' })
  })

  test('com customer CNPJ (14 dígitos) → devedor usa a chave cnpj', async () => {
    let sentBody: Record<string, unknown> | undefined
    const gw = new EfiPaymentGateway(
      mockClient({
        createCharge: (async (_txid: string, body: Record<string, unknown>) => {
          sentBody = body
          return {
            txid: TXID,
            loc: { id: 1 },
            pixCopiaECola: '00020101-COPIA-E-COLA',
            calendario: { expiracao: 3600 },
          }
        }) as EfiClient['createCharge'],
      }),
    )
    await gw.createPixCharge({
      ...input,
      customer: { name: 'Empresa de Serviços SA', document: '12.345.678/0001-95' },
    })
    expect(sentBody?.devedor).toEqual({ cnpj: '12345678000195', nome: 'Empresa de Serviços SA' })
  })

  test('sem customer → body NÃO tem devedor (comportamento anterior preservado)', async () => {
    let sentBody: Record<string, unknown> | undefined
    const gw = new EfiPaymentGateway(
      mockClient({
        createCharge: (async (_txid: string, body: Record<string, unknown>) => {
          sentBody = body
          return {
            txid: TXID,
            loc: { id: 1 },
            pixCopiaECola: '00020101-COPIA-E-COLA',
            calendario: { expiracao: 3600 },
          }
        }) as EfiClient['createCharge'],
      }),
    )
    await gw.createPixCharge(input)
    expect(sentBody && 'devedor' in sentBody).toBe(false)
  })

  test('erro não relacionado a txid propaga', async () => {
    const gw = new EfiPaymentGateway(
      mockClient({
        createCharge: (async () => {
          throw new EfiGatewayError('Indisponível', 'erro_interno', undefined, 503)
        }) as EfiClient['createCharge'],
      }),
    )
    await expect(gw.createPixCharge(input)).rejects.toBeInstanceOf(EfiGatewayError)
  })

  test('cobrança sem copia-e-cola falha alto (não persiste sucesso sem código pagável)', async () => {
    const gw = new EfiPaymentGateway(
      mockClient({
        createCharge: (async () => ({
          txid: TXID,
          calendario: { expiracao: 3600 },
        })) as EfiClient['createCharge'],
        generateQrCode: (async () => ({})) as EfiClient['generateQrCode'],
      }),
    )
    await expect(gw.createPixCharge(input)).rejects.toBeInstanceOf(EfiGatewayError)
  })
})

function mockCobrancas(over: Partial<EfiCobrancasClient>): EfiCobrancasClient {
  return {
    createOneStepCharge: async () => ({
      data: { charge_id: 777, status: 'approved', total: 3700, installments: 3 },
    }),
    detailCharge: async () => ({ data: { charge_id: 777, status: 'approved', total: 3700 } }),
    getNotification: async () => ({}),
    cancelCharge: async () => ({}),
    ...over,
  } as unknown as EfiCobrancasClient
}

const cardInput = {
  paymentId: PAYMENT_ID,
  amount: Money.fromCents(3700),
  installments: 3,
  paymentToken: 'paytok-abc',
  customer: {
    name: 'João da Silva',
    cpf: '52998224725',
    email: 'joao@example.com',
    phone: '11999998888',
    birth: '1990-05-10',
  },
  billingAddress: {
    street: 'Rua A',
    number: '100',
    neighborhood: 'Centro',
    zipcode: '01001000',
    city: 'São Paulo',
    state: 'SP',
  },
  idempotencyKey: 'idem-card',
}

describe('EfiPaymentGateway.createCardCharge', () => {
  test('approved → PAID, retorna charge_id e parcelas', async () => {
    const gw = new EfiPaymentGateway(mockClient({}), mockCobrancas({}))
    const out = await gw.createCardCharge(cardInput)
    expect(out.providerPaymentId).toBe('777')
    expect(out.status).toBe('PAID')
    expect(out.installments).toBe(3)
    expect(out.totalInCents).toBe(3700n)
  })

  test('unpaid → FAILED', async () => {
    const gw = new EfiPaymentGateway(
      mockClient({}),
      mockCobrancas({
        createOneStepCharge: (async () => ({
          data: { charge_id: 1, status: 'unpaid', total: 3700 },
        })) as EfiCobrancasClient['createOneStepCharge'],
      }),
    )
    const out = await gw.createCardCharge(cardInput)
    expect(out.status).toBe('FAILED')
  })

  test('waiting → PENDING', async () => {
    const gw = new EfiPaymentGateway(
      mockClient({}),
      mockCobrancas({
        createOneStepCharge: (async () => ({
          data: { charge_id: 2, status: 'waiting', total: 3700 },
        })) as EfiCobrancasClient['createOneStepCharge'],
      }),
    )
    const out = await gw.createCardCharge(cardInput)
    expect(out.status).toBe('PENDING')
  })

  test('resposta sem charge_id falha alto', async () => {
    const gw = new EfiPaymentGateway(
      mockClient({}),
      mockCobrancas({
        createOneStepCharge: (async () => ({
          data: { status: 'approved', total: 3700 },
        })) as EfiCobrancasClient['createOneStepCharge'],
      }),
    )
    await expect(gw.createCardCharge(cardInput)).rejects.toBeInstanceOf(EfiGatewayError)
  })

  test('getPixCharge compara o valor PAGO (pix[].valor), não o cobrado', async () => {
    const gw = new EfiPaymentGateway(
      mockClient({
        detailCharge: (async () => ({
          txid: TXID,
          status: 'CONCLUIDA',
          valor: { original: '100.00' },
          // Exemplo da doc oficial: cob de 100.00 paga com 110.00 — o valor
          // efetivamente pago vem em pix[].valor.
          pix: [{ endToEndId: 'E2E1', valor: '110.00', horario: '2026-01-02T10:00:00Z' }],
        })) as EfiClient['detailCharge'],
      }),
    )
    const out = await gw.getPixCharge(TXID)
    expect(out.status).toBe('PAID')
    expect(out.amountInCents).toBe(11000n) // pago, não os 10000 cobrados
    expect(out.paidAt?.toISOString()).toBe('2026-01-02T10:00:00.000Z')
  })

  test('getPixCharge sem pagamento (pix[] vazio) cai no valor cobrado', async () => {
    const gw = new EfiPaymentGateway(
      mockClient({
        detailCharge: (async () => ({
          txid: TXID,
          status: 'ATIVA',
          valor: { original: '100.00' },
        })) as EfiClient['detailCharge'],
      }),
    )
    const out = await gw.getPixCharge(TXID)
    expect(out.status).toBe('PENDING')
    expect(out.amountInCents).toBe(10000n)
    expect(out.paidAt).toBeUndefined()
  })

  test('getCardCharge re-consulta e mapeia approved→PAID (cartão-aware)', async () => {
    const gw = new EfiPaymentGateway(mockClient({}), mockCobrancas({}))
    const out = await gw.getCardCharge('777')
    expect(out.status).toBe('PAID')
    expect(out.amountInCents).toBe(3700n)
  })

  test('EfiGatewayError não serializa o corpo da Efí (PII) em JSON.stringify', () => {
    const err = new EfiGatewayError(
      'Efí [teste]: validação',
      'documento_invalido',
      { violacoes: [{ propriedade: 'devedor.cpf', valor: '11122233344' }] },
      400,
    )
    expect(JSON.stringify(err)).not.toContain('11122233344') // PII não vaza em log acidental
    expect(err.cause).toMatchObject({ violacoes: expect.any(Array) }) // acessível p/ debug
    expect(err.providerCode).toBe('documento_invalido')
    expect(err.status).toBe(400)
  })

  test('sem cliente Cobranças configurado → erro claro', async () => {
    const gw = new EfiPaymentGateway(mockClient({}))
    await expect(gw.createCardCharge(cardInput)).rejects.toBeInstanceOf(EfiGatewayError)
  })
})
