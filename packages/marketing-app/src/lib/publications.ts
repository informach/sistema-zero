/**
 * Estados e regras das publicações. PURO (unit-testado) — ESPELHO do
 * @sistemazero/marketing (`domain/publication/publication.ts` e a janela de
 * agendamento do `publication.service.ts`); mudou lá, mude aqui.
 */

import type { PublicationFormat } from './networks'
import type { ContentStage } from './pipeline'

export const PUBLICATION_STATUSES = [
  'draft',
  'ready',
  'scheduled',
  'publishing',
  'awaiting_manual',
  'published',
  'failed',
  'canceled',
] as const

export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number]

/** Rótulos PT por status (badges/chips do calendário e composer). */
export const STATUS_LABELS: Record<PublicationStatus, string> = {
  draft: 'Rascunho',
  ready: 'Pronta',
  scheduled: 'Agendada',
  publishing: 'Publicando',
  awaiting_manual: 'Aguardando publicação',
  published: 'Publicada',
  failed: 'Falhou',
  canceled: 'Cancelada',
}

/** Classes de cor por status (tokens do tema). */
export const STATUS_COLORS: Record<PublicationStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  ready: 'bg-chart-1/15 text-chart-1',
  scheduled: 'bg-primary/15 text-primary',
  publishing: 'bg-chart-4/15 text-chart-4',
  awaiting_manual: 'bg-chart-5/15 text-chart-5',
  published: 'bg-success/15 text-success-foreground',
  failed: 'bg-destructive/15 text-destructive',
  canceled: 'bg-muted text-muted-foreground',
}

/** Estados em que legenda/capa/título ainda podem ser editados (espelho). */
const EDITABLE_STATUSES: ReadonlySet<PublicationStatus> = new Set([
  'draft',
  'ready',
  'scheduled',
  'awaiting_manual',
  'failed',
])

export function isEditable(status: PublicationStatus): boolean {
  return EDITABLE_STATUSES.has(status)
}

/** Estados de onde se pode (re)agendar (espelho). */
export function canSchedule(status: PublicationStatus): boolean {
  return EDITABLE_STATUSES.has(status)
}

/** Estados de onde se pode cancelar (espelho). */
export function canCancelPublication(status: PublicationStatus): boolean {
  return EDITABLE_STATUSES.has(status)
}

/** Estados de onde o modo lembrete pode marcar como publicada (espelho). */
export function canMarkPublished(status: PublicationStatus): boolean {
  return (
    status === 'draft' ||
    status === 'ready' ||
    status === 'scheduled' ||
    status === 'awaiting_manual' ||
    status === 'failed'
  )
}

/** A publicação conta como "ativa" (espelho — canceladas ficam de fora). */
export function isActivePublication(status: PublicationStatus): boolean {
  return status !== 'canceled'
}

/** Stories não têm API de publicação em rede nenhuma — sempre modo lembrete. */
export function forcesManualMode(format: PublicationFormat): boolean {
  return format === 'ig_story'
}

/** Conteúdo pode ganhar publicações nesta etapa? (espelho de `canCreatePublications`). */
export function canCreatePublications(stage: ContentStage): boolean {
  return stage === 'approved' || stage === 'scheduled' || stage === 'published'
}

const PAST_GRACE_MS = 5 * 60_000
const MAX_FUTURE_MS = 2 * 365 * 86_400_000

/**
 * Validação CLIENT da janela de agendamento (espelho do `assertScheduleWindow`
 * do backend: nada no passado além de 5min de folga, teto de 2 anos). Devolve a
 * mensagem de erro em PT ou null quando válido — o backend revalida sempre.
 */
export function validateScheduleWindow(scheduledAt: Date, now: Date): string | null {
  if (Number.isNaN(scheduledAt.getTime())) return 'Escolha uma data e hora válidas'
  if (scheduledAt.getTime() < now.getTime() - PAST_GRACE_MS) {
    return 'O horário de agendamento não pode estar no passado'
  }
  if (scheduledAt.getTime() > now.getTime() + MAX_FUTURE_MS) {
    return 'O horário de agendamento está longe demais (máximo 2 anos)'
  }
  return null
}
