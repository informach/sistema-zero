import {
  type OAuthProvider,
  OAuthProviderError,
  type OAuthTokenSet,
  type ProviderAccount,
  type RefreshedTokens,
} from '../../../domain/ports/oauth-provider.port'

/**
 * OAuth do TikTok (Login Kit v2). Fetch nativo, sem SDK. Particularidades:
 * token endpoint é FORM-URLENCODED e usa `client_key` (não client_id); PKCE é
 * só p/ mobile/desktop — app web usa client_secret + state (nosso state
 * single-use atômico cobre o CSRF); access token dura 24h e o REFRESH TOKEN
 * (365d) ROTACIONA a cada refresh — o AccountService re-sela o novo quando o
 * provider o devolve. App sem auditoria só posta SELF_ONLY (privado).
 */
const AUTHORIZE_URL = 'https://www.tiktok.com/v2/auth/authorize/'
const TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/'
const REVOKE_URL = 'https://open.tiktokapis.com/v2/oauth/revoke/'
const USER_INFO_URL = 'https://open.tiktokapis.com/v2/user/info/'

export const TIKTOK_SCOPES = [
  'user.info.basic', // display_name/avatar
  'user.info.profile', // username (permalink dos posts)
  'user.info.stats', // follower_count (métricas da conta)
  'video.publish', // Direct Post
  'video.list', // stats dos vídeos (metrics-worker)
] as const

const DEFAULT_TIMEOUT_MS = 10_000

/** fetch com timeout via AbortController + clearTimeout (NUNCA AbortSignal.timeout). */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(new DOMException('tiktok timeout', 'TimeoutError')),
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
  refresh_expires_in?: number
  open_id?: string
  scope?: string
  error?: string
  error_description?: string
}

export interface TikTokOAuthConfig {
  clientKey: string
  clientSecret: string
}

export class TikTokOAuthProvider implements OAuthProvider {
  constructor(private readonly config: TikTokOAuthConfig) {}

  buildAuthorizeUrl(input: { state: string; codeChallenge: string; redirectUri: string }): string {
    const url = new URL(AUTHORIZE_URL)
    url.searchParams.set('client_key', this.config.clientKey)
    url.searchParams.set('redirect_uri', input.redirectUri)
    url.searchParams.set('response_type', 'code')
    // Escopos em CSV (≠ Google, que separa por espaço).
    url.searchParams.set('scope', TIKTOK_SCOPES.join(','))
    url.searchParams.set('state', input.state)
    // PKCE fica de fora de propósito: no TikTok é só p/ mobile/desktop.
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
      throw new OAuthProviderError('Falha de rede ao falar com o TikTok', false, { cause: error })
    }
    const data = (await res.json().catch(() => ({}))) as TokenResponse
    // O TikTok pode responder 200 com `error` no corpo — checar os dois.
    if (!res.ok || data.error) {
      const permanent = data.error === 'invalid_grant' || res.status === 400 || res.status === 401
      throw new OAuthProviderError(
        `TikTok token endpoint: ${data.error ?? res.status} ${data.error_description ?? ''}`.trim(),
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
        client_key: this.config.clientKey,
        client_secret: this.config.clientSecret,
      }),
    )
    if (!data.access_token) throw new OAuthProviderError('TikTok não devolveu access_token', true)
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      expiresInSeconds: data.expires_in ?? null,
      refreshExpiresInSeconds: data.refresh_expires_in ?? null,
      // Escopos vêm em CSV na resposta do token.
      scopes: data.scope ? data.scope.split(',').map((s) => s.trim()) : [],
      idToken: null,
    }
  }

  async refresh(refreshToken: string): Promise<RefreshedTokens> {
    const data = await this.postToken(
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_key: this.config.clientKey,
        client_secret: this.config.clientSecret,
      }),
    )
    if (!data.access_token) throw new OAuthProviderError('TikTok não devolveu access_token', true)
    return {
      accessToken: data.access_token,
      // ROTAÇÃO: o refresh devolvido pode ser NOVO — sempre repassar (o
      // AccountService re-sela; usar o antigo depois disso falharia).
      refreshToken: data.refresh_token ?? null,
      expiresInSeconds: data.expires_in ?? null,
      refreshExpiresInSeconds: data.refresh_expires_in ?? null,
    }
  }

  /** TikTok: 1 consent = 1 conta (o open_id do criador). */
  async resolveAccounts(tokens: OAuthTokenSet): Promise<ProviderAccount[]> {
    const url = new URL(USER_INFO_URL)
    url.searchParams.set('fields', 'open_id,union_id,avatar_url,display_name,username')
    let res: Response
    try {
      res = await fetchWithTimeout(url.toString(), {
        headers: { authorization: `Bearer ${tokens.accessToken}` },
      })
    } catch (error) {
      throw new OAuthProviderError('Falha de rede ao buscar a conta do TikTok', false, {
        cause: error,
      })
    }
    const body = (await res.json().catch(() => ({}))) as {
      data?: {
        user?: {
          open_id?: string
          union_id?: string
          avatar_url?: string
          display_name?: string
          username?: string
        }
      }
      error?: { code?: string; message?: string }
    }
    const user = body.data?.user
    if (!res.ok || (body.error && body.error.code !== 'ok') || !user?.open_id) {
      throw new OAuthProviderError(
        `TikTok user/info: ${body.error?.message ?? res.status}`,
        res.status === 401 || res.status === 403,
      )
    }
    return [
      {
        network: 'tiktok',
        identity: {
          externalId: user.open_id,
          displayName: user.display_name ?? user.username ?? user.open_id,
          username: user.username ?? null,
          metadata: {
            unionId: user.union_id ?? null,
            username: user.username ?? null,
            avatarUrl: user.avatar_url ?? null,
          },
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresInSeconds: tokens.expiresInSeconds,
          refreshExpiresInSeconds: tokens.refreshExpiresInSeconds,
          scopes: tokens.scopes,
        },
      },
    ]
  }

  async revoke(token: string): Promise<void> {
    try {
      await fetchWithTimeout(REVOKE_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_key: this.config.clientKey,
          client_secret: this.config.clientSecret,
          token,
        }).toString(),
      })
    } catch {
      // best-effort: a desconexão local acontece de qualquer forma
    }
  }
}
