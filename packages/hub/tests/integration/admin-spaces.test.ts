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
      jsonRequest('POST', '/hub/admin/spaces', { headers: adminHeaders(), body: validSpace() }),
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
