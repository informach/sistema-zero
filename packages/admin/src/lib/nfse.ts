/**
 * Helpers PUROS da fatia Notas fiscais (NFS-e): label/cor de status, máscara de
 * documento, chave de acesso truncada, data principal da nota e gates de ação.
 * Sem React/server-only — consumível por Client Components e unit-testado.
 */
import type { InvoiceView } from './types'

/** Rótulos PT-BR dos status da nota (espelha o enum do @sistemazero/fiscal). */
export const INVOICE_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Agendada',
  EMITTED: 'Emitida',
  SKIPPED: 'Dispensada',
  FAILED: 'Falhou',
  CANCEL_PENDING: 'Cancelamento pendente',
  CANCEL_FAILED: 'Cancelamento recusado',
  CANCELLED: 'Cancelada',
  SUBSTITUTED: 'Substituída',
}

/** Estados que exigem intervenção fiscal no painel. */
export const INVOICE_FAILURE_STATUSES = ['FAILED', 'CANCEL_FAILED'] as const

export type InvoiceBadgeVariant = 'success' | 'muted' | 'destructive' | 'default' | 'outline'

// SCHEDULED = aguardando (outline), EMITTED = sucesso, FAILED = erro,
// CANCEL_PENDING = alerta (default), SKIPPED/CANCELLED/SUBSTITUTED = neutros.
const INVOICE_STATUS_VARIANTS: Record<string, InvoiceBadgeVariant> = {
  SCHEDULED: 'outline',
  EMITTED: 'success',
  SKIPPED: 'muted',
  FAILED: 'destructive',
  CANCEL_PENDING: 'default',
  CANCEL_FAILED: 'destructive',
  CANCELLED: 'muted',
  SUBSTITUTED: 'muted',
}

export function invoiceStatusLabel(status: string): string {
  return INVOICE_STATUS_LABELS[status] ?? status
}

export function invoiceStatusVariant(status: string): InvoiceBadgeVariant {
  return INVOICE_STATUS_VARIANTS[status] ?? 'muted'
}

/**
 * CPF/CNPJ com máscara (11 dígitos → 000.000.000-00; 14 → 00.000.000/0000-00).
 * Outros tamanhos voltam como vieram (não inventa máscara p/ documento estranho).
 */
export function formatDocument(document: string): string {
  const digits = document.replace(/\D/g, '')
  if (digits.length === 11) {
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
  }
  if (digits.length === 14) {
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  }
  return document
}

/** Chave de acesso truncada: 8 primeiros…6 últimos (≤16 chars volta inteira). */
export function truncateAccessKey(key: string): string {
  if (key.length <= 16) return key
  return `${key.slice(0, 8)}…${key.slice(-6)}`
}

/** "nº · série" da DPS p/ tabela/detalhe ('—' quando a nota não foi emitida). */
export function formatDps(series: string | null, number: string | null): string {
  if (!series && !number) return '—'
  return `${number ?? '—'} · série ${series ?? '—'}`
}

/** Data principal da linha: emitida quando houver, senão a agendada. */
export function invoiceMainDate(invoice: Pick<InvoiceView, 'emittedAt' | 'scheduledFor'>): {
  label: 'Emitida em' | 'Agendada para'
  iso: string
} {
  return invoice.emittedAt
    ? { label: 'Emitida em', iso: invoice.emittedAt }
    : { label: 'Agendada para', iso: invoice.scheduledFor }
}

/**
 * Data-SÓ (sem hora) em pt-BR a partir da parte `YYYY-MM-DD` do ISO — parse por
 * componentes p/ não deslocar o dia por fuso (competência é um dia civil).
 */
export function formatDateOnly(iso: string | null | undefined): string {
  if (!iso) return '—'
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return '—'
  return `${m[3]}/${m[2]}/${m[1]}`
}

/** Soma contagens do `/stats` p/ um grupo de status (cards de resumo). */
export function sumStatusCounts(
  byStatus: Record<string, number>,
  statuses: readonly string[],
): number {
  return statuses.reduce((acc, s) => acc + (byStatus[s] ?? 0), 0)
}

// ── Gates de ação por estado (a UI espelha as regras do fiscal) ──

/** PDF disponível em NFS-e válida com o PDF já armazenado. */
export function canDownloadPdf(inv: Pick<InvoiceView, 'status' | 'pdfStoredAt'>): boolean {
  return (inv.status === 'EMITTED' || inv.status === 'CANCEL_FAILED') && inv.pdfStoredAt !== null
}

/** Reprocessar: só nota FALHADA. */
export function canRetryInvoice(inv: Pick<InvoiceView, 'status'>): boolean {
  return inv.status === 'FAILED'
}

/** Cancelar/repetir cancelamento: nota EMITIDA ou com rejeição determinística. */
export function canCancelInvoice(inv: Pick<InvoiceView, 'status'>): boolean {
  return inv.status === 'EMITTED' || inv.status === 'CANCEL_FAILED'
}

/** Substituir: só nota EMITIDA (a original é cancelada por substituição). */
export function canSubstituteInvoice(inv: Pick<InvoiceView, 'status'>): boolean {
  return inv.status === 'EMITTED'
}

/** Emitir agora (antecipar — NÃO espera o fim da garantia): só nota AGENDADA. */
export function canEmitNow(inv: Pick<InvoiceView, 'status'>): boolean {
  return inv.status === 'SCHEDULED'
}

/**
 * Motivo de cancelamento válido. Espelha o contrato do fiscal: o motivo vira o
 * `xMotivo` do evento e101101 = tipo TSMotivo do XSD = **15..255** chars (fora
 * disso a Sefin rejeita o cancelamento e a nota fica presa em CANCEL_PENDING).
 */
export function isValidCancelReason(reason: string): boolean {
  const trimmed = reason.trim()
  return trimmed.length >= 15 && trimmed.length <= 255
}

// ── Emissão manual ──

const UUID_PART = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const UUID_RE = new RegExp(`^${UUID_PART}$`, 'i')

/** UUID canônico (8-4-4-4-12 hex) — formato do Payment ID da emissão manual. */
export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value)
}

/**
 * Extrai o id da nota existente da mensagem de `INVOICE_ALREADY_EXISTS`
 * ("Já existe nota ativa para este pagamento (<id>)"). Ignora o próprio
 * `paymentId` caso a mensagem o inclua; `null` quando não há UUID extraível.
 */
export function extractExistingInvoiceId(message: string, paymentId?: string): string | null {
  const matches = message.match(new RegExp(UUID_PART, 'gi'))
  if (!matches) return null
  const exclude = paymentId?.toLowerCase()
  return matches.find((m) => m.toLowerCase() !== exclude) ?? null
}

/**
 * Resumo de uma linha do `detail` dos eventos p/ a timeline: `k: v` separados
 * por " · ", objetos viram JSON, truncado em `max`. `null` quando vazio.
 */
export function summarizeEventDetail(
  detail: Record<string, unknown> | null | undefined,
  max = 160,
): string | null {
  if (!detail) return null
  const entries = Object.entries(detail)
  if (entries.length === 0) return null
  const joined = entries
    .map(([k, v]) => `${k}: ${typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)}`)
    .join(' · ')
  return joined.length > max ? `${joined.slice(0, max - 1)}…` : joined
}
