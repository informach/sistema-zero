import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { defaultLessonSection, type LessonDraftDocument } from '@sistemazero/core/learning'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { Elysia } from 'elysia'
import {
  CoursePromotionService,
  CoursePromotionSourceService,
} from '../../src/application/course-publication/course-promotion.service'
import { CoursePublicationService } from '../../src/application/course-publication/course-publication.service'
import { readPublicationSource } from '../../src/domain/course-publication/jobs'
import {
  createCoursePromotionPeerClient,
  createCoursePromotionSourceClient,
} from '../../src/infrastructure/course-publication/promotion-peer.client'
import { DrizzleCoursePublicationRepository } from '../../src/infrastructure/persistence/drizzle/course-publication.repository'
import { createDbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleLessonDraftRepository } from '../../src/infrastructure/persistence/drizzle/lesson-draft.repository'
import { courses, lessons, modules } from '../../src/infrastructure/persistence/drizzle/schema'
import { parsePublicationSource } from '../../src/interfaces/http/course-publication-source.dtos'
import { buildErrorResponse } from '../../src/interfaces/http/error-handler'
import { parsePublishedLessonBlock } from '../../src/interfaces/http/lesson-draft.dtos'
import {
  coursePromotionPeerRoutes,
  coursePromotionSourceRoutes,
} from '../../src/interfaces/http/routes/course-promotion-peer.routes'
import { coursePublicationRoutes } from '../../src/interfaces/http/routes/course-publication.routes'
import { silentLogger } from './in-memory'

export async function createLocalPublicationFixture(
  database: string,
  token: string,
  productionDatabase?: string,
  relay?: (
    request: Request,
    kind: 'peer' | 'source',
    handler: (request: Request) => Promise<Response>,
  ) => Promise<Response>,
) {
  if (
    !['localhost', '127.0.0.1'].includes(new URL(database).hostname) ||
    new URL(database).pathname !== '/sistemazero_course_sync_test'
  )
    throw new Error('Banco local descartável obrigatório')
  const connection = createDbConnection(database, { max: 4 })
  await migrate(connection.db, {
    migrationsFolder: fileURLToPath(
      new URL('../../src/infrastructure/persistence/drizzle/migrations', import.meta.url),
    ),
    migrationsTable: 'members_migrations',
  })
  const actorId = randomUUID()
  const repository = new DrizzleCoursePublicationRepository(connection.db, {
    parseBlock: parsePublishedLessonBlock,
  })
  if (
    productionDatabase &&
    (new URL(productionDatabase).host !== new URL(database).host ||
      new URL(productionDatabase).pathname !== '/sistemazero_course_promotion_test')
  )
    throw new Error('A promoção exige o segundo Postgres local descartável')
  const productionConnection = productionDatabase
    ? createDbConnection(productionDatabase, { max: 4 })
    : null
  if (productionConnection)
    await migrate(productionConnection.db, {
      migrationsFolder: fileURLToPath(
        new URL('../../src/infrastructure/persistence/drizzle/migrations', import.meta.url),
      ),
      migrationsTable: 'members_migrations',
    })
  const productionRepository = productionConnection
    ? new DrizzleCoursePublicationRepository(productionConnection.db, {
        parseBlock: parsePublishedLessonBlock,
      })
    : null
  const errorBoundary = () =>
    new Elysia().onError({ as: 'global' }, ({ code, error, set }) => {
      const result = buildErrorResponse({ code, error, logger: silentLogger })
      set.status = result.status
      return result.body
    })
  const peerToken = `${token}-production-peer`,
    sourceToken = `${token}-staging-source`
  const productionApp = productionRepository
    ? errorBoundary().use(
        coursePromotionPeerRoutes({
          service: new CoursePromotionService(productionRepository),
          token: peerToken,
          enabled: true,
        }),
      )
    : null
  const productionPeer = productionApp
    ? createCoursePromotionPeerClient(
        { url: 'http://production.local', token: peerToken, throughAdmin: Boolean(relay) },
        (input, init) =>
          relay
            ? relay(new Request(input, init), 'peer', (request) => productionApp.handle(request))
            : productionApp.handle(new Request(input, init)),
      )
    : undefined
  const sourceApp = productionPeer
    ? errorBoundary().use(
        coursePromotionSourceRoutes({
          service: new CoursePromotionSourceService(repository, productionPeer),
          token: sourceToken,
        }),
      )
    : null
  const promotionSource = sourceApp
    ? createCoursePromotionSourceClient(
        {
          url: 'http://staging.local',
          token: sourceToken,
          throughAdmin: Boolean(relay),
          decodeSource: (value) => readPublicationSource(parsePublicationSource(value)),
        },
        (input, init) =>
          relay
            ? relay(new Request(input, init), 'source', (request) => sourceApp.handle(request))
            : sourceApp.handle(new Request(input, init)),
      )
    : null
  const app = new Elysia()
    .onError({ as: 'global' }, ({ code, error, set }) => {
      const result = buildErrorResponse({ code, error, logger: silentLogger })
      set.status = result.status
      return result.body
    })
    .use(
      coursePublicationRoutes({
        service: new CoursePublicationService(
          repository,
          productionPeer ? 'staging' : 'local',
          productionPeer,
        ),
        internalToken: token,
        requireAdminEnabled: true,
      }),
    )
  const scenarios = new Map<string, { id: string; slug: string; title: string }>()
  async function seed(scenario: string) {
    if (!['ready', 'fail', 'hold', 'promote'].includes(scenario))
      throw new Error('Cenário inválido')
    const existing = scenarios.get(scenario)
    if (existing) return existing
    const id = randomUUID(),
      moduleId = randomUUID(),
      lessonId = randomUUID(),
      blockId = randomUUID()
    const course = { id, slug: `curso-local-${scenario}-${id}`, title: 'Curso de teste local' }
    const now = new Date()
    await connection.db.insert(courses).values({
      ...course,
      audience: 'kids',
      status: 'published',
      createdAt: now,
      updatedAt: now,
      ...(scenario === 'promote' ? { coverImageUrl: 'https://stage.assets.example/capa.png' } : {}),
    })
    await connection.db.insert(modules).values({
      id: moduleId,
      courseId: id,
      title: 'Primeiro módulo',
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    })
    await connection.db.insert(lessons).values({
      id: lessonId,
      courseId: id,
      moduleId,
      title: 'Primeira aula',
      slug: 'aula-1',
      sortOrder: 0,
      isPublished: true,
      createdAt: now,
      updatedAt: now,
    })
    const drafts = new DrizzleLessonDraftRepository(connection.db, parsePublishedLessonBlock)
    const initial = await drafts.read(lessonId)
    const document: LessonDraftDocument = {
      title: 'Primeira aula',
      slug: 'aula-1',
      estimatedMinutes: 10,
      blocks: [
        {
          id: blockId,
          content: { kind: 'dialogue', text: `Observe o jogo. Cenário ${scenario}.` },
        },
      ],
      sections: [defaultLessonSection(randomUUID(), 'Observe', [blockId])],
      attachments: [],
      plannedVideos: [],
    }
    if (scenario === 'promote') {
      const video = randomUUID()
      document.blocks.push({
        id: video,
        content: {
          kind: 'video',
          provider: 'vimeo',
          src: 'https://player.vimeo.com/video/10?h=stage',
        },
      })
      document.sections[0]!.blockIds.push(video)
      document.attachments.push({
        id: randomUUID(),
        label: 'Material local',
        url: 'r2priv:manual.pdf',
        fileType: 'application/pdf',
        sizeBytes: 42,
      })
    }
    const saved = await drafts.replace(lessonId, actorId, initial.revision, randomUUID(), document)
    await drafts.publish(
      lessonId,
      actorId,
      saved.revision,
      randomUUID(),
      scenario === 'promote' ? ['10'] : [],
    )
    scenarios.set(scenario, course)
    return course
  }
  return {
    connection,
    actorId,
    repository,
    app,
    seed,
    productionConnection,
    productionRepository,
    promotionSource,
  }
}
