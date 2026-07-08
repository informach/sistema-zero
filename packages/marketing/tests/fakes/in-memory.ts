import type {
  ChecklistItem,
  Content,
  ContentComment,
  StageEvent,
} from '../../src/domain/content/content'
import type { Idea } from '../../src/domain/idea/idea'
import type { MediaAsset } from '../../src/domain/media/media-asset'
import type {
  ChecklistRepository,
  CommentRepository,
  ContentRepository,
  ListContentsFilter,
} from '../../src/domain/ports/content-repository.port'
import type { DriveClient, DriveFile } from '../../src/domain/ports/drive-client.port'
import { DriveClientError } from '../../src/domain/ports/drive-client.port'
import type { IdeaRepository, ListIdeasFilter } from '../../src/domain/ports/idea-repository.port'
import type {
  ListAssetsFilter,
  MediaAssetRepository,
} from '../../src/domain/ports/media-asset-repository.port'
import type { HeadResult, MediaStore } from '../../src/domain/ports/media-store.port'
import type {
  AccountSnapshot,
  MetricsRepository,
  PublicationSnapshot,
} from '../../src/domain/ports/metrics-repository.port'
import type {
  AccountIdentity,
  OAuthProvider,
  OAuthTokenSet,
  ProviderAccount,
  RefreshedTokens,
} from '../../src/domain/ports/oauth-provider.port'
import { OAuthProviderError } from '../../src/domain/ports/oauth-provider.port'
import type {
  OAuthStateRecord,
  OAuthStateRepository,
} from '../../src/domain/ports/oauth-state-repository.port'
import type { PublicationAssetRepository } from '../../src/domain/ports/publication-asset-repository.port'
import type {
  PublicationListItem,
  PublicationRepository,
  PublicationsWindowFilter,
} from '../../src/domain/ports/publication-repository.port'
import type {
  PublicationReminder,
  ReminderNotifier,
} from '../../src/domain/ports/reminder-notifier.port'
import { ReminderSendError } from '../../src/domain/ports/reminder-notifier.port'
import type { SecretBox } from '../../src/domain/ports/secret-box.port'
import type { SocialAccountRepository } from '../../src/domain/ports/social-account-repository.port'
import type { Network } from '../../src/domain/publication/publication'
import type { Publication } from '../../src/domain/publication/publication-record'
import type { SocialAccount } from '../../src/domain/social-account/social-account'

const clone = <T>(value: T): T => structuredClone(value)

export class InMemoryIdeaRepository implements IdeaRepository {
  readonly rows = new Map<string, Idea>()

  async create(idea: Idea): Promise<void> {
    this.rows.set(idea.id, clone(idea))
  }
  async byId(id: string): Promise<Idea | null> {
    const row = this.rows.get(id)
    return row ? clone(row) : null
  }
  async update(idea: Idea): Promise<void> {
    this.rows.set(idea.id, clone(idea))
  }
  async markPromoted(id: string, contentId: string, at: Date): Promise<boolean> {
    const current = this.rows.get(id)
    if (current?.status !== 'inbox') return false
    current.status = 'accepted'
    current.promotedContentId = contentId
    current.updatedAt = at
    return true
  }
  async list(filter: ListIdeasFilter): Promise<{ items: Idea[]; total: number }> {
    const all = [...this.rows.values()]
      .filter((i) => !filter.status || i.status === filter.status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    return {
      items: all.slice(filter.offset, filter.offset + filter.limit).map(clone),
      total: all.length,
    }
  }
}

export class InMemoryContentRepository implements ContentRepository {
  readonly rows = new Map<string, Content>()
  readonly events: StageEvent[] = []

  async create(content: Content): Promise<void> {
    this.rows.set(content.id, clone(content))
  }
  async byId(id: string): Promise<Content | null> {
    const row = this.rows.get(id)
    return row ? clone(row) : null
  }
  async update(content: Content, expectedVersion: number): Promise<boolean> {
    const current = this.rows.get(content.id)
    if (!current || current.version !== expectedVersion) return false
    this.rows.set(content.id, clone(content))
    return true
  }
  async list(filter: ListContentsFilter): Promise<{ items: Content[]; total: number }> {
    const all = [...this.rows.values()]
      .filter((c) => !filter.stage || c.stage === filter.stage)
      .filter((c) => !filter.ownerUserId || c.ownerUserId === filter.ownerUserId)
      .filter((c) => !filter.q || c.title.toLowerCase().includes(filter.q.toLowerCase()))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    return {
      items: all.slice(filter.offset, filter.offset + filter.limit).map(clone),
      total: all.length,
    }
  }
  async countByStage(): Promise<Map<Content['stage'], number>> {
    const map = new Map<Content['stage'], number>()
    for (const content of this.rows.values()) {
      map.set(content.stage, (map.get(content.stage) ?? 0) + 1)
    }
    return map
  }
  async insertStageEvent(event: StageEvent): Promise<void> {
    this.events.push(clone(event))
  }
  async listStageEvents(contentId: string): Promise<StageEvent[]> {
    return this.events.filter((e) => e.contentId === contentId).map(clone)
  }
}

export class InMemoryChecklistRepository implements ChecklistRepository {
  readonly rows = new Map<string, ChecklistItem>()

  async createMany(items: ChecklistItem[]): Promise<void> {
    for (const item of items) this.rows.set(item.id, clone(item))
  }
  async byId(id: string): Promise<ChecklistItem | null> {
    const row = this.rows.get(id)
    return row ? clone(row) : null
  }
  async update(item: ChecklistItem): Promise<void> {
    this.rows.set(item.id, clone(item))
  }
  async delete(id: string): Promise<void> {
    this.rows.delete(id)
  }
  async listByContent(contentId: string): Promise<ChecklistItem[]> {
    return [...this.rows.values()]
      .filter((i) => i.contentId === contentId)
      .sort((a, b) => a.position - b.position)
      .map(clone)
  }
  async countsByContent(
    contentIds: string[],
  ): Promise<Map<string, { done: number; total: number }>> {
    const map = new Map<string, { done: number; total: number }>()
    for (const id of contentIds) {
      const items = [...this.rows.values()].filter((i) => i.contentId === id)
      if (items.length > 0) {
        map.set(id, { done: items.filter((i) => i.done).length, total: items.length })
      }
    }
    return map
  }
}

export class InMemoryCommentRepository implements CommentRepository {
  readonly rows: ContentComment[] = []

  async create(comment: ContentComment): Promise<void> {
    this.rows.push(clone(comment))
  }
  async listByContent(contentId: string): Promise<ContentComment[]> {
    return this.rows.filter((c) => c.contentId === contentId).map(clone)
  }
  async countsByContent(contentIds: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>()
    for (const id of contentIds) {
      const n = this.rows.filter((c) => c.contentId === id).length
      if (n > 0) map.set(id, n)
    }
    return map
  }
}

export class InMemoryMediaAssetRepository implements MediaAssetRepository {
  readonly rows = new Map<string, MediaAsset>()

  async create(asset: MediaAsset): Promise<void> {
    this.rows.set(asset.id, clone(asset))
  }
  async byId(id: string): Promise<MediaAsset | null> {
    const row = this.rows.get(id)
    return row ? clone(row) : null
  }
  async update(asset: MediaAsset, expectedVersion: number): Promise<boolean> {
    const current = this.rows.get(asset.id)
    if (!current || current.version !== expectedVersion) return false
    this.rows.set(asset.id, clone(asset))
    return true
  }
  async list(filter: ListAssetsFilter): Promise<{ items: MediaAsset[]; total: number }> {
    const all = [...this.rows.values()]
      .filter((a) => !filter.contentId || a.contentId === filter.contentId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    return {
      items: all.slice(filter.offset, filter.offset + filter.limit).map(clone),
      total: all.length,
    }
  }
  async byIds(ids: string[]): Promise<Map<string, MediaAsset>> {
    const map = new Map<string, MediaAsset>()
    for (const id of ids) {
      const row = this.rows.get(id)
      if (row) map.set(id, clone(row))
    }
    return map
  }
  async claimDueTransfers(now: Date, limit: number, leaseMs: number): Promise<MediaAsset[]> {
    const due = [...this.rows.values()]
      .filter(
        (a) =>
          a.status === 'importing' &&
          (a.transferNextAt === null || a.transferNextAt.getTime() <= now.getTime()),
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, limit)
    const leaseUntil = new Date(now.getTime() + leaseMs)
    for (const asset of due) {
      asset.transferAttempts += 1
      asset.transferNextAt = leaseUntil
      asset.version += 1
      asset.updatedAt = now
    }
    return due.map(clone)
  }
}

export class InMemoryPublicationRepository implements PublicationRepository {
  readonly rows = new Map<string, Publication>()
  /** Ref opcional p/ o join do listByWindow (título/tipo do conteúdo). */
  contentsRef: InMemoryContentRepository | null = null

  async create(publication: Publication): Promise<void> {
    this.rows.set(publication.id, clone(publication))
  }
  async createMany(publications: Publication[]): Promise<void> {
    for (const publication of publications) this.rows.set(publication.id, clone(publication))
  }
  async byId(id: string): Promise<Publication | null> {
    const row = this.rows.get(id)
    return row ? clone(row) : null
  }
  async update(publication: Publication, expectedVersion: number): Promise<boolean> {
    const current = this.rows.get(publication.id)
    if (!current || current.version !== expectedVersion) return false
    this.rows.set(publication.id, clone(publication))
    return true
  }
  async listByContent(contentId: string): Promise<Publication[]> {
    return [...this.rows.values()]
      .filter((p) => p.contentId === contentId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(clone)
  }
  async listByContents(contentIds: string[]): Promise<Map<string, Publication[]>> {
    const map = new Map<string, Publication[]>()
    for (const id of contentIds) {
      const pubs = await this.listByContent(id)
      if (pubs.length > 0) map.set(id, pubs)
    }
    return map
  }
  async listByWindow(
    filter: PublicationsWindowFilter,
  ): Promise<{ items: PublicationListItem[]; total: number }> {
    const statuses = filter.statuses && filter.statuses.length > 0 ? new Set(filter.statuses) : null
    const all = [...this.rows.values()]
      .filter((p) => !filter.from || (p.scheduledAt && p.scheduledAt >= filter.from))
      .filter((p) => !filter.to || (p.scheduledAt && p.scheduledAt < filter.to))
      .filter((p) => !statuses || statuses.has(p.status))
      .filter((p) => !filter.network || p.network === filter.network)
      .filter((p) => !filter.format || p.format === filter.format)
      .filter((p) => !filter.contentId || p.contentId === filter.contentId)
      .sort((a, b) => {
        const at = a.scheduledAt?.getTime() ?? Number.POSITIVE_INFINITY
        const bt = b.scheduledAt?.getTime() ?? Number.POSITIVE_INFINITY
        return at === bt ? a.id.localeCompare(b.id) : at - bt
      })
    const items = all.slice(filter.offset, filter.offset + filter.limit).map((p) => {
      const content = this.contentsRef?.rows.get(p.contentId)
      return {
        publication: clone(p),
        contentTitle: content?.title ?? '',
        contentType: content?.contentType ?? 'reels',
      }
    })
    return { items, total: all.length }
  }
  async claimDueAutoPublish(input: {
    now: Date
    limit: number
    leaseMs: number
    maxAttempts: number
    networks: Array<{ network: Network; leadMs: number }>
  }): Promise<Publication[]> {
    const leadByNetwork = new Map(input.networks.map((n) => [n.network, n.leadMs]))
    const due = [...this.rows.values()]
      .filter((p) => {
        const leadMs = leadByNetwork.get(p.network)
        if (p.publishMode !== 'auto' || leadMs === undefined) return false
        if (p.status === 'scheduled') {
          return (
            p.scheduledAt !== null &&
            p.scheduledAt.getTime() <= input.now.getTime() + leadMs &&
            (p.nextAttemptAt === null || p.nextAttemptAt.getTime() <= input.now.getTime()) &&
            p.attempts < input.maxAttempts
          )
        }
        if (p.status === 'publishing') {
          return p.nextAttemptAt !== null && p.nextAttemptAt.getTime() <= input.now.getTime()
        }
        return false
      })
      .sort((a, b) => {
        const at = a.scheduledAt?.getTime() ?? 0
        const bt = b.scheduledAt?.getTime() ?? 0
        return at === bt ? a.id.localeCompare(b.id) : at - bt
      })
      .slice(0, input.limit)
    const leaseUntil = new Date(input.now.getTime() + input.leaseMs)
    for (const pub of due) {
      if (pub.status === 'publishing') pub.attempts += 1
      pub.status = 'publishing'
      pub.nextAttemptAt = leaseUntil
      pub.version += 1
      pub.updatedAt = input.now
    }
    return due.map(clone)
  }

  async listDueForMetrics(input: {
    network: Network
    now: Date
    limit: number
  }): Promise<Publication[]> {
    return [...this.rows.values()]
      .filter(
        (p) =>
          p.network === input.network &&
          p.status === 'published' &&
          p.externalPostId !== null &&
          p.metricsNextCollectAt !== null &&
          p.metricsNextCollectAt.getTime() <= input.now.getTime(),
      )
      .sort((a, b) => {
        const at = a.metricsNextCollectAt?.getTime() ?? 0
        const bt = b.metricsNextCollectAt?.getTime() ?? 0
        return at === bt ? a.id.localeCompare(b.id) : at - bt
      })
      .slice(0, input.limit)
      .map(clone)
  }
  async updateMetricsSchedule(
    items: Array<{ id: string; collectedAt: Date; nextCollectAt: Date | null }>,
  ): Promise<void> {
    for (const item of items) {
      const pub = this.rows.get(item.id)
      if (pub) {
        pub.metricsLastCollectedAt = item.collectedAt
        pub.metricsNextCollectAt = item.nextCollectAt
      }
    }
  }

  async claimDueManualReminders(
    now: Date,
    limit: number,
    leaseMs: number,
    maxAttempts: number,
  ): Promise<Publication[]> {
    const due = [...this.rows.values()]
      .filter((p) => {
        if (p.publishMode !== 'manual') return false
        if (p.status === 'scheduled') {
          return p.scheduledAt !== null && p.scheduledAt.getTime() <= now.getTime()
        }
        if (p.status === 'awaiting_manual') {
          return (
            p.reminderSentAt === null &&
            p.nextAttemptAt !== null &&
            p.nextAttemptAt.getTime() <= now.getTime() &&
            p.attempts < maxAttempts
          )
        }
        return false
      })
      .sort((a, b) => {
        const at = a.scheduledAt?.getTime() ?? 0
        const bt = b.scheduledAt?.getTime() ?? 0
        return at === bt ? a.id.localeCompare(b.id) : at - bt
      })
      .slice(0, limit)
    const leaseUntil = new Date(now.getTime() + leaseMs)
    for (const pub of due) {
      pub.status = 'awaiting_manual'
      pub.attempts += 1
      pub.nextAttemptAt = leaseUntil
      pub.version += 1
      pub.updatedAt = now
    }
    return due.map(clone)
  }
}

export class InMemoryPublicationAssetRepository implements PublicationAssetRepository {
  rows = new Map<string, string[]>()

  async replaceForPublication(publicationId: string, assetIds: string[]): Promise<void> {
    this.rows.set(publicationId, [...assetIds])
  }

  async listByPublication(publicationId: string): Promise<string[]> {
    return [...(this.rows.get(publicationId) ?? [])]
  }
}

/** MediaStore roteirizável: presign devolve URLs falsas; head lê `objects`. */
export class FakeMediaStore implements MediaStore {
  /** key → tamanho do objeto "no R2" (setado pelo teste após o "upload"). */
  readonly objects = new Map<string, number>()
  readonly deleted: string[] = []
  /** keys gravadas via put streaming (media-transfer-worker). */
  readonly putCalls: Array<{ key: string; contentType: string; sizeBytes: number }> = []
  /** Roteiriza falha no put (erro transitório de rede/R2). */
  failPutWith: Error | null = null

  async presignPut(input: { key: string }): Promise<string> {
    return `https://fake-r2.local/put/${encodeURIComponent(input.key)}`
  }
  async presignGet(input: { key: string }): Promise<string> {
    return `https://fake-r2.local/get/${encodeURIComponent(input.key)}`
  }
  async head(key: string): Promise<HeadResult> {
    const size = this.objects.get(key)
    if (size === undefined) return { exists: false, sizeBytes: null, contentType: null }
    return { exists: true, sizeBytes: size, contentType: 'application/octet-stream' }
  }
  async delete(key: string): Promise<void> {
    this.deleted.push(key)
    this.objects.delete(key)
  }
  async getRange(input: { key: string; start: number; endInclusive: number }): Promise<Uint8Array> {
    const size = this.objects.get(input.key)
    if (size === undefined) throw new Error(`objeto inexistente: ${input.key}`)
    const end = Math.min(input.endInclusive, size - 1)
    return new Uint8Array(Math.max(0, end - input.start + 1))
  }

  async put(input: {
    key: string
    contentType: string
    sizeBytes: number
    body: ReadableStream<Uint8Array>
  }): Promise<void> {
    if (this.failPutWith) throw this.failPutWith
    // Drena o stream (fiel ao adapter real) e materializa o objeto.
    const reader = input.body.getReader()
    let read = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      read += value.byteLength
    }
    this.putCalls.push({
      key: input.key,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
    })
    this.objects.set(input.key, read > 0 ? read : input.sizeBytes)
  }
}

export class InMemorySocialAccountRepository implements SocialAccountRepository {
  readonly rows = new Map<string, SocialAccount>()

  async create(account: SocialAccount): Promise<void> {
    this.rows.set(account.id, clone(account))
  }
  async byId(id: string): Promise<SocialAccount | null> {
    const row = this.rows.get(id)
    return row ? clone(row) : null
  }
  async list(): Promise<SocialAccount[]> {
    return [...this.rows.values()]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(clone)
  }
  async listByNetwork(network: Network): Promise<SocialAccount[]> {
    return (await this.list()).filter((a) => a.network === network)
  }
  async update(account: SocialAccount, expectedVersion: number): Promise<boolean> {
    const current = this.rows.get(account.id)
    if (!current || current.version !== expectedVersion) return false
    this.rows.set(account.id, clone(account))
    return true
  }
  async upsertByExternalId(account: SocialAccount): Promise<SocialAccount> {
    const existing = [...this.rows.values()].find(
      (a) => a.network === account.network && a.externalId === account.externalId,
    )
    if (!existing) {
      this.rows.set(account.id, clone(account))
      return clone(account)
    }
    const merged: SocialAccount = {
      ...existing,
      version: existing.version + 1,
      displayName: account.displayName,
      username: account.username,
      accessTokenEnc: account.accessTokenEnc,
      // Espelha o coalesce do Drizzle: refresh novo nulo preserva o antigo.
      refreshTokenEnc: account.refreshTokenEnc ?? existing.refreshTokenEnc,
      tokenExpiresAt: account.tokenExpiresAt,
      refreshExpiresAt: account.refreshExpiresAt ?? existing.refreshExpiresAt,
      scopes: account.scopes,
      status: account.status,
      metadata: account.metadata,
      connectedBy: account.connectedBy,
      lastRefreshError: null,
      updatedAt: account.updatedAt,
    }
    this.rows.set(merged.id, clone(merged))
    return clone(merged)
  }
  async listExpiring(now: Date, marginMs: number, limit: number): Promise<SocialAccount[]> {
    const cutoff = now.getTime() + marginMs
    return [...this.rows.values()]
      .filter(
        (a) =>
          a.status === 'connected' &&
          a.refreshTokenEnc !== null &&
          a.tokenExpiresAt !== null &&
          a.tokenExpiresAt.getTime() <= cutoff,
      )
      .sort((a, b) => (a.tokenExpiresAt?.getTime() ?? 0) - (b.tokenExpiresAt?.getTime() ?? 0))
      .slice(0, limit)
      .map(clone)
  }
  async listRefreshExpiring(now: Date, marginMs: number, limit: number): Promise<SocialAccount[]> {
    const cutoff = now.getTime() + marginMs
    return [...this.rows.values()]
      .filter(
        (a) =>
          a.status === 'connected' &&
          a.refreshTokenEnc !== null &&
          a.refreshExpiresAt !== null &&
          a.refreshExpiresAt.getTime() <= cutoff,
      )
      .sort((a, b) => (a.refreshExpiresAt?.getTime() ?? 0) - (b.refreshExpiresAt?.getTime() ?? 0))
      .slice(0, limit)
      .map(clone)
  }
}

export class InMemoryOAuthStateRepository implements OAuthStateRepository {
  readonly rows = new Map<string, OAuthStateRecord>()

  async create(record: OAuthStateRecord): Promise<void> {
    this.rows.set(record.state, clone(record))
  }
  async consume(state: string, now: Date): Promise<OAuthStateRecord | null> {
    const row = this.rows.get(state)
    if (!row || row.usedAt !== null || row.expiresAt.getTime() <= now.getTime()) return null
    row.usedAt = now
    return clone(row)
  }
}

/** OAuthProvider roteirizável: devolve tokens fixos e registra as chamadas. */
export class FakeOAuthProvider implements OAuthProvider {
  readonly exchanged: Array<{ code: string; codeVerifier: string; redirectUri: string }> = []
  readonly refreshed: string[] = []
  readonly revoked: string[] = []
  tokenSet: OAuthTokenSet = {
    accessToken: 'fake-access-token',
    refreshToken: 'fake-refresh-token',
    expiresInSeconds: 3600,
    refreshExpiresInSeconds: null,
    scopes: ['openid', 'email'],
    idToken: null,
  }
  identity: AccountIdentity = {
    externalId: 'google-sub-1',
    displayName: 'Canal Sistema Zero',
    username: null,
    metadata: { email: 'equipe@sistemazero.com.br', channelId: 'UC123' },
  }
  refreshResult: RefreshedTokens = {
    accessToken: 'fake-access-token-2',
    refreshToken: null,
    expiresInSeconds: 3600,
    refreshExpiresInSeconds: null,
  }
  /** Roteiriza falha: 'permanent' (invalid_grant) ou 'transient'. */
  failExchangeWith: 'permanent' | 'transient' | null = null
  failRefreshWith: 'permanent' | 'transient' | null = null

  buildAuthorizeUrl(input: { state: string; codeChallenge: string; redirectUri: string }): string {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    url.searchParams.set('state', input.state)
    url.searchParams.set('code_challenge', input.codeChallenge)
    url.searchParams.set('redirect_uri', input.redirectUri)
    return url.toString()
  }
  async exchangeCode(input: {
    code: string
    codeVerifier: string
    redirectUri: string
  }): Promise<OAuthTokenSet> {
    if (this.failExchangeWith) {
      throw new OAuthProviderError('exchange falhou', this.failExchangeWith === 'permanent')
    }
    this.exchanged.push(input)
    return structuredClone(this.tokenSet)
  }
  async refresh(refreshToken: string): Promise<RefreshedTokens> {
    if (this.failRefreshWith) {
      throw new OAuthProviderError('invalid_grant', this.failRefreshWith === 'permanent')
    }
    this.refreshed.push(refreshToken)
    return structuredClone(this.refreshResult)
  }
  /** Roteirizável: setado = contas devolvidas; senão deriva 1 conta youtube do tokenSet+identity. */
  accounts: ProviderAccount[] | null = null
  readonly renewCalls: string[] = []
  failRenewWith: 'permanent' | 'transient' | null = null

  async resolveAccounts(tokens: OAuthTokenSet): Promise<ProviderAccount[]> {
    if (this.accounts) return structuredClone(this.accounts)
    return [
      {
        network: 'youtube',
        identity: structuredClone(this.identity),
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
  /** Renovação proativa (Meta): devolve as MESMAS contas roteirizadas. */
  async renewAccounts(userToken: string): Promise<ProviderAccount[]> {
    if (this.failRenewWith) {
      throw new OAuthProviderError('renovação falhou', this.failRenewWith === 'permanent')
    }
    this.renewCalls.push(userToken)
    return this.resolveAccounts({
      accessToken: `renovado-${userToken}`,
      refreshToken: `renovado-${userToken}`,
      expiresInSeconds: 60 * 86_400,
      refreshExpiresInSeconds: 60 * 86_400,
      scopes: [],
      idToken: null,
    })
  }
  async revoke(token: string): Promise<void> {
    this.revoked.push(token)
  }
}

/** DriveClient roteirizável: arquivos em memória com bytes fixos. */
export class FakeDriveClient implements DriveClient {
  readonly files = new Map<string, DriveFile & { bytes: Uint8Array }>()
  /** Roteiriza falha no download: 'permanent' (403/404) ou 'transient'. */
  failDownloadWith: 'permanent' | 'transient' | null = null

  addFile(file: DriveFile, bytes?: Uint8Array): void {
    this.files.set(file.id, { ...file, bytes: bytes ?? new Uint8Array(file.sizeBytes ?? 0) })
  }
  async listFiles(
    _accessToken: string,
    input: { q?: string; pageToken?: string; pageSize?: number },
  ): Promise<{ files: DriveFile[]; nextPageToken: string | null }> {
    const all = [...this.files.values()]
      .filter((f) => !input.q || f.name.toLowerCase().includes(input.q.toLowerCase()))
      .map(({ bytes: _bytes, ...file }) => file)
    return { files: all.slice(0, input.pageSize ?? 25), nextPageToken: null }
  }
  async getFileMetadata(_accessToken: string, fileId: string): Promise<DriveFile> {
    const file = this.files.get(fileId)
    if (!file) throw new DriveClientError('Arquivo não encontrado no Drive', true)
    const { bytes: _bytes, ...meta } = file
    return meta
  }
  async downloadStream(_accessToken: string, fileId: string): Promise<ReadableStream<Uint8Array>> {
    if (this.failDownloadWith) {
      throw new DriveClientError('download falhou', this.failDownloadWith === 'permanent')
    }
    const file = this.files.get(fileId)
    if (!file) throw new DriveClientError('Arquivo não encontrado no Drive', true)
    const bytes = file.bytes
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes)
        controller.close()
      },
    })
  }
}

/** ReminderNotifier roteirizável: registra envios; falha sob demanda. */
export class FakeReminderNotifier implements ReminderNotifier {
  readonly sent: PublicationReminder[] = []
  failWith: 'permanent' | 'transient' | null = null

  async send(input: PublicationReminder): Promise<void> {
    if (this.failWith) {
      throw new ReminderSendError('envio falhou', this.failWith === 'permanent')
    }
    this.sent.push(structuredClone(input))
  }
}

export class InMemoryMetricsRepository implements MetricsRepository {
  readonly accountSnapshots: AccountSnapshot[] = []
  readonly publicationSnapshots: PublicationSnapshot[] = []

  async insertAccountSnapshot(row: AccountSnapshot): Promise<void> {
    this.accountSnapshots.push(clone(row))
  }
  async insertPublicationSnapshots(rows: PublicationSnapshot[]): Promise<void> {
    for (const row of rows) this.publicationSnapshots.push(clone(row))
  }
  async latestAccountSnapshot(socialAccountId: string): Promise<AccountSnapshot | null> {
    const rows = this.accountSnapshots
      .filter((r) => r.socialAccountId === socialAccountId)
      .sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime())
    return rows[0] ? clone(rows[0]) : null
  }
  async latestPublicationStats(
    publicationIds: string[],
  ): Promise<Map<string, PublicationSnapshot>> {
    const wanted = new Set(publicationIds)
    const map = new Map<string, PublicationSnapshot>()
    for (const row of [...this.publicationSnapshots].sort(
      (a, b) => b.capturedAt.getTime() - a.capturedAt.getTime(),
    )) {
      if (wanted.has(row.publicationId) && !map.has(row.publicationId)) {
        map.set(row.publicationId, clone(row))
      }
    }
    return map
  }
  async listPublicationSnapshots(
    publicationId: string,
    limit: number,
  ): Promise<PublicationSnapshot[]> {
    return this.publicationSnapshots
      .filter((r) => r.publicationId === publicationId)
      .sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime())
      .slice(0, limit)
      .map(clone)
  }
}

/** SecretBox de teste: prefixo verificável sem criptografia real. */
export class FakeSecretBox implements SecretBox {
  seal(plain: string): string {
    return `sealed:${plain}`
  }
  open(sealed: string): string {
    if (!sealed.startsWith('sealed:')) throw new Error('selo inválido')
    return sealed.slice('sealed:'.length)
  }
}
