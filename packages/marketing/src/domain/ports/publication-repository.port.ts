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
}
