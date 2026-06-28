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
    teaserWhenLocked: false,
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

  test('falha do members não derruba públicos e nega gated em fail-closed', async () => {
    ctx.members.checkAccess = async () => {
      throw new Error('members indisponível')
    }
    const headers = studentHeaders(randomUUID())
    const list = await ctx.app.handle(jsonRequest('GET', '/hub/spaces?audience=adult', { headers }))
    expect(list.status).toBe(200)
    const body = (await list.json()) as { items: Array<{ slug: string }> }
    expect(body.items.map((s) => s.slug)).toEqual(['geral'])

    const detail = await ctx.app.handle(jsonRequest('GET', '/hub/spaces/curso-a-srv', { headers }))
    expect(detail.status).toBe(403)
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

  test('chave-mestra KIDS cobre course_gated kids; a adulta não (cada uma na sua vitrine)', async () => {
    // Servidor kids pago (course_gated) — a chave KIDS deve cobrir.
    await ctx.repo.createSpace(
      space({ slug: 'clube-gated', name: 'Clube', audience: 'kids', accessConfig: COURSE_A }),
    )
    const listKids = async (headers: Record<string, string>) => {
      const res = await ctx.app.handle(jsonRequest('GET', '/hub/spaces?audience=kids', { headers }))
      const body = (await res.json()) as { items: Array<{ slug: string }> }
      return new Set(body.items.map((s) => s.slug))
    }

    // Chave-mestra KIDS → vê o clube gated (além do público kids).
    const kid = randomUUID()
    ctx.members.mastersKids.add(kid)
    expect(await listKids(studentHeaders(kid))).toEqual(new Set(['kids', 'clube-gated']))

    // Chave-mestra ADULTA não cobre espaço kids → só o público kids.
    const adultMaster = randomUUID()
    ctx.members.masters.add(adultMaster)
    expect(await listKids(studentHeaders(adultMaster))).toEqual(new Set(['kids']))
  })

  test('community_gated: só quem tem a CHAVE de comunidade enxerga', async () => {
    // Comunidade como PRODUTO: o espaço exige a chave 'vip'.
    await ctx.repo.createSpace(
      space({
        slug: 'comunidade-vip',
        name: 'Comunidade VIP',
        accessConfig: {
          visibility: 'community_gated',
          courses: [],
          communities: ['vip'],
          roles: [],
        },
      }),
    )

    // Sem o acesso de comunidade → não vê (só o público).
    expect(new Set(await listSlugs(ctx.app, studentHeaders(randomUUID())))).toEqual(
      new Set(['geral']),
    )

    // Com a chave 'vip' → vê a comunidade VIP (matrícula de curso NÃO basta).
    const member = randomUUID()
    ctx.members.communitiesByUser.set(member, new Set(['vip']))
    expect(new Set(await listSlugs(ctx.app, studentHeaders(member)))).toEqual(
      new Set(['geral', 'comunidade-vip']),
    )

    // Quem tem só matrícula de curso (não a comunidade) NÃO vê a VIP.
    const courseOnly = randomUUID()
    ctx.members.grantsByUser.set(courseOnly, new Set(['curso-a']))
    expect(new Set(await listSlugs(ctx.app, studentHeaders(courseOnly)))).toEqual(
      new Set(['geral', 'curso-a-srv']),
    )
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

  test('teaser: gated com teaserWhenLocked aparece BLOQUEADO; conteúdo segue gated', async () => {
    // Servidor pago com vitrine: sem acesso, aparece bloqueado em vez de sumir.
    await ctx.repo.createSpace(
      space({
        slug: 'clube',
        name: 'Clube dos Criadores',
        audience: 'kids',
        accessConfig: COURSE_A,
        teaserWhenLocked: true,
      }),
    )
    const headers = studentHeaders(randomUUID())
    // Listagem kids: o clube aparece com locked:true.
    const res = await ctx.app.handle(jsonRequest('GET', '/hub/spaces?audience=kids', { headers }))
    const list = (await res.json()) as { items: Array<{ slug: string; locked: boolean }> }
    const clube = list.items.find((s) => s.slug === 'clube')
    expect(clube?.locked).toBe(true)
    // Detalhe (teaser) responde 200 com locked:true (só metadados).
    const detail = await ctx.app.handle(jsonRequest('GET', '/hub/spaces/clube', { headers }))
    expect(detail.status).toBe(200)
    expect(((await detail.json()) as { locked: boolean }).locked).toBe(true)
    // Mas o CONTEÚDO (canais) segue gated → 403 (backstop à prova de vazamento).
    const channels = await ctx.app.handle(
      jsonRequest('GET', '/hub/spaces/clube/channels', { headers }),
    )
    expect(channels.status).toBe(403)
    // Com matrícula no curso, deixa de ser locked.
    const userId = randomUUID()
    ctx.members.grantsByUser.set(userId, new Set(['curso-a']))
    const okDetail = await ctx.app.handle(
      jsonRequest('GET', '/hub/spaces/clube', { headers: studentHeaders(userId) }),
    )
    expect(((await okDetail.json()) as { locked: boolean }).locked).toBe(false)
  })

  test('teaser: falha do members no detalhe vira 503 ACCESS_UNAVAILABLE, não bloqueio real', async () => {
    await ctx.repo.createSpace(
      space({
        slug: 'clube-indisponivel',
        name: 'Clube indisponível',
        audience: 'kids',
        accessConfig: COURSE_A,
        teaserWhenLocked: true,
      }),
    )
    ctx.members.checkAccess = async () => {
      throw new Error('members indisponível')
    }

    const res = await ctx.app.handle(
      jsonRequest('GET', '/hub/spaces/clube-indisponivel', {
        headers: studentHeaders(randomUUID()),
      }),
    )
    expect(res.status).toBe(503)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      'ACCESS_UNAVAILABLE',
    )
  })

  test('teaser: falha do members nos canais também vira 503 ACCESS_UNAVAILABLE', async () => {
    await ctx.repo.createSpace(
      space({
        slug: 'clube-canais-indisponivel',
        name: 'Clube canais indisponível',
        audience: 'kids',
        accessConfig: COURSE_A,
        teaserWhenLocked: true,
      }),
    )
    ctx.members.checkAccess = async () => {
      throw new Error('members indisponível')
    }

    const res = await ctx.app.handle(
      jsonRequest('GET', '/hub/spaces/clube-canais-indisponivel/channels', {
        headers: studentHeaders(randomUUID()),
      }),
    )
    expect(res.status).toBe(503)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      'ACCESS_UNAVAILABLE',
    )
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
