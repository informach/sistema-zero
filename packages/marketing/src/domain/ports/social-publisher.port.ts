import type { MediaAsset } from '../media/media-asset'
import type { Network, PublicationFormat } from '../publication/publication'
import type { Publication } from '../publication/publication-record'
import type { SocialAccount } from '../social-account/social-account'

/**
 * Resultado de uma tentativa de publicação automática:
 * - `published` — post no ar (id/URL externos preenchidos).
 * - `pending` — side-effect em andamento no provedor (ex.: YouTube esperando o
 *   `publishAt` nativo); repoll em `repollAt` SEM gastar tentativa.
 * - `deferred` — adiada por restrição externa (quota diária); SEM gastar
 *   tentativa, volta em `nextAttemptAt`.
 * - `retryable` — falha transitória (rede/5xx); backoff + attempts++.
 * - `permanent` — falha definitiva (payload inválido/conta revogada) → failed.
 */
export type PublishOutcome =
  | { kind: 'published'; externalPostId: string; externalUrl: string | null }
  | { kind: 'pending'; repollAt: Date }
  | { kind: 'deferred'; nextAttemptAt: Date; reason: string }
  | { kind: 'retryable'; reason: string }
  | { kind: 'permanent'; reason: string }

export interface PublishInput {
  publication: Publication
  account: SocialAccount
  /** Access token já ABERTO (só em memória — nunca persistir em claro). */
  accessToken: string
  /** Assets PRONTOS do conteúdo (o publisher escolhe vídeo/capa por kind/MIME). */
  assets: MediaAsset[]
  /** Ordem dos assets da PUBLICAÇÃO (carrossel) — vazia fora do ig_carousel. */
  orderedAssetIds: string[]
  /** Lê um range de bytes do asset (upload em chunks — memória O(chunk)). */
  assetBytes(asset: MediaAsset, start: number, endInclusive: number): Promise<Uint8Array>
  /**
   * URL presigned de LEITURA do asset (a Meta baixa a mídia por URL — o R2 é
   * privado). Gera uma URL NOVA a cada chamada/tentativa (TTL curto).
   */
  assetUrl(asset: MediaAsset, ttlSeconds: number): Promise<string>
  /** Checkpoint atual (`publications.provider_session`). */
  session: Record<string, unknown>
  /**
   * Persiste o checkpoint IMEDIATAMENTE (merge no provider_session). Chamar
   * ANTES e DEPOIS de cada side-effect — retry pós-crash NUNCA recria um
   * side-effect cujo id já foi salvo (uploadUri/videoId/creation_id).
   */
  saveSession(patch: Record<string, unknown>): Promise<void>
}

export interface SocialPublisher {
  readonly network: Network
  supports(format: PublicationFormat): boolean
  publish(input: PublishInput): Promise<PublishOutcome>
}
