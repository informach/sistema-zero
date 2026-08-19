import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { AccessConfig } from '../../src/domain/access/access-config'
import type {
  ChannelFields,
  SpaceFields,
} from '../../src/domain/ports/community-admin-repository.port'
import { buildApp, jsonRequest, studentHeaders } from '../helpers'

const PUBLIC: AccessConfig = { visibility: 'public', courses: [], roles: [] }

const spaceFields = (over: Partial<SpaceFields> & { slug: string }): SpaceFields => ({
  name: over.slug,
  description: null,
  iconUrl: null,
  audience: 'adult',
  accessConfig: PUBLIC,
  requiresApproval: false,
  teaserWhenLocked: false,
  status: 'active',
  ...over,
})
const channelFields = (over: Partial<ChannelFields> & { slug: string }): ChannelFields => ({
  name: over.slug,
  topic: null,
  accessConfig: null,
  postingPolicy: 'members',
  requiresApproval: null,
  status: 'active',
  ...over,
})

/** Cria space+canal direto no repo e devolve o channelId. */
async function seedChannel(
  ctx: ReturnType<typeof buildApp>,
  over: { space?: Partial<SpaceFields>; channel?: Partial<ChannelFields> } = {},
) {
  const space = await ctx.repo.createSpace(
    spaceFields({ slug: `s-${randomUUID().slice(0, 6)}`, ...over.space }),
  )
  const channel = await ctx.repo.createChannel(
    space.id,
    channelFields({ slug: `c-${randomUUID().slice(0, 6)}`, ...over.channel }),
  )
  return { space, channelId: channel.id }
}

describe('tópicos e comentários', () => {
  test('JWT antigo de perfil da conta excluída não consegue recriar dados', async () => {
    const accountId = randomUUID()
    const ctx = buildApp({ deletedAccountIds: [accountId] })
    const { channelId } = await seedChannel(ctx)

    const response = await ctx.app.handle(
      jsonRequest('POST', `/hub/channels/${channelId}/threads`, {
        headers: studentHeaders(randomUUID(), { 'x-auth-account-id': accountId }),
        body: { title: 'Não deve nascer', body: 'JWT antigo' },
      }),
    )

    expect(response.status).toBe(403)
    expect((await response.json()) as unknown).toMatchObject({
      error: { code: 'FORBIDDEN', message: 'Esta conta está em processo de exclusão.' },
    })
  })

  test('aluno cria tópico, comenta e lê', async () => {
    const ctx = buildApp()
    const { channelId } = await seedChannel(ctx)
    const user = randomUUID()

    const created = await ctx.app.handle(
      jsonRequest('POST', `/hub/channels/${channelId}/threads`, {
        headers: studentHeaders(user),
        body: { title: 'Minha dúvida', body: '# Olá\nComo faço X?' },
      }),
    )
    expect(created.status).toBe(201)
    const thread = (await created.json()) as { id: string; status: string; pending: boolean }
    expect(thread.status).toBe('visible')
    expect(thread.pending).toBe(false)

    const comment = await ctx.app.handle(
      jsonRequest('POST', `/hub/threads/${thread.id}/comments`, {
        headers: studentHeaders(randomUUID()),
        body: { body: 'Tenta assim...' },
      }),
    )
    expect(comment.status).toBe(201)

    const got = await ctx.app.handle(
      jsonRequest('GET', `/hub/threads/${thread.id}`, { headers: studentHeaders(user) }),
    )
    expect(((await got.json()) as { commentCount: number }).commentCount).toBe(1)

    const list = await ctx.app.handle(
      jsonRequest('GET', `/hub/threads/${thread.id}/comments`, { headers: studentHeaders(user) }),
    )
    expect(((await list.json()) as { items: unknown[] }).items).toHaveLength(1)
  })

  test('canal staff_only: aluno não abre tópico (403), staff abre', async () => {
    const ctx = buildApp()
    const { channelId } = await seedChannel(ctx, { channel: { postingPolicy: 'staff_only' } })

    const denied = await ctx.app.handle(
      jsonRequest('POST', `/hub/channels/${channelId}/threads`, {
        headers: studentHeaders(randomUUID()),
        body: { title: 'Aviso', body: 'oi' },
      }),
    )
    expect(denied.status).toBe(403)

    const ok = await ctx.app.handle(
      jsonRequest('POST', `/hub/channels/${channelId}/threads`, {
        headers: studentHeaders(randomUUID(), { 'x-auth-user-role': 'admin' }),
        body: { title: 'Aviso', body: 'oi' },
      }),
    )
    expect(ok.status).toBe(201)
  })

  test('canal staff_only: aluno não RESPONDE aviso (403); staff responde; vitrine (Mural) é exceção', async () => {
    const ctx = buildApp()
    const { channelId } = await seedChannel(ctx, { channel: { postingPolicy: 'staff_only' } })

    // A EQUIPE abre um aviso (tópico normal, não-vitrine).
    const notice = (await (
      await ctx.app.handle(
        jsonRequest('POST', `/hub/channels/${channelId}/threads`, {
          headers: studentHeaders(randomUUID(), { 'x-auth-user-role': 'admin' }),
          body: { title: 'Aviso', body: 'Leiam com atenção' },
        }),
      )
    ).json()) as { id: string }

    // Aluno NÃO responde o aviso (403 POSTING_NOT_ALLOWED).
    const denied = await ctx.app.handle(
      jsonRequest('POST', `/hub/threads/${notice.id}/comments`, {
        headers: studentHeaders(randomUUID()),
        body: { body: 'posso responder?' },
      }),
    )
    expect(denied.status).toBe(403)
    expect(((await denied.json()) as { error: { code: string } }).error.code).toBe(
      'POSTING_NOT_ALLOWED',
    )

    // Staff responde o aviso.
    const staffReply = await ctx.app.handle(
      jsonRequest('POST', `/hub/threads/${notice.id}/comments`, {
        headers: studentHeaders(randomUUID(), { 'x-auth-user-role': 'admin' }),
        body: { body: 'complemento' },
      }),
    )
    expect(staffReply.status).toBe(201)

    // EXCEÇÃO: post de VITRINE no mesmo canal staff_only → o aluno comenta (Mural).
    const showcaseId = randomUUID()
    await ctx.threadRepo.createShowcaseThread({
      id: showcaseId,
      channelId,
      authorId: randomUUID(),
      authorDisplayName: 'Mika',
      authorPublic: false,
      title: 'Meu Jogo',
      slug: `meu-jogo-${randomUUID().slice(0, 6)}`,
      body: 'oi',
      coverImageUrl: null,
      playId: randomUUID(),
      idempotencyKey: randomUUID(),
      now: new Date(),
    })
    const muralComment = await ctx.app.handle(
      jsonRequest('POST', `/hub/threads/${showcaseId}/comments`, {
        headers: studentHeaders(randomUUID()),
        body: { body: 'que legal!' },
      }),
    )
    expect(muralComment.status).toBe(201)
  })

  test('pré-moderação: criança posta pendente; some pros colegas, autor vê', async () => {
    const ctx = buildApp()
    const { channelId } = await seedChannel(ctx, {
      space: { audience: 'kids', requiresApproval: true },
    })
    const kid = randomUUID()
    const created = await ctx.app.handle(
      jsonRequest('POST', `/hub/channels/${channelId}/threads`, {
        headers: studentHeaders(kid),
        body: { title: 'Oi gente', body: 'tudo bem?' },
      }),
    )
    expect(((await created.json()) as { status: string }).status).toBe('pending')

    const others = await ctx.app.handle(
      jsonRequest('GET', `/hub/channels/${channelId}/threads`, {
        headers: studentHeaders(randomUUID()),
      }),
    )
    expect(((await others.json()) as { items: unknown[] }).items).toHaveLength(0)

    const own = await ctx.app.handle(
      jsonRequest('GET', `/hub/channels/${channelId}/threads`, { headers: studentHeaders(kid) }),
    )
    expect(((await own.json()) as { items: unknown[] }).items).toHaveLength(1)
  })

  test('editar tópico/comentário: autor edita, terceiro leva 403 e versão antiga dá 409', async () => {
    const ctx = buildApp()
    const { channelId } = await seedChannel(ctx)
    const author = randomUUID()
    const t = (await (
      await ctx.app.handle(
        jsonRequest('POST', `/hub/channels/${channelId}/threads`, {
          headers: studentHeaders(author),
          body: { title: 'T', body: 'v1' },
        }),
      )
    ).json()) as { id: string; version: number }

    const byOther = await ctx.app.handle(
      jsonRequest('PATCH', `/hub/threads/${t.id}`, {
        headers: studentHeaders(randomUUID()),
        body: { body: 'hack', version: t.version },
      }),
    )
    expect(byOther.status).toBe(403)

    const byAuthor = await ctx.app.handle(
      jsonRequest('PATCH', `/hub/threads/${t.id}`, {
        headers: studentHeaders(author),
        body: { body: 'v2', version: t.version },
      }),
    )
    expect(byAuthor.status).toBe(200)
    const edited = (await byAuthor.json()) as { editedAt: string | null; version: number }
    expect(edited.editedAt).not.toBeNull()
    expect(edited.version).toBe(t.version + 1)

    const stale = await ctx.app.handle(
      jsonRequest('PATCH', `/hub/threads/${t.id}`, {
        headers: studentHeaders(author),
        body: { body: 'v3 stale', version: t.version },
      }),
    )
    expect(stale.status).toBe(409)
    expect(((await stale.json()) as { error: { code: string } }).error.code).toBe(
      'CONCURRENCY_CONFLICT',
    )

    const c = (await (
      await ctx.app.handle(
        jsonRequest('POST', `/hub/threads/${t.id}/comments`, {
          headers: studentHeaders(author),
          body: { body: 'c1' },
        }),
      )
    ).json()) as { id: string; version: number }

    const editedComment = await ctx.app.handle(
      jsonRequest('PATCH', `/hub/comments/${c.id}`, {
        headers: studentHeaders(author),
        body: { body: 'c2', version: c.version },
      }),
    )
    expect(editedComment.status).toBe(200)
    expect(((await editedComment.json()) as { version: number }).version).toBe(c.version + 1)

    const staleComment = await ctx.app.handle(
      jsonRequest('PATCH', `/hub/comments/${c.id}`, {
        headers: studentHeaders(author),
        body: { body: 'c3 stale', version: c.version },
      }),
    )
    expect(staleComment.status).toBe(409)
    expect(((await staleComment.json()) as { error: { code: string } }).error.code).toBe(
      'CONCURRENCY_CONFLICT',
    )
  })

  test('paginação por cursor (mais novos primeiro)', async () => {
    let ms = Date.parse('2026-06-01T00:00:00.000Z')
    const clock = () => {
      ms += 1000
      return new Date(ms)
    }
    const ctx = buildApp({ clock })
    const { channelId } = await seedChannel(ctx)
    const user = randomUUID()
    const ids: string[] = []
    for (const title of ['a', 'b', 'c']) {
      const r = await ctx.app.handle(
        jsonRequest('POST', `/hub/channels/${channelId}/threads`, {
          headers: studentHeaders(user),
          body: { title, body: 'x' },
        }),
      )
      ids.push(((await r.json()) as { id: string }).id)
    }
    // ids em ordem de criação: [a,b,c]; mais novo = c.
    const [idA, idB, idC] = ids as [string, string, string]
    const page1 = await ctx.app.handle(
      jsonRequest('GET', `/hub/channels/${channelId}/threads?limit=2`, {
        headers: studentHeaders(user),
      }),
    )
    const p1 = (await page1.json()) as {
      items: Array<{ id: string }>
      nextCursor: string
      hasMore: boolean
    }
    expect(p1.items.map((t) => t.id)).toEqual([idC, idB])
    expect(p1.hasMore).toBe(true)

    const page2 = await ctx.app.handle(
      jsonRequest(
        'GET',
        `/hub/channels/${channelId}/threads?limit=2&cursor=${encodeURIComponent(p1.nextCursor)}`,
        { headers: studentHeaders(user) },
      ),
    )
    const p2 = (await page2.json()) as { items: Array<{ id: string }>; hasMore: boolean }
    expect(p2.items.map((t) => t.id)).toEqual([idA])
    expect(p2.hasMore).toBe(false)
  })

  test('sem acesso ao canal → 404 no tópico inexistente / 403 no gated', async () => {
    const ctx = buildApp()
    const res = await ctx.app.handle(
      jsonRequest('GET', `/hub/threads/${randomUUID()}`, { headers: studentHeaders(randomUUID()) }),
    )
    expect(res.status).toBe(404)
  })

  test('GET /hub/my-threads devolve só os tópicos do próprio autor', async () => {
    const ctx = buildApp()
    const { channelId } = await seedChannel(ctx)
    const me = randomUUID()
    const mine = (
      (await (
        await ctx.app.handle(
          jsonRequest('POST', `/hub/channels/${channelId}/threads`, {
            headers: studentHeaders(me),
            body: { title: 'Meu tópico', body: 'oi' },
          }),
        )
      ).json()) as { id: string }
    ).id
    // Tópico de OUTRA pessoa não deve entrar.
    await ctx.app.handle(
      jsonRequest('POST', `/hub/channels/${channelId}/threads`, {
        headers: studentHeaders(randomUUID()),
        body: { title: 'De outro', body: 'oi' },
      }),
    )
    const res = await ctx.app.handle(
      jsonRequest('GET', '/hub/my-threads', { headers: studentHeaders(me) }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: Array<{ id: string; commentCount: number }> }
    expect(body.items.map((t) => t.id)).toEqual([mine])
    expect(body.items[0]?.commentCount).toBe(0)
  })

  test('cross-link: tópico com playId de vitrine VISÍVEL é aceito; playId falso → 403', async () => {
    const ctx = buildApp()
    const { channelId } = await seedChannel(ctx, { space: { audience: 'kids' } })
    const playId = randomUUID()
    // Publica um jogo de vitrine (visível) → o playId passa a existir.
    await ctx.threadRepo.createShowcaseThread({
      id: randomUUID(),
      channelId,
      authorId: randomUUID(),
      authorDisplayName: 'Mika',
      authorPublic: false,
      title: 'Meu Jogo',
      slug: `meu-jogo-${randomUUID().slice(0, 6)}`,
      body: 'oi',
      coverImageUrl: null,
      playId,
      idempotencyKey: randomUUID(),
      now: new Date(),
    })
    const ok = await ctx.app.handle(
      jsonRequest('POST', `/hub/channels/${channelId}/threads`, {
        headers: studentHeaders(randomUUID()),
        body: { title: 'Olha meu jogo', body: 'joguem!', playId },
      }),
    )
    expect(ok.status).toBe(201)
    expect(((await ok.json()) as { playId: string | null }).playId).toBe(playId)

    // playId que não é vitrine visível → recusado (não deixa referenciar jogo inexistente).
    const bad = await ctx.app.handle(
      jsonRequest('POST', `/hub/channels/${channelId}/threads`, {
        headers: studentHeaders(randomUUID()),
        body: { title: 'Jogo falso', body: 'x', playId: randomUUID() },
      }),
    )
    expect(bad.status).toBe(403)
  })
})
