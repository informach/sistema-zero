import { beforeEach, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { canonicalHmacMessage, signHmac } from '@sistemazero/core/security'
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
    // E notificou o members (nível do aluno) com o curso autoritativo da elegibilidade.
    expect(ctx.members.showcaseNotifications.length).toBe(1)
    expect(ctx.members.showcaseNotifications[0]).toMatchObject({
      courseId: 'curso-1',
      audience: 'kids',
    })
  })

  test('projeto NÃO elegível → não publica nem notifica o nível do aluno', async () => {
    ctx.members.showcaseEligibility = { ...ctx.members.showcaseEligibility, eligible: false }
    const res = await ctx.app.handle(
      jsonRequest('POST', '/hub/internal/showcase-thread', {
        headers: child(randomUUID()),
        body: showcaseBody(),
      }),
    )
    expect(res.status).toBe(403)
    expect(ctx.members.showcaseNotifications.length).toBe(0)
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

  test('publica no canal parede mesmo quando outro canal vem antes na ordenação', async () => {
    const sp = await ctx.repo.findActiveSpaceBySlug('mural-dos-criadores')
    const extra = await ctx.repo.createChannel(sp!.id, {
      slug: 'avisos',
      name: 'Avisos',
      topic: null,
      accessConfig: null,
      postingPolicy: 'staff_only',
      requiresApproval: null,
      status: 'active',
    })
    const storedExtra = ctx.repo.channels.find((c) => c.id === extra.id)
    if (storedExtra) storedExtra.sortOrder = -1
    const parede = ctx.repo.channels.find((c) => c.spaceId === sp!.id && c.slug === 'parede')
    if (!parede) throw new Error('canal parede ausente no teste')

    const res = await ctx.app.handle(
      jsonRequest('POST', '/hub/internal/showcase-thread', {
        headers: child(randomUUID()),
        body: showcaseBody(),
      }),
    )
    expect(res.status).toBe(200)
    const { thread } = (await res.json()) as { thread: { channelId: string } }
    expect(thread.channelId).toBe(parede.id)
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
      slug: 'parede',
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
        headers: studentHeaders(randomUUID(), { 'x-internal-token': '' }),
        body: showcaseBody(),
      }),
    )
    expect(res.status).toBe(401)
  })

  test('projetos AVULSOS (sem cadeia) do mesmo curso NÃO colidem na idempotência', async () => {
    // Sem `chain` a chave caía em `autor:curso:` → 2 projetos avulsos do mesmo curso
    // colidiam e o 2º sumia. Agora o blockId desambigua.
    ctx.members.showcaseEligibility = { ...ctx.members.showcaseEligibility, chain: null }
    const headers = child(randomUUID())
    const blockA = '33333333-3333-3333-3333-333333333333'
    const blockB = '44444444-4444-4444-4444-444444444444'
    const pub = (blockId: string) =>
      ctx.app
        .handle(
          jsonRequest('POST', '/hub/internal/showcase-thread', {
            headers,
            body: showcaseBody({ blockId }),
          }),
        )
        .then((r) => r.json() as Promise<{ thread: { id: string }; deduped: boolean }>)

    const a = await pub(blockA)
    const b = await pub(blockB)
    const aAgain = await pub(blockA)

    expect(a.deduped).toBe(false)
    expect(b.deduped).toBe(false)
    expect(b.thread.id).not.toBe(a.thread.id) // dois projetos avulsos distintos
    expect(aAgain.deduped).toBe(true) // re-publicar o MESMO avulso ainda dedupe
    expect(aAgain.thread.id).toBe(a.thread.id)
  })

  test('capa padrão NÃO-https do members é descartada (parede infantil é HTTPS)', async () => {
    ctx.members.showcaseEligibility = {
      ...ctx.members.showcaseEligibility,
      defaultCoverUrl: 'http://inseguro.example.com/capa.png',
    }
    const res = await ctx.app.handle(
      jsonRequest('POST', '/hub/internal/showcase-thread', {
        headers: child(randomUUID()),
        body: showcaseBody({ coverImageUrl: null }),
      }),
    )
    expect(res.status).toBe(200)
    const { thread } = (await res.json()) as { thread: { coverImageUrl: string | null } }
    expect(thread.coverImageUrl).toBeNull()
  })

  // ── Variação KID-DRIVEN (botão "Compartilhar" do Estúdio) ──
  const studioBody = (over: Record<string, unknown> = {}) => ({
    spaceSlug: 'mural-dos-criadores',
    lessonId: LESSON_ID,
    blockId: BLOCK_ID,
    description: 'Um jogo de nave que desvia de asteroides.',
    coverImageUrl: 'https://cdn.example.com/capa.png',
    playId: randomUUID(),
    clientIdempotencyKey: randomUUID(),
    ...over,
  })

  test('studio: corpo = descrição da criança, título do members, playId persistido', async () => {
    const res = await ctx.app.handle(
      jsonRequest('POST', '/hub/internal/showcase-thread-studio', {
        headers: child(randomUUID()),
        body: studioBody({ playId: '55555555-5555-5555-5555-555555555555' }),
      }),
    )
    expect(res.status).toBe(200)
    const { thread, deduped } = (await res.json()) as {
      thread: {
        isShowcase: boolean
        title: string
        body: string
        authorDisplayName: string
        playId: string | null
        status: string
      }
      deduped: boolean
    }
    expect(deduped).toBe(false)
    expect(thread.isShowcase).toBe(true)
    // Descrição da criança vira o body; título continua autoritativo do members.
    expect(thread.body).toBe('Um jogo de nave que desvia de asteroides.')
    expect(thread.title).toBe('Meu joguinho')
    expect(thread.authorDisplayName).toBe('Sofia')
    expect(thread.playId).toBe('55555555-5555-5555-5555-555555555555')
    expect(thread.status).toBe('visible')
  })

  test('studio-play: só valida playId enquanto o post está visível', async () => {
    const playId = '55555555-5555-5555-5555-555555555555'
    const create = await ctx.app.handle(
      jsonRequest('POST', '/hub/internal/showcase-thread-studio', {
        headers: child(randomUUID()),
        body: studioBody({ playId }),
      }),
    )
    expect(create.status).toBe(200)

    const visible = await ctx.app.handle(
      jsonRequest('GET', `/hub/internal/studio-play/${playId}`, {
        headers: { 'x-internal-token': INTERNAL },
      }),
    )
    expect(visible.status).toBe(200)
    expect(await visible.json()).toEqual({ visible: true, authorDisplayName: 'Sofia' })

    const { thread } = (await create.json()) as { thread: { id: string } }
    ctx.threadRepo.threads = ctx.threadRepo.threads.map((t) =>
      t.id === thread.id ? { ...t, status: 'hidden' } : t,
    )

    const hidden = await ctx.app.handle(
      jsonRequest('GET', `/hub/internal/studio-play/${playId}`, {
        headers: { 'x-internal-token': INTERNAL },
      }),
    )
    expect(hidden.status).toBe(200)
    expect(await hidden.json()).toEqual({ visible: false, authorDisplayName: null })
  })

  test('studio: mesmo clientIdempotencyKey dedup-a; novo key = post NOVO (republicar)', async () => {
    const headers = child(randomUUID())
    const sameKey = randomUUID()
    const first = (await (
      await ctx.app.handle(
        jsonRequest('POST', '/hub/internal/showcase-thread-studio', {
          headers,
          body: studioBody({ clientIdempotencyKey: sameKey }),
        }),
      )
    ).json()) as { thread: { id: string }; deduped: boolean }
    const retry = (await (
      await ctx.app.handle(
        jsonRequest('POST', '/hub/internal/showcase-thread-studio', {
          headers,
          body: studioBody({ clientIdempotencyKey: sameKey }),
        }),
      )
    ).json()) as { thread: { id: string }; deduped: boolean }
    const republish = (await (
      await ctx.app.handle(
        jsonRequest('POST', '/hub/internal/showcase-thread-studio', {
          headers,
          body: studioBody({ clientIdempotencyKey: randomUUID() }),
        }),
      )
    ).json()) as { thread: { id: string }; deduped: boolean }
    expect(retry.deduped).toBe(true)
    expect(retry.thread.id).toBe(first.thread.id)
    expect(republish.deduped).toBe(false)
    expect(republish.thread.id).not.toBe(first.thread.id)
  })

  test('studio: projeto NÃO elegível → 403 (re-valida no members)', async () => {
    ctx.members.showcaseEligibility = { ...ctx.members.showcaseEligibility, eligible: false }
    const res = await ctx.app.handle(
      jsonRequest('POST', '/hub/internal/showcase-thread-studio', {
        headers: child(randomUUID()),
        body: studioBody(),
      }),
    )
    expect(res.status).toBe(403)
  })

  test('studio: sem x-internal-token → 401', async () => {
    const res = await ctx.app.handle(
      jsonRequest('POST', '/hub/internal/showcase-thread-studio', {
        headers: studentHeaders(randomUUID(), { 'x-internal-token': '' }),
        body: studioBody(),
      }),
    )
    expect(res.status).toBe(401)
  })

  test('com allowlist de parede: recusa space kids staff_only que NÃO é a parede', async () => {
    const gated = buildApp({ internalToken: INTERNAL, showcaseWallSlugs: ['mural-dos-criadores'] })
    await seedMural(gated)
    // Outra vitrine kids com canal staff_only — antes passaria pela heurística.
    const outra = await gated.repo.createSpace({
      slug: 'vitrine-curada',
      name: 'Vitrine curada',
      description: null,
      iconUrl: null,
      audience: 'kids',
      accessConfig: PUBLIC,
      requiresApproval: true,
      teaserWhenLocked: false,
      status: 'active',
    })
    await gated.repo.createChannel(outra.id, {
      slug: 'parede',
      name: 'Parede',
      topic: null,
      accessConfig: null,
      postingPolicy: 'staff_only',
      requiresApproval: null,
      status: 'active',
    })
    const denied = await gated.app.handle(
      jsonRequest('POST', '/hub/internal/showcase-thread', {
        headers: child(randomUUID()),
        body: showcaseBody({ spaceSlug: 'vitrine-curada' }),
      }),
    )
    expect(denied.status).toBe(403)
    // A parede designada segue passando.
    const ok = await gated.app.handle(
      jsonRequest('POST', '/hub/internal/showcase-thread', {
        headers: child(randomUUID()),
        body: showcaseBody(),
      }),
    )
    expect(ok.status).toBe(200)
  })

  // ── Estúdio COMPLETO (produto vendável, SEM aula) ──
  const standaloneBody = (over: Record<string, unknown> = {}) => ({
    spaceSlug: 'mural-dos-criadores',
    title: 'Meu jogo livre',
    description: 'Fiz no Estúdio Completo!',
    coverImageUrl: 'https://cdn.example.com/capa.png',
    playId: randomUUID(),
    clientIdempotencyKey: randomUUID(),
    ...over,
  })
  /** Concede o produto do Estúdio à conta (a elegibilidade do standalone é a posse). */
  const ownsStudio = (accountId: string) =>
    ctx.members.communitiesByUser.set(accountId, new Set(['estudio-completo']))

  test('standalone: com produto → publica título E descrição da criança + playId', async () => {
    const accountId = randomUUID()
    ownsStudio(accountId)
    const res = await ctx.app.handle(
      jsonRequest('POST', '/hub/internal/showcase-thread-studio-standalone', {
        headers: child(accountId),
        body: standaloneBody({ playId: '66666666-6666-6666-6666-666666666666' }),
      }),
    )
    expect(res.status).toBe(200)
    const { thread } = (await res.json()) as {
      thread: { isShowcase: boolean; title: string; body: string; playId: string | null }
    }
    expect(thread.isShowcase).toBe(true)
    // SEM aula → título E corpo vêm da criança (não há payload do members).
    expect(thread.title).toBe('Meu jogo livre')
    expect(thread.body).toBe('Fiz no Estúdio Completo!')
    expect(thread.playId).toBe('66666666-6666-6666-6666-666666666666')
  })

  test('standalone: SEM o produto → 403 (elegibilidade = posse, re-validada no hub)', async () => {
    const res = await ctx.app.handle(
      jsonRequest('POST', '/hub/internal/showcase-thread-studio-standalone', {
        headers: child(randomUUID()),
        body: standaloneBody(),
      }),
    )
    expect(res.status).toBe(403)
  })

  test('standalone: EQUIPE (privileged) publica SEM o produto — chave-mestra virtual p/ testar o Mural', async () => {
    // Ator com role de equipe (o gateway injeta; aqui simulamos) → `actor.privileged` →
    // bypass da posse do Estúdio. É como o admin testa a publicação sem comprar o produto.
    const staff = studentHeaders(randomUUID(), {
      'x-internal-token': INTERNAL,
      'x-auth-profile-name': 'Prof',
      'x-auth-user-role': 'admin',
    })
    const res = await ctx.app.handle(
      jsonRequest('POST', '/hub/internal/showcase-thread-studio-standalone', {
        headers: staff,
        body: standaloneBody(),
      }),
    )
    expect(res.status).toBe(200)
    const { thread } = (await res.json()) as { thread: { isShowcase: boolean } }
    expect(thread.isShowcase).toBe(true)
  })

  test('standalone: chave-mestra KIDS cobre a publicação', async () => {
    const accountId = randomUUID()
    ctx.members.mastersKids.add(accountId)
    const res = await ctx.app.handle(
      jsonRequest('POST', '/hub/internal/showcase-thread-studio-standalone', {
        headers: child(accountId),
        body: standaloneBody(),
      }),
    )
    expect(res.status).toBe(200)
  })

  test('standalone: mesmo clientKey dedup-a; key novo = post NOVO', async () => {
    const accountId = randomUUID()
    ownsStudio(accountId)
    const headers = child(accountId)
    const sameKey = randomUUID()
    const first = (await (
      await ctx.app.handle(
        jsonRequest('POST', '/hub/internal/showcase-thread-studio-standalone', {
          headers,
          body: standaloneBody({ clientIdempotencyKey: sameKey }),
        }),
      )
    ).json()) as { thread: { id: string }; deduped: boolean }
    const retry = (await (
      await ctx.app.handle(
        jsonRequest('POST', '/hub/internal/showcase-thread-studio-standalone', {
          headers,
          body: standaloneBody({ clientIdempotencyKey: sameKey }),
        }),
      )
    ).json()) as { thread: { id: string }; deduped: boolean }
    const republish = (await (
      await ctx.app.handle(
        jsonRequest('POST', '/hub/internal/showcase-thread-studio-standalone', {
          headers,
          body: standaloneBody({ clientIdempotencyKey: randomUUID() }),
        }),
      )
    ).json()) as { thread: { id: string }; deduped: boolean }
    expect(retry.deduped).toBe(true)
    expect(retry.thread.id).toBe(first.thread.id)
    expect(republish.deduped).toBe(false)
    expect(republish.thread.id).not.toBe(first.thread.id)
  })

  test('standalone: sem x-internal-token → 401', async () => {
    const res = await ctx.app.handle(
      jsonRequest('POST', '/hub/internal/showcase-thread-studio-standalone', {
        headers: studentHeaders(randomUUID(), { 'x-internal-token': '' }),
        body: standaloneBody(),
      }),
    )
    expect(res.status).toBe(401)
  })

  // ── Contador de jogadas + agregado da carreira (Fase 5, 07/2026) ──

  test('studio-play com count=1 conta a jogada; sem count só valida', async () => {
    const accountId = randomUUID()
    ownsStudio(accountId)
    const playId = '77777777-7777-7777-7777-777777777777'
    await ctx.app.handle(
      jsonRequest('POST', '/hub/internal/showcase-thread-studio-standalone', {
        headers: child(accountId),
        body: standaloneBody({ playId }),
      }),
    )
    const resolve = (qs = '') =>
      ctx.app.handle(
        jsonRequest('GET', `/hub/internal/studio-play/${playId}${qs}`, {
          headers: { 'x-internal-token': INTERNAL },
        }),
      )
    expect(await (await resolve('?count=1')).json()).toEqual({
      visible: true,
      authorDisplayName: 'Sofia',
    })
    expect(await (await resolve('?count=1')).json()).toEqual({
      visible: true,
      authorDisplayName: 'Sofia',
    })
    // Sem `count` (revalidações/refetches) NÃO infla o contador.
    expect(await (await resolve()).json()).toEqual({ visible: true, authorDisplayName: 'Sofia' })
    const t = ctx.threadRepo.threads.find((x) => x.playId === playId)
    expect(t?.playsCount).toBe(2)
  })

  // ── Desafio do MÊS (game jam — tag validada com drop silencioso) ──

  describe('desafio do mês (challengeKey no standalone)', () => {
    // Clock FIXO: 2026-06-15 12:00Z → mês civil de SP = 2026-06 → 'm:2026-06'.
    const NOW = new Date('2026-06-15T12:00:00.000Z')
    const MONTH = 'm:2026-06'

    const challengeCtx = async () => {
      const gated = buildApp({ internalToken: INTERNAL, clock: () => NOW })
      await seedMural(gated)
      return gated
    }
    const ownsBoth = (gated: Awaited<ReturnType<typeof challengeCtx>>, accountId: string) =>
      gated.members.communitiesByUser.set(
        accountId,
        new Set(['estudio-completo', 'clube-dos-criadores']),
      )
    const publish = (
      gated: Awaited<ReturnType<typeof challengeCtx>>,
      accountId: string,
      over: Record<string, unknown> = {},
    ) =>
      gated.app.handle(
        jsonRequest('POST', '/hub/internal/showcase-thread-studio-standalone', {
          headers: child(accountId),
          body: standaloneBody(over),
        }),
      )

    test('posse Clube+Estúdio + mês corrente → tag entra + notifica o members', async () => {
      const gated = await challengeCtx()
      const accountId = randomUUID()
      ownsBoth(gated, accountId)
      const res = await publish(gated, accountId, { challengeKey: MONTH })
      expect(res.status).toBe(200)
      const { thread } = (await res.json()) as { thread: { challengeKey: string | null } }
      expect(thread.challengeKey).toBe(MONTH)
      expect(gated.members.challengeNotifications).toMatchObject([
        { audience: 'kids', challengeKey: MONTH },
      ])
    })

    test('SEM o Clube: publica normal, mas a tag cai em silêncio (sem notificação)', async () => {
      const gated = await challengeCtx()
      const accountId = randomUUID()
      gated.members.communitiesByUser.set(accountId, new Set(['estudio-completo']))
      const res = await publish(gated, accountId, { challengeKey: MONTH })
      expect(res.status).toBe(200)
      const { thread } = (await res.json()) as { thread: { challengeKey: string | null } }
      expect(thread.challengeKey).toBeNull()
      expect(gated.members.challengeNotifications.length).toBe(0)
    })

    test('mês ERRADO/formato inválido: publica normal, tag cai em silêncio', async () => {
      const gated = await challengeCtx()
      const accountId = randomUUID()
      ownsBoth(gated, accountId)
      for (const bad of ['m:2026-05', 'lixo', 'm:26-06']) {
        const res = await publish(gated, accountId, { challengeKey: bad })
        expect(res.status).toBe(200)
        const { thread } = (await res.json()) as { thread: { challengeKey: string | null } }
        expect(thread.challengeKey).toBeNull()
      }
      expect(gated.members.challengeNotifications.length).toBe(0)
    })

    test('listagem com ?challenge= devolve SÓ os posts do desafio do mês', async () => {
      const gated = await challengeCtx()
      const accountId = randomUUID()
      ownsBoth(gated, accountId)
      await publish(gated, accountId, { challengeKey: MONTH })
      await publish(gated, accountId, {}) // post normal, sem tag
      const sp = await gated.repo.findActiveSpaceBySlug('mural-dos-criadores')
      const channels = await gated.repo.listActiveChannels(sp?.id ?? '')
      const channelId = channels[0]?.id as string
      const res = await gated.app.handle(
        jsonRequest('GET', `/hub/channels/${channelId}/threads?challenge=${MONTH}`, {
          headers: child(accountId),
        }),
      )
      expect(res.status).toBe(200)
      const page = (await res.json()) as { items: { challengeKey: string | null }[] }
      expect(page.items.length).toBe(1)
      expect(page.items[0]?.challengeKey).toBe(MONTH)
    })
  })

  // ── showcase-by-authors (S2S members→hub, HMAC — report dos pais) ──

  describe('showcase-by-authors (rota interna HMAC)', () => {
    const PATH = '/hub/internal/showcase-by-authors'
    const signedRequest = (bodyStr: string, secret = 'test-gateway-hmac-secret-0001') => {
      const ts = Math.floor(Date.now() / 1000)
      const sig = signHmac(
        secret,
        canonicalHmacMessage({ method: 'POST', path: PATH, body: bodyStr }),
        ts,
      )
      return new Request(`http://local${PATH}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-signature': `t=${ts},v1=${sig}` },
        body: bodyStr,
      })
    }

    test('devolve SÓ os posts dos autores pedidos na janela; sem HMAC → 401', async () => {
      const kidA = randomUUID()
      const kidB = randomUUID()
      for (const kid of [kidA, kidB]) {
        ctx.members.communitiesByUser.set(kid, new Set(['estudio-completo']))
        const res = await ctx.app.handle(
          jsonRequest('POST', '/hub/internal/showcase-thread-studio-standalone', {
            headers: child(kid),
            body: standaloneBody(),
          }),
        )
        expect(res.status).toBe(200)
      }

      const from = new Date(Date.now() - 3_600_000).toISOString()
      const to = new Date(Date.now() + 3_600_000).toISOString()
      const ok = await ctx.app.handle(
        signedRequest(JSON.stringify({ authorIds: [kidA], from, to })),
      )
      expect(ok.status).toBe(200)
      const { items } = (await ok.json()) as {
        items: { authorId: string; title: string; playId: string | null }[]
      }
      expect(items.length).toBe(1)
      expect(items[0]?.authorId).toBe(kidA)
      expect(items[0]?.playId).toBeTruthy()

      // Fora da janela → vazio.
      const past = await ctx.app.handle(
        signedRequest(
          JSON.stringify({
            authorIds: [kidA],
            from: new Date(Date.now() - 7_200_000).toISOString(),
            to: new Date(Date.now() - 3_600_000).toISOString(),
          }),
        ),
      )
      expect(((await past.json()) as { items: unknown[] }).items.length).toBe(0)

      // Assinatura errada → 401 (a rota NUNCA aceita chamada sem HMAC válido).
      const bad = await ctx.app.handle(
        signedRequest(JSON.stringify({ authorIds: [kidA], from, to }), 'segredo-errado-123456'),
      )
      expect(bad.status).toBe(401)
    })
  })

  // ── Retenção pós-cursos (07/2026): notify standalone + marcos de plays + play-check ──

  describe('gamificação do standalone (retenção pós-cursos)', () => {
    const flush = () => new Promise((r) => setTimeout(r, 0))

    test('publicar standalone NOTIFICA o members (marco + XP diário) com o playId', async () => {
      const accountId = randomUUID()
      ownsStudio(accountId)
      const playId = randomUUID()
      const res = await ctx.app.handle(
        jsonRequest('POST', '/hub/internal/showcase-thread-studio-standalone', {
          headers: child(accountId),
          body: standaloneBody({ playId }),
        }),
      )
      expect(res.status).toBe(200)
      await flush() // fire-and-forget (`void`) → espera o microtask do notify
      expect(ctx.members.standaloneShowcases.length).toBe(1)
      expect(ctx.members.standaloneShowcases[0]).toMatchObject({ playId, audience: 'kids' })
    })

    test('o hit que CRUZA 10 jogadas dispara o marco de plays (1× — nem antes, nem depois)', async () => {
      const accountId = randomUUID()
      ownsStudio(accountId)
      const playId = randomUUID()
      await ctx.app.handle(
        jsonRequest('POST', '/hub/internal/showcase-thread-studio-standalone', {
          headers: child(accountId),
          body: standaloneBody({ playId }),
        }),
      )
      const hit = () =>
        ctx.app.handle(
          jsonRequest('GET', `/hub/internal/studio-play/${playId}?count=1`, {
            headers: { 'x-internal-token': INTERNAL },
          }),
        )
      for (let i = 0; i < 9; i++) await hit()
      await flush()
      expect(ctx.members.playsMilestones.length).toBe(0)

      await hit() // 10º play → crossing exato
      await flush()
      expect(ctx.members.playsMilestones.length).toBe(1)
      expect(ctx.members.playsMilestones[0]).toMatchObject({ playId, milestone: 10 })

      await hit() // 11º → sem novo marco
      await flush()
      expect(ctx.members.playsMilestones.length).toBe(1)
    })

    test('play-check (S2S HMAC): visível → {visible, authorId}; oculto → false; sem HMAC → 401', async () => {
      const PATH = '/hub/internal/play-check'
      const signedPlayCheck = (bodyStr: string, secret = 'test-gateway-hmac-secret-0001') => {
        const ts = Math.floor(Date.now() / 1000)
        const sig = signHmac(
          secret,
          canonicalHmacMessage({ method: 'POST', path: PATH, body: bodyStr }),
          ts,
        )
        return new Request(`http://local${PATH}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-signature': `t=${ts},v1=${sig}` },
          body: bodyStr,
        })
      }

      const authorProfile = randomUUID()
      ctx.members.communitiesByUser.set(authorProfile, new Set(['estudio-completo']))
      const playId = randomUUID()
      const create = await ctx.app.handle(
        jsonRequest('POST', '/hub/internal/showcase-thread-studio-standalone', {
          headers: child(authorProfile),
          body: standaloneBody({ playId }),
        }),
      )
      expect(create.status).toBe(200)

      const ok = await ctx.app.handle(signedPlayCheck(JSON.stringify({ playId })))
      expect(ok.status).toBe(200)
      const body = (await ok.json()) as { visible: boolean; authorId: string | null }
      expect(body.visible).toBe(true)
      expect(body.authorId).toBe(authorProfile)

      // Oculta o post → play-check nega (e não vaza o autor).
      const { thread } = (await create.json()) as { thread: { id: string } }
      ctx.threadRepo.threads = ctx.threadRepo.threads.map((t) =>
        t.id === thread.id ? { ...t, status: 'hidden' } : t,
      )
      const hidden = await ctx.app.handle(signedPlayCheck(JSON.stringify({ playId })))
      expect(await hidden.json()).toEqual({ visible: false, authorId: null })

      // Assinatura errada → 401.
      const bad = await ctx.app.handle(
        signedPlayCheck(JSON.stringify({ playId }), 'segredo-errado-123456'),
      )
      expect(bad.status).toBe(401)
    })
  })

  test('my-showcase-stats agrega SÓ os posts visíveis do próprio autor', async () => {
    const accountId = randomUUID()
    ownsStudio(accountId)
    const headers = child(accountId)
    const p1 = randomUUID()
    const publish = (playId: string) =>
      ctx.app.handle(
        jsonRequest('POST', '/hub/internal/showcase-thread-studio-standalone', {
          headers,
          body: standaloneBody({ playId }),
        }),
      )
    await publish(p1)
    await publish(randomUUID())
    await ctx.app.handle(
      jsonRequest('GET', `/hub/internal/studio-play/${p1}?count=1`, {
        headers: { 'x-internal-token': INTERNAL },
      }),
    )
    const stats = await ctx.app.handle(jsonRequest('GET', '/hub/my-showcase-stats', { headers }))
    expect(stats.status).toBe(200)
    expect(await stats.json()).toEqual({ published: 2, plays: 1 })
    // Outro aluno NÃO vê os números de ninguém (agregado por autor).
    const other = await ctx.app.handle(
      jsonRequest('GET', '/hub/my-showcase-stats', { headers: child(randomUUID()) }),
    )
    expect(await other.json()).toEqual({ published: 0, plays: 0 })
  })
})
