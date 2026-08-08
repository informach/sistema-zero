import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

/**
 * Bloco "em breve" (aula EM PRODUÇÃO): enquanto ele existe, a aula devolve SÓ o
 * recado — os demais blocos e os anexos não saem do servidor — e a conclusão é
 * barrada. É portão de SERVIDOR de propósito: esconder na UI deixaria o conteúdo
 * inacabado no payload, e o POST /complete seguiria alcançável direto.
 */

const USER = '55555555-5555-5555-5555-555555555555'
const authHeaders = {
  'x-auth-user-id': USER,
  'x-auth-user-name': 'Maria Aluna',
  'content-type': 'application/json',
}
// Equipe interna: vê a aula inteira (é o "Ver como aluno" da autoria).
const staffHeaders = { ...authHeaders, 'x-auth-user-role': 'staff', 'x-auth-user-status': 'active' }

type App = ReturnType<typeof buildApp>['app']
const readJson = (res: Response): Promise<any> => res.json()

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

/** Curso semeado + bloco "em breve" na 1ª aula (que já tem 4 blocos e 1 anexo). */
function seedComingSoon(message?: string) {
  const built = buildApp()
  const seeded = seedSampleCourse(built.courses, 'curso-em-producao')
  grantLifetime(built.entitlements, { userId: USER, courseRef: seeded.slug })
  const [lessonId] = seeded.lessonIds
  built.courses.blocks.push({
    id: randomUUID(),
    lessonId,
    kind: 'coming_soon',
    sortOrder: 9,
    content: { kind: 'coming_soon', ...(message ? { message } : {}) },
  })
  return { ...built, ...seeded, lessonId }
}

describe('Bloco "em breve" (aula em produção)', () => {
  test('aluno recebe SÓ o recado — nenhum outro bloco e nenhum anexo', async () => {
    const { app, slug, lessonId } = seedComingSoon('Chega semana que vem!')

    const res = await getLesson(app, slug, lessonId)
    expect(res.status).toBe(200)
    const lesson = await readJson(res)

    expect(lesson.blocks).toHaveLength(1)
    expect(lesson.blocks[0].kind).toBe('coming_soon')
    expect(lesson.blocks[0].content).toEqual({
      kind: 'coming_soon',
      message: 'Chega semana que vem!',
    })
    expect(lesson.attachments).toEqual([])
    // O conteúdo inacabado não pode viajar no payload. Asserimos o que SÓ este
    // filtro esconde (o markdown, o src do vídeo e o html do embed semeados pelo
    // `seedSampleCourse`) — o `url` do ebook já é removido incondicionalmente pela
    // projeção, então testá-lo passaria com ou sem o filtro.
    const payload = JSON.stringify(lesson)
    expect(payload).not.toContain('# Olá')
    expect(payload).not.toContain('https://y/1')
    expect(payload).not.toContain('<canvas>')
  })

  test('equipe interna vê a aula inteira (blocos + anexos)', async () => {
    const { app, slug, lessonId } = seedComingSoon()

    const lesson = await getLesson(app, slug, lessonId, staffHeaders).then(readJson)
    expect(lesson.blocks.length).toBeGreaterThan(1)
    expect(lesson.blocks.some((b: any) => b.kind === 'coming_soon')).toBe(true)
    expect(lesson.blocks.some((b: any) => b.kind === 'video')).toBe(true)
    expect(lesson.attachments).toHaveLength(1)
  })

  test('aula SEM o bloco segue normal (blocos e anexos intactos)', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug, lessonIds } = seedSampleCourse(courses, 'curso-normal')
    grantLifetime(entitlements, { userId: USER, courseRef: slug })

    const lesson = await getLesson(app, slug, lessonIds[0]).then(readJson)
    expect(lesson.blocks.length).toBeGreaterThan(1)
    expect(lesson.attachments).toHaveLength(1)
  })

  test('POST /complete → 409 LESSON_COMING_SOON e a aula NÃO fica concluída', async () => {
    const { app, slug, lessonId } = seedComingSoon()

    const res = await complete(app, lessonId)
    expect(res.status).toBe(409)
    expect((await readJson(res)).error.code).toBe('LESSON_COMING_SOON')

    const lesson = await getLesson(app, slug, lessonId).then(readJson)
    expect(lesson.completed).toBe(false)
  })

  test('a equipe também não conclui (o conteúdo ainda não foi visto por ninguém)', async () => {
    const { app, lessonId } = seedComingSoon()

    const res = await complete(app, lessonId, staffHeaders)
    expect(res.status).toBe(409)
    expect((await readJson(res)).error.code).toBe('LESSON_COMING_SOON')
  })

  test('aula JÁ concluída antes do bloco entrar não regride', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug, lessonIds } = seedSampleCourse(courses, 'curso-ja-feito')
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    const lessonId = lessonIds[0]

    expect((await complete(app, lessonId)).status).toBe(200)

    // A autora volta a mexer na aula DEPOIS de a criança concluir.
    courses.blocks.push({
      id: randomUUID(),
      lessonId,
      kind: 'coming_soon',
      sortOrder: 9,
      content: { kind: 'coming_soon' },
    })

    // Re-concluir é idempotente (não passa pelos gates) e o estado segue concluído.
    expect((await complete(app, lessonId)).status).toBe(200)
    const lesson = await getLesson(app, slug, lessonId).then(readJson)
    expect(lesson.completed).toBe(true)
  })

  // O portão não pode viver SÓ na projeção da aula: um id de anexo/bloco visto
  // ANTES de o bloco entrar sobrevive na aba aberta, no histórico e num HAR — e
  // essas rotas resolvem o conteúdo direto de `lesson.blocks`/`lesson.attachments`.
  test('resolve do ANEXO de uma aula em breve → 404 (e a equipe ainda resolve)', async () => {
    const { app, courses, slug, lessonId } = seedComingSoon()
    const anexo = courses.attachments.find((a: any) => a.lessonId === lessonId)
    if (!anexo) throw new Error('o curso de exemplo deveria ter um anexo')
    const path = `http://localhost/members/courses/${slug}/lessons/${lessonId}/attachments/${anexo.id}/resolve`

    const res = await app.handle(new Request(path, { headers: authHeaders }))
    expect(res.status).toBe(404)

    const staff = await app.handle(new Request(path, { headers: staffHeaders }))
    expect(staff.status).toBe(200)
    expect((await readJson(staff)).storageRef).toContain('https://')
  })

  test('resolve do E-BOOK de uma aula em breve → 404 (o PDF privado não sai)', async () => {
    const { app, slug, lessonId, ebookBlockId } = seedComingSoon()
    const path = `http://localhost/members/courses/${slug}/lessons/${lessonId}/blocks/${ebookBlockId}/ebook/resolve`

    const res = await app.handle(new Request(path, { headers: authHeaders }))
    expect(res.status).toBe(404)

    const staff = await app.handle(new Request(path, { headers: staffHeaders }))
    expect(staff.status).toBe(200)
    expect((await readJson(staff)).storageRef).toContain('r2priv:')
  })

  test('tentativa de QUIZ de uma aula em breve → 404 (o gabarito não vaza nem rende XP)', async () => {
    const { app, courses, lessonId } = seedComingSoon()
    const quizId = randomUUID()
    courses.blocks.push({
      id: quizId,
      lessonId,
      kind: 'quiz',
      sortOrder: 5,
      content: {
        kind: 'quiz',
        questions: [
          {
            id: 'q1',
            prompt: 'Quanto é 1+1?',
            choices: [
              { id: 'a', label: '2' },
              { id: 'b', label: '3' },
            ],
            correctChoiceIds: ['a'],
            explanation: 'GABARITO SECRETO',
          },
        ],
      },
    })

    const res = await app.handle(
      new Request(`http://localhost/members/lessons/${lessonId}/blocks/${quizId}/quiz-attempts`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ answers: { q1: ['a'] } }),
      }),
    )
    expect(res.status).toBe(404)
    expect(JSON.stringify(await readJson(res))).not.toContain('GABARITO SECRETO')

    // A equipe segue conseguindo responder (é como a autora confere a aula). Sem este
    // lado, tirar o `!privileged` do gate passaria batido.
    const staff = await app.handle(
      new Request(`http://localhost/members/lessons/${lessonId}/blocks/${quizId}/quiz-attempts`, {
        method: 'POST',
        headers: staffHeaders,
        body: JSON.stringify({ answers: { q1: ['a'] } }),
      }),
    )
    expect(staff.status).toBe(200)
  })

  test('ENTREGA do Estúdio numa aula em breve → 404 (não sobrescreve a entrega boa)', async () => {
    const { app, courses, lessonId } = seedComingSoon()
    const studioId = randomUUID()
    courses.blocks.push({
      id: studioId,
      lessonId,
      kind: 'studio',
      sortOrder: 6,
      content: {
        kind: 'studio',
        initialProject: { name: 'Jogo', files: { 'script.js': '// ...' } },
      },
    })

    const res = await app.handle(
      new Request(
        `http://localhost/members/lessons/${lessonId}/blocks/${studioId}/studio-submission`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            project: { name: 'Versão pior', files: { 'script.js': '// regressão' } },
          }),
        },
      ),
    )
    expect(res.status).toBe(404)

    // Lado da equipe (senão tirar o `!privileged` do gate passaria batido).
    const staff = await app.handle(
      new Request(
        `http://localhost/members/lessons/${lessonId}/blocks/${studioId}/studio-submission`,
        {
          method: 'POST',
          headers: staffHeaders,
          body: JSON.stringify({
            project: { name: 'Conferindo', files: { 'script.js': '// ok' } },
          }),
        },
      ),
    )
    expect(staff.status).toBe(200)
  })

  test('payload da VITRINE de uma aula em breve → não elegível (não publica no Mural)', async () => {
    const { app, courses, studioSubmissions, courseId, lessonId } = seedComingSoon()
    const studioId = randomUUID()
    courses.blocks.push({
      id: studioId,
      lessonId,
      kind: 'studio',
      sortOrder: 7,
      content: {
        kind: 'studio',
        initialProject: { name: 'Jogo', files: { 'script.js': '// ...' } },
        showcase: { enabled: true, title: 'TÍTULO AUTORAL', summary: 'RESUMO AUTORAL' },
      },
    })
    // A criança já tinha entregado ANTES de a autora pôr o bloco "em breve" — é o que
    // deixa o payload elegível no caminho normal, e o que torna o vazamento alcançável.
    studioSubmissions.submissions.push({
      id: randomUUID(),
      userId: USER,
      blockId: studioId,
      lessonId,
      courseId,
      project: { name: 'Jogo', files: { 'script.js': '// ...' } },
      submittedAt: new Date('2026-06-02T00:00:00.000Z'),
    })

    const res = await app.handle(
      new Request(
        `http://localhost/members/lessons/${lessonId}/blocks/${studioId}/showcase-payload`,
        { headers: authHeaders },
      ),
    )
    expect(res.status).toBe(200)
    const payload = await readJson(res)
    expect(payload.eligible).toBe(false)
    // O texto autoral da vitrine não pode sair — é o mesmo service que o HUB
    // revalida no publish, então vazar aqui vira post público no Mural.
    expect(JSON.stringify(payload)).not.toContain('TÍTULO AUTORAL')
    expect(JSON.stringify(payload)).not.toContain('RESUMO AUTORAL')
  })

  test('tirar o bloco devolve a aula ao normal', async () => {
    const { app, courses, slug, lessonId } = seedComingSoon()

    expect((await getLesson(app, slug, lessonId).then(readJson)).blocks).toHaveLength(1)

    courses.blocks = courses.blocks.filter((b: any) => b.kind !== 'coming_soon')

    const lesson = await getLesson(app, slug, lessonId).then(readJson)
    expect(lesson.blocks.length).toBeGreaterThan(1)
    expect(lesson.attachments).toHaveLength(1)
    expect((await complete(app, lessonId)).status).toBe(200)
  })
})
