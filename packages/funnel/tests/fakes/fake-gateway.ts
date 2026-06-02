import type { GatewayClient, GatewayResult, RegisterBuyerInput } from '../../src/lib/gateway-client'

interface FakePix {
  txid: string
  copiaECola: string
  imagemQrcodeBase64?: string
  expiresAt: string | null
}
interface FakeBoleto {
  barcode: string
  digitableLine: string
  pdfUrl: string
  expiresAt: string | null
}
interface FakeCard {
  brand: string
  last4: string
  installments: number
}

export interface FakeGatewayState {
  gateway: GatewayClient
  calls: {
    create: Array<{ input: unknown; idempotencyKey: string }>
    get: string[]
    register: Array<{ input: RegisterBuyerInput }>
  }
  setStatus: (status: string) => void
  /** Status HTTP devolvido por registerBuyer (default 201). */
  setRegisterStatus: (status: number, body?: unknown) => void
}

/** Gateway falso em memória (não verifica HMAC; usado nos testes de checkout). */
export function createFakeGateway(): FakeGatewayState {
  const pix: FakePix = {
    txid: 'TX123',
    copiaECola: '00020126...br.gov.bcb.pix...6304ABCD',
    imagemQrcodeBase64: 'iVBORw0KGgo=',
    expiresAt: null,
  }
  const boleto: FakeBoleto = {
    barcode: '34191790010104351004791020150008291070026000',
    digitableLine: '34191.79001 01043.510047 91020.150008 2 91070026000',
    pdfUrl: 'https://efi.example/boleto/pay-1.pdf',
    expiresAt: null,
  }
  const card: FakeCard = { brand: 'visa', last4: '0087', installments: 1 }

  const view = { id: 'pay-1', status: 'PENDING', paidAt: null as string | null }
  const calls: FakeGatewayState['calls'] = { create: [], get: [], register: [] }
  let registerStatus = 201
  let registerBody: unknown = { user: { id: 'user-1' } }

  /** Monta o corpo de leitura com o bloco específico do método. */
  function bodyForMethod(method: string): Record<string, unknown> {
    const base: Record<string, unknown> = { id: view.id, status: view.status, paidAt: view.paidAt }
    if (method === 'BOLETO') base.boleto = boleto
    else if (method === 'CREDIT_CARD') base.card = card
    else base.pix = pix
    return base
  }

  const gateway: GatewayClient = {
    async createPayment(input, idempotencyKey): Promise<GatewayResult> {
      calls.create.push({ input, idempotencyKey })
      const method = (input as { method?: string }).method ?? 'PIX'
      return { status: 201, body: bodyForMethod(method) }
    },
    async getPayment(paymentId): Promise<GatewayResult> {
      calls.get.push(paymentId)
      // Sem o método na consulta, devolve os três blocos possíveis (a UI lê o seu).
      return {
        status: 200,
        body: { id: view.id, status: view.status, paidAt: view.paidAt, pix, boleto, card },
      }
    },
    async registerBuyer(input): Promise<GatewayResult> {
      calls.register.push({ input })
      return { status: registerStatus, body: registerBody }
    },
  }

  return {
    gateway,
    calls,
    setStatus: (status: string) => {
      view.status = status
      if (status === 'PAID') view.paidAt = new Date().toISOString()
    },
    setRegisterStatus: (status: number, body?: unknown) => {
      registerStatus = status
      if (body !== undefined) registerBody = body
    },
  }
}
