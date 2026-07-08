import type { Network } from '../publication/publication'
import type { SocialAccount } from '../social-account/social-account'

export interface SocialAccountRepository {
  create(account: SocialAccount): Promise<void>
  byId(id: string): Promise<SocialAccount | null>
  list(): Promise<SocialAccount[]>
  listByNetwork(network: Network): Promise<SocialAccount[]>
  /** Update com concorrência otimista: 0 linhas (versão defasada) → false. */
  update(account: SocialAccount, expectedVersion: number): Promise<boolean>
  /**
   * Upsert atômico pela unique `(network, external_id)` — reconectar a MESMA
   * conta atualiza tokens/escopos em vez de duplicar. Se o refresh token novo
   * vier nulo (Google só o devolve no 1º consent), PRESERVA o antigo.
   * Retorna a linha persistida (id vencedor).
   */
  upsertByExternalId(account: SocialAccount): Promise<SocialAccount>
  /** Contas `connected` com access token vencendo dentro da margem (token-refresh-worker). */
  listExpiring(now: Date, marginMs: number, limit: number): Promise<SocialAccount[]>
  /**
   * Contas `connected` com o token de RENOVAÇÃO vencendo (Meta: user token 60d
   * em `refresh_expires_at`) — passe de renovação proativa do worker.
   */
  listRefreshExpiring(now: Date, marginMs: number, limit: number): Promise<SocialAccount[]>
}
