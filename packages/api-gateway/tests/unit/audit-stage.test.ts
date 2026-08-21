import { describe, expect, test } from 'bun:test'
import { createAuditStage } from '../../src/application/pipeline/stages/audit.stage'
import type { AuditEmitter, AuditEvent } from '../../src/domain/audit/audit-emitter.port'
import type { RouteMatch } from '../../src/domain/routing/route-match'
import { makeContext } from '../helpers'

function recordingEmitter() {
  const events: AuditEvent[] = []
  const waiters: Array<() => void> = []
  const emitter: AuditEmitter = {
    name: 'rec',
    emit: async (e) => {
      events.push(e)
      for (const w of waiters.splice(0)) w()
    },
  }
  /** Resolve assim que (ou se já tiver) ≥1 evento — para aguardar o caminho ADIADO. */
  const emitted = () =>
    events.length > 0 ? Promise.resolve() : new Promise<void>((resolve) => waiters.push(resolve))
  return { emitter, events, emitted }
}

/** Monta um RouteMatch mínimo (só o que o stage lê: id, audit, params). */
function route(opts: {
  id: string
  audit?: { action?: string; targetField?: string; targetResponseField?: string } | undefined
  params?: Record<string, string>
}): RouteMatch {
  return {
    route: { id: opts.id, audit: opts.audit } as RouteMatch['route'],
    params: opts.params ?? {},
    version: 'v1',
  }
}

const ADMIN = {
  id: 'admin-1',
  email: 'admin@x.com',
  firstName: 'A',
  lastName: 'D',
  role: 'admin',
  status: 'active',
}

describe('audit stage', () => {
  test('emite em 2xx de rota audit-marcada com ator + targetId do param', async () => {
    const { emitter, events } = recordingEmitter()
    const ctx = makeContext({ method: 'POST', url: 'http://gw.local/members/admin/entitlements' })
    ctx.route = route({ id: 'members-admin-grant', audit: {}, params: { id: 'u-9' } })
    ctx.user = ADMIN
    ctx.response = new Response('{}', { status: 201 })

    await createAuditStage({ emitter }).run(ctx)

    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      actorId: 'admin-1',
      actorEmail: 'admin@x.com',
      actorRole: 'admin',
      action: 'members-admin-grant',
      method: 'POST',
      path: '/members/admin/entitlements',
      targetId: 'u-9',
      status: 201,
    })
  })

  test('NÃO emite em 4xx/5xx', async () => {
    const { emitter, events } = recordingEmitter()
    const ctx = makeContext({ method: 'POST' })
    ctx.route = route({ id: 'members-admin-grant', audit: {} })
    ctx.user = ADMIN
    ctx.response = new Response('no', { status: 409 })
    await createAuditStage({ emitter }).run(ctx)
    expect(events).toHaveLength(0)
  })

  test('NÃO emite em 3xx', async () => {
    const { emitter, events } = recordingEmitter()
    const ctx = makeContext({ method: 'POST' })
    ctx.route = route({ id: 'members-admin-grant', audit: {} })
    ctx.user = ADMIN
    ctx.response = new Response(null, { status: 302, headers: { location: '/login' } })
    await createAuditStage({ emitter }).run(ctx)
    expect(events).toHaveLength(0)
  })

  test('NÃO emite para método não mutante mesmo se a config vier malformada', async () => {
    const { emitter, events } = recordingEmitter()
    const ctx = makeContext({ method: 'GET' })
    ctx.route = route({ id: 'bad-audit-route', audit: {} })
    ctx.user = ADMIN
    ctx.response = new Response('ok', { status: 200 })
    await createAuditStage({ emitter }).run(ctx)
    expect(events).toHaveLength(0)
  })

  test('NÃO emite quando a rota não é audit-marcada', async () => {
    const { emitter, events } = recordingEmitter()
    const ctx = makeContext({ method: 'GET' })
    ctx.route = route({ id: 'members-admin-members-list', audit: undefined })
    ctx.user = ADMIN
    ctx.response = new Response('ok', { status: 200 })
    await createAuditStage({ emitter }).run(ctx)
    expect(events).toHaveLength(0)
  })

  test('NÃO emite sem ator resolvido (ex.: S2S sem usuário)', async () => {
    const { emitter, events } = recordingEmitter()
    const ctx = makeContext({ method: 'POST' })
    ctx.route = route({ id: 'members-admin-grant', audit: {} })
    ctx.response = new Response('ok', { status: 200 })
    await createAuditStage({ emitter }).run(ctx)
    expect(events).toHaveLength(0)
  })

  test('action customizada sobrescreve o id da rota', async () => {
    const { emitter, events } = recordingEmitter()
    const ctx = makeContext({ method: 'DELETE' })
    ctx.route = route({ id: 'r', audit: { action: 'cancelar-assinatura' }, params: { id: 's-1' } })
    ctx.user = ADMIN
    ctx.response = new Response('ok', { status: 200 })
    await createAuditStage({ emitter }).run(ctx)
    expect(events[0]?.action).toBe('cancelar-assinatura')
  })

  test('usa targetField do corpo JSON quando a rota não tem path param', async () => {
    const { emitter, events } = recordingEmitter()
    const ctx = makeContext({ method: 'POST', url: 'http://gw.local/members/admin/entitlements' })
    ctx.route = route({
      id: 'members-admin-grant',
      audit: { targetField: 'userId' },
    })
    ctx.rawBody = JSON.stringify({ userId: 'u-42', mode: 'all_courses' })
    ctx.user = ADMIN
    ctx.response = new Response('{}', { status: 201 })

    await createAuditStage({ emitter }).run(ctx)

    expect(events[0]?.targetId).toBe('u-42')
  })

  test('usa targetResponseField do JSON de resposta quando o id nasce no upstream', async () => {
    const { emitter, events, emitted } = recordingEmitter()
    const ctx = makeContext({ method: 'POST', url: 'http://gw.local/auth/admin/users' })
    ctx.route = route({
      id: 'auth-admin-user-create',
      audit: { targetResponseField: 'user.id' },
    })
    ctx.user = ADMIN
    ctx.response = new Response(JSON.stringify({ user: { id: 'u-created' }, inviteSent: true }), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    })

    createAuditStage({ emitter }).run(ctx)
    await emitted()

    expect(events[0]?.targetId).toBe('u-created')
    // O clone preservou o corpo: a resposta ao cliente segue íntegra.
    expect(await ctx.response.text()).toBe('{"user":{"id":"u-created"},"inviteSent":true}')
  })

  test('targetResponseField NÃO bloqueia o finalizer: leitura do corpo é adiada', async () => {
    const { emitter, events, emitted } = recordingEmitter()
    const ctx = makeContext({ method: 'POST', url: 'http://gw.local/auth/admin/users' })
    ctx.route = route({ id: 'auth-admin-user-create', audit: { targetResponseField: 'user.id' } })
    ctx.user = ADMIN
    ctx.response = new Response(JSON.stringify({ user: { id: 'u-created' } }), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    })

    // O finalizer retorna SÍNCRONO (sem prometer a leitura do corpo) — o cliente não espera.
    const outcome = createAuditStage({ emitter }).run(ctx)
    expect(outcome).toBeUndefined()
    expect(events).toHaveLength(0) // emissão ainda não ocorreu (adiada para fora do hot path)

    await emitted()
    expect(events).toHaveLength(1)
  })

  test('em sessão de suporte, registra o impersonador (ator real ≠ sub impersonado)', async () => {
    const { emitter, events } = recordingEmitter()
    const ctx = makeContext({ method: 'POST' })
    ctx.route = route({ id: 'members-admin-grant', audit: {}, params: { id: 'u-9' } })
    ctx.user = { ...ADMIN, impersonatorId: 'support-admin-1' }
    ctx.response = new Response('{}', { status: 201 })

    await createAuditStage({ emitter }).run(ctx)

    expect(events[0]?.impersonatorId).toBe('support-admin-1')
  })

  test('sem impersonação, impersonatorId fica indefinido', async () => {
    const { emitter, events } = recordingEmitter()
    const ctx = makeContext({ method: 'POST' })
    ctx.route = route({ id: 'members-admin-grant', audit: {}, params: { id: 'u-9' } })
    ctx.user = ADMIN
    ctx.response = new Response('{}', { status: 201 })

    await createAuditStage({ emitter }).run(ctx)

    expect(events[0]?.impersonatorId).toBeUndefined()
  })

  test('audita toda mutação bem-sucedida em impersonação write mesmo sem marca na rota', async () => {
    const { emitter, events } = recordingEmitter()
    const ctx = makeContext({ method: 'POST', url: 'http://gw.local/members/lessons/1/submit' })
    ctx.route = route({ id: 'members-studio-submit', audit: undefined })
    ctx.user = {
      ...ADMIN,
      id: 'profile-1',
      role: 'customer',
      email: 'cliente@x.com',
      impersonatorId: 'admin-1',
      impersonationMode: 'write',
    }
    ctx.response = new Response('{}', { status: 200 })

    await createAuditStage({ emitter }).run(ctx)

    expect(events[0]).toMatchObject({
      actorId: 'profile-1',
      impersonatorId: 'admin-1',
      action: 'members-studio-submit',
    })
  })
})
