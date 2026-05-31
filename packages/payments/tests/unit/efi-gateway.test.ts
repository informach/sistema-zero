import { describe, expect, test } from 'bun:test'
import type { EfiClient } from '../../src/infrastructure/gateways/efi/efi.client'
import { EfiGatewayError } from '../../src/infrastructure/gateways/efi/efi.errors'
import { EfiPaymentGateway } from '../../src/infrastructure/gateways/efi/efi.gateway'
import { Money } from '../../src/domain/value-objects/money'

const PAYMENT_ID = 'c73280a9-7ddd-457a-82c3-d65283171237'
const TXID = 'c73280a97ddd457a82c3d65283171237'

function mockClient(over: Partial<EfiClient>): EfiClient {
  return {
    createCharge: async () => ({ txid: TXID, loc: { id: 1 }, pixCopiaECola: '00020101-COPIA-E-COLA', calendario: { expiracao: 3600, criacao: '2026-01-01T00:00:00Z' } }),
    detailCharge: async () => ({ txid: TXID, loc: { id: 1 }, pixCopiaECola: '00020101-COPIA-E-COLA', calendario: { expiracao: 3600, criacao: '2026-01-01T00:00:00Z' } }),
    generateQrCode: async () => ({ qrcode: '00020101-QR', imagemQrcode: 'data:image/png;base64,QQ==' }),
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
          throw new EfiGatewayError('Campo txid informado já foi utilizado', 'txid_duplicado', undefined, 409)
        }) as EfiClient['createCharge'],
        detailCharge: (async () => {
          detailCalls++
          return { txid: TXID, loc: { id: 1 }, pixCopiaECola: '00020101-EXISTENTE', calendario: { expiracao: 3600 } }
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
        createCharge: (async () => ({ txid: TXID, calendario: { expiracao: 3600 } })) as EfiClient['createCharge'],
        generateQrCode: (async () => ({})) as EfiClient['generateQrCode'],
      }),
    )
    await expect(gw.createPixCharge(input)).rejects.toBeInstanceOf(EfiGatewayError)
  })
})
