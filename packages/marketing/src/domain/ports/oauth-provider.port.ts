/**
 * Porta do provedor OAuth de uma rede (Google/Meta/TikTok). Implementações em
 * `infrastructure/gateways/<rede>/` com fetch nativo (convenção do repo).
 * Datas de expiração são devolvidas em SEGUNDOS relativos (`expiresInSeconds`)
 * — quem transforma em `Date` é o serviço, com o `now()` injetado.
 */
export interface OAuthTokenSet {
  accessToken: string
  /** Google só devolve no 1º consent (por isso `prompt=consent`); pode vir nulo. */
  refreshToken: string | null
  expiresInSeconds: number | null
  refreshExpiresInSeconds: number | null
  /** Escopos efetivamente concedidos (campo `scope` da resposta). */
  scopes: string[]
  /** id_token OIDC (identidade estável via `sub`), quando o escopo `openid` foi pedido. */
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
  /** Id estável da conta no provedor (Google: `sub` do id_token). */
  externalId: string
  displayName: string
  username: string | null
  /** Específico por rede (Google: {email, channelId?, channelTitle?}). */
  metadata: Record<string, unknown>
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
  refresh(refreshToken: string): Promise<RefreshedTokens>
  /** Identidade da conta (Google: sub/e-mail do id_token + canal via channels.list best-effort). */
  fetchIdentity(accessToken: string, idToken: string | null): Promise<AccountIdentity>
  /** Revogação best-effort ao desconectar (falha não impede a desconexão local). */
  revoke(token: string): Promise<void>
}
