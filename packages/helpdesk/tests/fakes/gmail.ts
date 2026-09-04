import type {
  GmailClient,
  GmailHistoryPage,
  GmailMessageIdsPage,
  GmailProfile,
  ParsedEmail,
} from '../../src/domain/ports/gmail-client.port'
import type {
  GmailIdentity,
  OAuthProvider,
  OAuthProviderError,
  OAuthTokenSet,
  RefreshedTokens,
} from '../../src/domain/ports/oauth-provider.port'
import type { SecretBox } from '../../src/domain/ports/secret-box.port'

/** Secret-box determinístico (selo legível) — só p/ teste. */
export class FakeSecretBox implements SecretBox {
  seal(plain: string): string {
    return `sealed(${plain})`
  }
  open(sealed: string): string {
    const match = sealed.match(/^sealed\((.*)\)$/)
    if (!match) throw new Error('selo inválido (fake)')
    return match[1] as string
  }
}

/** Provider OAuth fake: identidade e tokens configuráveis. */
export class FakeGmailOAuthProvider implements OAuthProvider {
  identity: GmailIdentity | null = { sub: 'google-sub-1', email: 'contato@sistemazero.com.br' }
  nextTokens: OAuthTokenSet = {
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    expiresInSeconds: 3600,
    scopes: ['openid', 'email', 'https://www.googleapis.com/auth/gmail.modify'],
    idToken: 'idtoken-1',
  }
  refreshResult: RefreshedTokens = {
    accessToken: 'access-refreshed',
    refreshToken: null,
    expiresInSeconds: 3600,
  }
  refreshError: OAuthProviderError | null = null
  exchangeError: OAuthProviderError | null = null
  revoked: string[] = []
  lastAuthorizeInput: { state: string; codeChallenge: string; redirectUri: string } | null = null

  buildAuthorizeUrl(input: { state: string; codeChallenge: string; redirectUri: string }): string {
    this.lastAuthorizeInput = input
    return `https://accounts.google.test/authorize?state=${input.state}`
  }
  async exchangeCode(): Promise<OAuthTokenSet> {
    if (this.exchangeError) throw this.exchangeError
    return this.nextTokens
  }
  async refresh(): Promise<RefreshedTokens> {
    if (this.refreshError) throw this.refreshError
    return this.refreshResult
  }
  identityFromIdToken(): GmailIdentity | null {
    return this.identity
  }
  async revoke(token: string): Promise<void> {
    this.revoked.push(token)
  }
}

/** Gmail API fake: perfil, páginas de list/history e mensagens por id. */
export class FakeGmailClient implements GmailClient {
  profile: GmailProfile = { emailAddress: 'contato@sistemazero.com.br', historyId: '1000' }
  listPages: GmailMessageIdsPage[] = []
  historyPages: GmailHistoryPage[] = []
  messagesById = new Map<string, ParsedEmail | null>()
  getProfileCalls = 0

  async getProfile(): Promise<GmailProfile> {
    this.getProfileCalls += 1
    return this.profile
  }
  async listMessages(): Promise<GmailMessageIdsPage> {
    return this.listPages.shift() ?? { ids: [], nextPageToken: null }
  }
  async listHistory(): Promise<GmailHistoryPage> {
    return (
      this.historyPages.shift() ?? {
        messageIds: [],
        historyId: this.profile.historyId,
        nextPageToken: null,
        expired: false,
      }
    )
  }
  async getMessage(_accessToken: string, id: string): Promise<ParsedEmail | null> {
    return this.messagesById.get(id) ?? null
  }

  sent: Array<{ raw: string; threadId?: string }> = []
  sentByRfc822MessageId = new Map<string, { id: string; threadId: string }>()
  nextSendId = 'sent-1'
  sendError: Error | null = null
  /** Gmail aceitou a mensagem, mas a resposta HTTP se perdeu no caminho. */
  sendAfterAcceptedError: Error | null = null
  async sendMessage(
    _accessToken: string,
    input: { raw: string; threadId?: string },
  ): Promise<{ id: string; threadId: string }> {
    if (this.sendError) throw this.sendError
    const threadId = input.threadId ?? `thread-${this.nextSendId}`
    this.sent.push(input)
    const raw = Buffer.from(input.raw, 'base64url').toString('utf8')
    const messageId = raw.match(/^Message-ID:\s*(.+)$/im)?.[1]?.trim()
    if (messageId) {
      this.sentByRfc822MessageId.set(messageId, {
        id: this.nextSendId,
        threadId,
      })
    }
    if (this.sendAfterAcceptedError) throw this.sendAfterAcceptedError
    return { id: this.nextSendId, threadId }
  }

  async findMessageByRfc822MessageId(
    _accessToken: string,
    messageId: string,
  ): Promise<{ id: string; threadId: string } | null> {
    return this.sentByRfc822MessageId.get(messageId) ?? null
  }
}

/** ParsedEmail pronto p/ semear o FakeGmailClient. */
export function makeParsedEmail(overrides: Partial<ParsedEmail> = {}): ParsedEmail {
  return {
    gmailMessageId: 'gm-1',
    gmailThreadId: 'thread-1',
    rfc822MessageId: '<msg-1@mail.example.com>',
    inReplyTo: null,
    references: [],
    fromEmail: 'maria@example.com',
    fromName: 'Maria Silva',
    toEmails: ['contato@sistemazero.com.br'],
    ccEmails: [],
    subject: 'Não consigo acessar o curso',
    bodyText: 'Olá, comprei o curso e não consigo acessar.',
    bodyHtml: null,
    snippet: 'Olá, comprei o curso',
    attachments: [],
    internalDate: new Date('2026-07-08T12:00:00Z'),
    labelIds: ['INBOX'],
    autoSubmitted: null,
    listUnsubscribe: null,
    isAutoreply: false,
    ...overrides,
  }
}
