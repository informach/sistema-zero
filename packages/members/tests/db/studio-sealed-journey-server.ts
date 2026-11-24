import { openKidsJourneyTestDatabase } from './kids-journey-database'
import { publishKidsSeedForTest } from './kids-journey-seed-fixture'

const database = process.env.STUDIO_SEALED_JOURNEY_DATABASE_URL
if (process.env.NODE_ENV !== 'test' || !database || process.env.DATABASE_URL !== database)
  throw new Error('Use only the isolated LG04 QA database.')
const db = await openKidsJourneyTestDatabase(database)
try {
  const [policy] = await db.sql`select phase from members.kids_journey_policy where id = 'kids'`
  if (policy?.phase !== 'published') await publishKidsSeedForTest(db.db)
} finally {
  await db.close()
}
// Real service startup/shutdown; fixture bootstrap does not enter frontend compilation.
await import('../../src/index')
