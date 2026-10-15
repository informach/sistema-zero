import { randomBytes, timingSafeEqual } from 'node:crypto'
import { auth, type OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js'
import {
  OAuthClientInformationFullSchema,
  type OAuthClientInformationMixed,
  OAuthClientInformationSchema,
  type OAuthTokens,
  OAuthTokensSchema,
} from '@modelcontextprotocol/sdk/shared/auth.js'
import { z } from 'zod'
import { boundedFetch, endpointUrl } from './http'
export interface OAuthStorage {
  get: (name: string) => Promise<string | null>
  set: (name: string, value: string) => Promise<unknown>
  delete: (name: string) => Promise<unknown>
}
/** Each instance is bound to one configured MCP resource. Tokens never cross this storage prefix. */
export class McpOAuth implements OAuthClientProvider {
  private server: ReturnType<typeof Bun.serve>
  private expectedState = ''
  private verifier = ''
  private deadline = 0
  private loginEnabled = false
  private authorizationUrl: string | undefined
  private status: 'idle' | 'waiting' | 'connected' | 'failed' = 'idle'
  readonly redirectUrl: string
  private constructor(
    private resource: string,
    private storage: OAuthStorage,
    port: number,
    private origins: string[],
  ) {
    endpointUrl(resource)
    this.server = Bun.serve({
      hostname: '127.0.0.1',
      port,
      maxRequestBodySize: 4096,
      fetch: (request) => this.callback(request),
    })
    this.redirectUrl = `http://127.0.0.1:${this.server.port}/callback`
  }
  static async create(resource: string, storage: OAuthStorage, origins: string[] = []) {
    const saved = await storage.get('port')
    const port = saved ? z.number().int().min(1024).max(65535).parse(Number(saved)) : 0
    const provider = new McpOAuth(resource, storage, port, origins)
    try {
      if (!port) await storage.set('port', String(provider.server.port))
      return provider
    } catch (error) {
      provider.close()
      throw error
    }
  }
  get clientMetadata() {
    return {
      client_name: 'Sistema Zero',
      redirect_uris: [this.redirectUrl],
      response_types: ['code'],
      grant_types: ['authorization_code', 'refresh_token'],
      token_endpoint_auth_method: 'none',
    }
  }
  async clientInformation() {
    const value = await this.storage.get('client')
    if (!value) return undefined
    const parsed: unknown = JSON.parse(value)
    const full = OAuthClientInformationFullSchema.safeParse(parsed)
    return full.success ? full.data : OAuthClientInformationSchema.parse(parsed)
  }
  async saveClientInformation(value: OAuthClientInformationMixed) {
    await this.storage.set('client', JSON.stringify(value))
  }
  async tokens() {
    const value = await this.storage.get('tokens')
    return value ? OAuthTokensSchema.parse(JSON.parse(value)) : undefined
  }
  async saveTokens(value: OAuthTokens) {
    await this.storage.set('tokens', JSON.stringify(value))
    this.status = 'connected'
  }
  state() {
    this.expectedState = randomBytes(24).toString('hex')
    return this.expectedState
  }
  saveCodeVerifier(value: string) {
    this.verifier = value
  }
  codeVerifier() {
    if (!this.verifier || Date.now() > this.deadline) throw new Error('OAuth flow expired')
    return this.verifier
  }
  redirectToAuthorization(url: URL) {
    if (!this.loginEnabled)
      throw new Error('MCP login required. Start login from the local control interface.')
    const target = endpointUrl(url.href)
    if (target.protocol !== 'https:' && !['127.0.0.1', '[::1]'].includes(target.hostname))
      throw new Error('Invalid OAuth authorization endpoint')
    if (
      ![
        new URL(this.resource).origin,
        ...this.origins.map((origin) => endpointUrl(origin).origin),
      ].includes(target.origin)
    )
      throw new Error(`OAuth authorization origin is not configured: ${target.origin}`)
    this.authorizationUrl = url.href
    this.status = 'waiting'
  }
  async invalidateCredentials(scope: 'all' | 'client' | 'tokens' | 'verifier' | 'discovery') {
    if (scope === 'all' || scope === 'client') await this.storage.delete('client')
    if (scope === 'all' || scope === 'tokens') await this.storage.delete('tokens')
    if (scope === 'all' || scope === 'verifier') {
      this.verifier = ''
      this.expectedState = ''
    }
  }
  async begin() {
    this.loginEnabled = true
    this.deadline = Date.now() + 5 * 60 * 1000
    this.authorizationUrl = undefined
    try {
      const result = await auth(this, {
        serverUrl: this.resource,
        fetchFn: boundedFetch(this.resource, this.origins),
      })
      return {
        status: result === 'AUTHORIZED' ? 'connected' : 'waiting',
        url: this.authorizationUrl,
        expiresAt: new Date(this.deadline).toISOString(),
      }
    } catch (error) {
      this.status = 'failed'
      this.loginEnabled = false
      throw error
    }
  }
  inspect() {
    return { status: this.status, expired: this.deadline > 0 && Date.now() > this.deadline }
  }
  private async callback(request: Request) {
    const url = new URL(request.url)
    if (
      request.method !== 'GET' ||
      request.headers.get('host') !== new URL(this.redirectUrl).host ||
      url.pathname !== '/callback'
    )
      return new Response('Not found', { status: 404 })
    const state = url.searchParams.get('state') ?? ''
    const code = url.searchParams.get('code') ?? ''
    if (
      !this.loginEnabled ||
      Date.now() > this.deadline ||
      !code ||
      code.length > 4096 ||
      !this.expectedState ||
      Buffer.byteLength(state) !== Buffer.byteLength(this.expectedState) ||
      !timingSafeEqual(Buffer.from(state), Buffer.from(this.expectedState))
    )
      return new Response('Invalid or expired authorization', { status: 400 })
    this.expectedState = ''
    this.loginEnabled = false
    try {
      await auth(this, {
        serverUrl: this.resource,
        authorizationCode: code,
        fetchFn: boundedFetch(this.resource, this.origins),
      })
      this.verifier = ''
      return new Response('Conectado. Volte ao Sistema Zero.', {
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'cache-control': 'no-store',
          'content-security-policy': "default-src 'none'",
        },
      })
    } catch {
      this.status = 'failed'
      this.verifier = ''
      return new Response('Falha ao concluir login. Reinicie pelo Sistema Zero.', { status: 400 })
    }
  }
  close() {
    this.server.stop(true)
    this.verifier = ''
    this.expectedState = ''
    this.loginEnabled = false
  }
}
