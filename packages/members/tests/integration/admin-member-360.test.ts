import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { CertificateRecord } from '../../src/domain/certificate/certificate'
import { buildApp, seedSampleCourse } from '../helpers'

const A = '11111111-1111-1111-1111-111111111111'
const readJson = (res: Response): Promise<any> => res.json()
type App = ReturnType<typeof buildApp>['app']
const get = (app: App, path: string, headers: Record<string, string> = {}) =>
  app.handle(new Request(`http://localhost${path}`, { headers }))

describe('Members HTTP — admin: gamificação do aluno (ficha 360)', () => {
  test('aluno sem perfil → zeros + nível noob + catálogo de badges', async () => {
    const { app } = buildApp()
    const res = await get(app, `/members/admin/members/${A}/gamification?audience=kids`)
    expect(res.status).toBe(200)
    const body = await readJson(res)
    expect(body.xp).toBe(0)
    expect(body.level.slug).toBe('noob')
    expect(body.coins.balance).toBe(0)
    expect(Array.isArray(body.badges)).toBe(true)
    // Visão admin: nunca marca passe de equipe (estado REAL do aluno).
    expect(body.coins.unlimited).toBeUndefined()
  })

  test('audiência inválida → 400 (validação de borda)', async () => {
    const { app } = buildApp()
    expect((await get(app, `/members/admin/members/${A}/gamification?audience=nope`)).status).toBe(
      400,
    )
  })
})

describe('Members HTTP — admin: linha do tempo de atividade', () => {
  test('mescla as 4 fontes, distingue Pinta de Estúdio e pagina por data desc', async () => {
    const { app, courses, progress, positions, quizAttempts, studioSubmissions } = buildApp()
    const seeded = seedSampleCourse(courses)
    const lesson = seeded.lessonIds[0]
    const studioBlock = randomUUID()
    const pintaBlock = randomUUID()
    const course = seeded.courseId
    courses.blocks.push(
      {
        id: studioBlock,
        lessonId: lesson,
        kind: 'studio',
        sortOrder: 10,
        content: { kind: 'studio', initialProject: { name: 'p', files: {} } },
      },
      {
        id: pintaBlock,
        lessonId: lesson,
        kind: 'pinta',
        sortOrder: 11,
        content: { kind: 'pinta', initialAsset: { kind: 'pixel-sprite' } },
      },
    )

    // 5 eventos em datas crescentes (o mais novo deve vir primeiro).
    await positions.upsert(A, lesson, course, 30, new Date('2026-06-01T00:00:00.000Z'))
    await progress.markComplete(A, lesson, course, new Date('2026-06-02T00:00:00.000Z'))
    await quizAttempts.save({
      id: randomUUID(),
      userId: A,
      lessonId: lesson,
      blockId: studioBlock,
      courseId: course,
      score: 80,
      passed: true,
      answers: {},
      createdAt: new Date('2026-06-03T00:00:00.000Z'),
    })
    await studioSubmissions.upsert({
      id: randomUUID(),
      userId: A,
      accountId: A,
      blockId: studioBlock,
      lessonId: lesson,
      courseId: course,
      project: { name: 'p', files: {} },
      submittedAt: new Date('2026-06-04T00:00:00.000Z'),
      message: 'oi prof',
    })
    await studioSubmissions.upsert({
      id: randomUUID(),
      userId: A,
      accountId: A,
      blockId: pintaBlock,
      lessonId: lesson,
      courseId: course,
      project: { kind: 'pixel-sprite' },
      submittedAt: new Date('2026-06-05T00:00:00.000Z'),
      message: 'meu desenho',
    })

    const body = await readJson(await get(app, `/members/admin/members/${A}/activity`))
    expect(body.items.map((i: { kind: string }) => i.kind)).toEqual([
      'pinta_submission',
      'studio_submission',
      'quiz_attempt',
      'lesson_completed',
      'lesson_accessed',
    ])
    expect(body.hasMore).toBe(false)
    const pinta = body.items[0]
    expect(pinta.message).toBe('meu desenho')
    expect(pinta.passed).toBeNull()
    const studio = body.items[1]
    expect(studio.message).toBe('oi prof')
    expect(studio.passed).toBeNull()

    // Paginação: limit=2 → 2 itens (os mais novos) + hasMore.
    const page = await readJson(await get(app, `/members/admin/members/${A}/activity?limit=2`))
    expect(page.items).toHaveLength(2)
    expect(page.hasMore).toBe(true)
    expect(page.items.map((i: { kind: string }) => i.kind)).toEqual([
      'pinta_submission',
      'studio_submission',
    ])
  })
})

describe('Members HTTP — admin: certificados e classificações', () => {
  function cert(over: Partial<CertificateRecord>): CertificateRecord {
    return {
      id: randomUUID(),
      userId: A,
      accountId: A,
      courseId: randomUUID(),
      courseRef: 'curso-x',
      serial: `SZ-2026-${randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`,
      studentName: 'Aluno',
      courseTitle: 'Curso X',
      completedAt: new Date('2026-06-01T00:00:00.000Z'),
      issuedAt: new Date('2026-06-01T00:00:00.000Z'),
      revokedAt: null,
      ...over,
    }
  }

  test('certificados: inclui revogado, mais recente primeiro', async () => {
    const { app, certificates } = buildApp()
    await certificates.insertIfAbsent(
      cert({ courseTitle: 'Antigo', issuedAt: new Date('2026-06-01T00:00:00.000Z') }),
    )
    await certificates.insertIfAbsent(
      cert({
        courseTitle: 'Novo',
        issuedAt: new Date('2026-06-05T00:00:00.000Z'),
        revokedAt: new Date('2026-06-06T00:00:00.000Z'),
      }),
    )
    const body = await readJson(await get(app, `/members/admin/members/${A}/certificates`))
    expect(body.certificates.map((c: { courseTitle: string }) => c.courseTitle)).toEqual([
      'Novo',
      'Antigo',
    ])
    expect(body.certificates[0].revokedAt).not.toBeNull()
  })

  test('classificações: nota volta como 1–5 (ratingHalf÷2)', async () => {
    const { app, ratings } = buildApp()
    await ratings.upsert(
      A,
      randomUUID(),
      { ratingHalf: 9, comment: 'bom', feedbackAnswers: null },
      new Date('2026-06-01T00:00:00.000Z'),
    )
    const body = await readJson(await get(app, `/members/admin/members/${A}/ratings`))
    expect(body.ratings).toHaveLength(1)
    expect(body.ratings[0].rating).toBe(4.5)
    expect(body.ratings[0].comment).toBe('bom')
  })
})
