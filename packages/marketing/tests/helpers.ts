import { randomUUID } from 'node:crypto'
import { AccountService } from '../src/application/accounts/account.service'
import { OAuthService } from '../src/application/accounts/oauth.service'
import { ContentService } from '../src/application/contents/content.service'
import { IdeaService } from '../src/application/ideas/idea.service'
import { PromoteIdeaService } from '../src/application/ideas/promote-idea.service'
import { DriveImportService } from '../src/application/media/drive.service'
import { MediaService } from '../src/application/media/media.service'
import { MetricsService } from '../src/application/metrics/metrics.service'
import { PublicationService } from '../src/application/publications/publication.service'
import type { OAuthProvider } from '../src/domain/ports/oauth-provider.port'
import type { Network } from '../src/domain/publication/publication'
import { loadEnv } from '../src/infrastructure/config/env'
import { createServer } from '../src/interfaces/http/server'
import {
  FakeDriveClient,
  FakeMediaStore,
  FakeOAuthProvider,
  FakeSecretBox,
  InMemoryChecklistRepository,
  InMemoryCommentRepository,
  InMemoryContentRepository,
  InMemoryIdeaRepository,
  InMemoryMediaAssetRepository,
  InMemoryMetricsRepository,
  InMemoryOAuthStateRepository,
  InMemoryPublicationAssetRepository,
  InMemoryPublicationRepository,
  InMemorySocialAccountRepository,
} from './fakes/in-memory'

export const INTERNAL_TOKEN = 'test-internal-token-1234'

const silentLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
}

export const TEST_APP_URL = 'http://app.test'

export interface TestApp {
  app: { handle: (request: Request) => Promise<Response> }
  repos: {
    ideas: InMemoryIdeaRepository
    contents: InMemoryContentRepository
    checklist: InMemoryChecklistRepository
    comments: InMemoryCommentRepository
    assets: InMemoryMediaAssetRepository
    publications: InMemoryPublicationRepository
    publicationAssets: InMemoryPublicationAssetRepository
    accounts: InMemorySocialAccountRepository
    oauthStates: InMemoryOAuthStateRepository
    metrics: InMemoryMetricsRepository
  }
  store: FakeMediaStore
  provider: FakeOAuthProvider
  metaProvider: FakeOAuthProvider
  driveClient: FakeDriveClient
  secretBox: FakeSecretBox
  services: { accounts: AccountService }
}

/** Monta a app HTTP inteira sobre fakes in-memory (sem banco, sem R2). */
export function buildTestApp(
  overrides: {
    maxUploadBytes?: number
    /** false = OAuth/Drive desligados (503 OAUTH_NOT_CONFIGURED). */
    googleEnabled?: boolean
    autoCapableNetworks?: ReadonlySet<Network>
  } = {},
): TestApp {
  const env = loadEnv({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://unused-in-tests',
    INTERNAL_API_TOKEN: INTERNAL_TOKEN,
  })
  const now = () => new Date()
  const idGen = () => randomUUID()

  const ideas = new InMemoryIdeaRepository()
  const contents = new InMemoryContentRepository()
  const checklist = new InMemoryChecklistRepository()
  const comments = new InMemoryCommentRepository()
  const assets = new InMemoryMediaAssetRepository()
  const publications = new InMemoryPublicationRepository()
  publications.contentsRef = contents
  const publicationAssets = new InMemoryPublicationAssetRepository()
  const store = new FakeMediaStore()
  const accounts = new InMemorySocialAccountRepository()
  const oauthStates = new InMemoryOAuthStateRepository()
  const provider = new FakeOAuthProvider()
  const driveClient = new FakeDriveClient()
  const secretBox = new FakeSecretBox()
  const googleEnabled = overrides.googleEnabled ?? true
  const maxUploadBytes = overrides.maxUploadBytes ?? 100 * 1024 * 1024

  const ideaService = new IdeaService(ideas, now, idGen)
  const contentService = new ContentService(contents, checklist, comments, publications, now, idGen)
  const promoteService = new PromoteIdeaService(ideaService, contentService)
  const publicationService = new PublicationService(
    publications,
    contentService,
    now,
    idGen,
    { links: publicationAssets, media: assets },
    overrides.autoCapableNetworks
      ? { accounts, capableNetworks: overrides.autoCapableNetworks }
      : null,
  )
  const mediaService = new MediaService(
    assets,
    contents,
    store,
    {
      maxUploadBytes,
      presignPutTtlSeconds: 3600,
      presignGetTtlSeconds: 3600,
    },
    now,
    idGen,
  )
  const metaProvider = new FakeOAuthProvider()
  const oauthProviders = new Map<Network, OAuthProvider>(
    googleEnabled
      ? [
          ['youtube' as Network, provider],
          // Meta: o MESMO provider fake serve facebook e instagram.
          ['facebook' as Network, metaProvider],
          ['instagram' as Network, metaProvider],
        ]
      : [],
  )
  const accountService = new AccountService(
    accounts,
    googleEnabled ? { providers: oauthProviders, secretBox } : null,
    overrides.autoCapableNetworks ?? new Set(),
    now,
    silentLogger,
  )
  const oauthService = new OAuthService(
    oauthStates,
    accounts,
    googleEnabled
      ? { secretBox, redirectBaseUrl: 'http://gateway.test', appUrl: TEST_APP_URL }
      : null,
    oauthProviders,
    { stateTtlMinutes: 10 },
    now,
    idGen,
    silentLogger,
  )
  const driveService = new DriveImportService(
    googleEnabled ? driveClient : null,
    accountService,
    assets,
    contents,
    { maxUploadBytes },
    now,
    idGen,
  )
  const metrics = new InMemoryMetricsRepository()
  const metricsService = new MetricsService(accounts, publications, metrics)

  const app = createServer({
    env,
    logger: silentLogger,
    readiness: async () => ({ ready: true, checks: { db: 'ok' } }),
    ideas: {
      ideas: ideaService,
      promote: promoteService,
      internalToken: INTERNAL_TOKEN,
      requireStaffEnabled: true,
    },
    contents: {
      contents: contentService,
      internalToken: INTERNAL_TOKEN,
      requireStaffEnabled: true,
    },
    publications: {
      publications: publicationService,
      internalToken: INTERNAL_TOKEN,
      requireStaffEnabled: true,
    },
    media: {
      media: mediaService,
      internalToken: INTERNAL_TOKEN,
      requireStaffEnabled: true,
    },
    oauth: {
      oauth: oauthService,
      internalToken: INTERNAL_TOKEN,
      requireStaffEnabled: true,
    },
    accounts: {
      accounts: accountService,
      internalToken: INTERNAL_TOKEN,
      requireStaffEnabled: true,
    },
    drive: {
      drive: driveService,
      internalToken: INTERNAL_TOKEN,
      requireStaffEnabled: true,
    },
    metrics: {
      metrics: metricsService,
      internalToken: INTERNAL_TOKEN,
      requireStaffEnabled: true,
    },
  })

  return {
    app,
    repos: {
      ideas,
      contents,
      checklist,
      comments,
      assets,
      publications,
      publicationAssets,
      accounts,
      oauthStates,
      metrics,
    },
    store,
    provider,
    metaProvider,
    driveClient,
    secretBox,
    services: { accounts: accountService },
  }
}

export const STAFF_USER_ID = '11111111-1111-4111-8111-111111111111'

/** Headers de uma chamada vinda do gateway com um membro da equipe autenticado. */
export function staffHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    'content-type': 'application/json',
    'x-internal-token': INTERNAL_TOKEN,
    'x-auth-user-id': STAFF_USER_ID,
    'x-auth-user-name': 'Helena Oliveira',
    'x-auth-user-role': 'staff',
    'x-auth-user-status': 'active',
    ...extra,
  }
}

export function request(
  app: TestApp['app'],
  method: string,
  path: string,
  options: { headers?: Record<string, string>; body?: unknown } = {},
): Promise<Response> {
  return app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: options.headers ?? staffHeaders(),
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    }),
  )
}
