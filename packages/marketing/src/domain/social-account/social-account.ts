import type { Network } from '../publication/publication'

export type SocialAccountStatus = 'connected' | 'needs_reauth' | 'revoked' | 'disabled'

/** Conta social conectada (tokens SEMPRE selados — nunca em claro no banco). */
export interface SocialAccount {
  id: string
  version: number
  network: Network
  externalId: string
  displayName: string
  username: string | null
  /** Selados pela secret-box (`v1.<iv>.<tag>.<ct>`). Views NUNCA expõem. */
  accessTokenEnc: string | null
  refreshTokenEnc: string | null
  tokenExpiresAt: Date | null
  refreshExpiresAt: Date | null
  scopes: string[]
  status: SocialAccountStatus
  metadata: Record<string, unknown>
  connectedBy: string
  lastRefreshAt: Date | null
  lastRefreshError: string | null
  createdAt: Date
  updatedAt: Date
}

/** O access token está para vencer (dentro da margem) e a conta pode renovar? */
export function needsRefresh(account: SocialAccount, now: Date, marginMs: number): boolean {
  if (account.status !== 'connected') return false
  if (!account.refreshTokenEnc) return false
  if (!account.tokenExpiresAt) return false
  return account.tokenExpiresAt.getTime() <= now.getTime() + marginMs
}

/** A conta pode publicar automaticamente com os escopos exigidos pela rede? */
export function hasScopes(account: SocialAccount, required: readonly string[]): boolean {
  const owned = new Set(account.scopes)
  return required.every((scope) => owned.has(scope))
}

/**
 * Escopos que a publicação AUTOMÁTICA exige por rede. YouTube: `youtube.upload`
 * (videos.insert/thumbnails.set) + `youtube` completo (videos.update/delete —
 * reagendar/cancelar pós-upload). Conta conectada sem eles → CTA "reconecte".
 */
export const AUTO_PUBLISH_SCOPES: Record<Network, readonly string[]> = {
  youtube: [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube',
  ],
  // Meta (F3): o IG publica com o PAGE token — os escopos vêm do consent do
  // Facebook Login (por isso pages_read_engagement aparece nos dois).
  instagram: ['instagram_basic', 'instagram_content_publish', 'pages_read_engagement'],
  facebook: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'],
  // TikTok (F4): Direct Post exige video.publish (os demais escopos são leitura).
  tiktok: ['video.publish'],
}

/** A conta serve para o publisher automático da rede? */
export function canAutoPublish(account: SocialAccount): boolean {
  return account.status === 'connected' && hasScopes(account, AUTO_PUBLISH_SCOPES[account.network])
}
