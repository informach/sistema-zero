import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { defaultLessonSection, videoCoverageAnswers } from '@sistemazero/core/learning'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

describe('abertura conserva a navegação já guardada', () => {
  test('o responsável retoma o fim ainda não assistido mesmo depois de liberar a próxima parte', async () => {
    const ctx = buildApp(),
      user = randomUUID()
    const course = seedSampleCourse(ctx.courses, `pais-fim-${user}`, 'published', 'kids')
    const stored = ctx.courses.courses.find((c) => c.id === course.courseId)
    if (!stored) throw new Error('Missing parent course')
    stored.learner = 'parents'
    grantLifetime(ctx.entitlements, { userId: user, courseRef: course.slug })
    const lessonId = course.lessonIds[0],
      a = randomUUID(),
      b = randomUUID(),
      revision = 'a'.repeat(32)
    ctx.courses.blocks = ctx.courses.blocks.filter((block) => block.lessonId !== lessonId)
    for (const [order, id] of [a, b].entries())
      ctx.courses.blocks.push({
        id,
        lessonId,
        kind: 'video',
        sortOrder: order,
        contentRevision: revision,
        content: {
          kind: 'video',
          provider: 'file',
          src: `https://example.test/${id}.mp4`,
          durationSeconds: 120,
        },
      })
    const first = {
      ...defaultLessonSection(randomUUID(), 'Parte 1', [a]),
      completion: { version: 1 as const, blockIds: [a] },
    }
    const second = {
      ...defaultLessonSection(randomUUID(), 'Parte 2', [b]),
      completion: { version: 1 as const, blockIds: [b] },
    }
    ctx.learningRepository.structures.set(lessonId, {
      revision: randomUUID(),
      sections: [first, second],
    })
    const request = (path: string, method = 'GET', body?: unknown) =>
      ctx.app.handle(
        new Request(`http://localhost/members${path}`, {
          method,
          headers: { 'content-type': 'application/json', 'x-auth-user-id': user },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        }),
      )
    const save = (seconds: number) =>
      request(`/lessons/${lessonId}/blocks/${a}/learning-progress`, 'PUT', {
        revision,
        answers: videoCoverageAnswers({ duration: 120, ranges: [[0, seconds]] }),
        hintsUsed: 0,
        positionSeconds: seconds,
      })
    expect(
      (await request(`/lessons/${lessonId}/navigation`, 'PUT', { sectionId: first.id })).status,
    ).toBe(200)
    expect((await save(109)).status).toBe(200)
    const partial = await (await request(`/courses/${course.slug}/lessons/${lessonId}`)).json()
    expect(partial.sectionProgress.sections[0].status).toBe('completed')
    expect(partial.sectionProgress.sections[1].status).toBe('available')
    expect(partial.learningProgress.sectionId).toBe(first.id)
    expect((await save(120)).status).toBe(200)
    const ended = await (await request(`/courses/${course.slug}/lessons/${lessonId}`)).json()
    expect(ended.learningProgress.sectionId).toBe(second.id)
    // Rever o vídeo desde o meio continua sendo uma retomada válida.
    expect((await save(50)).status).toBe(200)
    expect(
      (await (await request(`/courses/${course.slug}/lessons/${lessonId}`)).json()).learningProgress
        .sectionId,
    ).toBe(first.id)
  })
  test.each([
    { name: 'adulto', audience: 'adult' as const, parents: false, profile: false },
    { name: 'criança', audience: 'kids' as const, parents: false, profile: true },
    { name: 'responsável', audience: 'kids' as const, parents: true, profile: false },
  ])('$name retoma a mesma parte e os segundos do vídeo na identidade correta', async ({
    audience,
    parents,
    profile,
  }) => {
    const ctx = buildApp(),
      accountId = randomUUID(),
      userId = profile ? randomUUID() : accountId
    const course = seedSampleCourse(ctx.courses, `retomada-${userId}`, 'published', audience)
    const storedCourse = ctx.courses.courses.find((c) => c.id === course.courseId)
    if (!storedCourse) throw new Error('Missing course')
    storedCourse.learner = parents ? 'parents' : 'child'
    grantLifetime(ctx.entitlements, { userId: accountId, courseRef: course.slug })
    const lessonId = course.lessonIds[0],
      videoId = randomUUID(),
      revision = 'a'.repeat(32)
    ctx.courses.blocks = ctx.courses.blocks.filter((b) => b.lessonId !== lessonId)
    ctx.courses.blocks.push({
      id: videoId,
      lessonId,
      kind: 'video',
      sortOrder: 0,
      contentRevision: revision,
      content: {
        kind: 'video',
        provider: 'file',
        src: 'https://example.test/aula.mp4',
        durationSeconds: 120,
      },
    })
    const first = defaultLessonSection(randomUUID(), 'Parte 1', [videoId])
    const second = defaultLessonSection(randomUUID(), 'Parte 2', [])
    ctx.learningRepository.structures.set(lessonId, {
      revision: randomUUID(),
      sections: [first, second],
    })
    const request = (path: string, method = 'GET', body?: unknown) =>
      ctx.app.handle(
        new Request(`http://localhost/members${path}`, {
          method,
          headers: {
            'content-type': 'application/json',
            'x-auth-user-id': userId,
            'x-auth-account-id': accountId,
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        }),
      )
    expect(
      (
        await request(`/lessons/${lessonId}/blocks/${videoId}/learning-progress`, 'PUT', {
          revision,
          answers: {},
          hintsUsed: 0,
          positionSeconds: 87,
        })
      ).status,
    ).toBe(200)
    expect(
      (await request(`/lessons/${lessonId}/navigation`, 'PUT', { sectionId: second.id })).status,
    ).toBe(200)
    expect(
      (
        await request(`/lessons/${lessonId}/navigation`, 'PUT', {
          sectionId: first.id,
          opening: true,
        })
      ).status,
    ).toBe(200)
    const res = await request(`/courses/${course.slug}/lessons/${lessonId}`)
    expect(res.status).toBe(200)
    const reopened = await res.json()
    expect(reopened.learningProgress.sectionId).toBe(second.id)
    expect(
      reopened.learningProgress.blocks.find((b: { blockId: string }) => b.blockId === videoId)
        ?.positionSeconds,
    ).toBe(87)
    expect(
      (await ctx.learningRepository.getProgress({ userId: randomUUID(), accountId }, lessonId))
        .blocks,
    ).toEqual([])
  })
  test('um registro de abertura atrasado não substitui uma parte mais recente', async () => {
    const ctx = buildApp(),
      user = randomUUID()
    const course = seedSampleCourse(ctx.courses),
      lessonId = course.lessonIds[0]
    grantLifetime(ctx.entitlements, { userId: user, courseRef: course.slug })
    const first = defaultLessonSection(
      randomUUID(),
      'Parte 1',
      ctx.courses.blocks.filter((b) => b.lessonId === lessonId).map((b) => b.id),
    )
    const second = defaultLessonSection(randomUUID(), 'Parte 2', [])
    ctx.learningRepository.structures.set(lessonId, {
      revision: randomUUID(),
      sections: [first, second],
    })
    const request = (sectionId: string, opening?: boolean) =>
      ctx.app.handle(
        new Request(`http://localhost/members/lessons/${lessonId}/navigation`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json', 'x-auth-user-id': user },
          body: JSON.stringify({ sectionId, ...(opening ? { opening } : {}) }),
        }),
      )
    expect((await request(second.id)).status).toBe(200)
    expect((await request(first.id, true)).status).toBe(200)
    const saved = await ctx.learningRepository.getProgress(
      { userId: user, accountId: user },
      lessonId,
    )
    expect(saved.sectionId).toBe(second.id)
    expect((await request(first.id)).status).toBe(200)
    expect(
      (await ctx.learningRepository.getProgress({ userId: user, accountId: user }, lessonId))
        .sectionId,
    ).toBe(first.id)
  })
})
