import { AdultJourneyService } from '../src/application/adult-journey/adult-journey.service'
import { DrizzleAdultJourneyRepository } from '../src/infrastructure/persistence/drizzle/adult-journey.repository'
import { DrizzleContentAdminRepository } from '../src/infrastructure/persistence/drizzle/content-admin.repository'
import { DrizzleCourseRepository } from '../src/infrastructure/persistence/drizzle/course.repository'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import {
  adultProductionSeedFailed,
  parseAdultProductionSeedArgs,
  runAdultProductionSeed,
} from './adult-journey-production-seed'

export async function main(args = process.argv.slice(2)): Promise<void> {
  const options = parseAdultProductionSeedArgs(args)
  const url = process.env.DATABASE_URL?.trim()
  if (!url) throw new Error('DATABASE_URL ausente')
  const connection = createDbConnection(url, {
    max: 1,
    ssl: ['true', '1'].includes(process.env.DATABASE_SSL?.toLowerCase() ?? ''),
  })
  try {
    const courses = new DrizzleCourseRepository(connection.db)
    const admin = new DrizzleContentAdminRepository(connection.db)
    const report = await runAdultProductionSeed(options, {
      service: new AdultJourneyService(
        new DrizzleAdultJourneyRepository(connection.db),
        courses,
        () => new Date(),
      ),
      listCourses: () => courses.listPublishedCourses('adult'),
      listShowcaseCourseIds: (ids) => admin.listCourseIdsWithShowcaseBlock([...ids]),
    })
    console.log(JSON.stringify(report, null, 2))
    if (adultProductionSeedFailed(report)) process.exitCode = 1
  } finally {
    await connection.close()
  }
}
if (import.meta.main)
  main().catch(() => {
    console.error(
      JSON.stringify({
        domain: 'adult-journey',
        outcome: 'failed',
        reason: 'Confira argumentos, conexão e schema; a política existente não é sobrescrita.',
      }),
    )
    process.exitCode = 1
  })
