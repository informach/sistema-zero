import { randomUUID } from 'node:crypto'
import { ContentService } from '../src/application/contents/content.service'
import { IdeaService } from '../src/application/ideas/idea.service'
import { PromoteIdeaService } from '../src/application/ideas/promote-idea.service'
import { MediaService } from '../src/application/media/media.service'
import { PublicationService } from '../src/application/publications/publication.service'
import { loadEnv } from '../src/infrastructure/config/env'
import { createServer } from '../src/interfaces/http/server'
import {
  FakeMediaStore,
  InMemoryChecklistRepository,
  InMemoryCommentRepository,
  InMemoryContentRepository,
  InMemoryIdeaRepository,
  InMemoryMediaAssetRepository,
  InMemoryPublicationRepository,
} from './fakes/in-memory'

export const INTERNAL_TOKEN = 'test-internal-token-1234'

const silentLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
}

export interface TestApp {
  app: { handle: (request: Request) => Promise<Response> }
  repos: {
    ideas: InMemoryIdeaRepository
    contents: InMemoryContentRepository
    checklist: InMemoryChecklistRepository
    comments: InMemoryCommentRepository
    assets: InMemoryMediaAssetRepository
    publications: InMemoryPublicationRepository
  }
  store: FakeMediaStore
}

/** Monta a app HTTP inteira sobre fakes in-memory (sem banco, sem R2). */
export function buildTestApp(overrides: { maxUploadBytes?: number } = {}): TestApp {
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
  const store = new FakeMediaStore()

  const ideaService = new IdeaService(ideas, now, idGen)
  const contentService = new ContentService(contents, checklist, comments, publications, now, idGen)
  const promoteService = new PromoteIdeaService(ideaService, contentService)
  const publicationService = new PublicationService(publications, contentService, now, idGen)
  const mediaService = new MediaService(
    assets,
    contents,
    store,
    {
      maxUploadBytes: overrides.maxUploadBytes ?? 100 * 1024 * 1024,
      presignPutTtlSeconds: 3600,
      presignGetTtlSeconds: 3600,
    },
    now,
    idGen,
  )

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
  })

  return { app, repos: { ideas, contents, checklist, comments, assets, publications }, store }
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
