import { beforeEach, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { AccessConfig } from '../../src/domain/access/access-config'
import { buildApp, jsonRequest, studentHeaders } from '../helpers'

const PUBLIC: AccessConfig = { visibility: 'public', courses: [], roles: [] }
const INTERNAL = 'showcase-internal-token-0001'

/** Cria o servidor do Mural (público no teste) + 1 canal staff_only (a parede). */
async function seedMural(ctx: ReturnType<typeof buildApp>) {
  const space = await ctx.repo.createSpace({
    slug: 'mural-dos-criadores',
    name: 'Mural dos Criadores',
    description: null,
    iconUrl: null,
    audience: 'kids',
    accessConfig: PUBLIC,
    requiresApproval: true,
    teaserWhenLocked: true,
    status: 'active',
  })
  const channel = await ctx.repo.createChannel(space.id, {
    slug: 'parede',
    name: 'Parede',
    topic: null,
    accessConfig: null,
    postingPolicy: 'staff_only',
    requiresApproval: null,
    status: 'active',
  })
  return { space, channel }
}

function showcaseBody(over: Record<string, unknown> = {}) {
  return {
    spaceSlug: 'mural-dos-criadores',
    authorDisplayName: 'Sofia',
    title: 'Meu joguinho',
    summary: 'Um jogo de plataforma com a faísca pulando.',
    coverImageUrl: 'https://cdn.example.com/capa.png',
    idempotencyKey: 'perfil-1:curso-1:cadeia-1',
    ...over,
  }
}

describe('vitrine (Mural dos Criadores)', () => {
  let ctx: ReturnType<typeof buildApp>
  beforeEach(async () => {
    ctx = buildApp({ internalToken: INTERNAL })
    await seedMural(ctx)
  })

  const child = (id: string) => studentHeaders(id, { 'x-internal-token': INTERNAL })

  test('auto-publica o projeto: visível na hora, com autor e capa', async () => {
    const res = await ctx.app.handle(
      jsonRequest('POST', '/hub/internal/showcase-thread', {
        headers: child(randomUUID()),
        body: showcaseBody(),
      }),
    )
    expect(res.status).toBe(200)
    const { thread, deduped } = (await res.json()) as {
      thread: {
        isShowcase: boolean
        authorDisplayName: string
        coverImageUrl: string
        status: string
        pending: boolean
        title: string
      }
      deduped: boolean
    }
    expect(deduped).toBe(false)
    expect(thread.isShowcase).toBe(true)
    expect(thread.authorDisplayName).toBe('Sofia')
    expect(thread.coverImageUrl).toBe('https://cdn.example.com/capa.png')
    expect(thread.status).toBe('visible')
    expect(thread.pending).toBe(false)
  })

  test('idempotente: re-publicar a mesma cadeia devolve o post existente', async () => {
    const headers = child(randomUUID())
    const first = (await (
      await ctx.app.handle(
        jsonRequest('POST', '/hub/internal/showcase-thread', { headers, body: showcaseBody() }),
      )
    ).json()) as { thread: { id: string } }
    const second = (await (
      await ctx.app.handle(
        jsonRequest('POST', '/hub/internal/showcase-thread', { headers, body: showcaseBody() }),
      )
    ).json()) as { thread: { id: string }; deduped: boolean }
    expect(second.deduped).toBe(true)
    expect(second.thread.id).toBe(first.thread.id)
  })

  test('canal staff_only barra post normal da criança, mas a vitrine passa', async () => {
    // O canal já foi semeado no beforeEach; pega o id pela leitura.
    const sp = await ctx.repo.findActiveSpaceBySlug('mural-dos-criadores')
    const channels = await ctx.repo.listActiveChannels(sp!.id)
    const channelId = channels[0]?.id as string
    // Criança tentando abrir tópico normal no canal staff_only → 403.
    const denied = await ctx.app.handle(
      jsonRequest('POST', `/hub/channels/${channelId}/threads`, {
        headers: child(randomUUID()),
        body: { title: 'Oi', body: 'Posso postar?' },
      }),
    )
    expect(denied.status).toBe(403)
    // Mas a auto-publicação da vitrine cria o post mesmo assim.
    const ok = await ctx.app.handle(
      jsonRequest('POST', '/hub/internal/showcase-thread', {
        headers: child(randomUUID()),
        body: showcaseBody({ idempotencyKey: 'perfil-2:curso-1:cadeia-1' }),
      }),
    )
    expect(ok.status).toBe(200)
  })

  test('recusa publicar em servidor ADULTO (defesa em profundidade)', async () => {
    // A rota é alcançável por qualquer conta ativa na borda; o hub barra spaces não-kids.
    await ctx.repo.createSpace({
      slug: 'forum-adulto',
      name: 'Fórum',
      description: null,
      iconUrl: null,
      audience: 'adult',
      accessConfig: PUBLIC,
      requiresApproval: false,
      teaserWhenLocked: false,
      status: 'active',
    })
    const res = await ctx.app.handle(
      jsonRequest('POST', '/hub/internal/showcase-thread', {
        headers: child(randomUUID()),
        body: showcaseBody({ spaceSlug: 'forum-adulto', idempotencyKey: 'perfil:curso:adulto' }),
      }),
    )
    expect(res.status).toBe(403)
  })

  test('recusa publicar em canal de postagem livre (não staff_only)', async () => {
    const sp = await ctx.repo.createSpace({
      slug: 'mural-aberto',
      name: 'Aberto',
      description: null,
      iconUrl: null,
      audience: 'kids',
      accessConfig: PUBLIC,
      requiresApproval: true,
      teaserWhenLocked: false,
      status: 'active',
    })
    await ctx.repo.createChannel(sp.id, {
      slug: 'geral',
      name: 'Geral',
      topic: null,
      accessConfig: null,
      postingPolicy: 'members',
      requiresApproval: null,
      status: 'active',
    })
    const res = await ctx.app.handle(
      jsonRequest('POST', '/hub/internal/showcase-thread', {
        headers: child(randomUUID()),
        body: showcaseBody({ spaceSlug: 'mural-aberto', idempotencyKey: 'perfil:curso:aberto' }),
      }),
    )
    expect(res.status).toBe(403)
  })

  test('sem x-internal-token → 401 (chamada interna)', async () => {
    const res = await ctx.app.handle(
      jsonRequest('POST', '/hub/internal/showcase-thread', {
        headers: studentHeaders(randomUUID()),
        body: showcaseBody({ idempotencyKey: 'perfil-3:curso-1:cadeia-1' }),
      }),
    )
    expect(res.status).toBe(401)
  })
})
