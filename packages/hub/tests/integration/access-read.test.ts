import { beforeEach, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { AccessConfig } from '../../src/domain/access/access-config'
import type { SpaceFields } from '../../src/domain/ports/community-admin-repository.port'
import { adminHeaders, buildApp, jsonRequest, studentHeaders } from '../helpers'

const PUBLIC: AccessConfig = { visibility: 'public', courses: [], roles: [] }
const COURSE_A: AccessConfig = { visibility: 'course_gated', courses: ['curso-a'], roles: [] }

function space(over: Partial<SpaceFields> & { slug: string; name: string }): SpaceFields {
  return {
    description: null,
    iconUrl: null,
    audience: 'adult',
    accessConfig: PUBLIC,
    requiresApproval: false,
    status: 'active',
    ...over,
  }
}

async function listSlugs(app: ReturnType<typeof buildApp>['app'], headers: Record<string, string>) {
  const res = await app.handle(jsonRequest('GET', '/hub/spaces?audience=adult', { headers }))
  const body = (await res.json()) as { items: Array<{ slug: string }> }
  return body.items.map((s) => s.slug)
}

describe('leitura do aluno com resolução de acesso', () => {
  let ctx: ReturnType<typeof buildApp>
  beforeEach(async () => {
    ctx = buildApp()
    await ctx.repo.createSpace(space({ slug: 'geral', name: 'Geral', accessConfig: PUBLIC }))
    await ctx.repo.createSpace(
      space({ slug: 'curso-a-srv', name: 'Curso A', accessConfig: COURSE_A }),
    )
    await ctx.repo.createSpace(
      space({ slug: 'kids', name: 'Kids', audience: 'kids', accessConfig: PUBLIC }),
    )
  })

  test('aluno sem matrícula vê só o público', async () => {
    const slugs = await listSlugs(ctx.app, studentHeaders(randomUUID()))
    expect(slugs).toEqual(['geral'])
  })

  test('aluno com matrícula no curso vê o servidor course_gated', async () => {
    const userId = randomUUID()
    ctx.members.grantsByUser.set(userId, new Set(['curso-a']))
    const slugs = await listSlugs(ctx.app, studentHeaders(userId))
    expect(new Set(slugs)).toEqual(new Set(['geral', 'curso-a-srv']))
  })

  test('chave-mestra cobre course_gated adult', async () => {
    const userId = randomUUID()
    ctx.members.masters.add(userId)
    const slugs = await listSlugs(ctx.app, studentHeaders(userId))
    expect(new Set(slugs)).toEqual(new Set(['geral', 'curso-a-srv']))
  })

  test('staff/admin vê tudo (bypass) sem chamar o members', async () => {
    const slugs = await listSlugs(ctx.app, adminHeaders())
    expect(new Set(slugs)).toEqual(new Set(['geral', 'curso-a-srv']))
    expect(ctx.members.calls).toBe(0)
  })

  test('GET direto de servidor sem acesso → 403; público → 200', async () => {
    const headers = studentHeaders(randomUUID())
    const denied = await ctx.app.handle(jsonRequest('GET', '/hub/spaces/curso-a-srv', { headers }))
    expect(denied.status).toBe(403)
    const ok = await ctx.app.handle(jsonRequest('GET', '/hub/spaces/geral', { headers }))
    expect(ok.status).toBe(200)
  })

  test('servidor inexistente/arquivado → 404', async () => {
    const res = await ctx.app.handle(
      jsonRequest('GET', '/hub/spaces/nao-existe', { headers: studentHeaders(randomUUID()) }),
    )
    expect(res.status).toBe(404)
  })

  test('canal com gate próprio estreita o acesso (AND com o space)', async () => {
    const userId = randomUUID()
    const sp = await ctx.repo.findActiveSpaceBySlug('geral')
    // canal público herdado + canal travado por curso-b (que o aluno não tem)
    await ctx.repo.createChannel(sp!.id, {
      slug: 'aberto',
      name: 'Aberto',
      topic: null,
      accessConfig: null,
      postingPolicy: 'members',
      requiresApproval: null,
      status: 'active',
    })
    await ctx.repo.createChannel(sp!.id, {
      slug: 'restrito',
      name: 'Restrito',
      topic: null,
      accessConfig: { visibility: 'course_gated', courses: ['curso-b'], roles: [] },
      postingPolicy: 'members',
      requiresApproval: null,
      status: 'active',
    })
    const res = await ctx.app.handle(
      jsonRequest('GET', '/hub/spaces/geral/channels', { headers: studentHeaders(userId) }),
    )
    const body = (await res.json()) as { items: Array<{ slug: string }> }
    expect(body.items.map((c) => c.slug)).toEqual(['aberto'])
  })

  test('micro-cache evita martelar o members', async () => {
    const cached = buildApp({ accessCacheTtlMs: 60_000 })
    await cached.repo.createSpace(space({ slug: 'curso-a-srv', name: 'A', accessConfig: COURSE_A }))
    const userId = randomUUID()
    const headers = studentHeaders(userId)
    await listSlugs(cached.app, headers)
    await listSlugs(cached.app, headers)
    expect(cached.members.calls).toBe(1)
  })
})
