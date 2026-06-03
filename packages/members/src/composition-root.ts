import { randomUUID } from 'node:crypto'
import { createLogger, type Logger } from '@sistemazero/core/logging'
import { CheckAccessService } from './application/access/check-access.service'
import {
  AttachmentAdminService,
  BlockAdminService,
  CourseAdminService,
  LessonAdminService,
  ModuleAdminService,
} from './application/content-admin/content-admin.service'
import { GetCourseProgressService } from './application/get-course-progress/get-course-progress.service'
import { GetLessonService } from './application/get-lesson/get-lesson.service'
import { GetMemberDetailService } from './application/get-member-detail/get-member-detail.service'
import { GetMyCourseService } from './application/get-my-course/get-my-course.service'
import { GrantEntitlementService } from './application/grant-entitlement/grant-entitlement.service'
import { GrantManualEntitlementService } from './application/grant-manual-entitlement/grant-manual-entitlement.service'
import { ListMembersService } from './application/list-members/list-members.service'
import { ListMyCoursesService } from './application/list-my-courses/list-my-courses.service'
import { ManageEntitlementService } from './application/manage-entitlement/manage-entitlement.service'
import { MarkLessonCompleteService } from './application/mark-lesson-complete/mark-lesson-complete.service'
import { RevokeEntitlementService } from './application/revoke-entitlement/revoke-entitlement.service'
import type { Env } from './infrastructure/config/env'
import { createCatalogHttpGateway } from './infrastructure/gateways/catalog-http.gateway'
import { DrizzleContentAdminRepository } from './infrastructure/persistence/drizzle/content-admin.repository'
import { DrizzleCourseRepository } from './infrastructure/persistence/drizzle/course.repository'
import { createDbConnection, type DbConnection } from './infrastructure/persistence/drizzle/db'
import { DrizzleEntitlementRepository } from './infrastructure/persistence/drizzle/entitlement.repository'
import { DrizzleProcessedWebhookRepository } from './infrastructure/persistence/drizzle/processed-webhook.repository'
import { DrizzleProgressRepository } from './infrastructure/persistence/drizzle/progress.repository'
import { createServer } from './interfaces/http/server'

export interface Application {
  logger: Logger
  start(): Promise<void>
  stop(): Promise<void>
}

/**
 * Raiz de composição (injeção de dependências). ÚNICO lugar que instancia adapters
 * concretos e os pluga nos ports.
 */
export async function createApplication(env: Env): Promise<Application> {
  const logger = createLogger({
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    pretty: env.NODE_ENV !== 'production',
  })

  const connection: DbConnection = createDbConnection(env.DATABASE_URL, {
    max: env.DATABASE_POOL_MAX,
  })
  const db = connection.db
  const clock = () => new Date()

  // Adapters
  const courses = new DrizzleCourseRepository(db)
  const content = new DrizzleContentAdminRepository(db)
  const entitlements = new DrizzleEntitlementRepository(db)
  const progress = new DrizzleProgressRepository(db)
  const processed = new DrizzleProcessedWebhookRepository(db)
  const catalog = createCatalogHttpGateway({ baseUrl: env.CATALOG_BASE_URL })

  // Casos de uso do aluno
  const checkAccess = new CheckAccessService(courses, entitlements, clock)
  const listMyCourses = new ListMyCoursesService(entitlements, courses, progress, clock)
  const getMyCourse = new GetMyCourseService(checkAccess, courses, progress)
  const getLesson = new GetLessonService(checkAccess, courses, progress)
  const markComplete = new MarkLessonCompleteService(checkAccess, courses, progress, clock)
  const getProgress = new GetCourseProgressService(checkAccess, courses, progress)

  // Motor de acesso (webhooks)
  const grant = new GrantEntitlementService({
    catalog,
    entitlements,
    graceDays: env.SUBSCRIPTION_GRACE_DAYS,
    newId: () => randomUUID(),
    logger,
  })
  const revoke = new RevokeEntitlementService({ entitlements, clock, logger })

  // Autoria de conteúdo (painel)
  const courseAdmin = new CourseAdminService(content, courses)
  const moduleAdmin = new ModuleAdminService(content, courses)
  const lessonAdmin = new LessonAdminService(content, courses)
  const blockAdmin = new BlockAdminService(content)
  const attachmentAdmin = new AttachmentAdminService(content)

  // Gestão admin (painel)
  const listMembers = new ListMembersService(entitlements, clock)
  const getMemberDetail = new GetMemberDetailService(entitlements, courses, progress)
  const grantManual = new GrantManualEntitlementService({
    catalog,
    courses,
    entitlements,
    newId: () => randomUUID(),
    clock,
    logger,
  })
  const manageEntitlement = new ManageEntitlementService(entitlements, clock)

  const server = createServer({
    env,
    logger,
    members: {
      listMyCourses,
      getMyCourse,
      getLesson,
      markComplete,
      getProgress,
      internalToken: env.INTERNAL_API_TOKEN,
    },
    webhooks: {
      grant,
      revoke,
      processed,
      webhookSecret: env.GATEWAY_HMAC_SECRET,
      toleranceSeconds: env.HMAC_TOLERANCE_SECONDS,
      now: clock,
      logger,
    },
    admin: {
      requireAdminEnabled: env.REQUIRE_ADMIN,
      listMembers,
      getMemberDetail,
      grantManual,
      manageEntitlement,
    },
    content: {
      requireAdminEnabled: env.REQUIRE_ADMIN,
      courses: courseAdmin,
      modules: moduleAdmin,
      lessons: lessonAdmin,
      blocks: blockAdmin,
      attachments: attachmentAdmin,
    },
  })

  return {
    logger,
    async start() {
      server.listen(env.PORT)
      logger.info('http.listening', { port: env.PORT })
    },
    async stop() {
      await server.stop()
      await connection.close()
      logger.info('app.stopped')
    },
  }
}
