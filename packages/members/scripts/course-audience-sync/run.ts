import { loadStudioAuthoringPolicy } from '../../src/infrastructure/config/studio-authoring-policy'
import {
  executeCourseSync,
  type SyncRequest,
} from '../../src/infrastructure/persistence/drizzle/course-sync'
import { createDbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { parsePublishedLessonBlock } from '../../src/interfaces/http/lesson-draft.dtos'

export async function run(request: SyncRequest) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(request.actorId))
    throw new Error('Informe o UUID da conta administrativa responsável')
  if (
    !['staging', 'production'].includes(request.environment) ||
    process.env.RAILWAY_ENVIRONMENT_NAME !== request.environment ||
    process.env.RAILWAY_SERVICE_NAME !== 'members'
  )
    throw new Error('Ambiente ou serviço Railway diferente do solicitado')
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(request.sourceSlug) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(request.targetSlug)
  )
    throw new Error('Slugs inválidos')
  const connection = createDbConnection(process.env.DATABASE_URL ?? '', {
    max: 1,
    idleInTransactionTimeoutMs: 120_000,
  })
  try {
    return await executeCourseSync(connection.db, request, {
      parseBlock: parsePublishedLessonBlock,
      policy: await loadStudioAuthoringPolicy({
        STUDIO_AUTHORING_POLICY_JSON: process.env.STUDIO_AUTHORING_POLICY_JSON,
        STUDIO_AUTHORING_POLICY_SHA256: process.env.STUDIO_AUTHORING_POLICY_SHA256,
      }),
    })
  } finally {
    await connection.close()
  }
}
