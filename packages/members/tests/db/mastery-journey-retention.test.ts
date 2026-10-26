import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { creatorJourneyCourseIds, initialKidsJourneyPolicy } from '../../../core/src/journey'
import {
  creatorCurriculumFixture,
  creatorPostCompletions,
} from '../../../core/tests/fixtures/creator-curriculum'
import { KidsJourneyQueryService } from '../../src/application/kids-journey/kids-journey-query.service'
import { DrizzleKidsJourneyRepository } from '../../src/infrastructure/persistence/drizzle/kids-journey.repository'
import { DrizzleMasteryRepository } from '../../src/infrastructure/persistence/drizzle/mastery.repository'
import { courses, kidsJourneyPolicy } from '../../src/infrastructure/persistence/drizzle/schema'
import { openKidsJourneyTestDatabase } from './kids-journey-database'

const target = process.env.MASTERY_RETENTION_TEST_DATABASE_URL
for (const mode of ['award', 'nucleus-credit'] as const)
  test.skipIf(!target)(
    `Kids ${mode} after cohort capture preserves new rights through a policy move`,
    async () => {
      const database = new URL(target!)
      database.pathname += mode === 'award' ? '_award' : '_credit'
      const connection = await openKidsJourneyTestDatabase(database.toString())
      try {
        const curriculum = creatorCurriculumFixture()
        if (mode === 'nucleus-credit')
          Object.assign(curriculum.masteries[0]!.levels[0]!, { grants: ['molda'] })
        const policy = { ...initialKidsJourneyPolicy(), curriculum }
        const changed = structuredClone(curriculum)
        const area = changed.masteries[0]!
        if (mode === 'nucleus-credit') Object.assign(area.levels[0]!, { grants: undefined })
        const oldNucleus = area.levels[1]!.nucleusCourseIds[0]!
        // A real editorial move: the previous level-II nucleus now belongs to level III.
        const replacement = area.levels[2]!.nucleusCourseIds
        Object.assign(area.levels[2]!, { nucleusCourseIds: area.levels[1]!.nucleusCourseIds })
        Object.assign(area.levels[1]!, { nucleusCourseIds: replacement })
        await connection.db
          .insert(kidsJourneyPolicy)
          .values({ id: 'kids', phase: 'published', version: 1, policy, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: kidsJourneyPolicy.id,
            set: { phase: 'published', version: 1, policy },
          })
        await connection.db.insert(courses).values(
          creatorJourneyCourseIds(curriculum).map((id) => ({
            id,
            slug: id,
            title: id,
            status: 'published' as const,
            audience: 'kids' as const,
            modality: 'recorded' as const,
            level: 'iniciante' as const,
            track: '2d' as const,
            createdAt: new Date(),
            updatedAt: new Date(),
          })),
        )
        const owner = { userId: randomUUID(), accountId: randomUUID() }
        const repo = new DrizzleKidsJourneyRepository(connection.db)
        const awards = new DrizzleMasteryRepository(connection.db)
        const query = new KidsJourneyQueryService(repo)
        await connection.sql`insert into members.gamification_profiles(id,user_id,account_id,audience,created_at,updated_at) values(${randomUUID()},${owner.userId},${owner.accountId},'kids',now(),now())`
        await repo.initializeProfile(owner)
        const level = curriculum.masteries[0]!.levels[0]!
        const completions = [
          ...creatorPostCompletions(curriculum, 0),
          curriculum.stages[1]!.base2dCourseId,
          curriculum.stages[1]!.base3dCourseId,
          ...(mode === 'award'
            ? [
                ...level.nucleusCourseIds,
                ...level.workshops.slice(0, 2).flatMap((w) => w.courseIds),
              ]
            : []),
        ]
        for (const courseId of completions)
          await connection.sql`insert into members.xp_events(id,user_id,audience,source_type,source_id,amount,created_at) values(${randomUUID()},${owner.userId},'kids','course_complete',${courseId},0,now())`
        const actor = { kind: 'user' as const, id: randomUUID() }
        let ready = (await repo.createPreparation({
          expectedVersion: 1,
          candidatePolicy: { ...policy, curriculum: changed },
          actor,
          reason: 'Reorganizar nível II/III',
        }))!
        while (ready.status === 'capturing')
          ready = (await repo.advanceCapture(ready.id, ready.captureStage, ready.captureCursor))!
        while (ready.status === 'preparing') {
          const result = await repo.advancePreparation(ready.id, ready.cursor)
          if (result.status !== 'advanced') throw new Error(result.status)
          ready = result.preparation
        }
        const submission = await awards.submit({
          ...owner,
          audience: 'kids',
          id: randomUUID(),
          masteryId: 'python2d',
          level: 1,
          areaTitle: 'Python 2D',
          policyVersion: 1,
          definition: level,
          message: null,
          submittedAt: new Date(),
          evidence: {
            id: randomUUID(),
            title: 'Projeto aprovado',
            lessonId: randomUUID(),
            kind: 'studio',
            revision: 'v1',
            payload: { project: {} },
            createdAt: new Date(),
          },
        })
        const reviewId = randomUUID()
        await awards.review({
          id: reviewId,
          submissionId: submission.id,
          reviewerId: randomUUID(),
          reviewedAt: new Date(),
          feedback: 'Todos os critérios demonstrados.',
          criteria: level.rubric.criteria.map((c) => ({
            criterionId: c.id,
            result: 'approved' as const,
            feedback: '',
          })),
          credits:
            mode === 'nucleus-credit'
              ? [
                  {
                    requirementId: 'nucleus',
                    reason: 'Equivalência demonstrada neste projeto preservado.',
                  },
                ]
              : [],
        })
        const saved =
          mode === 'award'
            ? await awards.award(
                {
                  ...owner,
                  audience: 'kids',
                  masteryId: 'python2d',
                  level: 1,
                  submissionId: submission.id,
                  reviewId,
                  capabilities: [],
                  awardedAt: new Date(),
                },
                { policyVersion: 1 },
              )
            : null
        const afterReview = (await repo.readSnapshot([owner])).profiles.get(owner.userId)!
        if (mode === 'nucleus-credit') {
          expect(afterReview.earned.capabilities).toContain('molda')
          expect(await awards.listAwards({ ...owner, audience: 'kids' })).toHaveLength(0)
        }
        const before = (await query.courseLocks(owner, [oldNucleus])).get(oldNucleus)
        const published = await repo.publishPrepared({
          preparationId: ready.id,
          expectedVersion: ready.expectedVersion,
          draftHash: ready.draftHash,
          catalogHash: ready.catalogHash,
          cohortHash: ready.cohortHash!,
          actor,
        })
        const after = (await query.courseLocks(owner, [oldNucleus])).get(oldNucleus)
        const snapshot = await repo.readSnapshot([owner])
        const retained = snapshot.profiles
          .get(owner.userId)!
          .earned.courseAccess.creatorCourseIds?.includes(oldNucleus)
        expect(published?.version).toBe(2)
        if (mode === 'award') {
          expect(saved?.status).toBe('saved')
          expect(before).toEqual({ locked: false })
          expect(after).toEqual({ locked: false })
          expect(retained).toBe(true)
        } else {
          expect(snapshot.profiles.get(owner.userId)!.earned.capabilities).toContain('molda')
          expect(
            snapshot.profiles.get(owner.userId)!.masteryFacts?.masteryApprovals[0]
              ?.nucleusEquivalent,
          ).toBe(true)
        }
      } finally {
        await connection.close()
      }
    },
    60000,
  )
