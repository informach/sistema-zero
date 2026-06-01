import type {
  CreateBoletoChargeInput,
  CreateBoletoChargeOutput,
  CreateCardChargeInput,
  CreateCardChargeOutput,
  CreateCardSubscriptionInput,
  CreateCardSubscriptionOutput,
  CreatePixChargeInput,
  CreatePixChargeOutput,
  CreatePlanInput,
  CreatePlanOutput,
  PaymentGateway,
  ProviderCharge,
  ProviderNotification,
  ProviderSubscription,
} from '../../../domain/ports/payment-gateway.port'
import type { EfiClient } from './efi.client'
import { EfiGatewayError, toEfiGatewayError } from './efi.errors'
import { mapCobStatus, reaisStringToCents } from './efi.mapper'
import type { EfiCobrancasClient } from './efi-cobrancas.client'
import {
  type ParsedBoletoCharge,
  parseCardDetailCharge,
  parseCreatePlanResponse,
  parseCreateSubscriptionResponse,
  parseDetailCharge,
  parseNotification,
  parseNotificationEntries,
  parseOneStepCardResponse,
  parseOneStepResponse,
  parseSubscriptionDetail,
} from './efi-cobrancas.mapper'

/** Defaults aplicados às cobranças de boleto quando não vierem na requisição. */
export interface BoletoDefaults {
  /** Dias até o vencimento, quando o caso de uso não resolver uma data. */
  expiresDays: number
  /** Multa padrão (% em centavos). */
  fine?: number
  /** Juros padrão ao mês (% em centavos). */
  interest?: number
  /** URL de notificação registrada por cobrança (`metadata.notification_url`). */
  notificationUrl?: string
}

/**
 * Deriva um `txid` determinístico (32 hex) a partir do `paymentId` (UUID),
 * respeitando a regra da Efí `[a-zA-Z0-9]{26,35}`. Determinístico = idempotente:
 * o mesmo pagamento sempre aponta para a MESMA cobrança na Efí, então
 * retries/reprocessamentos não criam cobranças duplicadas.
 */
function toEfiTxid(paymentId: string): string {
  const txid = paymentId.replace(/[^a-zA-Z0-9]/g, '')
  if (txid.length < 26 || txid.length > 35) {
    throw new EfiGatewayError(`paymentId não gera um txid válido para a Efí: ${paymentId}`)
  }
  return txid
}

/**
 * Adapter da Efí Pay para o port `PaymentGateway`. Traduz o nosso vocabulário
 * para a API Pix da Efí (cobrança imediata `PUT /v2/cob/{txid}` + QR Code) e
 * para a API Cobranças (boleto, `POST /charge/one-step`). É a única parte do
 * sistema que conhece o formato da Efí.
 *
 * O `cobrancasClient` é **opcional**: um deploy só-Pix (sem credenciais de
 * Cobranças) continua bootando; os métodos de boleto falham com erro claro.
 */
export class EfiPaymentGateway implements PaymentGateway {
  readonly provider = 'EFI'

  constructor(
    private readonly client: EfiClient,
    private readonly cobrancas?: EfiCobrancasClient,
    private readonly boletoDefaults: BoletoDefaults = { expiresDays: 3 },
  ) {}

  async createPixCharge(input: CreatePixChargeInput): Promise<CreatePixChargeOutput> {
    const expiracao = input.expiresInSeconds ?? 3600
    const txid = toEfiTxid(input.paymentId)

    const body: Record<string, unknown> = {
      calendario: { expiracao },
      valor: { original: input.amount.toReais().toFixed(2) },
      chave: input.pixKey,
    }
    const message = input.payerMessage ?? input.description
    if (message) body.solicitacaoPagador = message.slice(0, 140)

    try {
      // PUT /v2/cob/{txid} — txid determinístico.
      const cob = await this.client.createCharge(txid, body)
      return await this.toChargeOutput(txid, cob, expiracao)
    } catch (error) {
      // A Efí REJEITA reusar um txid (409 `txid_duplicado`) em vez de devolver a
      // cobrança existente. Como o txid é determinístico, isso é exatamente o
      // nosso "idempotente": a cobrança já existe (retry após resposta perdida,
      // ou reprocesso do mesmo pagamento) → busca e reusa, sem duplicar nem falhar.
      if (error instanceof EfiGatewayError && error.providerCode === 'txid_duplicado') {
        const cob = await this.client.detailCharge(txid)
        return await this.toChargeOutput(txid, cob, expiracao)
      }
      throw toEfiGatewayError(error)
    }
  }

  /** Monta o output (busca o QR pela location) a partir de uma cobrança (cob) da Efí. */
  private async toChargeOutput(
    txid: string,
    cob: any,
    fallbackExpiracao: number,
  ): Promise<CreatePixChargeOutput> {
    const locationId = cob?.loc?.id
    const qr = locationId != null ? await this.client.generateQrCode(locationId) : undefined

    const copiaECola = String(qr?.qrcode ?? cob?.pixCopiaECola ?? '')
    if (!copiaECola) {
      // Uma cobrança sem copia-e-cola é inutilizável; falhe alto em vez de
      // persistir um "sucesso" sem código pagável.
      throw new EfiGatewayError(`Efí não retornou copia-e-cola para a cobrança ${txid}`)
    }

    const createdAt = cob?.calendario?.criacao ? new Date(cob.calendario.criacao) : new Date()
    const expiracao = Number(cob?.calendario?.expiracao ?? fallbackExpiracao)

    return {
      providerPaymentId: String(cob?.txid ?? txid),
      txid: String(cob?.txid ?? txid),
      copiaECola,
      imagemQrcodeBase64: qr?.imagemQrcode ? String(qr.imagemQrcode) : undefined,
      locationId: locationId != null ? String(locationId) : undefined,
      expiresAt: new Date(createdAt.getTime() + expiracao * 1000),
    }
  }

  async getPixCharge(txid: string): Promise<ProviderCharge> {
    try {
      const cob = await this.client.detailCharge(txid)
      const firstPix = Array.isArray(cob?.pix) ? cob.pix[0] : undefined

      return {
        providerPaymentId: String(cob?.txid ?? txid),
        txid: String(cob?.txid ?? txid),
        status: mapCobStatus(cob?.status),
        amountInCents: reaisStringToCents(cob?.valor?.original),
        paidAt: firstPix?.horario ? new Date(firstPix.horario) : undefined,
      }
    } catch (error) {
      throw toEfiGatewayError(error)
    }
  }

  // ── Boleto (API Cobranças) ────────────────────────────────────────────────

  async createBoletoCharge(input: CreateBoletoChargeInput): Promise<CreateBoletoChargeOutput> {
    const client = this.requireCobrancas()
    try {
      // ⚠️ `POST /charge/one-step` NÃO é idempotente na Efí (gera um charge_id novo
      // a cada chamada) e a API Cobranças não expõe um lookup por custom_id que
      // funcione (verificado no sandbox). Por isso o POST nunca é re-tentado
      // (idempotent:false no client) e a idempotência vem das camadas acima:
      // o idempotency store por (consumerId, Idempotency-Key) replica a resposta
      // em retries, e o claim (SKIP LOCKED) limita quem cria no modo assíncrono.
      // Janela residual (rara): se a Efí criar o boleto mas o processo cair ANTES
      // de persistir, uma nova tentativa pode emitir um 2º boleto. Estampamos
      // `metadata.custom_id = paymentId` em toda cobrança para rastreio/auditoria.
      const created = await client.createOneStepCharge(this.buildOneStepBody(input))
      return this.toBoletoOutput(parseOneStepResponse(created), input)
    } catch (error) {
      throw toEfiGatewayError(error)
    }
  }

  async getBoletoCharge(providerId: string): Promise<ProviderCharge> {
    const client = this.requireCobrancas()
    try {
      const raw = await client.detailCharge(providerId)
      return parseDetailCharge(raw, providerId)
    } catch (error) {
      throw toEfiGatewayError(error)
    }
  }

  async getNotification(token: string): Promise<ProviderNotification> {
    const client = this.requireCobrancas()
    try {
      const raw = await client.getNotification(token)
      // `entries` carrega a assinatura-pai (ciclos recorrentes); `chargeIds` mantém
      // a semântica antiga (compat. boleto/cartão avulso).
      return { chargeIds: parseNotification(raw), entries: parseNotificationEntries(raw) }
    } catch (error) {
      throw toEfiGatewayError(error)
    }
  }

  // ── Cartão de crédito (API Cobranças, one-step) ───────────────────────────

  async createCardCharge(input: CreateCardChargeInput): Promise<CreateCardChargeOutput> {
    const client = this.requireCobrancas()
    try {
      // ⚠️ Como o boleto, `POST /charge/one-step` NÃO é idempotente (gera um
      // charge_id novo a cada chamada) → o client não re-tenta o POST. A
      // idempotência vem das camadas acima (idempotency store + fencing). Além
      // disso o cartão é SEMPRE síncrono (o `payment_token` é de vida curta), então
      // não há worker assíncrono nem janela de re-claim como no boleto.
      const created = await client.createOneStepCharge(this.buildCardOneStepBody(input))
      const parsed = parseOneStepCardResponse(created)
      return {
        providerPaymentId: parsed.chargeId,
        status: parsed.status,
        installments: parsed.installments ?? input.installments,
        totalInCents: parsed.totalInCents,
      }
    } catch (error) {
      throw toEfiGatewayError(error)
    }
  }

  async getCardCharge(providerId: string): Promise<ProviderCharge> {
    const client = this.requireCobrancas()
    try {
      const raw = await client.detailCharge(providerId)
      return parseCardDetailCharge(raw, providerId)
    } catch (error) {
      throw toEfiGatewayError(error)
    }
  }

  // ── Assinaturas (recorrência via cartão, API Cobranças) ───────────────────

  async createPlan(input: CreatePlanInput): Promise<CreatePlanOutput> {
    const client = this.requireCobrancas()
    try {
      const created = await client.createPlan({
        name: input.name,
        interval: input.intervalMonths,
        // `null` = ilimitado (a Efí aceita repeats nulo).
        repeats: input.repeats,
      })
      return parseCreatePlanResponse(created)
    } catch (error) {
      throw toEfiGatewayError(error)
    }
  }

  async createCardSubscription(
    input: CreateCardSubscriptionInput,
  ): Promise<CreateCardSubscriptionOutput> {
    const client = this.requireCobrancas()
    try {
      // ⚠️ POST não idempotente (subscription_id gerado pela Efí) → o client não
      // re-tenta. A idempotência vem da camada acima (idempotency store + fencing):
      // um retry NÃO deve criar uma 2ª assinatura (cobraria de novo a cada ciclo).
      const created = await client.createOneStepSubscription(
        input.planId,
        this.buildSubscriptionOneStepBody(input),
      )
      const parsed = parseCreateSubscriptionResponse(created)
      return {
        providerSubscriptionId: parsed.subscriptionId,
        status: parsed.status,
        firstChargeId: parsed.firstChargeId,
        firstChargeStatus: parsed.firstChargeStatus,
      }
    } catch (error) {
      throw toEfiGatewayError(error)
    }
  }

  async getSubscription(providerSubscriptionId: string): Promise<ProviderSubscription> {
    const client = this.requireCobrancas()
    try {
      const raw = await client.detailSubscription(providerSubscriptionId)
      return parseSubscriptionDetail(raw, providerSubscriptionId)
    } catch (error) {
      throw toEfiGatewayError(error)
    }
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    const client = this.requireCobrancas()
    try {
      await client.cancelSubscription(providerSubscriptionId)
    } catch (error) {
      throw toEfiGatewayError(error)
    }
  }

  /**
   * Corpo do `POST /plan/:id/subscription/one-step` (cartão). Igual ao one-step de
   * cartão avulso (`buildCardOneStepBody`), mas SEM `installments` — cada ciclo é
   * uma cobrança única. `metadata.custom_id` = nosso subscriptionId (rastreio).
   */
  private buildSubscriptionOneStepBody(
    input: CreateCardSubscriptionInput,
  ): Record<string, unknown> {
    const addr = input.billingAddress
    const billingAddress: Record<string, unknown> = {
      street: addr.street,
      number: addr.number,
      neighborhood: addr.neighborhood,
      zipcode: addr.zipcode.replace(/\D/g, ''),
      city: addr.city,
      state: addr.state,
      ...(addr.complement ? { complement: addr.complement } : {}),
    }

    const creditCard: Record<string, unknown> = {
      payment_token: input.paymentToken,
      billing_address: billingAddress,
      customer: {
        name: input.customer.name,
        email: input.customer.email,
        cpf: input.customer.cpf.replace(/\D/g, ''),
        birth: input.customer.birth,
        phone_number: input.customer.phone.replace(/\D/g, ''),
      },
    }

    const metadata: Record<string, unknown> = { custom_id: input.subscriptionId }
    if (this.boletoDefaults.notificationUrl) {
      metadata.notification_url = this.boletoDefaults.notificationUrl
    }

    return {
      items: [
        {
          name: input.itemName?.slice(0, 255) || 'Assinatura',
          value: Number(input.amount.amountInCents),
          amount: 1,
        },
      ],
      payment: { credit_card: creditCard },
      metadata,
    }
  }

  /** Monta o corpo do `POST /charge/one-step` para cartão (`payment.credit_card`). */
  private buildCardOneStepBody(input: CreateCardChargeInput): Record<string, unknown> {
    const addr = input.billingAddress
    const billingAddress: Record<string, unknown> = {
      street: addr.street,
      number: addr.number,
      neighborhood: addr.neighborhood,
      zipcode: addr.zipcode.replace(/\D/g, ''),
      city: addr.city,
      state: addr.state,
      ...(addr.complement ? { complement: addr.complement } : {}),
    }

    const creditCard: Record<string, unknown> = {
      installments: input.installments,
      payment_token: input.paymentToken,
      billing_address: billingAddress,
      customer: {
        name: input.customer.name,
        email: input.customer.email,
        cpf: input.customer.cpf.replace(/\D/g, ''),
        birth: input.customer.birth,
        phone_number: input.customer.phone.replace(/\D/g, ''),
      },
    }

    const metadata: Record<string, unknown> = { custom_id: input.paymentId }
    if (this.boletoDefaults.notificationUrl) {
      metadata.notification_url = this.boletoDefaults.notificationUrl
    }

    return {
      items: [
        {
          name: input.description?.slice(0, 255) || 'Pagamento',
          value: Number(input.amount.amountInCents),
          amount: 1,
        },
      ],
      payment: { credit_card: creditCard },
      metadata,
    }
  }

  private requireCobrancas(): EfiCobrancasClient {
    if (!this.cobrancas) {
      throw new EfiGatewayError(
        'Cobranças (boleto/cartão) não configurado: EfiCobrancasClient ausente (defina as credenciais Cobranças)',
      )
    }
    return this.cobrancas
  }

  /** Monta o corpo do `POST /charge/one-step` (CPF vs juridical_person por documento). */
  private buildOneStepBody(input: CreateBoletoChargeInput): Record<string, unknown> {
    const doc = input.customer.cpfOrCnpj.replace(/\D/g, '')
    const addr = input.customer.address
    const customer: Record<string, unknown> = {
      email: input.customer.email,
      phone_number: input.customer.phone.replace(/\D/g, ''),
      address: {
        street: addr.street,
        number: addr.number,
        neighborhood: addr.neighborhood,
        zipcode: addr.zipcode.replace(/\D/g, ''),
        city: addr.city,
        state: addr.state,
        ...(addr.complement ? { complement: addr.complement } : {}),
      },
    }
    if (doc.length === 14) {
      customer.juridical_person = {
        corporate_name: input.customer.corporateName ?? input.customer.name,
        cnpj: doc,
      }
    } else {
      customer.name = input.customer.name
      customer.cpf = doc
      if (input.customer.birth) customer.birth = input.customer.birth
    }

    const configurations: Record<string, unknown> = {}
    const fine = input.fine ?? this.boletoDefaults.fine
    const interest = input.interest ?? this.boletoDefaults.interest
    if (fine !== undefined) configurations.fine = fine
    if (interest !== undefined) configurations.interest = interest
    if (input.daysToWriteOff !== undefined) configurations.days_to_write_off = input.daysToWriteOff

    const bankingBillet: Record<string, unknown> = {
      customer,
      expire_at: input.expireAt,
    }
    if (Object.keys(configurations).length > 0) bankingBillet.configurations = configurations
    if (input.message) bankingBillet.message = input.message.slice(0, 400)
    if (input.discount !== undefined) {
      bankingBillet.discount = { type: 'currency', value: input.discount }
    }

    const metadata: Record<string, unknown> = { custom_id: input.paymentId }
    if (this.boletoDefaults.notificationUrl) {
      metadata.notification_url = this.boletoDefaults.notificationUrl
    }

    return {
      items: [{ name: 'Pagamento', value: Number(input.amount.amountInCents), amount: 1 }],
      payment: { banking_billet: bankingBillet },
      metadata,
    }
  }

  private toBoletoOutput(
    parsed: ParsedBoletoCharge,
    input: CreateBoletoChargeInput,
  ): CreateBoletoChargeOutput {
    const barcode = parsed.barcode ?? parsed.digitableLine
    const pdfUrl = parsed.pdfUrl ?? parsed.link
    if (!barcode || !pdfUrl) {
      throw new EfiGatewayError(
        `Boleto ${parsed.chargeId} sem código de barras ou link pagável utilizáveis`,
      )
    }
    return {
      providerPaymentId: parsed.chargeId,
      barcode,
      digitableLine: parsed.digitableLine ?? barcode,
      pdfUrl,
      expiresAt: parsed.expiresAt ?? new Date(`${input.expireAt}T00:00:00Z`),
    }
  }
}
