import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { defaultLessonSection } from '@sistemazero/core/learning'
import type { LessonDetailView } from '../../src/application/mappers/views'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

function setup(studio = false, backfill = true) {
  const env = buildApp(),
    course = seedSampleCourse(env.courses)
  const userId = randomUUID(),
    lessonId = course.lessonIds[0],
    videoId = randomUUID(),
    quizId = randomUUID(),
    studioId = randomUUID()
  const revision = 'a'.repeat(32)
  grantLifetime(env.entitlements, { userId, courseRef: course.slug })
  env.courses.blocks = env.courses.blocks.filter((b) => b.lessonId !== lessonId)
  env.courses.blocks.push(
    {
      id: videoId,
      lessonId,
      kind: 'video',
      contentRevision: revision,
      sortOrder: 0,
      content: { kind: 'video', provider: 'vimeo', src: 'https://vimeo.com/123456789' },
    },
    {
      id: quizId,
      lessonId,
      kind: 'quiz',
      contentRevision: revision,
      sortOrder: 2,
      content: {
        kind: 'quiz',
        passingScore: 70,
        questions: [
          {
            id: 'q',
            prompt: 'Qual?',
            choices: [
              { id: 'a', label: 'A' },
              { id: 'b', label: 'B' },
            ],
            correctChoiceIds: ['a'],
          },
        ],
      },
    },
  )
  if (studio)
    env.courses.blocks.push({
      id: studioId,
      lessonId,
      kind: 'studio',
      contentRevision: revision,
      sortOrder: 1,
      content: { kind: 'studio', initialProject: {} },
    })
  if (backfill)
    env.learningRepository.structures.set(lessonId, {
      revision: randomUUID(),
      sections: [
        defaultLessonSection(
          lessonId,
          'Aula',
          env.courses.blocks.filter((b) => b.lessonId === lessonId).map((b) => b.id),
        ),
      ],
    })
  const request = (path: string, method = 'GET', body?: unknown) =>
    env.app.handle(
      new Request(`http://localhost/members${path}`, {
        method,
        headers: { 'x-auth-user-id': userId, 'content-type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    )
  const read = async (): Promise<LessonDetailView> =>
    (
      await request(`/courses/${course.slug}/lessons/${lessonId}`)
    ).json() as Promise<LessonDetailView>
  const watch = (ranges: string[], positionSeconds = 99) =>
    request(`/lessons/${lessonId}/blocks/${videoId}/learning-progress`, 'PUT', {
      revision,
      answers: { videoDuration: 100, videoRanges: ranges },
      positionSeconds,
      hintsUsed: 0,
    })
  const quiz = (answer = 'a') =>
    request(`/lessons/${lessonId}/blocks/${quizId}/quiz-attempts`, 'POST', {
      answers: { q: [answer] },
    })
  return {
    ...env,
    course,
    userId,
    lessonId,
    videoId,
    quizId,
    studioId,
    revision,
    request,
    read,
    watch,
    quiz,
  }
}

describe('legacy lessons with two sections', () => {
  test.each([
    true,
    false,
  ])('90% of played intervals unlocks a video-only section, backfill=%s', async (backfill) => {
    const ctx = setup(false, backfill)
    expect((await ctx.read()).sections).toHaveLength(2)
    expect((await ctx.read()).blocks.map((b) => b.id)).toEqual([ctx.videoId])
    expect((await ctx.quiz()).status).toBe(423)
    expect(
      (await ctx.request(`/lessons/${ctx.lessonId}/navigation`, 'PUT', { sectionId: ctx.quizId }))
        .status,
    ).toBe(423)
    expect((await ctx.watch(['0:45', '90:100'])).status).toBe(200)
    expect((await ctx.read()).sectionProgress?.completed).toBe(0)
    expect((await ctx.watch(['45:89'])).status).toBe(200)
    expect((await ctx.read()).sectionProgress?.completed).toBe(1)
    expect((await ctx.request(`/lessons/${ctx.lessonId}/complete`, 'POST')).status).toBe(409)
    expect((await ctx.quiz()).status).toBe(200)
    expect((await ctx.request(`/lessons/${ctx.lessonId}/complete`, 'POST')).status).toBe(200)
    expect(
      await ctx.learningRepository.getSectionProgress(
        { userId: ctx.userId, accountId: ctx.userId },
        ctx.lessonId,
      ),
    ).toEqual([])
  })
  test('watching is no extra requirement with Studio; a historical delivery opens the quiz', async () => {
    const ctx = setup(true)
    expect((await ctx.read()).sectionProgress?.completed).toBe(0)
    await ctx.studioSubmissions.upsert({
      id: randomUUID(),
      userId: ctx.userId,
      accountId: ctx.userId,
      lessonId: ctx.lessonId,
      courseId: ctx.course.courseId,
      blockId: ctx.studioId,
      project: {},
      submittedAt: new Date(),
      passedAt: null,
      score: null,
    })
    expect((await ctx.read()).sectionProgress?.completed).toBe(1)
    const wrong = await ctx.quiz('b')
    expect(wrong.status).toBe(200)
    expect(await wrong.json()).toMatchObject({ retryAvailableAt: expect.any(String) })
    expect((await ctx.request(`/lessons/${ctx.lessonId}/complete`, 'POST')).status).toBe(409)
  })
  test('completed lessons remain open and old resume positions never count as watched', async () => {
    const ctx = setup()
    await ctx.learningRepository.saveProgress({
      userId: ctx.userId,
      accountId: ctx.userId,
      lessonId: ctx.lessonId,
      progress: {
        blockId: ctx.videoId,
        revision: ctx.revision,
        positionSeconds: 99,
        answers: {},
        hintsUsed: 0,
        attemptsCount: 0,
        result: null,
        updatedAt: new Date().toISOString(),
      },
    })
    expect((await ctx.read()).sectionProgress?.completed).toBe(0)
    await ctx.progress.markComplete(ctx.userId, ctx.lessonId, ctx.course.courseId, new Date())
    expect((await ctx.read()).sectionProgress?.percent).toBe(100)
    expect((await ctx.read()).blocks).toHaveLength(2)
  })
})
