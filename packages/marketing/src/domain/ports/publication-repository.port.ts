import type { Network, PublicationFormat, PublicationStatus } from '../publication/publication'
import type { Publication } from '../publication/publication-record'

/** Filtro da listagem por janela (Calendário/Painel). Janela é OPCIONAL. */
export interface PublicationsWindowFilter {
  /** Filtra `scheduled_at >= from` (implica scheduled_at não nulo). */
  from?: Date
  /** Filtra `scheduled_at < to` (implica scheduled_at não nulo). */
  to?: Date
  statuses?: PublicationStatus[]
  network?: Network
  format?: PublicationFormat
  contentId?: string
  limit: number
  offset: number
}

/** Item da listagem: publicação + título/tipo do conteúdo (join p/ chips da UI). */
export interface PublicationListItem {
  publication: Publication
  contentTitle: string
  contentType: string
}

export interface PublicationRepository {
  create(publication: Publication): Promise<void>
  /** Insert único do cross-post — tudo entra ou nada entra. */
  createMany(publications: Publication[]): Promise<void>
  byId(id: string): Promise<Publication | null>
  /** Update com concorrência otimista: 0 linhas (versão defasada) → false. */
  update(publication: Publication, expectedVersion: number): Promise<boolean>
  listByContent(contentId: string): Promise<Publication[]>
  listByContents(contentIds: string[]): Promise<Map<string, Publication[]>>
  /** Listagem com janela de data + filtros (ordem `scheduled_at ASC NULLS LAST, id`). */
  listByWindow(filter: PublicationsWindowFilter): Promise<{
    items: PublicationListItem[]
    total: number
  }>
  /**
   * Claim do publisher-worker (ramo MANUAL): agendadas vencidas + lembretes com
   * lease vencido (reaper). `FOR UPDATE SKIP LOCKED`; a linha claimada vira
   * `awaiting_manual` com `attempts+1` e lease em `next_attempt_at` — crash
   * entre o claim e o envio devolve a linha à fila quando o lease vence.
   * Linhas com `attempts >= maxAttempts` NÃO são claimadas (teto do lembrete).
   */
  claimDueManualReminders(
    now: Date,
    limit: number,
    leaseMs: number,
    maxAttempts: number,
  ): Promise<Publication[]>
  /**
   * Claim do publisher-worker (ramo AUTO): publicações `auto` agendadas dentro
   * do LEAD de upload antecipado (`scheduled_at <= now + leadMs`) + presas em
   * `publishing` com lease vencido (reaper — re-claim incrementa attempts).
   * A linha claimada vira `publishing` com lease em `next_attempt_at`.
   */
  claimDueAutoPublish(input: {
    now: Date
    leadMs: number
    limit: number
    leaseMs: number
    maxAttempts: number
    networks: Network[]
  }): Promise<Publication[]>
  /**
   * Fila do metrics-worker (decaimento): publicadas com post externo e
   * `metrics_next_collect_at <= now` (NULL = fora do radar, nunca elegível).
   */
  listDueForMetrics(input: { network: Network; now: Date; limit: number }): Promise<Publication[]>
  /**
   * Grava a coleta + a PRÓXIMA (decaimento). Campos operacionais do worker —
   * não mexe em `version` (não conflita com edições da equipe).
   */
  updateMetricsSchedule(
    items: Array<{ id: string; collectedAt: Date; nextCollectAt: Date | null }>,
  ): Promise<void>
}
