import type { GatewayClient, GatewayResult } from '../../src/lib/gateway-client'

interface FakePix {
  txid: string
  copiaECola: string
  imagemQrcodeBase64?: string
  expiresAt: string | null
}

export interface FakeGatewayState {
  gateway: GatewayClient
  calls: { create: Array<{ input: unknown; idempotencyKey: string }>; get: string[] }
  setStatus: (status: string) => void
}

/** Gateway falso em memória (não verifica HMAC; usado nos testes de checkout). */
export function createFakeGateway(): FakeGatewayState {
  const pix: FakePix = {
    txid: 'TX123',
    copiaECola: '00020126...br.gov.bcb.pix...6304ABCD',
    imagemQrcodeBase64: 'iVBORw0KGgo=',
    expiresAt: null,
  }
  const view = { id: 'pay-1', status: 'PENDING', paidAt: null as string | null, pix }
  const calls: FakeGatewayState['calls'] = { create: [], get: [] }

  const gateway: GatewayClient = {
    async createPayment(input, idempotencyKey): Promise<GatewayResult> {
      calls.create.push({ input, idempotencyKey })
      return { status: 201, body: { ...view } }
    },
    async getPayment(paymentId): Promise<GatewayResult> {
      calls.get.push(paymentId)
      return { status: 200, body: { ...view } }
    },
  }

  return {
    gateway,
    calls,
    setStatus: (status: string) => {
      view.status = status
      if (status === 'PAID') view.paidAt = new Date().toISOString()
    },
  }
}
