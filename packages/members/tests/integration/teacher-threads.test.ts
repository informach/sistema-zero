import { describe, expect, test } from 'bun:test'
import { buildApp, signedWebhookHeaders } from '../helpers'

const STUDENT = '22222222-2222-2222-2222-222222222222'
const STUDENT2 = '44444444-4444-4444-4444-444444444444'
const ADMIN = '99999999-9999-9999-9999-999999999999'
const ADMIN2 = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
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
const adminHeaders2 = {
  'x-auth-user-id': ADMIN2,
  'x-auth-user-name': 'Marcos',
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

const studentGet = (app: App, threadId: string, id = STUDENT, audience = 'kids', before?: string) =>
  app.handle(
    new Request(
      `http://localhost/members/teacher-threads/${threadId}?audience=${audience}${before ? `&before=${encodeURIComponent(before)}` : ''}`,
      { headers: studentHeaders(id) },
    ),
  )

const studentReply = (app: App, threadId: string, body: string, id = STUDENT, audience = 'kids') =>
  app.handle(
    new Request(
      `http://localhost/members/teacher-threads/${threadId}/messages?audience=${audience}`,
      { method: 'POST', headers: studentHeaders(id), body: JSON.stringify({ body }) },
    ),
  )

const studentMarkRead = (app: App, threadId: string, id = STUDENT, audience = 'kids') =>
  app.handle(
    new Request(`http://localhost/members/teacher-threads/${threadId}/read?audience=${audience}`, {
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

  test('leitura é individual por professor', async () => {
    const { app, clockRef } = buildApp()
    const created = await readJson(await adminPost(app, studioBody()))
    clockRef.now = new Date('2026-06-02T12:05:00.000Z')
    await studentReply(app, created.id, 'Posso tentar de novo?')

    const markReadAs = (headers: Record<string, string>) =>
      app.handle(
        new Request(`http://localhost/members/admin/teacher-threads/${created.id}/read`, {
          method: 'POST',
          headers,
        }),
      )
    const inboxAs = (headers: Record<string, string>) =>
      app.handle(
        new Request('http://localhost/members/admin/teacher-threads?unread=true', { headers }),
      )

    expect((await markReadAs(adminHeaders)).status).toBe(200)
    const secondTeacherInbox = await readJson(await inboxAs(adminHeaders2))
    expect(secondTeacherInbox.threads).toHaveLength(1)
    expect(secondTeacherInbox.threads[0].unread).toBe(true)
  })

  test('unread-count do PROFESSOR: individual por staff; read-all zera e devolve o nº', async () => {
    const { app, clockRef } = buildApp()
    // Duas conversas com resposta do aluno (uma kids, uma via 2º contexto).
    const a = await readJson(await adminPost(app, studioBody()))
    const b = await readJson(
      await adminPost(app, studioBody({ contextType: 'general', blockId: undefined })),
    )
    clockRef.now = new Date('2026-06-02T12:05:00.000Z')
    await studentReply(app, a.id, 'Consertei!')
    await studentReply(app, b.id, 'Recebi o recado!')

    const unreadCountAs = async (headers: Record<string, string>, audience?: string) =>
      readJson(
        await app.handle(
          new Request(
            `http://localhost/members/admin/teacher-threads/unread-count${audience ? `?audience=${audience}` : ''}`,
            { headers },
          ),
        ),
      )
    expect((await unreadCountAs(adminHeaders)).count).toBe(2)
    // Individual: o 2º professor também vê 2 (watermark é POR staff).
    expect((await unreadCountAs(adminHeaders2)).count).toBe(2)
    // `?audience=` escopa o badge à plataforma ativa (seletor global do painel).
    expect((await unreadCountAs(adminHeaders, 'kids')).count).toBe(2)
    expect((await unreadCountAs(adminHeaders, 'adult')).count).toBe(0)

    // read-all do 1º professor zera SÓ o dele.
    const readAll = await readJson(
      await app.handle(
        new Request('http://localhost/members/admin/teacher-threads/read-all', {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({}),
        }),
      ),
    )
    expect(readAll.updated).toBe(2)
    expect((await unreadCountAs(adminHeaders)).count).toBe(0)
    expect((await unreadCountAs(adminHeaders2)).count).toBe(2)

    // Idempotente: repetir devolve 0.
    const again = await readJson(
      await app.handle(
        new Request('http://localhost/members/admin/teacher-threads/read-all', {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({}),
        }),
      ),
    )
    expect(again.updated).toBe(0)
  })

  test('read-all respeita o escopo (context) e mensagem nova volta a contar', async () => {
    const { app, clockRef } = buildApp()
    const entrega = await readJson(await adminPost(app, studioBody()))
    const geral = await readJson(
      await adminPost(app, studioBody({ contextType: 'general', blockId: undefined })),
    )
    clockRef.now = new Date('2026-06-02T12:05:00.000Z')
    await studentReply(app, entrega.id, 'a')
    await studentReply(app, geral.id, 'b')

    const readAllEntregas = await readJson(
      await app.handle(
        new Request('http://localhost/members/admin/teacher-threads/read-all', {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({ context: 'studio_submission' }),
        }),
      ),
    )
    expect(readAllEntregas.updated).toBe(1)
    const count = await readJson(
      await app.handle(
        new Request('http://localhost/members/admin/teacher-threads/unread-count', {
          headers: adminHeaders,
        }),
      ),
    )
    expect(count.count).toBe(1) // só a geral segue não-lida

    // Mensagem NOVA do aluno depois do read-all volta a contar (watermark, não flag).
    clockRef.now = new Date('2026-06-02T12:10:00.000Z')
    await studentReply(app, entrega.id, 'mais uma')
    const after = await readJson(
      await app.handle(
        new Request('http://localhost/members/admin/teacher-threads/unread-count', {
          headers: adminHeaders,
        }),
      ),
    )
    expect(after.count).toBe(2)
  })

  test('filtro por aluno (?userIds=): casa userId E accountId; lixo é descartado', async () => {
    const { app } = buildApp()
    const PARENT = '77777777-7777-7777-7777-777777777777'
    await adminPost(app, studioBody({ accountId: PARENT }))
    await adminPost(app, studioBody({ userId: STUDENT2, blockId: COURSE }))

    const byUser = await readJson(await adminInbox(app, `?userIds=${STUDENT}`))
    expect(byUser.threads).toHaveLength(1)
    expect(byUser.threads[0].userId).toBe(STUDENT)

    // Pelo ACCOUNT do responsável acha a conversa da criança (família toda).
    const byAccount = await readJson(await adminInbox(app, `?userIds=${PARENT}`))
    expect(byAccount.threads).toHaveLength(1)
    expect(byAccount.threads[0].userId).toBe(STUDENT)

    // CSV com lixo → só o uuid válido filtra.
    const mixed = await readJson(await adminInbox(app, `?userIds=nao-e-uuid,${STUDENT2}`))
    expect(mixed.threads).toHaveLength(1)
    expect(mixed.threads[0].userId).toBe(STUDENT2)

    // Só lixo → filtro ignorado (caixa completa, não vazia).
    const junk = await readJson(await adminInbox(app, '?userIds=xyz'))
    expect(junk.threads).toHaveLength(2)
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

  test('marcar como lida respeita a audiência da conversa', async () => {
    const { app } = buildApp()
    const created = await readJson(await adminPost(app, studioBody()))

    const wrongAudienceRead = await app.handle(
      new Request(`http://localhost/members/teacher-threads/${created.id}/read?audience=adult`, {
        method: 'POST',
        headers: studentHeaders(),
      }),
    )
    expect(wrongAudienceRead.status).toBe(200)
    expect((await readJson(await studentUnread(app))).count).toBe(1)
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

  test('caixa do aluno informa quando há conversas além da primeira página', async () => {
    const { app, clockRef } = buildApp()
    for (let i = 0; i < 31; i++) {
      clockRef.now = new Date(`2026-06-03T12:${String(i).padStart(2, '0')}:00.000Z`)
      await adminPost(app, {
        userId: STUDENT,
        audience: 'kids',
        contextType: 'general',
        body: `Recado ${i}`,
      })
    }

    const firstPage = await readJson(await studentInbox(app))
    expect(firstPage.threads).toHaveLength(30)
    expect(firstPage.nextOffset).toBe(30)
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

  test('histórico é paginado por cursor sem ocultar mensagens antigas', async () => {
    const { app, clockRef } = buildApp()
    const first = await readJson(await adminPost(app, studioBody({ body: 'Mensagem 0' })))

    for (let i = 1; i <= 50; i++) {
      clockRef.now = new Date(`2026-06-02T12:${String(i).padStart(2, '0')}:00.000Z`)
      await adminPost(app, studioBody({ body: `Mensagem ${i}` }))
    }

    const latest = await readJson(await studentGet(app, first.id))
    expect(latest.messages).toHaveLength(50)
    expect(latest.messages[0].body).toBe('Mensagem 1')
    expect(latest.nextCursor).toEqual(expect.any(String))

    const older = await readJson(
      await studentGet(app, first.id, STUDENT, 'kids', latest.nextCursor),
    )
    expect(older.messages).toHaveLength(1)
    expect(older.messages[0].body).toBe('Mensagem 0')
    expect(older.nextCursor).toBeNull()
  })

  test('cursor bem-formado, mas com id inválido, retorna 400', async () => {
    const { app } = buildApp()
    const created = await readJson(await adminPost(app, studioBody()))
    const malformedIdCursor = Buffer.from('2026-06-02T12:00:00.000Z|not-a-uuid').toString(
      'base64url',
    )

    expect((await studentGet(app, created.id, STUDENT, 'kids', malformedIdCursor)).status).toBe(400)
  })

  test('marcar como lida usa a última mensagem persistida, sem apagar recado concorrente', async () => {
    const { app, clockRef } = buildApp()
    clockRef.now = new Date('2026-06-02T12:00:00.000Z')
    const created = await readJson(await adminPost(app, studioBody()))

    // Simula o professor ter capturado o horário antes de ficar aguardando a
    // transação, enquanto o aluno abre a conversa depois. O watermark precisa
    // apontar para a última mensagem efetivamente persistida, não para "agora".
    clockRef.now = new Date('2026-06-02T12:10:00.000Z')
    await studentMarkRead(app, created.id)
    clockRef.now = new Date('2026-06-02T12:05:00.000Z')
    await adminPost(app, studioBody({ body: 'Recado que chegou durante a leitura' }))

    expect((await readJson(await studentUnread(app))).count).toBe(1)
  })

  test('caixa do professor prioriza não-lidas antes de paginar', async () => {
    const { app, clockRef } = buildApp()
    clockRef.now = new Date('2026-06-02T12:00:00.000Z')
    const pending = await readJson(await adminPost(app, studioBody({ blockId: BLOCK })))
    clockRef.now = new Date('2026-06-02T12:01:00.000Z')
    await studentReply(app, pending.id, 'Tenho uma dúvida')

    clockRef.now = new Date('2026-06-02T12:02:00.000Z')
    await adminPost(
      app,
      studioBody({ blockId: '77777777-7777-7777-7777-777777777777', body: 'Conversa recente' }),
    )

    const inbox = await readJson(await adminInbox(app))
    expect(inbox.threads[0].id).toBe(pending.id)
    expect(inbox.threads[0].unread).toBe(true)
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

  test('recusa webhook sem delivery id para não duplicar recados em retries', async () => {
    const { app } = buildApp()

    const response = await postWebhook(app)
    expect(response.status).toBe(400)

    const inbox = await readJson(await studentInbox(app))
    expect(inbox.threads).toEqual([])
  })

  test('rejeita trocar o delivery id de uma entrega já assinada', async () => {
    const { app } = buildApp()
    const headers = signedWebhookHeaders('/members/webhooks/mural-message', raw, 'del-original')
    headers['x-delivery-id'] = 'del-adulterado'

    const response = await app.handle(
      new Request('http://localhost/members/webhooks/mural-message', {
        method: 'POST',
        headers,
        body: raw,
      }),
    )

    expect(response.status).toBe(401)
    expect((await readJson(await studentInbox(app))).threads).toEqual([])
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
