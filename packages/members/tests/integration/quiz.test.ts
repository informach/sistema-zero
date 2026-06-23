import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { InMemoryCourseRepository } from '../fakes/in-memory'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

const USER = '11111111-1111-1111-1111-111111111111'
const authHeaders = { 'x-auth-user-id': USER, 'content-type': 'application/json' }

type App = ReturnType<typeof buildApp>['app']
const readJson = (res: Response): Promise<any> => res.json()

/** Anexa um bloco de quiz (2 questões, gabarito conhecido) a uma aula existente. */
function seedQuizBlock(
  courses: InMemoryCourseRepository,
  lessonId: string,
  opts: { passingScore?: number } = {},
) {
  const blockId = randomUUID()
  courses.blocks.push({
    id: blockId,
    lessonId,
    kind: 'quiz',
    sortOrder: 10,
    content: {
      kind: 'quiz',
      ...(opts.passingScore !== undefined ? { passingScore: opts.passingScore } : {}),
      questions: [
        {
          id: 'q1',
          prompt: '2 + 2?',
          choices: [
            { id: 'a', label: '3' },
            { id: 'b', label: '4' },
          ],
          correctChoiceIds: ['b'],
          explanation: 'Aritmética básica.',
        },
        {
          id: 'q2',
          prompt: 'Capital do Brasil?',
          choices: [
            { id: 'a', label: 'Brasília' },
            { id: 'b', label: 'Rio' },
          ],
          correctChoiceIds: ['a'],
        },
      ],
    },
  })
  return blockId
}

const submit = (app: App, lessonId: string, blockId: string, answers: unknown) =>
  app.handle(
    new Request(`http://localhost/members/lessons/${lessonId}/blocks/${blockId}/quiz-attempts`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ answers }),
    }),
  )

const complete = (app: App, lessonId: string) =>
  app.handle(
    new Request(`http://localhost/members/lessons/${lessonId}/complete`, {
      method: 'POST',
      headers: authHeaders,
    }),
  )

const getLesson = (app: App, slug: string, lessonId: string) =>
  app.handle(
    new Request(`http://localhost/members/courses/${slug}/lessons/${lessonId}`, {
      headers: authHeaders,
    }),
  )

const updateBlock = (app: App, blockId: string, content: unknown) =>
  app.handle(
    new Request(`http://localhost/members/admin/blocks/${blockId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ content }),
    }),
  )

describe('Quiz server-side', () => {
  test('GET da aula NÃO vaza gabarito e traz quizState zerado', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    seedQuizBlock(courses, course.lessonIds[0], { passingScore: 100 })

    const res = await getLesson(app, course.slug, course.lessonIds[0])
    expect(res.status).toBe(200)
    const raw = await res.text()
    expect(raw).not.toContain('correctChoiceIds')
    expect(raw).not.toContain('explanation')

    const body = JSON.parse(raw)
    const quizBlock = body.blocks.find((b: { kind: string }) => b.kind === 'quiz')
    expect(quizBlock.content.passingScore).toBe(100)
    expect(quizBlock.quizState).toEqual({
      lastScore: null,
      passed: false,
      attemptsCount: 0,
      retryAvailableAt: null,
    })
  })

  test('submit aprovado → score 100, correções com gabarito, sem cooldown', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    const blockId = seedQuizBlock(courses, course.lessonIds[0], { passingScore: 100 })

    const res = await submit(app, course.lessonIds[0], blockId, { q1: ['b'], q2: ['a'] })
    expect(res.status).toBe(200)
    const body = await readJson(res)
    expect(body).toMatchObject({ score: 100, passed: true, passingScore: 100, attemptsCount: 1 })
    expect(body.retryAvailableAt).toBeNull()
    expect(body.questions[0]).toMatchObject({ correct: true, correctChoiceIds: ['b'] })
  })

  test('reprovou → cooldown: retry imediato 429; após 5 min liberado', async () => {
    const { app, courses, entitlements, clockRef } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    const blockId = seedQuizBlock(courses, course.lessonIds[0], { passingScore: 100 })

    const fail = await submit(app, course.lessonIds[0], blockId, { q1: ['a'], q2: ['a'] })
    expect(fail.status).toBe(200)
    const failBody = await readJson(fail)
    expect(failBody).toMatchObject({ score: 50, passed: false })
    expect(failBody.retryAvailableAt).toBe('2026-06-02T12:05:00.000Z')

    const blocked = await submit(app, course.lessonIds[0], blockId, { q1: ['b'], q2: ['a'] })
    expect(blocked.status).toBe(429)
    expect((await readJson(blocked)).error.code).toBe('QUIZ_COOLDOWN')

    // GET da aula reflete o cooldown no quizState.
    const lesson = await readJson(await getLesson(app, course.slug, course.lessonIds[0]))
    const qb = lesson.blocks.find((b: { kind: string }) => b.kind === 'quiz')
    expect(qb.quizState).toMatchObject({
      lastScore: 50,
      passed: false,
      attemptsCount: 1,
      retryAvailableAt: '2026-06-02T12:05:00.000Z',
    })

    // 5 minutos depois → liberado e aprova.
    clockRef.now = new Date('2026-06-02T12:05:01.000Z')
    const retry = await submit(app, course.lessonIds[0], blockId, { q1: ['b'], q2: ['a'] })
    expect(retry.status).toBe(200)
    expect(await readJson(retry)).toMatchObject({ passed: true, attemptsCount: 2 })
  })

  test('aprovado antes: reprovar num re-treino NÃO re-arma cooldown (retryAvailableAt null)', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    const blockId = seedQuizBlock(courses, course.lessonIds[0], { passingScore: 100 })

    // Aprova (gate destravado para sempre).
    const pass = await submit(app, course.lessonIds[0], blockId, { q1: ['b'], q2: ['a'] })
    expect((await readJson(pass)).passed).toBe(true)

    // Re-treino reprovado: como já aprovou, NÃO há cooldown — e a resposta não pode
    // anunciar um `retryAvailableAt` que o GET (computeRetryAvailableAt) dá como nulo.
    const refail = await submit(app, course.lessonIds[0], blockId, { q1: ['a'], q2: ['a'] })
    expect(refail.status).toBe(200)
    const body = await readJson(refail)
    expect(body.passed).toBe(false)
    expect(body.retryAvailableAt).toBeNull()

    const lesson = await readJson(await getLesson(app, course.slug, course.lessonIds[0]))
    const qb = lesson.blocks.find((b: { kind: string }) => b.kind === 'quiz')
    expect(qb.quizState.retryAvailableAt).toBeNull()
  })

  test('corrida de submits simultâneos: o guard atômico do save barra o perdedor (429)', async () => {
    const { app, courses, entitlements, quizAttempts } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    const blockId = seedQuizBlock(courses, course.lessonIds[0], { passingScore: 100 })

    // Simula a corrida check-then-act: a pré-checagem passou (sem cooldown), mas
    // o save com guard perde para um submit concorrente que reprovou primeiro.
    const originalSave = quizAttempts.save.bind(quizAttempts)
    quizAttempts.save = async () => false
    const lost = await submit(app, course.lessonIds[0], blockId, { q1: ['a'], q2: ['a'] })
    expect(lost.status).toBe(429)
    expect((await readJson(lost)).error.code).toBe('QUIZ_COOLDOWN')
    quizAttempts.save = originalSave
    // Nada foi gravado pelo perdedor.
    expect(quizAttempts.attempts).toHaveLength(0)
  })

  test('gate: complete 409 sem quiz aprovado; após aprovar → 200', async () => {
    const { app, courses, entitlements, clockRef } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    const lessonId = course.lessonIds[0]
    const blockId = seedQuizBlock(courses, lessonId, { passingScore: 100 })

    const blocked = await complete(app, lessonId)
    expect(blocked.status).toBe(409)
    expect((await readJson(blocked)).error.code).toBe('QUIZ_GATE_NOT_PASSED')

    // Reprovar não destrava.
    await submit(app, lessonId, blockId, { q1: ['a'], q2: ['a'] })
    expect((await complete(app, lessonId)).status).toBe(409)

    // Aprovar destrava (avança o relógio p/ sair do cooldown).
    clockRef.now = new Date('2026-06-02T12:10:00.000Z')
    await submit(app, lessonId, blockId, { q1: ['b'], q2: ['a'] })
    const ok = await complete(app, lessonId)
    expect(ok.status).toBe(200)
    expect((await readJson(ok)).completedLessons).toBe(1)

    // Idempotente: completar de novo continua 200.
    expect((await complete(app, lessonId)).status).toBe(200)
  })

  test('editar quiz avaliativo invalida aprovação anterior do mesmo bloco', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    const lessonId = course.lessonIds[0]
    const blockId = seedQuizBlock(courses, lessonId, { passingScore: 100 })

    const oldPass = await submit(app, lessonId, blockId, { q1: ['b'], q2: ['a'] })
    expect(oldPass.status).toBe(200)
    expect((await readJson(oldPass)).passed).toBe(true)

    const patched = await updateBlock(app, blockId, {
      kind: 'quiz',
      passingScore: 100,
      questions: [
        {
          id: 'q1',
          prompt: '2 + 2?',
          choices: [
            { id: 'a', label: '3' },
            { id: 'b', label: '4' },
          ],
          correctChoiceIds: ['a'],
        },
        {
          id: 'q2',
          prompt: 'Capital do Brasil?',
          choices: [
            { id: 'a', label: 'Brasília' },
            { id: 'b', label: 'Rio' },
          ],
          correctChoiceIds: ['b'],
        },
      ],
    })
    expect(patched.status).toBe(200)

    const blocked = await complete(app, lessonId)
    expect(blocked.status).toBe(409)
    expect((await readJson(blocked)).error.code).toBe('QUIZ_GATE_NOT_PASSED')

    const state = await readJson(await getLesson(app, course.slug, lessonId))
    const quiz = state.blocks.find((b: { id: string }) => b.id === blockId)
    expect(quiz.quizState).toMatchObject({ attemptsCount: 0, passed: false })

    const newPass = await submit(app, lessonId, blockId, { q1: ['a'], q2: ['b'] })
    expect(newPass.status).toBe(200)
    expect((await readJson(newPass)).passed).toBe(true)
    expect((await complete(app, lessonId)).status).toBe(200)
  })

  test('quiz SEM passingScore (fixação) não bloqueia o complete', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    seedQuizBlock(courses, course.lessonIds[0])

    expect((await complete(app, course.lessonIds[0])).status).toBe(200)
  })

  test('fixação: submit < 100% → concluído, sem cooldown, reenvio liberado na hora', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    const blockId = seedQuizBlock(courses, course.lessonIds[0]) // sem passingScore

    const res = await submit(app, course.lessonIds[0], blockId, { q1: ['a'], q2: ['a'] })
    expect(res.status).toBe(200)
    const body = await readJson(res)
    // Sem nota de corte: passou ao enviar mesmo com 50% — e SEM cooldown.
    expect(body).toMatchObject({ score: 50, passed: true })
    expect(body.retryAvailableAt).toBeNull()

    // Reenvio imediato NÃO é bloqueado (fixação não impõe espera).
    const again = await submit(app, course.lessonIds[0], blockId, { q1: ['b'], q2: ['a'] })
    expect(again.status).toBe(200)
    expect((await readJson(again)).passed).toBe(true)
  })

  test('quiz gated mas SEM perguntas não trava o complete (não-respondível)', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    // Estado que a UI não cria, mas dados legados/escrita direta poderiam ter.
    courses.blocks.push({
      id: randomUUID(),
      lessonId: course.lessonIds[0],
      kind: 'quiz',
      sortOrder: 11,
      content: { kind: 'quiz', passingScore: 50, questions: [] },
    })
    expect((await complete(app, course.lessonIds[0])).status).toBe(200)
  })

  test('bloco inexistente/não-quiz → 404; sem matrícula → 403; corpo inválido → 400', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    const lessonId = course.lessonIds[0]
    const blockId = seedQuizBlock(courses, lessonId, { passingScore: 100 })

    expect((await submit(app, lessonId, randomUUID(), { q1: ['b'] })).status).toBe(404)
    const richTextBlock = courses.blocks.find((b) => b.kind === 'rich_text')
    expect((await submit(app, lessonId, richTextBlock?.id ?? '', { q1: ['b'] })).status).toBe(404)

    const outro = seedSampleCourse(courses, 'outro-curso')
    const outroBlock = seedQuizBlock(courses, outro.lessonIds[0], { passingScore: 100 })
    expect((await submit(app, outro.lessonIds[0], outroBlock, { q1: ['b'] })).status).toBe(403)

    expect((await submit(app, lessonId, blockId, 'nao-e-objeto')).status).toBe(400)
  })
})
