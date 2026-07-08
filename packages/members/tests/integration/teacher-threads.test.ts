import { describe, expect, test } from 'bun:test'
import { buildApp, signedWebhookHeaders } from '../helpers'

const STUDENT = '22222222-2222-2222-2222-222222222222'
const STUDENT2 = '44444444-4444-4444-4444-444444444444'
const ADMIN = '99999999-9999-9999-9999-999999999999'
const BLOCK = '33333333-3333-3333-3333-333333333333'
const COURSE = '55555555-5555-5555-5555-555555555555'
const LESSON = '66666666-6666-6666-6666-666666666666'

type App = ReturnType<typeof buildApp>['app']
const readJson = (res: Response): Promise<any> => res.json()

const studentHeaders = (id = STUDENT) => ({
  'x-auth-user-id': id,
  'content-type': 'application/json',
})
const adminHeaders = {
  'x-auth-user-id': ADMIN,
  'x-auth-user-name': 'Helena',
  'content-type': 'application/json',
}

/** Professor abre/continua uma conversa por contexto (Entrega ou geral). */
const adminPost = (app: App, body: unknown) =>
  app.handle(
    new Request('http://localhost/members/admin/teacher-threads', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify(body),
    }),
  )

const studioBody = (overrides: Record<string, unknown> = {}) => ({
  userId: STUDENT,
  audience: 'kids',
  contextType: 'studio_submission',
  blockId: BLOCK,
  courseId: COURSE,
  lessonId: LESSON,
  title: 'Entrega: Meu primeiro jogo',
  body: 'Oi! Seu jogo trava no bloco de repetição — falta fechar o laço.',
  ...overrides,
})

const studentInbox = (app: App, id = STUDENT, audience = 'kids') =>
  app.handle(
    new Request(`http://localhost/members/teacher-threads?audience=${audience}`, {
      headers: studentHeaders(id),
    }),
  )

const studentUnread = (app: App, id = STUDENT, audience = 'kids') =>
  app.handle(
    new Request(`http://localhost/members/teacher-threads/unread-count?audience=${audience}`, {
      headers: studentHeaders(id),
    }),
  )

const studentGet = (app: App, threadId: string, id = STUDENT, audience = 'kids') =>
  app.handle(
    new Request(`http://localhost/members/teacher-threads/${threadId}?audience=${audience}`, {
      headers: studentHeaders(id),
    }),
  )

const studentReply = (app: App, threadId: string, body: string, id = STUDENT, audience = 'kids') =>
  app.handle(
    new Request(
      `http://localhost/members/teacher-threads/${threadId}/messages?audience=${audience}`,
      { method: 'POST', headers: studentHeaders(id), body: JSON.stringify({ body }) },
    ),
  )

const studentMarkRead = (app: App, threadId: string, id = STUDENT) =>
  app.handle(
    new Request(`http://localhost/members/teacher-threads/${threadId}/read`, {
      method: 'POST',
      headers: studentHeaders(id),
    }),
  )

const adminInbox = (app: App, qs = '') =>
  app.handle(
    new Request(`http://localhost/members/admin/teacher-threads${qs}`, { headers: adminHeaders }),
  )

describe('conversas com o professor (canal de retorno)', () => {
  test('professor abre conversa na Entrega → aluno vê, sino conta, lê e zera', async () => {
    const { app } = buildApp()

    const created = await readJson(await adminPost(app, studioBody()))
    expect(created.contextType).toBe('studio_submission')
    expect(created.messages).toHaveLength(1)
    expect(created.messages[0].authorRole).toBe('teacher')
    expect(created.messages[0].authorName).toBe('Helena')

    // Aluno vê na caixa de entrada, com não-lido.
    const inbox = await readJson(await studentInbox(app))
    expect(inbox.threads).toHaveLength(1)
    expect(inbox.threads[0].unread).toBe(true)
    expect(inbox.threads[0].title).toBe('Entrega: Meu primeiro jogo')
    expect(inbox.threads[0].lastMessageRole).toBe('teacher')
    expect((await readJson(await studentUnread(app))).count).toBe(1)

    // Marca lido → sino zera.
    expect((await studentMarkRead(app, created.id)).status).toBe(200)
    expect((await readJson(await studentUnread(app))).count).toBe(0)
  })

  test('aluno responde → professor vê como não-lido; texto vazio é 400', async () => {
    const { app, clockRef } = buildApp()
    const created = await readJson(await adminPost(app, studioBody()))

    const empty = await studentReply(app, created.id, '   ')
    expect(empty.status).toBe(400)

    // O tempo avança entre o recado do professor e a resposta do aluno (real).
    clockRef.now = new Date('2026-06-02T12:05:00.000Z')
    const replied = await readJson(await studentReply(app, created.id, 'Consertei, obrigado!'))
    expect(replied.messages).toHaveLength(2)
    expect(replied.messages[1].authorRole).toBe('student')

    // Caixa do professor mostra a conversa com não-lido (mensagem do aluno).
    const adminUnread = await readJson(await adminInbox(app, '?unread=true'))
    expect(adminUnread.threads).toHaveLength(1)
    expect(adminUnread.threads[0].unread).toBe(true)
    expect(adminUnread.threads[0].lastMessageRole).toBe('student')
  })

  test('posse: outro aluno não acessa a conversa (404 sem vazar)', async () => {
    const { app } = buildApp()
    const created = await readJson(await adminPost(app, studioBody()))

    expect((await studentGet(app, created.id, STUDENT2)).status).toBe(404)
    expect((await studentReply(app, created.id, 'oi', STUDENT2)).status).toBe(404)
  })

  test('audiência: conversa kids não aparece na vitrine adulta', async () => {
    const { app } = buildApp()
    await adminPost(app, studioBody())

    const adultInbox = await readJson(await studentInbox(app, STUDENT, 'adult'))
    expect(adultInbox.threads).toHaveLength(0)
    expect((await readJson(await studentUnread(app, STUDENT, 'adult'))).count).toBe(0)
  })

  test('Entrega deduplica por bloco; recado geral cria conversa nova a cada vez', async () => {
    const { app } = buildApp()

    // Mesmo bloco 2× → 1 conversa, 2 turnos do professor.
    await adminPost(app, studioBody({ body: 'primeira dica' }))
    await adminPost(app, studioBody({ body: 'segunda dica' }))
    const inbox = await readJson(await studentInbox(app))
    expect(inbox.threads).toHaveLength(1)
    expect(inbox.threads[0].messageCount).toBe(2)

    // 2 recados gerais → 2 conversas.
    await adminPost(app, {
      userId: STUDENT,
      audience: 'kids',
      contextType: 'general',
      body: 'oi 1',
    })
    await adminPost(app, {
      userId: STUDENT,
      audience: 'kids',
      contextType: 'general',
      body: 'oi 2',
    })
    const inbox2 = await readJson(await studentInbox(app))
    expect(
      inbox2.threads.filter((t: { contextType: string }) => t.contextType === 'general'),
    ).toHaveLength(2)
  })

  test('Entrega sem blockId é rejeitada (400)', async () => {
    const { app } = buildApp()
    const res = await adminPost(app, studioBody({ blockId: undefined }))
    expect(res.status).toBe(400)
  })

  test('aluno não inicia conversa: só responde a existentes', async () => {
    const { app } = buildApp()
    // Sem conversa criada, um GET de id aleatório dá 404.
    expect((await studentGet(app, '00000000-0000-0000-0000-000000000000')).status).toBe(404)
  })

  test('admin abre a conversa da Entrega por contexto (viewer)', async () => {
    const { app } = buildApp()
    const byContext = (blockId: string) =>
      app.handle(
        new Request(
          `http://localhost/members/admin/teacher-threads/by-context?userId=${STUDENT}&contextType=studio_submission&contextRef=${blockId}`,
          { headers: adminHeaders },
        ),
      )

    // Sem conversa → { thread: null }.
    expect((await readJson(await byContext(BLOCK))).thread).toBeNull()

    // Depois de o professor abrir a conversa, o by-context devolve com os turnos.
    await adminPost(app, studioBody())
    const found = await readJson(await byContext(BLOCK))
    expect(found.thread).toBeTruthy()
    expect(found.thread.contextType).toBe('studio_submission')
    expect(found.thread.messages).toHaveLength(1)
  })
})

describe('webhook do Mural (motivo da moderação → recado ao aluno)', () => {
  const muralBody = {
    userId: STUDENT,
    accountId: STUDENT,
    audience: 'kids',
    // Id do tópico no HUB — TEXTO, não uuid (snapshot de outro serviço).
    contextRef: 'hub-thread-abc-123',
    reason: 'Escondi seu jogo porque a capa tinha um palavrão. Troque a capa e publique de novo!',
    moderatorName: 'Helena',
    title: 'Meu jogo de nave',
  }
  const raw = JSON.stringify(muralBody)
  const postWebhook = (app: App, deliveryId?: string) =>
    app.handle(
      new Request('http://localhost/members/webhooks/mural-message', {
        method: 'POST',
        headers: signedWebhookHeaders('/members/webhooks/mural-message', raw, deliveryId),
        body: raw,
      }),
    )

  test('cria conversa mural_publication visível ao aluno + dedupe por entrega', async () => {
    const { app } = buildApp()

    expect((await postWebhook(app, 'del-1')).status).toBe(200)

    const inbox = await readJson(await studentInbox(app))
    const mural = inbox.threads.find(
      (t: { contextType: string }) => t.contextType === 'mural_publication',
    )
    expect(mural).toBeTruthy()
    expect(mural.title).toBe('Meu jogo de nave')
    expect(mural.unread).toBe(true)

    // Reentrega da MESMA entrega → dedupe (não duplica conversa nem mensagem).
    expect((await readJson(await postWebhook(app, 'del-1'))).deduped).toBe(true)
    const inbox2 = await readJson(await studentInbox(app))
    expect(
      inbox2.threads.filter((t: { contextType: string }) => t.contextType === 'mural_publication'),
    ).toHaveLength(1)

    const detail = await readJson(await studentGet(app, mural.id))
    expect(detail.messages).toHaveLength(1)
    expect(detail.messages[0].authorRole).toBe('teacher')
    expect(detail.messages[0].authorName).toBe('Helena')
  })

  test('assinatura HMAC inválida → 401 (nada criado)', async () => {
    const { app } = buildApp()
    const res = await app.handle(
      new Request('http://localhost/members/webhooks/mural-message', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-signature': 't=1,v1=deadbeef' },
        body: raw,
      }),
    )
    expect(res.status).toBe(401)
  })
})
