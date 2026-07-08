import {
  type GmailIdentity,
  type OAuthProvider,
  OAuthProviderError,
  type OAuthTokenSet,
  type RefreshedTokens,
} from '../../../domain/ports/oauth-provider.port'

/**
 * OAuth do Google para a caixa do Gmail (help desk). Fetch nativo, sem SDK
 * (convenção do repo). URLs são CONSTANTES hardcoded (anti-SSRF: nada vem de input).
 *
 * Escopo: `gmail.modify` cobre LER mensagens/threads/history, ROTULAR e ENVIAR
 * (users.messages.send) — um único escopo restrito, sem readonly+send separados.
 * ⚠️ O client OAuth deve ser INTERNAL (org Workspace): app External em "Testing"
 * expira o refresh token em 7 DIAS (risco mapeado no plano).
 */
const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke'

export const GMAIL_SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/gmail.modify',
] as const

const DEFAULT_TIMEOUT_MS = 10_000

/**
 * fetch com timeout via AbortController + clearTimeout — NUNCA
 * `AbortSignal.timeout` (signal de fábrica não cancelável deixa timer vivo e
 * pendura o `bun test`; gotcha documentado no monorepo).
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(new DOMException('google timeout', 'TimeoutError')),
    timeoutMs,
  )
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

interface TokenResponse {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  scope?: string
  id_token?: string
  error?: string
  error_description?: string
}

/**
 * Decodifica o payload do id_token SEM verificar assinatura — veio direto do
 * endpoint TLS do Google (canal direto, padrão OIDC p/ confidential clients).
 */
function decodeIdTokenPayload(idToken: string): Record<string, unknown> | null {
  const parts = idToken.split('.')
  if (parts.length !== 3 || !parts[1]) return null
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

export class GmailOAuthProvider implements OAuthProvider {
  constructor(private readonly config: { clientId: string; clientSecret: string }) {}

  buildAuthorizeUrl(input: { state: string; codeChallenge: string; redirectUri: string }): string {
    const url = new URL(AUTHORIZE_URL)
    url.searchParams.set('client_id', this.config.clientId)
    url.searchParams.set('redirect_uri', input.redirectUri)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', GMAIL_SCOPES.join(' '))
    url.searchParams.set('state', input.state)
    url.searchParams.set('code_challenge', input.codeChallenge)
    url.searchParams.set('code_challenge_method', 'S256')
    // `access_type=offline` + `prompt=consent`: o refresh token só vem no
    // consent — sem forçar, a reconexão ficaria sem refresh.
    url.searchParams.set('access_type', 'offline')
    url.searchParams.set('prompt', 'consent')
    url.searchParams.set('include_granted_scopes', 'true')
    return url.toString()
  }

  private async postToken(body: URLSearchParams): Promise<TokenResponse> {
    let res: Response
    try {
      res = await fetchWithTimeout(TOKEN_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      })
    } catch (error) {
      throw new OAuthProviderError('Falha de rede ao falar com o Google', false, { cause: error })
    }
    const data = (await res.json().catch(() => ({}))) as TokenResponse
    if (!res.ok) {
      // invalid_grant = code/refresh revogado ou vencido → reauth (permanente).
      const permanent = data.error === 'invalid_grant' || res.status === 400 || res.status === 401
      throw new OAuthProviderError(
        `Google token endpoint: ${data.error ?? res.status} ${data.error_description ?? ''}`.trim(),
        permanent,
      )
    }
    return data
  }

  async exchangeCode(input: {
    code: string
    codeVerifier: string
    redirectUri: string
  }): Promise<OAuthTokenSet> {
    const data = await this.postToken(
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: input.code,
        redirect_uri: input.redirectUri,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code_verifier: input.codeVerifier,
      }),
    )
    if (!data.access_token) throw new OAuthProviderError('Google não devolveu access_token', true)
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      expiresInSeconds: data.expires_in ?? null,
      scopes: data.scope ? data.scope.split(' ') : [],
      idToken: data.id_token ?? null,
    }
  }

  async refresh(refreshToken: string): Promise<RefreshedTokens> {
    const data = await this.postToken(
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    )
    if (!data.access_token) throw new OAuthProviderError('Google não devolveu access_token', true)
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      expiresInSeconds: data.expires_in ?? null,
    }
  }

  identityFromIdToken(idToken: string | null): GmailIdentity | null {
    const payload = idToken ? decodeIdTokenPayload(idToken) : null
    const sub = typeof payload?.sub === 'string' ? payload.sub : null
    if (!sub) return null
    const email = typeof payload?.email === 'string' ? payload.email : null
    return { sub, email }
  }

  async revoke(token: string): Promise<void> {
    try {
      await fetchWithTimeout(REVOKE_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token }).toString(),
      })
    } catch {
      // best-effort: a desconexão local acontece de qualquer forma
    }
  }
}
