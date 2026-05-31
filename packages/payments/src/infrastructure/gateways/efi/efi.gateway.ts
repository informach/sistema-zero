import type {
  CreateBoletoChargeInput,
  CreateBoletoChargeOutput,
  CreatePixChargeInput,
  CreatePixChargeOutput,
  PaymentGateway,
  ProviderCharge,
  ProviderNotification,
} from '../../../domain/ports/payment-gateway.port'
import type { EfiClient } from './efi.client'
import { EfiGatewayError, toEfiGatewayError } from './efi.errors'
import { mapCobStatus, reaisStringToCents } from './efi.mapper'
import type { EfiCobrancasClient } from './efi-cobrancas.client'
import {
  type ParsedBoletoCharge,
  parseDetailCharge,
  parseNotification,
  parseOneStepResponse,
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
      return { chargeIds: parseNotification(raw) }
    } catch (error) {
      throw toEfiGatewayError(error)
    }
  }

  private requireCobrancas(): EfiCobrancasClient {
    if (!this.cobrancas) {
      throw new EfiGatewayError(
        'Boleto não configurado: EfiCobrancasClient ausente (defina as credenciais Cobranças)',
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
