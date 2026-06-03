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

/** Estorno de Pix (devolução): resolve o e2eId a partir do txid e devolve o valor. */
export interface RefundPixInput {
  /** txid da cobrança Pix (o adapter busca o e2eId do Pix recebido). */
  txid: string
  /** Valor a devolver (estorno total = valor original). */
  amount: Money
}

/** Resultado de um estorno (Pix devolução ou cartão refund). */
export interface RefundResult {
  /** Id da devolução/estorno no provedor (Pix: id da devolução; cartão: o charge). */
  providerRefundId: string
  /** Status reportado pelo provedor (ex.: EM_PROCESSAMENTO / processing). */
  status: string
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

/** Pagador do cartão (a Efí exige CPF, data de nascimento e telefone). */
export interface CardCustomer {
  name: string
  /** Apenas dígitos: CPF (11). */
  cpf: string
  email: string
  phone: string
  /** Data de nascimento (YYYY-MM-DD). OPCIONAL: a Efí não a exige no cartão one-step
   *  (só name/cpf/email/phone_number). Quando ausente, o adapter não envia o campo. */
  birth?: string
}

export interface CreateCardChargeInput {
  paymentId: string
  amount: Money
  /** Número de parcelas (1–12, validado na borda). */
  installments: number
  /** Token de pagamento gerado no browser (PCI) — de vida curta. */
  paymentToken: string
  customer: CardCustomer
  /**
   * Endereço de cobrança do cartão. OPCIONAL: a Efí aceita cartão sem
   * `billing_address` (útil p/ reduzir fricção em produtos de baixo valor). Quando
   * ausente, o adapter simplesmente não envia o campo.
   */
  billingAddress?: Address
  description?: string
  idempotencyKey: string
}

export interface CreateCardChargeOutput {
  /** charge_id da Efí (numérico) — armazenado como string. */
  providerPaymentId: string
  /** Status já mapeado (approved→PAID, unpaid→FAILED, waiting→PENDING). */
  status: ProviderChargeStatus
  installments: number
  totalInCents: bigint
}

/** Uma entrada do histórico de notificação: a cobrança afetada e, se houver, a assinatura-pai. */
export interface ProviderNotificationEntry {
  chargeId: string
  /** Presente quando a cobrança é um ciclo de assinatura (recorrência). */
  subscriptionId?: string
}

/** Resultado da resolução de um token de notificação (cobranças afetadas). */
export interface ProviderNotification {
  /** charge_ids (→ providerPaymentId) cujo status mudou (compat. boleto/cartão avulso). */
  chargeIds: string[]
  /**
   * Entradas com a assinatura-pai quando aplicável. Quando presente, o handler de
   * notificação prefere iterar `entries` (para rotear ciclos de assinatura ao
   * caminho recorrente) e cai em `chargeIds` apenas como compatibilidade.
   */
  entries?: ProviderNotificationEntry[]
}

// ── Assinaturas (recorrência via cartão, API Cobranças) ──────────────────────

export interface CreatePlanInput {
  name: string
  /** Intervalo entre cobranças, em MESES (inteiro ≥ 1). */
  intervalMonths: number
  /** Total de cobranças; `null` = ilimitado. */
  repeats: number | null
}

export interface CreatePlanOutput {
  /** plan_id da Efí (numérico) — armazenado como string. */
  planId: string
}

export type ProviderSubscriptionStatus = 'PENDING' | 'ACTIVE' | 'CANCELED' | 'EXPIRED'

export interface CreateCardSubscriptionInput {
  /** Nosso id da assinatura (estampado em `metadata.custom_id` p/ rastreio). */
  subscriptionId: string
  /** plan_id da Efí (de `createPlan` / registro reutilizável). */
  planId: string
  amount: Money
  /** Nome do item exibido na cobrança. */
  itemName?: string
  /** Token de pagamento gerado no browser (PCI) — de vida curta, usado 1x. */
  paymentToken: string
  customer: CardCustomer
  billingAddress: Address
  description?: string
}

export interface CreateCardSubscriptionOutput {
  /** subscription_id da Efí (numérico) — armazenado como string. */
  providerSubscriptionId: string
  status: ProviderSubscriptionStatus
  /** Cobrança do 1º ciclo, quando a resposta de criação a expõe. */
  firstChargeId?: string
  firstChargeStatus?: ProviderChargeStatus
}

export interface ProviderSubscription {
  providerSubscriptionId: string
  status: ProviderSubscriptionStatus
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
   * Cria uma cobrança de cartão de crédito (API Cobranças, `one-step`) usando o
   * `payment_token` gerado no browser. Síncrona: a resposta já traz o status
   * (approved/unpaid/waiting). PAN nunca trafega aqui — apenas o token.
   */
  createCardCharge(input: CreateCardChargeInput): Promise<CreateCardChargeOutput>

  /** Re-consulta a cobrança de cartão pelo charge_id (reconciliação/notificação). */
  getCardCharge(providerId: string): Promise<ProviderCharge>

  /**
   * Estorna (devolve) um Pix pago — `PUT /v2/pix/:e2eId/devolucao/:id`. O adapter
   * resolve o `e2eId` do Pix recebido a partir do `txid`. Idempotente no provedor
   * (id de devolução determinístico). Devolução total = valor original.
   */
  refundPixCharge(input: RefundPixInput): Promise<RefundResult>

  /**
   * Estorna uma cobrança de cartão paga — `POST /v1/charge/card/:id/refund`
   * (valor total quando `amount` omitido). A cobrança deve estar `paid`.
   */
  refundCardCharge(providerPaymentId: string, amount: Money): Promise<RefundResult>

  /**
   * Resolve um token de notificação da Efí (Cobranças) na fonte, retornando as
   * cobranças afetadas. O token POSTado pela Efí não traz dados — só o ponteiro.
   */
  getNotification(token: string): Promise<ProviderNotification>

  // ── Assinaturas (recorrência via cartão) ───────────────────────────────────

  /** Cria (ou nada além de criar) um plano de recorrência reutilizável na Efí. */
  createPlan(input: CreatePlanInput): Promise<CreatePlanOutput>

  /**
   * Cria uma assinatura de cartão (API Cobranças, `one-step`) ligada a um plano.
   * A Efí passa a cobrar o cartão guardado a cada ciclo e notifica por token —
   * não há cobrança recorrente disparada por nós. PAN nunca trafega aqui.
   */
  createCardSubscription(input: CreateCardSubscriptionInput): Promise<CreateCardSubscriptionOutput>

  /** Re-consulta o estado da assinatura no provedor (reconciliação/cancelamento). */
  getSubscription(providerSubscriptionId: string): Promise<ProviderSubscription>

  /** Cancela a assinatura na Efí (interrompe as cobranças futuras). */
  cancelSubscription(providerSubscriptionId: string): Promise<void>
}
