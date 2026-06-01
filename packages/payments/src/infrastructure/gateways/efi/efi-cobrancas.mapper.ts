import type {
  ProviderChargeStatus,
  ProviderNotificationEntry,
  ProviderSubscriptionStatus,
} from '../../../domain/ports/payment-gateway.port'
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

/**
 * Mapeia o status de uma cobrança de CARTÃO (one-step) da API Cobranças. Difere
 * do boleto (`mapCobrancasStatus`): aqui `approved` (transação aprovada e
 * capturada no fluxo one-step) é **PAID**; `unpaid` (recusada) é FAILED;
 * `waiting` (em análise) é PENDING.
 */
export function mapCardStatus(status: string | undefined): ProviderChargeStatus {
  switch (status) {
    case 'approved':
    case 'paid':
    case 'settled':
      return 'PAID'
    case 'unpaid':
    case 'canceled':
    case 'contested':
      return 'FAILED'
    case 'refunded':
      return 'REFUNDED'
    default:
      // new/waiting/identified/link → ainda pendente.
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

export interface ParsedCardCharge {
  chargeId: string
  status: ProviderChargeStatus
  installments?: number
  totalInCents: bigint
}

/**
 * Parser da resposta de criação one-step de CARTÃO (`POST /charge/one-step` com
 * `payment.credit_card`). A resposta é síncrona: `data.status` já indica
 * approved/unpaid/waiting. Falha alto se faltar `charge_id`.
 */
export function parseOneStepCardResponse(raw: any): ParsedCardCharge {
  const data = dataOf(raw)
  const chargeId = data?.charge_id ?? data?.id
  if (chargeId == null) {
    throw new EfiGatewayError('Efí Cobranças não retornou charge_id na criação do cartão')
  }
  const installments = data?.installments != null ? Number(data.installments) : undefined
  return {
    chargeId: String(chargeId),
    status: mapCardStatus(data?.status),
    installments:
      installments !== undefined && Number.isFinite(installments) ? installments : undefined,
    totalInCents: centsToBigInt(data?.total),
  }
}

/**
 * Extrai status + paidAt do `GET /charge/:id` de CARTÃO (re-consulta para
 * reconciliação/notificação). Igual a `parseDetailCharge`, mas cartão-aware:
 * usa `mapCardStatus` (onde `approved` é PAID), não `mapCobrancasStatus`.
 */
export function parseCardDetailCharge(
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
    .find((h: any) => h?.status === 'approved' || h?.status === 'paid' || h?.status === 'settled')
  const paidAtRaw = data?.paid_at ?? paidEntry?.created_at ?? paidEntry?.date
  return {
    providerPaymentId: String(data?.charge_id ?? data?.id ?? fallbackId),
    status: mapCardStatus(data?.status),
    amountInCents: principalInCents(data),
    paidAt: parseProviderDate(paidAtRaw),
  }
}

/** Normaliza a lista de eventos de um `GET /notification/:token` (tolera variações). */
function notificationList(raw: any): any[] {
  const data = raw?.data ?? raw
  return Array.isArray(data) ? data : Array.isArray(data?.notifications) ? data.notifications : []
}

/**
 * Extrai os `charge_id` afetados de um `GET /notification/:token`. A resposta é
 * um histórico de eventos; cada um aponta uma cobrança via `identifiers.charge_id`
 * (formato a confirmar no sandbox — toleramos variações). Mantido para o caminho
 * de boleto/cartão avulso; ciclos de assinatura usam `parseNotificationEntries`.
 */
export function parseNotification(raw: any): string[] {
  const ids = new Set<string>()
  for (const entry of notificationList(raw)) {
    const id = entry?.identifiers?.charge_id ?? entry?.charge_id
    if (id != null) ids.add(String(id))
  }
  return [...ids]
}

/**
 * Extrai as entradas (cobrança + assinatura-pai, quando houver) de um
 * `GET /notification/:token`. Um ciclo de assinatura traz `identifiers.charge_id`
 * **e** `identifiers.subscription_id`; cobrança avulsa traz só `charge_id`. O
 * handler usa `subscriptionId` para rotear ao caminho recorrente. Defensivo:
 * confirme os nomes exatos no sandbox.
 */
export function parseNotificationEntries(raw: any): ProviderNotificationEntry[] {
  const seen = new Set<string>()
  const entries: ProviderNotificationEntry[] = []
  for (const entry of notificationList(raw)) {
    const chargeId = entry?.identifiers?.charge_id ?? entry?.charge_id
    if (chargeId == null) continue
    const subscriptionRaw =
      entry?.identifiers?.subscription_id ?? entry?.subscription_id ?? undefined
    const subscriptionId = subscriptionRaw != null ? String(subscriptionRaw) : undefined
    // Dedup por (charge, subscription) — o mesmo par pode repetir no histórico.
    const key = `${chargeId}:${subscriptionId ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    entries.push({ chargeId: String(chargeId), subscriptionId })
  }
  return entries
}

/**
 * Mapeia o status de uma ASSINATURA da Efí para o nosso vocabulário.
 * active → ACTIVE; canceled → CANCELED; expired/finished/ended → EXPIRED;
 * new/created/waiting → PENDING.
 */
export function mapSubscriptionStatus(status: string | undefined): ProviderSubscriptionStatus {
  switch (status) {
    case 'active':
      return 'ACTIVE'
    case 'canceled':
    case 'cancelled':
      return 'CANCELED'
    case 'expired':
    case 'finished':
    case 'ended':
      return 'EXPIRED'
    default:
      return 'PENDING'
  }
}

/** Parser da resposta de `POST /plan`. Falha alto se faltar `plan_id`. */
export function parseCreatePlanResponse(raw: any): { planId: string } {
  const data = dataOf(raw)
  const planId = data?.plan_id ?? data?.id
  if (planId == null) {
    throw new EfiGatewayError('Efí Cobranças não retornou plan_id na criação do plano')
  }
  return { planId: String(planId) }
}

export interface ParsedSubscription {
  subscriptionId: string
  status: ProviderSubscriptionStatus
  firstChargeId?: string
  firstChargeStatus?: ProviderChargeStatus
}

/**
 * Parser da resposta de criação one-step de ASSINATURA. Extrai `subscription_id`,
 * o status da assinatura e — quando exposta — a 1ª cobrança (charge_id + status).
 * Defensivo quanto ao formato (a confirmar no sandbox). Falha alto sem `subscription_id`.
 */
export function parseCreateSubscriptionResponse(raw: any): ParsedSubscription {
  const data = dataOf(raw)
  const subscriptionId = data?.subscription_id ?? data?.id
  if (subscriptionId == null) {
    throw new EfiGatewayError(
      'Efí Cobranças não retornou subscription_id na criação da assinatura',
    )
  }
  // A 1ª cobrança pode vir aninhada em `charge`/`first_execution`, ou no topo.
  const charge = data?.charge ?? data?.first_execution ?? {}
  const firstChargeRaw = charge?.charge_id ?? charge?.id ?? data?.charge_id
  const firstChargeStatusRaw = charge?.status ?? (firstChargeRaw != null ? data?.status : undefined)
  return {
    subscriptionId: String(subscriptionId),
    status: mapSubscriptionStatus(data?.status),
    firstChargeId: firstChargeRaw != null ? String(firstChargeRaw) : undefined,
    firstChargeStatus:
      firstChargeRaw != null && firstChargeStatusRaw != null
        ? mapCardStatus(firstChargeStatusRaw)
        : undefined,
  }
}

/** Extrai status + id do `GET /subscription/:id` (reconciliação/cancelamento). */
export function parseSubscriptionDetail(
  raw: any,
  fallbackId: string,
): { providerSubscriptionId: string; status: ProviderSubscriptionStatus } {
  const data = dataOf(raw)
  return {
    providerSubscriptionId: String(data?.subscription_id ?? data?.id ?? fallbackId),
    status: mapSubscriptionStatus(data?.status),
  }
}
