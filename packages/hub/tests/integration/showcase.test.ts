import { beforeEach, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { AccessConfig } from '../../src/domain/access/access-config'
import { buildApp, jsonRequest, studentHeaders } from '../helpers'

const PUBLIC: AccessConfig = { visibility: 'public', courses: [], roles: [] }
const INTERNAL = 'showcase-internal-token-0001'
const LESSON_ID = '11111111-1111-1111-1111-111111111111'
const BLOCK_ID = '22222222-2222-2222-2222-222222222222'

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

// O corpo só diz QUAL projeto (lessonId/blockId) e a capa capturada. Título/resumo/
// nome/idempotência são resolvidos no hub (members S2S + header de perfil do gateway).
function showcaseBody(over: Record<string, unknown> = {}) {
  return {
    spaceSlug: 'mural-dos-criadores',
    lessonId: LESSON_ID,
    blockId: BLOCK_ID,
    coverImageUrl: 'https://cdn.example.com/capa.png',
    ...over,
  }
}

describe('vitrine (Mural dos Criadores)', () => {
  let ctx: ReturnType<typeof buildApp>
  beforeEach(async () => {
    ctx = buildApp({ internalToken: INTERNAL })
    await seedMural(ctx)
  })

  // Criança: token interno (gateway) + nome do PERFIL no header confiável (x-auth-profile-name).
  const child = (id: string) =>
    studentHeaders(id, { 'x-internal-token': INTERNAL, 'x-auth-profile-name': 'Sofia' })

  test('auto-publica o projeto: visível, autor do header de perfil, conteúdo do members', async () => {
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
    // Nome vem do header de perfil (gateway), NÃO do corpo.
    expect(thread.authorDisplayName).toBe('Sofia')
    // Título vem do members (autoritativo), não do corpo.
    expect(thread.title).toBe('Meu joguinho')
    // Capa capturada (corpo) prevalece sobre a padrão do members.
    expect(thread.coverImageUrl).toBe('https://cdn.example.com/capa.png')
    expect(thread.status).toBe('visible')
    expect(thread.pending).toBe(false)
    // O hub RE-VALIDOU a elegibilidade no members (acesso pela conta, entrega pelo perfil).
    expect(ctx.members.eligibilityCalls.length).toBe(1)
  })

  test('capa AUSENTE no corpo → cai na capa padrão do members', async () => {
    const res = await ctx.app.handle(
      jsonRequest('POST', '/hub/internal/showcase-thread', {
        headers: child(randomUUID()),
        body: showcaseBody({ coverImageUrl: null }),
      }),
    )
    expect(res.status).toBe(200)
    const { thread } = (await res.json()) as { thread: { coverImageUrl: string } }
    expect(thread.coverImageUrl).toBe('https://cdn.example.com/capa-padrao.png')
  })

  test('idempotente: mesma criança/projeto devolve o post existente', async () => {
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

  test('projeto NÃO elegível (não concluído) → 403 (o hub re-valida, não confia no corpo)', async () => {
    ctx.members.showcaseEligibility = { ...ctx.members.showcaseEligibility, eligible: false }
    const res = await ctx.app.handle(
      jsonRequest('POST', '/hub/internal/showcase-thread', {
        headers: child(randomUUID()),
        body: showcaseBody(),
      }),
    )
    expect(res.status).toBe(403)
  })

  test('canal staff_only barra post normal da criança, mas a vitrine passa', async () => {
    const sp = await ctx.repo.findActiveSpaceBySlug('mural-dos-criadores')
    const channels = await ctx.repo.listActiveChannels(sp!.id)
    const channelId = channels[0]?.id as string
    const denied = await ctx.app.handle(
      jsonRequest('POST', `/hub/channels/${channelId}/threads`, {
        headers: child(randomUUID()),
        body: { title: 'Oi', body: 'Posso postar?' },
      }),
    )
    expect(denied.status).toBe(403)
    const ok = await ctx.app.handle(
      jsonRequest('POST', '/hub/internal/showcase-thread', {
        headers: child(randomUUID()),
        body: showcaseBody(),
      }),
    )
    expect(ok.status).toBe(200)
  })

  test('recusa publicar em servidor ADULTO (defesa em profundidade)', async () => {
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
        body: showcaseBody({ spaceSlug: 'forum-adulto' }),
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
        body: showcaseBody({ spaceSlug: 'mural-aberto' }),
      }),
    )
    expect(res.status).toBe(403)
  })

  test('sem x-internal-token → 401 (chamada interna)', async () => {
    const res = await ctx.app.handle(
      jsonRequest('POST', '/hub/internal/showcase-thread', {
        headers: studentHeaders(randomUUID()),
        body: showcaseBody(),
      }),
    )
    expect(res.status).toBe(401)
  })
})
