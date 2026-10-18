import { expect, test } from 'bun:test'
import { DrizzleLiveBenefitsRepository } from '../../src/infrastructure/persistence/drizzle/live-benefits.repository'
import { openStudioReviewDatabase } from './studio-review-database'

const url = process.env.STUDIO_REVIEW_DATABASE_URL
test.skipIf(!url)(
  'adult workshop seats never grant Kids profiles or wall access; legacy Kids seats retain their rights',
  async () => {
    const connection = await openStudioReviewDatabase(url!)
    const { sql } = connection
    const accountId = crypto.randomUUID(),
      childId = crypto.randomUUID()
    const courseIds: string[] = [],
      cohortIds: string[] = [],
      sessionIds: string[] = [],
      enrollmentIds: string[] = []
    const now = new Date('2026-10-18T12:00:00Z'),
      start = new Date(now.getTime() - 60000),
      end = new Date(now.getTime() + 60000)
    const benefits = new DrizzleLiveBenefitsRepository(connection.db)
    async function seat(audience: 'adult' | 'kids' | null, learnerId: string | null) {
      const courseId = audience ? crypto.randomUUID() : null,
        cohortId = crypto.randomUUID(),
        sessionId = crypto.randomUUID(),
        enrollmentId = crypto.randomUUID()
      if (courseId) {
        courseIds.push(courseId)
        await sql`insert into members.courses(id,slug,title,audience,modality,created_at,updated_at) values(${courseId},${courseId},'QA',${audience},'live',${now.toISOString()}::timestamptz,${now.toISOString()}::timestamptz)`
      }
      cohortIds.push(cohortId)
      sessionIds.push(sessionId)
      enrollmentIds.push(enrollmentId)
      await sql`insert into members.live_cohorts(id,course_id,document)values(${cohortId},${courseId},'{}')`
      await sql`insert into members.live_sessions(id,cohort_id,document)values(${sessionId},${cohortId},'{}')`
      await sql`insert into members.live_enrollments(id,cohort_id,account_id,learner_id,status,document)values(${enrollmentId},${cohortId},${accountId},${learnerId},'active','{}')`
      await sql`insert into members.live_access_grants(id,enrollment_id,session_id,starts_at,ends_at)values(${crypto.randomUUID()},${enrollmentId},${sessionId},${start.toISOString()}::timestamptz,${end.toISOString()}::timestamptz)`
    }
    try {
      await seat('adult', accountId)
      expect(await benefits.maxProfiles(accountId, now)).toBe(0)
      expect(await benefits.hasMural(accountId, accountId, now)).toBe(false)
      await seat('kids', childId)
      expect(await benefits.maxProfiles(accountId, now)).toBe(1)
      expect(await benefits.hasMural(accountId, childId, now)).toBe(true)
      await seat(null, null)
      expect(await benefits.maxProfiles(accountId, now)).toBe(2)
      expect(await benefits.hasMural(accountId, accountId, now)).toBe(false)
      expect(await benefits.hasMural(accountId, childId, new Date(end.getTime() + 1))).toBe(false)
    } finally {
      await sql`delete from members.live_access_grants where enrollment_id in ${sql(enrollmentIds)}`
      await sql`delete from members.live_enrollments where id in ${sql(enrollmentIds)}`
      await sql`delete from members.live_sessions where id in ${sql(sessionIds)}`
      await sql`delete from members.live_cohorts where id in ${sql(cohortIds)}`
      await sql`delete from members.courses where id in ${sql(courseIds)}`
      await connection.close()
    }
  },
)
