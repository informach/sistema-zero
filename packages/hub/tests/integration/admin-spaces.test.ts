import { describe, expect, test } from 'bun:test'
import { adminHeaders, buildApp, jsonRequest } from '../helpers'

const validSpace = (over: Record<string, unknown> = {}) => ({
  slug: 'geral',
  name: 'Geral',
  audience: 'adult',
  accessConfig: { visibility: 'public' },
  ...over,
})

async function createSpace(app: ReturnType<typeof buildApp>['app'], body: Record<string, unknown>) {
  const res = await app.handle(
    jsonRequest('POST', '/hub/admin/spaces', { headers: adminHeaders(), body }),
  )
  return res
}

describe('admin de spaces/channels', () => {
  test('cria, lê (com canais) e lista servidores', async () => {
    const { app } = buildApp()
    const created = await createSpace(app, validSpace())
    expect(created.status).toBe(201)
    const space = (await created.json()) as {
      id: string
      sortOrder: number
      requiresApproval: boolean
    }
    expect(space.requiresApproval).toBe(false) // adult default

    const tree = await app.handle(
      jsonRequest('GET', `/hub/admin/spaces/${space.id}`, { headers: adminHeaders() }),
    )
    expect(tree.status).toBe(200)
    expect(((await tree.json()) as { channels: unknown[] }).channels).toEqual([])

    const list = await app.handle(
      jsonRequest('GET', '/hub/admin/spaces?audience=adult', { headers: adminHeaders() }),
    )
    expect(((await list.json()) as { total: number }).total).toBe(1)
  })

  test('servidor kids nasce com pré-moderação ligada', async () => {
    const { app } = buildApp()
    const res = await createSpace(app, validSpace({ slug: 'kids-geral', audience: 'kids' }))
    expect(((await res.json()) as { requiresApproval: boolean }).requiresApproval).toBe(true)
  })

  test('slug duplicado → 409 DUPLICATE_SLUG', async () => {
    const { app } = buildApp()
    await createSpace(app, validSpace())
    const dup = await createSpace(app, validSpace({ name: 'Outro' }))
    expect(dup.status).toBe(409)
    expect(((await dup.json()) as { error: { code: string } }).error.code).toBe('DUPLICATE_SLUG')
  })

  test('PATCH de servidor rejeita versão antiga → 409 CONCURRENCY_CONFLICT', async () => {
    const { app } = buildApp()
    const created = await createSpace(app, validSpace())
    const space = (await created.json()) as { id: string; version: number }

    const first = await app.handle(
      jsonRequest('PATCH', `/hub/admin/spaces/${space.id}`, {
        headers: adminHeaders(),
        body: validSpace({ name: 'Geral editado', version: space.version }),
      }),
    )
    expect(first.status).toBe(200)
    const edited = (await first.json()) as { name: string; version: number }
    expect(edited.name).toBe('Geral editado')
    expect(edited.version).toBe(space.version + 1)

    const stale = await app.handle(
      jsonRequest('PATCH', `/hub/admin/spaces/${space.id}`, {
        headers: adminHeaders(),
        body: validSpace({ name: 'Geral sobrescrito', version: space.version }),
      }),
    )
    expect(stale.status).toBe(409)
    expect(((await stale.json()) as { error: { code: string } }).error.code).toBe(
      'CONCURRENCY_CONFLICT',
    )
  })

  test('PATCH parcial de servidor preserva campos ausentes', async () => {
    const { app } = buildApp()
    const created = await createSpace(
      app,
      validSpace({
        description: 'Descrição original',
        requiresApproval: true,
        teaserWhenLocked: true,
        status: 'archived',
      }),
    )
    const space = (await created.json()) as { id: string; version: number }

    const patched = await app.handle(
      jsonRequest('PATCH', `/hub/admin/spaces/${space.id}`, {
        headers: adminHeaders(),
        body: { name: 'Nome parcial', version: space.version },
      }),
    )
    expect(patched.status).toBe(200)
    const body = (await patched.json()) as {
      name: string
      description: string | null
      requiresApproval: boolean
      teaserWhenLocked: boolean
      status: string
    }
    expect(body.name).toBe('Nome parcial')
    expect(body.description).toBe('Descrição original')
    expect(body.requiresApproval).toBe(true)
    expect(body.teaserWhenLocked).toBe(true)
    expect(body.status).toBe('archived')
  })

  test('course_gated sem cursos → 400 VALIDATION_ERROR', async () => {
    const { app } = buildApp()
    const res = await createSpace(
      app,
      validSpace({ accessConfig: { visibility: 'course_gated', courses: [] } }),
    )
    expect(res.status).toBe(400)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('VALIDATION_ERROR')
  })

  test('community_gated sem comunidades → 400 VALIDATION_ERROR', async () => {
    const { app } = buildApp()
    const res = await createSpace(
      app,
      validSpace({ accessConfig: { visibility: 'community_gated', communities: [] } }),
    )
    expect(res.status).toBe(400)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('VALIDATION_ERROR')
  })

  test('cria canal e reordena dentro do servidor', async () => {
    const { app } = buildApp()
    const space = (await (await createSpace(app, validSpace())).json()) as { id: string }

    const c1 = (await (
      await app.handle(
        jsonRequest('POST', `/hub/admin/spaces/${space.id}/channels`, {
          headers: adminHeaders(),
          body: { slug: 'duvidas', name: 'Dúvidas' },
        }),
      )
    ).json()) as { id: string; sortOrder: number; postingPolicy: string }
    expect(c1.sortOrder).toBe(0)
    expect(c1.postingPolicy).toBe('members')

    const c2 = (await (
      await app.handle(
        jsonRequest('POST', `/hub/admin/spaces/${space.id}/channels`, {
          headers: adminHeaders(),
          body: { slug: 'avisos', name: 'Avisos', postingPolicy: 'staff_only' },
        }),
      )
    ).json()) as { id: string }

    const reorder = await app.handle(
      jsonRequest('POST', `/hub/admin/spaces/${space.id}/channels/reorder`, {
        headers: adminHeaders(),
        body: { orderedIds: [c2.id, c1.id] },
      }),
    )
    expect(reorder.status).toBe(200)

    const tree = await app.handle(
      jsonRequest('GET', `/hub/admin/spaces/${space.id}`, { headers: adminHeaders() }),
    )
    const channels = ((await tree.json()) as { channels: Array<{ id: string }> }).channels
    expect(channels.map((c) => c.id)).toEqual([c2.id, c1.id])
  })

  test('PATCH de canal rejeita versão antiga → 409 CONCURRENCY_CONFLICT', async () => {
    const { app } = buildApp()
    const space = (await (await createSpace(app, validSpace())).json()) as { id: string }
    const created = await app.handle(
      jsonRequest('POST', `/hub/admin/spaces/${space.id}/channels`, {
        headers: adminHeaders(),
        body: { slug: 'duvidas', name: 'Dúvidas' },
      }),
    )
    const channel = (await created.json()) as { id: string; version: number }

    const first = await app.handle(
      jsonRequest('PATCH', `/hub/admin/channels/${channel.id}`, {
        headers: adminHeaders(),
        body: { slug: 'duvidas', name: 'Dúvidas editadas', version: channel.version },
      }),
    )
    expect(first.status).toBe(200)
    const edited = (await first.json()) as { name: string; version: number }
    expect(edited.name).toBe('Dúvidas editadas')
    expect(edited.version).toBe(channel.version + 1)

    const stale = await app.handle(
      jsonRequest('PATCH', `/hub/admin/channels/${channel.id}`, {
        headers: adminHeaders(),
        body: { slug: 'duvidas', name: 'Dúvidas sobrescritas', version: channel.version },
      }),
    )
    expect(stale.status).toBe(409)
    expect(((await stale.json()) as { error: { code: string } }).error.code).toBe(
      'CONCURRENCY_CONFLICT',
    )
  })

  test('PATCH parcial de canal preserva campos ausentes', async () => {
    const { app } = buildApp()
    const space = (await (await createSpace(app, validSpace())).json()) as { id: string }
    const created = await app.handle(
      jsonRequest('POST', `/hub/admin/spaces/${space.id}/channels`, {
        headers: adminHeaders(),
        body: {
          slug: 'avisos',
          name: 'Avisos',
          topic: 'Original',
          postingPolicy: 'staff_only',
          requiresApproval: true,
          status: 'archived',
        },
      }),
    )
    const channel = (await created.json()) as { id: string; version: number }

    const patched = await app.handle(
      jsonRequest('PATCH', `/hub/admin/channels/${channel.id}`, {
        headers: adminHeaders(),
        body: { name: 'Avisos editados', version: channel.version },
      }),
    )
    expect(patched.status).toBe(200)
    const body = (await patched.json()) as {
      name: string
      topic: string | null
      postingPolicy: string
      requiresApproval: boolean | null
      status: string
    }
    expect(body.name).toBe('Avisos editados')
    expect(body.topic).toBe('Original')
    expect(body.postingPolicy).toBe('staff_only')
    expect(body.requiresApproval).toBe(true)
    expect(body.status).toBe('archived')
  })

  test('reorder com id desconhecido → 400', async () => {
    const { app } = buildApp()
    const space = (await (await createSpace(app, validSpace())).json()) as { id: string }
    const res = await app.handle(
      jsonRequest('POST', `/hub/admin/spaces/${space.id}/channels/reorder`, {
        headers: adminHeaders(),
        body: { orderedIds: ['22222222-2222-2222-2222-222222222222'] },
      }),
    )
    expect(res.status).toBe(400)
  })

  test('guard de admin: token interno exigido quando configurado', async () => {
    const { app } = buildApp({ internalToken: 'tok-interno-16-chars!!' })
    const res = await app.handle(
      jsonRequest('POST', '/hub/admin/spaces', {
        headers: adminHeaders({ 'x-internal-token': '' }),
        body: validSpace(),
      }),
    )
    expect(res.status).toBe(401) // sem x-internal-token
  })

  test('guard de admin: papel não-admin → 403 quando requireAdmin', async () => {
    const { app } = buildApp({ requireAdmin: true })
    const res = await app.handle(
      jsonRequest('POST', '/hub/admin/spaces', {
        headers: adminHeaders({ 'x-auth-user-role': 'customer' }),
        body: validSpace(),
      }),
    )
    expect(res.status).toBe(403)
  })
})
