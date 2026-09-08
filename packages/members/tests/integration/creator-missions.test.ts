import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { AccessCheckService } from '../../src/application/access-check/access-check.service'
import { GetMissionsService } from '../../src/application/gamification/get-missions.service'
import { ListMyCoursesService } from '../../src/application/list-my-courses/list-my-courses.service'
import {
  assignDailyMissions,
  assignMonthlyMissions,
  assignWeeklyMissions,
  monthlyPeriodKey,
  weeklyPeriodKey,
} from '../../src/domain/gamification/missions'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

const today = '2026-06-02'
const now = new Date(`${today}T12:00:00Z`)

test('free-creation missions wait for the career without reshuffling or hiding completed legacy work', async () => {
  const ctx = buildApp()
  const ownsStudio = (ref: string) => ref === 'estudio-completo'
  const assigned = (id: string) => [
    ...assignWeeklyMissions(id, weeklyPeriodKey(today), ownsStudio),
    ...assignMonthlyMissions(id, monthlyPeriodKey(today), ownsStudio),
  ]
  const userId = Array.from({ length: 100 }, () => randomUUID()).find((id) =>
    assigned(id).some((m) => m.goalType === 'studio_remix'),
  )
  if (!userId) throw new Error('No remix mission in fixture cohort')
  const accountId = randomUUID()
  grantLifetime(ctx.entitlements, { userId: accountId, courseRef: 'estudio-completo' })
  const service = new GetMissionsService(
    ctx.gamification,
    new AccessCheckService(ctx.entitlements, () => now),
    () => now,
    new ListMyCoursesService(
      ctx.entitlements,
      ctx.courses,
      ctx.progress,
      ctx.positions,
      ctx.gamification,
      () => now,
    ),
  )
  const read = async () => {
    const view = await service.execute(userId, accountId, 'kids')
    return [...view.daily, ...view.weekly, ...view.monthly]
  }
  const before = await read()
  expect(
    before.some((m) => m.goalType === 'studio_remix' || m.goalType === 'studio_published'),
  ).toBe(false)
  const remix = assigned(userId).find((m) => m.goalType === 'studio_remix')
  if (!remix) throw new Error('Missing assigned remix')
  await ctx.gamification.award({
    userId,
    accountId,
    audience: 'kids',
    today,
    now,
    privileged: false,
    events: Array.from({ length: remix.target }, () => ({
      sourceType: 'studio_remix' as const,
      sourceId: randomUUID(),
      amount: 0,
    })),
  })
  expect((await read()).find((m) => m.slug === remix.slug)?.completed).toBe(true)
  const foundation = seedSampleCourse(
    ctx.courses,
    'mission-foundation',
    'published',
    'kids',
    false,
    'primeiros-passos',
    '2d',
    1,
  )
  await ctx.gamification.award({
    userId,
    accountId,
    audience: 'kids',
    today,
    now,
    privileged: false,
    events: [
      { sourceType: 'course_complete', sourceId: foundation.courseId, amount: 0 },
      { sourceType: 'course_showcased', sourceId: foundation.courseId, amount: 0 },
    ],
  })
  const after = await read()
  expect(after.some((m) => m.slug === remix.slug)).toBe(true)
  expect(
    before.every((old) => after.some((m) => m.slug === old.slug && m.periodKey === old.periodKey)),
  ).toBe(true)
})

test('content missions use the learner access and remaining events, preserving earned rewards', async () => {
  const ctx = buildApp(),
    accountId = randomUUID()
  const userId = Array.from(
    { length: 100 },
    (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
  ).find((id) =>
    assignDailyMissions(id, today, () => false).some((m) => m.goalType === 'quiz_passed'),
  )
  if (!userId) throw new Error('Quiz fixture missing')
  const course = seedSampleCourse(
    ctx.courses,
    'mission-access',
    'published',
    'kids',
    true,
    'primeiros-passos',
    '2d',
    1,
  )
  const quizId = randomUUID()
  ctx.courses.blocks.push({
    id: quizId,
    lessonId: course.lessonIds[0],
    kind: 'quiz',
    sortOrder: 12,
    content: {
      kind: 'quiz',
      questions: [
        { id: 'q', prompt: 'Escolha', choices: [{ id: 'a', label: 'A' }], correctChoiceIds: ['a'] },
      ],
    },
  })
  const service = new GetMissionsService(
    ctx.gamification,
    new AccessCheckService(ctx.entitlements, () => now),
    () => now,
    new ListMyCoursesService(
      ctx.entitlements,
      ctx.courses,
      ctx.progress,
      ctx.positions,
      ctx.gamification,
      () => now,
    ),
  )
  const read = async (learner = userId) => {
    const view = await service.execute(learner, accountId, 'kids')
    return [...view.daily, ...view.weekly, ...view.monthly]
  }
  expect((await read()).some((m) => m.goalType === 'quiz_passed')).toBe(false)
  grantLifetime(ctx.entitlements, { userId: accountId, courseRef: course.slug })
  expect((await read()).find((m) => m.slug === 'daily-quiz')?.target).toBe(1)
  expect((await read()).some((m) => m.slug === 'weekly-quizzes-3')).toBe(false)
  const quiz = ctx.courses.blocks.find((b) => b.id === quizId)
  if (!quiz) throw new Error('Missing quiz')
  ctx.courses.blocks.push({
    id: randomUUID(),
    lessonId: course.lessonIds[0],
    kind: 'coming_soon',
    sortOrder: 13,
    content: { kind: 'coming_soon' },
  })
  expect((await read()).some((m) => m.goalType === 'quiz_passed')).toBe(false)
  ctx.courses.blocks = ctx.courses.blocks.filter((b) => b.kind !== 'coming_soon')
  await ctx.gamification.award({
    userId,
    accountId,
    audience: 'kids',
    today,
    now,
    privileged: false,
    events: [{ sourceType: 'quiz_passed', sourceId: quizId, amount: 15 }],
  })
  const done = (await read()).find((m) => m.slug === 'daily-quiz')
  expect(done).toMatchObject({ completed: true, progress: 1 })
  expect(
    (await ctx.gamification.listContentMissionOpportunities(userId, 'kids', [course.slug])).get(
      'quiz_passed',
    ),
  ).toBe(0)
  expect(
    (
      await ctx.gamification.listContentMissionOpportunities(randomUUID(), 'kids', [course.slug])
    ).get('quiz_passed'),
  ).toBe(1)
  ctx.courses.blocks = ctx.courses.blocks.filter((b) => b.id !== quizId)
  expect((await read()).find((m) => m.slug === 'daily-quiz')).toEqual(done)
})
