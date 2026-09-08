import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

const TOKEN = 'practice-test-internal-token'
async function setup(pilot = true) {
  const accountId = randomUUID(),
    userId = randomUUID()
  const ctx = buildApp({
    internalToken: TOKEN,
    practicePilotAccounts: pilot ? accountId : undefined,
  })
  const course = seedSampleCourse(
    ctx.courses,
    'pratica-criador',
    'published',
    'kids',
    false,
    'primeiros-passos',
    '2d',
    1,
  )
  grantLifetime(ctx.entitlements, { userId: accountId, courseRef: course.slug })
  const blockId = randomUUID(),
    lessonId = course.lessonIds[0]
  ctx.courses.blocks.push({
    id: blockId,
    lessonId,
    kind: 'quiz',
    sortOrder: 1,
    content: {
      kind: 'quiz',
      passingScore: 100,
      questions: [
        {
          id: 'q',
          prompt: 'Qual bloco repete uma ação?',
          choices: [
            { id: 'repeat', label: 'Repetir' },
            { id: 'stop', label: 'Parar' },
          ],
          correctChoiceIds: ['repeat'],
          explanation: 'Repetir executa a mesma ação várias vezes.',
        },
      ],
    },
  })
  const headers = {
    'x-auth-user-id': userId,
    'x-auth-account-id': accountId,
    'x-internal-token': TOKEN,
    'content-type': 'application/json',
  }
  const request = (path: string, body?: unknown, override: Record<string, string> = {}) =>
    ctx.app.handle(
      new Request(`http://localhost/members/practice${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { ...headers, ...override },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    )
  async function learned() {
    await ctx.progress.markComplete(userId, lessonId, course.courseId, new Date())
    await ctx.quizAttempts.save({
      id: randomUUID(),
      userId,
      lessonId,
      blockId,
      courseId: course.courseId,
      score: 100,
      passed: true,
      answers: { q: ['repeat'] },
      createdAt: new Date(),
    })
  }
  const input = { id: randomUUID(), courseSlug: course.slug, lessonId, blockId }
  return { ...ctx, accountId, userId, course, blockId, lessonId, request, learned, input }
}

describe('prática independente', () => {
  test('coorte, autenticação e conteúdo aprendido são exigidos antes de abrir uma sessão', async () => {
    const closed = await setup(false)
    expect(await (await closed.request('/availability')).json()).toEqual({ enabled: false })
    expect((await closed.request('/sessions', closed.input)).status).toBe(403)
    const ctx = await setup()
    expect(
      (await ctx.request('/sessions', ctx.input, { 'x-internal-token': 'wrong' })).status,
    ).toBe(401)
    expect((await ctx.request('/sessions', ctx.input)).status).toBe(409)
    expect(await (await ctx.request(`/topics?courseSlug=${ctx.course.slug}`)).json()).toEqual({
      topics: [],
    })
    await ctx.learned()
    expect(await (await ctx.request(`/topics?courseSlug=${ctx.course.slug}`)).json()).toMatchObject(
      { topics: [{ lessonId: ctx.lessonId, blockId: ctx.blockId, questionCount: 1 }] },
    )
    const response = await ctx.request('/sessions', ctx.input)
    expect(response.status).toBe(200)
    const raw = await response.text()
    expect(raw).not.toContain('correctChoiceIds')
    expect(raw).not.toContain('explanation')
  })
  test('corrige, preserva a primeira resposta e não altera XP, moedas, conclusões nem tentativas de aula', async () => {
    const ctx = await setup()
    await ctx.learned()
    await ctx.request('/sessions', ctx.input)
    const before = structuredClone({
      xp: ctx.gamification.events,
      coins: ctx.gamification.coinEvents,
      lessons: ctx.progress.completions,
      attempts: ctx.quizAttempts.attempts,
    })
    expect(
      (await ctx.request(`/sessions/${ctx.input.id}/answers`, { answers: { q: ['invented'] } }))
        .status,
    ).toBe(400)
    const result = await ctx.request(`/sessions/${ctx.input.id}/answers`, {
      answers: { q: ['stop'] },
    })
    expect(result.status).toBe(200)
    expect(await result.json()).toMatchObject({
      session: {
        answers: { q: ['stop'] },
        review: {
          score: 0,
          questions: [
            {
              correct: false,
              correctChoiceIds: ['repeat'],
              explanation: 'Repetir executa a mesma ação várias vezes.',
            },
          ],
        },
      },
    })
    expect(
      await (
        await ctx.request(`/sessions/${ctx.input.id}/answers`, { answers: { q: ['repeat'] } })
      ).json(),
    ).toMatchObject({ session: { answers: { q: ['stop'] }, review: { score: 0 } } })
    expect({
      xp: ctx.gamification.events,
      coins: ctx.gamification.coinEvents,
      lessons: ctx.progress.completions,
      attempts: ctx.quizAttempts.attempts,
    }).toEqual(before)
  })
  test('irmãos e outra conta não leem nem respondem a prática; UUID repetido não duplica', async () => {
    const ctx = await setup()
    await ctx.learned()
    await Promise.all([ctx.request('/sessions', ctx.input), ctx.request('/sessions', ctx.input)])
    const history = await (await ctx.request('/sessions')).json()
    expect(history).toMatchObject({ sessions: [{ id: ctx.input.id }] })
    expect(history).toHaveProperty('sessions.length', 1)
    const otherOwners: Record<string, string>[] = [
      { 'x-auth-user-id': randomUUID() },
      { 'x-auth-account-id': randomUUID() },
    ]
    for (const override of otherOwners) {
      expect((await ctx.request(`/sessions/${ctx.input.id}`, undefined, override)).status).toBe(404)
      expect(
        (
          await ctx.request(
            `/sessions/${ctx.input.id}/answers`,
            { answers: { q: ['repeat'] } },
            override,
          )
        ).status,
      ).toBe(404)
      expect(await (await ctx.request('/sessions', undefined, override)).json()).toEqual({
        sessions: [],
      })
    }
  })
  test('edição do quiz exige estudá-lo novamente; histórico iniciado preserva seu conteúdo', async () => {
    const ctx = await setup()
    await ctx.learned()
    await ctx.request('/sessions', ctx.input)
    ctx.quizAttempts.deleteByBlockId(ctx.blockId)
    const block = ctx.courses.blocks.find((row) => row.id === ctx.blockId)
    if (block?.content.kind !== 'quiz') throw new Error('Quiz fixture missing')
    const question = block.content.questions[0]
    if (!question) throw new Error('Question fixture missing')
    question.prompt = 'Novo assunto'
    expect((await ctx.request('/sessions', { ...ctx.input, id: randomUUID() })).status).toBe(409)
    expect(await (await ctx.request(`/sessions/${ctx.input.id}`)).json()).toMatchObject({
      session: { questions: [{ prompt: 'Qual bloco repete uma ação?' }] },
    })
    const lesson = ctx.courses.lessons.find((row) => row.id === ctx.lessonId)
    if (!lesson) throw new Error('Lesson fixture missing')
    lesson.isPublished = false
    expect((await ctx.request('/sessions', { ...ctx.input, id: randomUUID() })).status).toBe(404)
    expect(
      (await ctx.request(`/sessions/${ctx.input.id}/answers`, { answers: { q: ['repeat'] } }))
        .status,
    ).toBe(200)
  })
})
