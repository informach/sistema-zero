import type {
  CreatePixChargeInput,
  CreatePixChargeOutput,
  PaymentGateway,
  ProviderCharge,
} from '../../../domain/ports/payment-gateway.port'
import type { EfiClient } from './efi.client'
import { EfiGatewayError, toEfiGatewayError } from './efi.errors'
import { mapCobStatus, reaisStringToCents } from './efi.mapper'

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
 * vice-versa. É a única parte do sistema que conhece o formato da Efí.
 */
export class EfiPaymentGateway implements PaymentGateway {
  readonly provider = 'EFI'

  constructor(private readonly client: EfiClient) {}

  async createPixCharge(input: CreatePixChargeInput): Promise<CreatePixChargeOutput> {
    const expiracao = input.expiresInSeconds ?? 3600
    const txid = toEfiTxid(input.paymentId)

    const body: Record<string, unknown> = {
      calendario: { expiracao },
      valor: { original: input.amount.toReais().toFixed(2) },
      chave: input.pixKey,
    }
    const message = input.payerMessage ?? input.description
    if (message) body['solicitacaoPagador'] = message.slice(0, 140)

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
        providerPaymentId: String(cob.txid ?? txid),
        txid: String(cob.txid ?? txid),
        status: mapCobStatus(cob?.status),
        amountInCents: reaisStringToCents(cob?.valor?.original),
        paidAt: firstPix?.horario ? new Date(firstPix.horario) : undefined,
      }
    } catch (error) {
      throw toEfiGatewayError(error)
    }
  }
}
