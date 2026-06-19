import { beforeEach, describe, expect, it } from 'bun:test'
import { adminHeaders, buildApp, get, postJson } from '../helpers'

type App = ReturnType<typeof buildApp>['app']

async function seedEmailTemplate(app: App, headers: Record<string, string> = {}): Promise<void> {
  await app.handle(
    postJson(
      '/messaging/admin/templates',
      {
        key: 'welcome',
        channel: 'email',
        name: 'Boas-vindas',
        subject: 'Bem-vindo, {{nome}}',
        body: '<p>Olá {{nome}}, sua senha: {{senha}}</p>',
        variables: ['nome', 'senha'],
      },
      headers,
    ),
  )
}

async function seedDefaultSender(app: App, headers: Record<string, string> = {}): Promise<void> {
  await app.handle(
    postJson(
      '/messaging/admin/senders',
      {
        fromEmail: 'no-reply@sistemazero.com',
        fromName: 'Sistema Zero',
        isDefault: true,
      },
      headers,
    ),
  )
}

describe('POST /messaging/send (e-mail)', () => {
  let ctx: ReturnType<typeof buildApp>
  beforeEach(async () => {
    ctx = buildApp()
    await seedEmailTemplate(ctx.app)
  })

  it('falha com 422 quando não há remetente default', async () => {
    const res = await ctx.app.handle(
      postJson('/messaging/send', {
        channel: 'email',
        templateKey: 'welcome',
        recipient: { name: 'Helena', email: 'helena@example.com' },
        variables: { nome: 'Helena', senha: 'abc' },
      }),
    )
    expect(res.status).toBe(422)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('NO_SENDER_AVAILABLE')
  })

  it('enfileira (202) com template + remetente e persiste a mensagem', async () => {
    await seedDefaultSender(ctx.app)
    const res = await ctx.app.handle(
      postJson('/messaging/send', {
        channel: 'email',
        templateKey: 'welcome',
        recipient: { name: 'Helena', email: 'helena@example.com' },
        variables: { nome: 'Helena', senha: 'abc' },
      }),
    )
    expect(res.status).toBe(202)
    const body = (await res.json()) as { id: string; status: string }
    expect(body.status).toBe('QUEUED')

    const stored = ctx.messages.store.get(body.id)
    expect(stored?.state.renderedSubject).toBe('Bem-vindo, Helena')
    expect(stored?.state.renderedBody).toContain('sua senha: abc')
    // outbox capturou o evento de enfileiramento
    expect(ctx.messages.events.map((e) => e.eventName)).toContain('message.queued')
  })

  it('404 quando o template não existe', async () => {
    await seedDefaultSender(ctx.app)
    const res = await ctx.app.handle(
      postJson('/messaging/send', {
        channel: 'email',
        templateKey: 'inexistente',
        recipient: { name: 'A', email: 'a@b.com' },
      }),
    )
    expect(res.status).toBe(404)
  })

  it('400 quando senderId é malformado (não chega ao cast UUID do banco)', async () => {
    const res = await ctx.app.handle(
      postJson('/messaging/send', {
        channel: 'email',
        templateKey: 'welcome',
        recipient: { name: 'A', email: 'a@b.com' },
        variables: { nome: 'A', senha: 'abc' },
        senderId: 'nao-e-uuid',
      }),
    )
    expect(res.status).toBe(400)
  })

  it('400 quando falta variável obrigatória', async () => {
    await seedDefaultSender(ctx.app)
    const res = await ctx.app.handle(
      postJson('/messaging/send', {
        channel: 'email',
        templateKey: 'welcome',
        recipient: { name: 'A', email: 'a@b.com' },
        variables: { nome: 'A' }, // falta 'senha'
      }),
    )
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('MISSING_TEMPLATE_VARIABLE')
  })

  it('idempotência: mesma Idempotency-Key não duplica', async () => {
    await seedDefaultSender(ctx.app)
    const payload = {
      channel: 'email',
      templateKey: 'welcome',
      recipient: { name: 'Helena', email: 'helena@example.com' },
      variables: { nome: 'Helena', senha: 'abc' },
    }
    const headers = { 'x-consumer-id': 'funnel', 'idempotency-key': 'k-1' }
    const r1 = await ctx.app.handle(postJson('/messaging/send', payload, headers))
    const r2 = await ctx.app.handle(postJson('/messaging/send', payload, headers))
    const b1 = (await r1.json()) as { id: string }
    const b2 = (await r2.json()) as { id: string }
    expect(b1.id).toBe(b2.id)
    expect(ctx.messages.store.size).toBe(1)
  })

  it('409 quando o destinatário está suprimido', async () => {
    await seedDefaultSender(ctx.app)
    await ctx.suppressions.add('email', 'helena@example.com', 'hard_bounce')
    const res = await ctx.app.handle(
      postJson('/messaging/send', {
        channel: 'email',
        templateKey: 'welcome',
        recipient: { name: 'Helena', email: 'helena@example.com' },
        variables: { nome: 'Helena', senha: 'abc' },
      }),
    )
    expect(res.status).toBe(409)
  })
})

describe('POST /messaging/send — anexos por URL', () => {
  let ctx: ReturnType<typeof buildApp>
  const payload = (attachments: unknown) => ({
    channel: 'email',
    templateKey: 'welcome',
    recipient: { name: 'Helena', email: 'helena@example.com' },
    variables: { nome: 'Helena', senha: 'abc' },
    attachments,
  })

  beforeEach(async () => {
    ctx = buildApp()
    await seedEmailTemplate(ctx.app)
    await seedDefaultSender(ctx.app)
  })

  it('aceita attachments válidos e persiste SÓ os metadados na mensagem', async () => {
    const res = await ctx.app.handle(
      postJson(
        '/messaging/send',
        payload([
          {
            filename: 'danfse.pdf',
            url: 'https://fiscal.railway.internal/nfse/1.pdf',
            contentType: 'application/pdf',
          },
          { filename: 'recibo.pdf', url: 'http://fiscal.railway.internal/recibo/1.pdf' },
        ]),
      ),
    )
    expect(res.status).toBe(202)
    const body = (await res.json()) as { id: string }
    const stored = ctx.messages.store.get(body.id)
    expect(stored?.state.attachments).toEqual([
      {
        filename: 'danfse.pdf',
        url: 'https://fiscal.railway.internal/nfse/1.pdf',
        contentType: 'application/pdf',
      },
      {
        filename: 'recibo.pdf',
        url: 'http://fiscal.railway.internal/recibo/1.pdf',
        contentType: null,
      },
    ])
  })

  it('rejeita mais de 3 anexos (400)', async () => {
    const four = Array.from({ length: 4 }, (_, i) => ({
      filename: `a-${i}.pdf`,
      url: `https://fiscal.railway.internal/${i}.pdf`,
    }))
    const res = await ctx.app.handle(postJson('/messaging/send', payload(four)))
    expect(res.status).toBe(400)
  })

  it('rejeita url que não é http(s) (400)', async () => {
    const res = await ctx.app.handle(
      postJson('/messaging/send', payload([{ filename: 'a.pdf', url: 'ftp://x/a.pdf' }])),
    )
    expect(res.status).toBe(400)
  })

  it('rejeita filename vazio (400)', async () => {
    const res = await ctx.app.handle(
      postJson(
        '/messaging/send',
        payload([{ filename: '', url: 'https://fiscal.railway.internal/a.pdf' }]),
      ),
    )
    expect(res.status).toBe(400)
  })

  it('anexo em canal whatsapp → 400 (validação de domínio)', async () => {
    await ctx.app.handle(
      postJson('/messaging/admin/templates', {
        key: 'welcome',
        channel: 'whatsapp',
        name: 'Boas-vindas WA',
        body: 'Olá {{nome}}',
        variables: ['nome'],
      }),
    )
    const res = await ctx.app.handle(
      postJson('/messaging/send', {
        channel: 'whatsapp',
        templateKey: 'welcome',
        recipient: { name: 'Zé', phone: '5511999999999' },
        variables: { nome: 'Zé' },
        attachments: [{ filename: 'a.pdf', url: 'https://fiscal.railway.internal/a.pdf' }],
      }),
    )
    expect(res.status).toBe(400)
  })
})

describe('GET /messaging/messages/:id', () => {
  it('200 para mensagem existente, 404 para inexistente', async () => {
    const ctx = buildApp()
    await seedEmailTemplate(ctx.app)
    await seedDefaultSender(ctx.app)
    const created = (await (
      await ctx.app.handle(
        postJson('/messaging/send', {
          channel: 'email',
          templateKey: 'welcome',
          recipient: { name: 'Helena', email: 'helena@example.com' },
          variables: { nome: 'Helena', senha: 'abc' },
        }),
      )
    ).json()) as { id: string }

    const ok = await ctx.app.handle(get(`/messaging/messages/${created.id}`))
    expect(ok.status).toBe(200)
    // uuid válido inexistente → 404; id malformado → 400 (validação, não 500 do cast).
    const notFound = await ctx.app.handle(
      get('/messaging/messages/00000000-0000-4000-8000-000000000000'),
    )
    expect(notFound.status).toBe(404)
    const malformed = await ctx.app.handle(get('/messaging/messages/nope'))
    expect(malformed.status).toBe(400)
  })

  it('escopa a consulta pelo consumer HMAC autenticado', async () => {
    const ctx = buildApp({ internalToken: 'tok-interno-16' })
    const funnelHeaders = { 'x-internal-token': 'tok-interno-16', 'x-consumer-id': 'funnel' }
    await seedEmailTemplate(ctx.app, funnelHeaders)
    await seedDefaultSender(ctx.app, funnelHeaders)
    const created = (await (
      await ctx.app.handle(
        postJson(
          '/messaging/send',
          {
            channel: 'email',
            templateKey: 'welcome',
            recipient: { name: 'Helena', email: 'helena@example.com' },
            variables: { nome: 'Helena', senha: 'abc' },
          },
          funnelHeaders,
        ),
      )
    ).json()) as { id: string }

    expect(
      (await ctx.app.handle(get(`/messaging/messages/${created.id}`, funnelHeaders))).status,
    ).toBe(200)
    expect(
      (
        await ctx.app.handle(
          get(`/messaging/messages/${created.id}`, {
            'x-internal-token': 'tok-interno-16',
            'x-consumer-id': 'auth',
          }),
        )
      ).status,
    ).toBe(404)
    expect(
      (
        await ctx.app.handle(
          get(`/messaging/messages/${created.id}`, { 'x-internal-token': 'tok-interno-16' }),
        )
      ).status,
    ).toBe(401)
  })
})

describe('WhatsApp send', () => {
  it('enfileira mensagem de whatsapp (sem remetente)', async () => {
    const ctx = buildApp()
    await ctx.app.handle(
      postJson('/messaging/admin/templates', {
        key: 'welcome',
        channel: 'whatsapp',
        name: 'Boas-vindas WA',
        body: 'Olá {{nome}}! Acesse {{link}}',
        variables: ['nome', 'link'],
      }),
    )
    const res = await ctx.app.handle(
      postJson('/messaging/send', {
        channel: 'whatsapp',
        templateKey: 'welcome',
        recipient: { name: 'Zé', phone: '5511999999999' },
        variables: { nome: 'Zé', link: 'https://x.com' },
      }),
    )
    expect(res.status).toBe(202)
    const body = (await res.json()) as { id: string; status: string }
    const stored = ctx.messages.store.get(body.id)
    expect(stored?.channel).toBe('whatsapp')
    expect(stored?.state.renderedBody).toBe('Olá Zé! Acesse https://x.com')
  })
})

describe('Auth', () => {
  it('admin: 401 sem headers, 200 com role admin (requireAdmin ligado)', async () => {
    const ctx = buildApp({ requireAdmin: true })
    const denied = await ctx.app.handle(
      postJson('/messaging/admin/templates', {
        key: 'k',
        channel: 'whatsapp',
        name: 'N',
        body: 'B',
      }),
    )
    expect(denied.status).toBe(401)

    const ok = await ctx.app.handle(
      postJson(
        '/messaging/admin/templates',
        { key: 'k', channel: 'whatsapp', name: 'N', body: 'B' },
        adminHeaders,
      ),
    )
    expect(ok.status).toBe(200)
  })

  it('send: 401 sem x-internal-token quando configurado', async () => {
    const ctx = buildApp({ internalToken: 'secret' })
    const res = await ctx.app.handle(
      postJson('/messaging/send', {
        channel: 'whatsapp',
        templateKey: 'welcome',
        recipient: { name: 'Zé', phone: '5511999999999' },
      }),
    )
    expect(res.status).toBe(401)
  })

  it('staff: leitura 200, ESCRITA 403 (espelha o RBAC do gateway)', async () => {
    const ctx = buildApp({ requireAdmin: true })
    const staff = { 'x-auth-user-role': 'staff', 'x-auth-user-status': 'active' }

    const read = await ctx.app.handle(get('/messaging/admin/templates', staff))
    expect(read.status).toBe(200)

    const write = await ctx.app.handle(
      postJson(
        '/messaging/admin/templates',
        { key: 'k', channel: 'whatsapp', name: 'N', body: 'B' },
        staff,
      ),
    )
    expect(write.status).toBe(403)
  })
})

describe('Admin WhatsApp instances', () => {
  it('duplicidade de instanceName retorna 409', async () => {
    const ctx = buildApp()
    const payload = { instanceName: 'vendas', phoneNumber: '5511999999999' }

    expect(
      (await ctx.app.handle(postJson('/messaging/admin/whatsapp-instances', payload))).status,
    ).toBe(200)
    expect(
      (await ctx.app.handle(postJson('/messaging/admin/whatsapp-instances', payload))).status,
    ).toBe(409)
  })
})

describe('Health', () => {
  it('/health 200 sempre; /readyz reflete o probe', async () => {
    const ctx = buildApp()
    expect((await ctx.app.handle(get('/health'))).status).toBe(200)
    expect((await ctx.app.handle(get('/readyz'))).status).toBe(200)
  })
})

describe('Admin exige x-internal-token (prova de que veio do gateway)', () => {
  it('headers de admin VÁLIDOS sem o token → 401; com token → 200', async () => {
    const ctx = buildApp({ requireAdmin: true, internalToken: 'tok-interno' })
    const denied = await ctx.app.handle(get('/messaging/admin/templates', adminHeaders))
    expect(denied.status).toBe(401)

    const ok = await ctx.app.handle(
      get('/messaging/admin/templates', { ...adminHeaders, 'x-internal-token': 'tok-interno' }),
    )
    expect(ok.status).toBe(200)
  })

  it('fail-closed: x-auth-user-status AUSENTE → 401 (ausente nunca é "ativo")', async () => {
    const ctx = buildApp({ requireAdmin: true })
    const res = await ctx.app.handle(
      get('/messaging/admin/templates', { 'x-auth-user-role': 'admin' }),
    )
    expect(res.status).toBe(401)
  })
})

describe('Teto de corpo por rota (lotes grandes do webhook)', () => {
  it('corpo acima do teto geral passa no WEBHOOK e leva 413 no /send', async () => {
    // Teto geral de 1KB; teto de webhook de 256KB — payload de ~8KB.
    const ctx = buildApp({ maxRequestBodyBytes: 1024, webhookMaxBodyBytes: 256 * 1024 })
    const bigBatch = Array.from({ length: 80 }, (_, i) => ({
      event: 'processed',
      sg_event_id: `evt-${i}`,
      padding: 'x'.repeat(80),
    }))

    const webhook = await ctx.app.handle(postJson('/messaging/webhooks/sendgrid', bigBatch))
    expect(webhook.status).toBe(200)

    const send = await ctx.app.handle(postJson('/messaging/send', bigBatch))
    expect(send.status).toBe(413)
  })
})

describe('GET /metrics', () => {
  it('com METRICS_TOKEN: 401 sem token, 200 com token (snapshot de backlog)', async () => {
    const ctx = buildApp({ metricsToken: 'metrics-token-16+' })
    expect((await ctx.app.handle(get('/metrics'))).status).toBe(401)

    const ok = await ctx.app.handle(get('/metrics', { 'x-metrics-token': 'metrics-token-16+' }))
    expect(ok.status).toBe(200)
    const body = (await ok.json()) as Record<string, unknown>
    expect(body).toHaveProperty('outboxPending')
    expect(body).toHaveProperty('emailDue')
    expect(body).toHaveProperty('whatsappOldestDueAgeSeconds')
  })
})

describe('Tetos dos headers de idempotência', () => {
  it('Idempotency-Key gigante → 400', async () => {
    const ctx = buildApp()
    await seedEmailTemplate(ctx.app)
    await seedDefaultSender(ctx.app)
    const res = await ctx.app.handle(
      postJson(
        '/messaging/send',
        {
          channel: 'email',
          templateKey: 'welcome',
          recipient: { name: 'Helena', email: 'helena@example.com' },
          variables: { nome: 'Helena', senha: 'abc' },
        },
        { 'x-consumer-id': 'funnel', 'idempotency-key': 'k'.repeat(201) },
      ),
    )
    expect(res.status).toBe(400)
  })
})
