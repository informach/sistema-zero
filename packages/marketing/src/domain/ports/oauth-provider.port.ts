import type { Network } from '../publication/publication'

/**
 * Porta do provedor OAuth de uma rede (Google/Meta/TikTok). Implementações em
 * `infrastructure/gateways/<provedor>/` com fetch nativo (convenção do repo).
 * Datas de expiração são devolvidas em SEGUNDOS relativos (`expiresInSeconds`)
 * — quem transforma em `Date` é o serviço, com o `now()` injetado.
 */
export interface OAuthTokenSet {
  accessToken: string
  /** Google só devolve no 1º consent (`prompt=consent`); Meta usa o próprio user token. */
  refreshToken: string | null
  expiresInSeconds: number | null
  refreshExpiresInSeconds: number | null
  /** Escopos efetivamente concedidos (Meta: via GET /me/permissions). */
  scopes: string[]
  /** id_token OIDC (identidade estável via `sub`), quando o provedor emite. */
  idToken: string | null
}

export interface RefreshedTokens {
  accessToken: string
  /** Alguns provedores rotacionam o refresh (TikTok); Google normalmente não. */
  refreshToken: string | null
  expiresInSeconds: number | null
  refreshExpiresInSeconds: number | null
}

export interface AccountIdentity {
  /** Id estável no provedor (Google: `sub`; Meta: pageId/igUserId). */
  externalId: string
  displayName: string
  username: string | null
  /** Específico por rede (Google: {email, channelId?}; Meta: {pageId, igUserId?...}). */
  metadata: Record<string, unknown>
}

/**
 * Uma CONTA que o consent conecta. Google: 1 (a conta do canal). Meta: N —
 * uma `facebook` por Página (token = PAGE token, que não expira) e uma
 * `instagram` por IG business vinculado (token = o MESMO page token; o
 * refreshToken carrega o USER token long-lived ~60d p/ a renovação).
 */
export interface ProviderAccount {
  network: Network
  identity: AccountIdentity
  tokens: {
    accessToken: string
    refreshToken: string | null
    /** null = token que NÃO expira (page token da Meta). */
    expiresInSeconds: number | null
    refreshExpiresInSeconds: number | null
    scopes: string[]
  }
}

/** Erro do provedor: `permanent` (invalid_grant/revogado) exige reauth. */
export class OAuthProviderError extends Error {
  constructor(
    message: string,
    readonly permanent: boolean,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'OAuthProviderError'
  }
}

export interface OAuthProvider {
  buildAuthorizeUrl(input: { state: string; codeChallenge: string; redirectUri: string }): string
  exchangeCode(input: {
    code: string
    codeVerifier: string
    redirectUri: string
  }): Promise<OAuthTokenSet>
  /** TODAS as contas que este consent conecta (Google: 1; Meta: Páginas + IGs). */
  resolveAccounts(tokens: OAuthTokenSet): Promise<ProviderAccount[]>
  refresh(refreshToken: string): Promise<RefreshedTokens>
  /**
   * Renovação PROATIVA das contas derivadas (Meta: fb_exchange_token no user
   * token ainda válido → re-deriva os page tokens). Provedores sem o conceito
   * não implementam.
   */
  renewAccounts?(userToken: string): Promise<ProviderAccount[]>
  /** Revogação best-effort ao desconectar (falha não impede a desconexão local). */
  revoke(token: string): Promise<void>
}
