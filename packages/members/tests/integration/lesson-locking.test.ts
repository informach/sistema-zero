import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

const USER = '44444444-4444-4444-4444-444444444444'
const authHeaders = {
  'x-auth-user-id': USER,
  'x-auth-user-name': 'João Aluno',
  'content-type': 'application/json',
}
// Equipe interna (chave-mestra virtual) — ignora a trava.
const staffHeaders = { ...authHeaders, 'x-auth-user-role': 'staff', 'x-auth-user-status': 'active' }

type App = ReturnType<typeof buildApp>['app']
const readJson = (res: Response): Promise<any> => res.json()

const getCourse = (app: App, slug: string, headers = authHeaders) =>
  app.handle(new Request(`http://localhost/members/courses/${slug}`, { headers }))

const getLesson = (app: App, slug: string, lessonId: string, headers = authHeaders) =>
  app.handle(
    new Request(`http://localhost/members/courses/${slug}/lessons/${lessonId}`, { headers }),
  )

const complete = (app: App, lessonId: string, headers = authHeaders) =>
  app.handle(
    new Request(`http://localhost/members/lessons/${lessonId}/complete`, {
      method: 'POST',
      headers,
    }),
  )

const savePosition = (app: App, slug: string, lessonId: string, headers = authHeaders) =>
  app.handle(
    new Request(`http://localhost/members/courses/${slug}/lessons/${lessonId}/position`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ positionSeconds: 30 }),
    }),
  )

/** Aulas do outline, achatadas na ordem do curso. */
const flatLessons = (course: any): any[] => course.modules.flatMap((m: any) => m.lessons)

describe('Trava sequencial das aulas (estilo Duolingo)', () => {
  test('outline marca aulas posteriores como locked até concluir as anteriores', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug } = seedSampleCourse(courses, 'curso-trava', 'published', 'adult', true)
    grantLifetime(entitlements, { userId: USER, courseRef: slug })

    const before = flatLessons(await getCourse(app, slug).then(readJson))
    expect(before[0].locked).toBe(false) // 1ª aula sempre liberada
    expect(before[1].locked).toBe(true) // 2ª travada

    await complete(app, before[0].id)

    const after = flatLessons(await getCourse(app, slug).then(readJson))
    expect(after[0].locked).toBe(false)
    expect(after[1].locked).toBe(false) // liberou após concluir a 1ª
  })

  test('GET de aula travada → 423 LESSON_LOCKED; liberar destrava (200)', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug } = seedSampleCourse(courses, 'curso-trava', 'published', 'adult', true)
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    const [l1, l2] = flatLessons(await getCourse(app, slug).then(readJson))

    const blocked = await getLesson(app, slug, l2.id)
    expect(blocked.status).toBe(423)
    expect((await readJson(blocked)).error.code).toBe('LESSON_LOCKED')

    // A 1ª aula abre normalmente.
    expect((await getLesson(app, slug, l1.id)).status).toBe(200)

    await complete(app, l1.id)
    expect((await getLesson(app, slug, l2.id)).status).toBe(200)
  })

  test('POST de conclusão em aula travada → 423; não grava progresso nem XP', async () => {
    const { app, courses, entitlements, gamification } = buildApp()
    const { slug } = seedSampleCourse(courses, 'curso-trava', 'published', 'adult', true)
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    const [, l2] = flatLessons(await getCourse(app, slug).then(readJson))

    const blocked = await complete(app, l2.id)
    expect(blocked.status).toBe(423)
    expect((await readJson(blocked)).error.code).toBe('LESSON_LOCKED')

    const after = flatLessons(await getCourse(app, slug).then(readJson))
    expect(after[1].completed).toBe(false)
    expect(after[1].locked).toBe(true)
    expect(gamification.events.filter((e) => e.sourceId === l2.id)).toHaveLength(0)
  })

  test('posição de vídeo em aula travada → 423; last-accessed legado não vira continue travado', async () => {
    const { app, courses, entitlements, positions } = buildApp()
    const { courseId, slug, lessonIds } = seedSampleCourse(
      courses,
      'curso-trava',
      'published',
      'adult',
      true,
    )
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    const [l1, l2] = lessonIds

    const blocked = await savePosition(app, slug, l2)
    expect(blocked.status).toBe(423)

    // Simula posição legada gravada antes da trava existir.
    positions.rows.push({
      userId: USER,
      courseId,
      lessonId: l2,
      positionSeconds: 30,
      updatedAt: new Date('2026-06-02T12:30:00.000Z'),
    })

    const detail = await getCourse(app, slug).then(readJson)
    expect(detail.continueLessonId).toBe(l1)
    expect(flatLessons(detail)[1].locked).toBe(true)

    const list = await app
      .handle(new Request('http://localhost/members/courses', { headers: authHeaders }))
      .then(readJson)
    expect(list.courses[0].continueLessonId).toBe(l1)
  })

  test('ações de aula travada também retornam 423', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug, lessonIds } = seedSampleCourse(courses, 'curso-trava', 'published', 'adult', true)
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    const [, l2] = lessonIds
    const blockId = randomUUID()
    const attachmentId = randomUUID()
    courses.blocks.push({
      id: blockId,
      lessonId: l2,
      kind: 'quiz',
      sortOrder: 0,
      content: {
        kind: 'quiz',
        passingScore: 100,
        questions: [
          {
            id: 'q1',
            prompt: '1 + 1?',
            choices: [
              { id: 'a', label: '1' },
              { id: 'b', label: '2' },
            ],
            correctChoiceIds: ['b'],
          },
        ],
      },
    })
    courses.attachments.push({
      id: attachmentId,
      lessonId: l2,
      label: 'PDF',
      url: 'https://x/locked.pdf',
      fileType: 'application/pdf',
      sizeBytes: null,
      sortOrder: 0,
    })

    const quiz = await app.handle(
      new Request(`http://localhost/members/lessons/${l2}/blocks/${blockId}/quiz-attempts`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ answers: { q1: ['b'] } }),
      }),
    )
    expect(quiz.status).toBe(423)

    const attachment = await app.handle(
      new Request(
        `http://localhost/members/courses/${slug}/lessons/${l2}/attachments/${attachmentId}/resolve`,
        { headers: authHeaders },
      ),
    )
    expect(attachment.status).toBe(423)
  })

  test('equipe interna (staff) ignora a trava — outline livre + GET 200', async () => {
    const { app, courses } = buildApp()
    const { slug } = seedSampleCourse(courses, 'curso-trava', 'published', 'adult', true)
    // Sem grant: a chave-mestra virtual da equipe cobre acesso E ignora a trava.

    const lessons = flatLessons(await getCourse(app, slug, staffHeaders).then(readJson))
    expect(lessons.every((l) => l.locked === false)).toBe(true)
    expect((await getLesson(app, slug, lessons[1].id, staffHeaders)).status).toBe(200)
  })

  test('curso com a trava DESLIGADA mantém navegação livre', async () => {
    const { app, courses, entitlements } = buildApp()
    // sequentialLock=false (legado): nada trava.
    const { slug } = seedSampleCourse(courses, 'curso-livre', 'published', 'adult', false)
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    const [, l2] = flatLessons(await getCourse(app, slug).then(readJson))

    expect(l2.locked).toBe(false)
    expect((await getLesson(app, slug, l2.id)).status).toBe(200)
  })
})
