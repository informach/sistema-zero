import type { ProviderChargeStatus } from '../../../domain/ports/payment-gateway.port'
import { EfiGatewayError } from './efi.errors'

/**
 * Mapeia o status de uma cobrança da API Cobranças (boleto) da Efí para o nosso
 * vocabulário (`ProviderChargeStatus`).
 *
 * paid/settled → paga; canceled/expired → expirada; unpaid/contested → falha;
 * refunded → estornada; new/waiting/identified/approved/link → pendente.
 */
export function mapCobrancasStatus(status: string | undefined): ProviderChargeStatus {
  switch (status) {
    case 'paid':
    case 'settled':
      return 'PAID'
    case 'canceled':
    case 'expired':
      return 'EXPIRED'
    case 'unpaid':
    case 'contested':
      return 'FAILED'
    case 'refunded':
      return 'REFUNDED'
    default:
      return 'PENDING'
  }
}

/** A API Cobranças já usa inteiro em centavos — converte defensivamente para bigint. */
export function centsToBigInt(value: number | string | undefined | null): bigint {
  if (value === undefined || value === null) return 0n
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num)) return 0n
  return BigInt(Math.round(num))
}

export interface ParsedBoletoCharge {
  chargeId: string
  status: string | undefined
  barcode?: string
  digitableLine?: string
  pdfUrl?: string
  link?: string
  expiresAt?: Date
  totalInCents: bigint
}

/** Lê o objeto de dados da cobrança (a resposta vem em `data` ou na raiz). */
function dataOf(raw: any): any {
  return raw?.data ?? raw ?? {}
}

/**
 * Parser **defensivo** da cobrança de boleto da Efí. Lida com as DUAS formas
 * (confirmadas no sandbox via `bun run boleto:create`):
 *  - `POST /charge/one-step`: barcode/pdf/link/expire_at no topo de `data`;
 *  - `GET /charge/:id`: os mesmos campos aninhados em `data.payment.banking_billet`.
 * `charge_id`, `status` e `total` ficam sempre no topo de `data`. Falha alto se
 * não houver nada pagável (boleto sem código/link é inutilizável).
 */
export function parseOneStepResponse(raw: any): ParsedBoletoCharge {
  const data = dataOf(raw)
  const billet = data?.payment?.banking_billet ?? {}
  const chargeId = data?.charge_id ?? data?.id
  if (chargeId == null) {
    throw new EfiGatewayError('Efí Cobranças não retornou charge_id na criação do boleto')
  }

  const barcode = data?.barcode ?? billet?.barcode ?? data?.linha_digitavel ?? data?.barcode_code
  const pdfUrl =
    data?.pdf?.charge ?? billet?.pdf?.charge ?? data?.billet_link ?? billet?.billet_link
  const link = data?.link ?? billet?.link ?? data?.billet_link ?? billet?.billet_link
  if (!barcode && !pdfUrl && !link) {
    throw new EfiGatewayError(`Boleto ${chargeId} sem código de barras nem link pagável`)
  }

  const barcodeStr = barcode ? String(barcode) : undefined
  const expireAt = data?.expire_at ?? billet?.expire_at
  return {
    chargeId: String(chargeId),
    status: data?.status,
    barcode: barcodeStr,
    // A Efí traz a linha digitável no mesmo campo `barcode`.
    digitableLine: barcodeStr,
    pdfUrl: pdfUrl ? String(pdfUrl) : undefined,
    link: link ? String(link) : undefined,
    expiresAt: expireAt ? new Date(expireAt) : undefined,
    totalInCents: centsToBigInt(data?.total),
  }
}

/**
 * Valor PRINCIPAL cobrado (em centavos), invariante a multa/juros/desconto. A
 * verificação de valor (defesa em profundidade) deve comparar o PRINCIPAL: num
 * boleto pago com encargos, `total` inclui multa/juros (ou é reduzido por desconto),
 * o que faria um pagamento legítimo ser rejeitado e ficar PENDING para sempre.
 * Ordem: soma dos `items` → `value` → `total` (fallback, pode incluir encargos).
 */
function principalInCents(data: any): bigint {
  const items = Array.isArray(data?.items) ? data.items : []
  if (items.length > 0) {
    let sum = 0
    for (const it of items) {
      const value = Number(it?.value ?? 0)
      const qty = Number(it?.amount ?? 1)
      if (Number.isFinite(value) && Number.isFinite(qty)) sum += value * qty
    }
    if (sum > 0) return BigInt(Math.round(sum))
  }
  if (data?.value !== undefined && data?.value !== null) {
    const n = Number(data.value)
    if (Number.isFinite(n) && n > 0) return BigInt(Math.round(n))
  }
  return centsToBigInt(data?.total)
}

/** Converte um timestamp da Efí em `Date`, descartando datas inválidas/garbage. */
function parseProviderDate(raw: unknown): Date | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined
  const d = new Date(raw as string | number)
  return Number.isNaN(d.getTime()) ? undefined : d
}

/** Extrai status + paidAt do `GET /charge/:id` (re-consulta para reconciliação). */
export function parseDetailCharge(
  raw: any,
  fallbackId: string,
): {
  providerPaymentId: string
  status: ProviderChargeStatus
  amountInCents: bigint
  paidAt?: Date
} {
  const data = dataOf(raw)
  const history = Array.isArray(data?.history) ? data.history : []
  const paidEntry = [...history]
    .reverse()
    .find((h: any) => h?.status === 'paid' || h?.status === 'settled')
  const paidAtRaw = data?.paid_at ?? paidEntry?.created_at ?? paidEntry?.date
  return {
    providerPaymentId: String(data?.charge_id ?? data?.id ?? fallbackId),
    status: mapCobrancasStatus(data?.status),
    // PRINCIPAL (não `total`): invariante a multa/juros/desconto.
    amountInCents: principalInCents(data),
    // `paidAt` validado: um timestamp garbage viraria `Invalid Date` e faria
    // `markPaid().toISOString()` lançar, travando a confirmação permanentemente.
    paidAt: parseProviderDate(paidAtRaw),
  }
}

/**
 * Extrai os `charge_id` afetados de um `GET /notification/:token`. A resposta é
 * um histórico de eventos; cada um aponta uma cobrança via `identifiers.charge_id`
 * (formato a confirmar no sandbox — toleramos variações).
 */
export function parseNotification(raw: any): string[] {
  const data = raw?.data ?? raw
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.notifications)
      ? data.notifications
      : []
  const ids = new Set<string>()
  for (const entry of list) {
    // Apenas `charge_id` — NÃO `subscription_id` (namespace distinto): um id de
    // assinatura consultado como charge_id bateria no endpoint errado. Eventos de
    // assinatura/carnê serão roteados à parte quando o slice recorrente existir.
    const id = entry?.identifiers?.charge_id ?? entry?.charge_id
    if (id != null) ids.add(String(id))
  }
  return [...ids]
}
