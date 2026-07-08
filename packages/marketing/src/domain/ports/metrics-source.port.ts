import type { Network } from '../publication/publication'
import type { Publication } from '../publication/publication-record'
import type { SocialAccount } from '../social-account/social-account'

/** Snapshot de conta SEM os campos que o worker preenche (id/conta/hora). */
export interface AccountMetricsSample {
  followers: number
  raw: Record<string, unknown>
}

/** Snapshot de publicação SEM os campos que o worker preenche. */
export interface PublicationMetricsSample {
  views: number
  likes: number
  comments: number
  shares?: number
  saves?: number
  reach?: number | null
  watchTimeSeconds?: number | null
  avgWatchRatio?: number | null
  raw: Record<string, unknown>
}

/**
 * Fonte de métricas de UMA rede (YouTube/Instagram/Facebook). O metrics-worker
 * genérico cuida do agendamento (decaimento) e da persistência; a fonte só
 * fala com a API do provedor. Erros de rate/rede devem ser lançados — o worker
 * loga e deixa o decaimento reagendar.
 */
export interface MetricsSource {
  readonly network: Network
  /** Snapshot da conta (seguidores). null = pulou este ciclo (ex.: quota). */
  collectAccount(account: SocialAccount, accessToken: string): Promise<AccountMetricsSample | null>
  /** Snapshots por publicação (chave = publication.id). Ausente = sem dado (post apagado). */
  collectPublications(
    publications: Publication[],
    account: SocialAccount,
    accessToken: string,
  ): Promise<Map<string, PublicationMetricsSample>>
}
