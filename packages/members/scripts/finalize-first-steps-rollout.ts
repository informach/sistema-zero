import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { finalizeFirstStepsRollout } from '../src/infrastructure/persistence/drizzle/finalize-first-steps-rollout'

function argument(name: string): string | null {
  const index = process.argv.indexOf(name)
  return index >= 0 ? (process.argv[index + 1] ?? null) : null
}

if (!process.argv.includes('--confirm')) {
  throw new Error('Operação não executada: passe --confirm depois de ativar a manutenção')
}

const courseSlug = argument('--course-slug')
if (!courseSlug) throw new Error('Passe --course-slug <slug-do-curso-base>')

const databaseUrl = process.env.DATABASE_URL?.trim()
if (!databaseUrl) throw new Error('DATABASE_URL é obrigatória')

const connection = createDbConnection(databaseUrl, { max: 1 })
try {
  const result = await finalizeFirstStepsRollout(connection.sql, courseSlug)
  console.log(
    `[career-rollout] concluído: courseId=${result.courseId}, eventos=${result.updatedEvents}, perfis=${result.affectedProfiles}`,
  )
} finally {
  await connection.close()
}
