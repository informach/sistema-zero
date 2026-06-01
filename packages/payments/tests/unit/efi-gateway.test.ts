import { describe, expect, test } from 'bun:test'
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

  test('getCardCharge re-consulta e mapeia approved→PAID (cartão-aware)', async () => {
    const gw = new EfiPaymentGateway(mockClient({}), mockCobrancas({}))
    const out = await gw.getCardCharge('777')
    expect(out.status).toBe('PAID')
    expect(out.amountInCents).toBe(3700n)
  })

  test('sem cliente Cobranças configurado → erro claro', async () => {
    const gw = new EfiPaymentGateway(mockClient({}))
    await expect(gw.createCardCharge(cardInput)).rejects.toBeInstanceOf(EfiGatewayError)
  })
})
