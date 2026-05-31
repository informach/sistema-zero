import type { Money } from '../value-objects/money'

/**
 * Port (driven) que abstrai o provedor de pagamento. A Efí é apenas UM adapter;
 * trocar de provedor (ou testar com um fake) não toca no domínio. Esta é a
 * camada anti-corrupção: o vocabulário aqui é o nosso, não o da Efí.
 *
 * Nesta fatia vertical apenas o Pix está implementado; boleto e cartão entram
 * como novos métodos deste contrato nos próximos passos.
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

export interface PaymentGateway {
  readonly provider: string

  /** Cria uma cobrança Pix imediata e retorna o QR Code / copia-e-cola. */
  createPixCharge(input: CreatePixChargeInput): Promise<CreatePixChargeOutput>

  /**
   * Re-consulta o estado da cobrança no provedor. Usado ao receber um webhook
   * para confirmar o pagamento na fonte (nunca confiar apenas no payload).
   */
  getPixCharge(txid: string): Promise<ProviderCharge>
}
