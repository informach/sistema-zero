/**
 * Porta do provedor OAuth do Gmail (Google). Implementação em
 * `infrastructure/gateways/google/gmail-oauth-provider.ts` com fetch nativo
 * (convenção do repo). Datas de expiração vêm em SEGUNDOS relativos — quem
 * transforma em `Date` é o serviço, com o `now()` injetado.
 */
export interface OAuthTokenSet {
  accessToken: string
  /** Google só devolve no consent (`prompt=consent`); ausente na reconexão sem consent. */
  refreshToken: string | null
  expiresInSeconds: number | null
  /** Escopos efetivamente concedidos. */
  scopes: string[]
  /** id_token OIDC (identidade estável via `sub`). */
  idToken: string | null
}

export interface RefreshedTokens {
  accessToken: string
  /** Google normalmente não rotaciona o refresh; se vier, re-selamos. */
  refreshToken: string | null
  expiresInSeconds: number | null
}

/** Identidade da conta a partir do id_token (canal TLS direto do Google). */
export interface GmailIdentity {
  /** `sub` do id_token — id estável da conta Google. */
  sub: string
  email: string | null
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
  /** Identidade a partir do id_token (decodifica o payload; NÃO faz rede). */
  identityFromIdToken(idToken: string | null): GmailIdentity | null
  /** Revogação best-effort ao desconectar (falha não impede a desconexão local). */
  revoke(token: string): Promise<void>
}
