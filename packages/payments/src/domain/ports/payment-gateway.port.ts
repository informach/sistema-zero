import type { Address } from '../value-objects/customer'
import type { Money } from '../value-objects/money'

/**
 * Port (driven) que abstrai o provedor de pagamento. A Efí é apenas UM adapter;
 * trocar de provedor (ou testar com um fake) não toca no domínio. Esta é a
 * camada anti-corrupção: o vocabulário aqui é o nosso, não o da Efí.
 *
 * Pix usa a API Pix (mTLS); boleto usa a API "Cobranças" da Efí (sem mTLS,
 * outra base URL e modelo de notificação por token) — ver `EfiCobrancasClient`.
 */

export interface CreatePixChargeInput {
  paymentId: string
  amount: Money
  /** Chave Pix da nossa conta que recebe o valor. */
  pixKey: string
  description?: string
  /** Mensagem exibida ao pagador. */
  payerMessage?: string
  /** Tempo de expiração da cobrança imediata, em segundos. */
  expiresInSeconds?: number
  idempotencyKey: string
}

export interface CreatePixChargeOutput {
  /** Identificador da cobrança no provedor (para Pix, normalmente o txid). */
  providerPaymentId: string
  txid: string
  /** Código "copia e cola" (payload EMV/BRCode). */
  copiaECola: string
  /** Imagem do QR Code em base64 (PNG), quando disponível. */
  imagemQrcodeBase64?: string
  locationId?: string
  expiresAt?: Date
}

export type ProviderChargeStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED'

export interface ProviderCharge {
  providerPaymentId: string
  txid?: string
  status: ProviderChargeStatus
  paidAt?: Date
  amountInCents: bigint
}

/** Pagador do boleto (a Efí exige documento + endereço completos). */
export interface BoletoCustomer {
  name: string
  /** Apenas dígitos: CPF (11) ou CNPJ (14). */
  cpfOrCnpj: string
  email: string
  phone: string
  birth?: string
  /** Razão social (quando CNPJ). */
  corporateName?: string
  address: Address
}

export interface CreateBoletoChargeInput {
  paymentId: string
  amount: Money
  customer: BoletoCustomer
  /** Vencimento (YYYY-MM-DD), já resolvido pelo caso de uso. */
  expireAt: string
  /** Multa (% em centavos, ex.: 200 = 2,00%). */
  fine?: number
  /** Juros ao mês (% em centavos). */
  interest?: number
  discount?: number
  message?: string
  daysToWriteOff?: number
  idempotencyKey: string
}

export interface CreateBoletoChargeOutput {
  /** charge_id da Efí (numérico) — armazenado como string. */
  providerPaymentId: string
  barcode: string
  digitableLine: string
  pdfUrl: string
  /** Data de vencimento. */
  expiresAt: Date
}

/** Resultado da resolução de um token de notificação (cobranças afetadas). */
export interface ProviderNotification {
  /** charge_ids (→ providerPaymentId) cujo status mudou. */
  chargeIds: string[]
}

export interface PaymentGateway {
  readonly provider: string

  /** Cria uma cobrança Pix imediata e retorna o QR Code / copia-e-cola. */
  createPixCharge(input: CreatePixChargeInput): Promise<CreatePixChargeOutput>

  /**
   * Re-consulta o estado da cobrança no provedor. Usado ao receber um webhook
   * para confirmar o pagamento na fonte (nunca confiar apenas no payload).
   */
  getPixCharge(txid: string): Promise<ProviderCharge>

  /** Cria uma cobrança de boleto (API Cobranças) e retorna a linha digitável/PDF. */
  createBoletoCharge(input: CreateBoletoChargeInput): Promise<CreateBoletoChargeOutput>

  /** Re-consulta a cobrança de boleto pelo charge_id (reconciliação/notificação). */
  getBoletoCharge(providerId: string): Promise<ProviderCharge>

  /**
   * Resolve um token de notificação da Efí (Cobranças) na fonte, retornando as
   * cobranças afetadas. O token POSTado pela Efí não traz dados — só o ponteiro.
   */
  getNotification(token: string): Promise<ProviderNotification>
}
