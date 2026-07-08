import {
  type OAuthProvider,
  OAuthProviderError,
  type OAuthTokenSet,
  type ProviderAccount,
  type RefreshedTokens,
} from '../../../domain/ports/oauth-provider.port'

/**
 * OAuth da Meta (Facebook Login → Páginas + Instagram business). UM consent
 * conecta N contas: uma `facebook` por Página (token = PAGE token, que NÃO
 * expira quando derivado de user token long-lived) e uma `instagram` por IG
 * business vinculado (o IG publishing usa o MESMO page token).
 *
 * Tokens: code → short user token → `fb_exchange_token` → long-lived USER
 * token (~60d, guardado como "refresh" p/ a renovação proativa — um long-lived
 * VÁLIDO troca por um novo; expirado = re-login). A Meta NÃO suporta PKCE no
 * fluxo manual — o `state` single-use atômico cobre o CSRF (o codeChallenge
 * recebido é ignorado de propósito).
 *
 * ⚠️ App em Development Mode deixa posts de Página INVISÍVEIS ao público —
 * manter o app em Live Mode (Standard Access publica nos assets próprios sem
 * App Review; equipe precisa de papel no app).
 */
export const META_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
  'instagram_manage_insights',
  'read_insights',
] as const

const DEFAULT_TIMEOUT_MS = 10_000

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(new DOMException('meta timeout', 'TimeoutError')),
    timeoutMs,
  )
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (error) {
    throw new OAuthProviderError('Falha de rede ao falar com a Meta', false, { cause: error })
  } finally {
    clearTimeout(timer)
  }
}

interface GraphError {
  error?: { message?: string; type?: string; code?: number }
}

async function readJson<T>(res: Response, context: string): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as T & GraphError
  if (!res.ok) {
    // 190 = token inválido/expirado; erros de OAuth 4xx são permanentes (reauth).
    const code = body.error?.code
    const permanent = code === 190 || (res.status >= 400 && res.status < 500)
    throw new OAuthProviderError(`Meta ${context}: ${body.error?.message ?? res.status}`, permanent)
  }
  return body
}

export interface MetaOAuthConfig {
  appId: string
  appSecret: string
  /** Versão pinada da Graph API (ex.: v25.0). */
  graphVersion: string
}

export class MetaOAuthProvider implements OAuthProvider {
  constructor(private readonly config: MetaOAuthConfig) {}

  private graph(path: string): string {
    return `https://graph.facebook.com/${this.config.graphVersion}${path}`
  }

  buildAuthorizeUrl(input: { state: string; codeChallenge: string; redirectUri: string }): string {
    const url = new URL(`https://www.facebook.com/${this.config.graphVersion}/dialog/oauth`)
    url.searchParams.set('client_id', this.config.appId)
    url.searchParams.set('redirect_uri', input.redirectUri)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('state', input.state)
    // Meta usa vírgula como separador de escopos.
    url.searchParams.set('scope', META_SCOPES.join(','))
    return url.toString()
  }

  /** code → short user token → long-lived (~60d) + escopos via /me/permissions. */
  async exchangeCode(input: {
    code: string
    codeVerifier: string
    redirectUri: string
  }): Promise<OAuthTokenSet> {
    const shortUrl = new URL(this.graph('/oauth/access_token'))
    shortUrl.searchParams.set('client_id', this.config.appId)
    shortUrl.searchParams.set('client_secret', this.config.appSecret)
    shortUrl.searchParams.set('redirect_uri', input.redirectUri)
    shortUrl.searchParams.set('code', input.code)
    const short = await readJson<{ access_token?: string }>(
      await fetchWithTimeout(shortUrl.toString()),
      'troca do code',
    )
    if (!short.access_token) throw new OAuthProviderError('Meta não devolveu access_token', true)

    const { accessToken, expiresInSeconds } = await this.exchangeLongLived(short.access_token)
    const scopes = await this.grantedScopes(accessToken)
    return {
      accessToken,
      // O long-lived USER token é o "refresh" da Meta (renova ANTES de expirar).
      refreshToken: accessToken,
      expiresInSeconds,
      refreshExpiresInSeconds: expiresInSeconds,
      scopes,
      idToken: null,
    }
  }

  private async exchangeLongLived(
    userToken: string,
  ): Promise<{ accessToken: string; expiresInSeconds: number | null }> {
    const url = new URL(this.graph('/oauth/access_token'))
    url.searchParams.set('grant_type', 'fb_exchange_token')
    url.searchParams.set('client_id', this.config.appId)
    url.searchParams.set('client_secret', this.config.appSecret)
    url.searchParams.set('fb_exchange_token', userToken)
    const data = await readJson<{ access_token?: string; expires_in?: number }>(
      await fetchWithTimeout(url.toString()),
      'fb_exchange_token',
    )
    if (!data.access_token) throw new OAuthProviderError('Meta não devolveu long-lived token', true)
    return { accessToken: data.access_token, expiresInSeconds: data.expires_in ?? 60 * 86_400 }
  }

  /** A resposta do token da Meta NÃO traz escopos — vêm de /me/permissions. */
  private async grantedScopes(userToken: string): Promise<string[]> {
    try {
      const url = new URL(this.graph('/me/permissions'))
      url.searchParams.set('access_token', userToken)
      const data = await readJson<{
        data?: Array<{ permission?: string; status?: string }>
      }>(await fetchWithTimeout(url.toString()), 'permissões')
      return (data.data ?? [])
        .filter((p) => p.status === 'granted' && p.permission)
        .map((p) => p.permission as string)
    } catch {
      // Best-effort: sem a lista, segue com vazio (canAutoPublish acusa e o
      // card de Conexões orienta reconectar).
      return []
    }
  }

  /**
   * Páginas (+ IG business de cada uma) do user token. Page tokens NÃO expiram
   * (expiresInSeconds null); o user token vai no refresh de CADA conta.
   */
  async resolveAccounts(tokens: OAuthTokenSet): Promise<ProviderAccount[]> {
    const accounts: ProviderAccount[] = []
    let url: string | null = (() => {
      const u = new URL(this.graph('/me/accounts'))
      u.searchParams.set(
        'fields',
        'id,name,access_token,instagram_business_account{id,username,name}',
      )
      u.searchParams.set('limit', '25')
      u.searchParams.set('access_token', tokens.accessToken)
      return u.toString()
    })()
    let pages = 0
    while (url && pages < 4) {
      pages += 1
      const data: {
        data?: Array<{
          id?: string
          name?: string
          access_token?: string
          instagram_business_account?: { id?: string; username?: string; name?: string }
        }>
        paging?: { next?: string }
      } = await readJson(await fetchWithTimeout(url), 'listagem de Páginas')
      for (const page of data.data ?? []) {
        if (!page.id || !page.access_token) continue
        const shared = {
          refreshToken: tokens.refreshToken,
          expiresInSeconds: null,
          refreshExpiresInSeconds: tokens.refreshExpiresInSeconds,
          scopes: tokens.scopes,
        }
        accounts.push({
          network: 'facebook',
          identity: {
            externalId: page.id,
            displayName: page.name ?? page.id,
            username: null,
            metadata: {
              pageId: page.id,
              pageName: page.name ?? null,
              igBusinessId: page.instagram_business_account?.id ?? null,
            },
          },
          tokens: { accessToken: page.access_token, ...shared },
        })
        const ig = page.instagram_business_account
        if (ig?.id) {
          accounts.push({
            network: 'instagram',
            identity: {
              externalId: ig.id,
              displayName: ig.name ?? ig.username ?? ig.id,
              username: ig.username ?? null,
              metadata: {
                igUserId: ig.id,
                username: ig.username ?? null,
                pageId: page.id,
                pageName: page.name ?? null,
              },
            },
            // O IG publishing usa o PAGE token da Página vinculada.
            tokens: { accessToken: page.access_token, ...shared },
          })
        }
      }
      url = data.paging?.next ?? null
    }
    if (accounts.length === 0) {
      throw new OAuthProviderError(
        'A conta não administra nenhuma Página do Facebook — o app publica via Páginas',
        true,
      )
    }
    return accounts
  }

  /** Page token não usa refresh (não expira) — nunca deve chegar aqui. */
  async refresh(_refreshToken: string): Promise<RefreshedTokens> {
    throw new OAuthProviderError(
      'Page token da Meta não usa refresh — renove pelo user token',
      true,
    )
  }

  /** Renovação proativa: user token VÁLIDO → novo long-lived → re-deriva tudo. */
  async renewAccounts(userToken: string): Promise<ProviderAccount[]> {
    const { accessToken, expiresInSeconds } = await this.exchangeLongLived(userToken)
    const scopes = await this.grantedScopes(accessToken)
    return this.resolveAccounts({
      accessToken,
      refreshToken: accessToken,
      expiresInSeconds,
      refreshExpiresInSeconds: expiresInSeconds,
      scopes,
      idToken: null,
    })
  }

  /** Revoga o consent inteiro (user token) — best-effort. */
  async revoke(token: string): Promise<void> {
    try {
      const url = new URL(this.graph('/me/permissions'))
      url.searchParams.set('access_token', token)
      await fetchWithTimeout(url.toString(), { method: 'DELETE' })
    } catch {
      // best-effort: a desconexão local acontece de qualquer forma
    }
  }
}
