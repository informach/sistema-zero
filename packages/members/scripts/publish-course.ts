import {
  CoursePublicationCommandSchema,
  CoursePublicationPrepareSchema,
} from '@sistemazero/core/course/publication'
import { z } from 'zod'
import { CoursePublicationService } from '../src/application/course-publication/course-publication.service'
import { loadStudioAuthoringPolicy } from '../src/infrastructure/config/studio-authoring-policy'
import { createCoursePromotionPeerClient } from '../src/infrastructure/course-publication/promotion-peer.client'
import { DrizzleCoursePublicationRepository } from '../src/infrastructure/persistence/drizzle/course-publication.repository'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { parsePublishedLessonBlock } from '../src/interfaces/http/lesson-draft.dtos'

const environment = z.enum(['staging', 'production'])
export const PublicationOperatorRequestSchema = z.discriminatedUnion('action', [
  CoursePublicationPrepareSchema.extend({
    action: z.literal('preview'),
    environment,
    actorId: z.uuid(),
  }),
  z.strictObject({ action: z.literal('view'), environment, id: z.uuid() }),
  CoursePublicationCommandSchema.extend({
    action: z.enum(['approve', 'cancel', 'resume']),
    environment,
    id: z.uuid(),
  }),
])

/** Operational entrypoint, never invoked by a web request. Same service and durable worker as the Admin. */
export async function runCoursePublicationOperator(value: unknown) {
  const input = PublicationOperatorRequestSchema.parse(value)
  if (
    process.env.RAILWAY_SERVICE_NAME !== 'members' ||
    process.env.RAILWAY_ENVIRONMENT_NAME !== input.environment ||
    process.env.COURSE_PUBLICATION_ENVIRONMENT !== input.environment
  )
    throw new Error(
      'Execute no Members Railway do ambiente solicitado, com a publicação configurada',
    )
  const connection = createDbConnection(process.env.DATABASE_URL ?? '', { max: 1 })
  try {
    const repository = new DrizzleCoursePublicationRepository(connection.db, {
      parseBlock: parsePublishedLessonBlock,
      policy: await loadStudioAuthoringPolicy({
        STUDIO_AUTHORING_POLICY_JSON: process.env.STUDIO_AUTHORING_POLICY_JSON,
        STUDIO_AUTHORING_POLICY_SHA256: process.env.STUDIO_AUTHORING_POLICY_SHA256,
      }),
    })
    const production =
      input.environment === 'staging' &&
      process.env.COURSE_PUBLICATION_PRODUCTION_ADMIN_URL &&
      process.env.COURSE_PUBLICATION_PEER_TOKEN
        ? createCoursePromotionPeerClient({
            url: process.env.COURSE_PUBLICATION_PRODUCTION_ADMIN_URL,
            token: process.env.COURSE_PUBLICATION_PEER_TOKEN,
            throughAdmin: true,
          })
        : undefined
    const service = new CoursePublicationService(repository, input.environment, production)
    if (input.action === 'preview') return service.prepare(input)
    if (input.action === 'view') return service.view(input.id)
    return service.command(input.id, input.action, input.version, input.planHash)
  } finally {
    await connection.close()
  }
}
if (import.meta.main) {
  const path = process.argv[2]
  if (!path || process.argv.length !== 3)
    throw new Error('Informe um arquivo JSON de pedido da publicação')
  const file = Bun.file(path)
  if (file.size > 32_768) throw new Error('Pedido acima de 32 KB')
  console.log(JSON.stringify(await runCoursePublicationOperator(await file.json())))
}
