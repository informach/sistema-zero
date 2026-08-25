import { beforeEach, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { canonicalHmacMessage, signHmac } from '@sistemazero/core/security'
import type { AccessConfig } from '../../src/domain/access/access-config'
import {
  adminHeaders,
  buildApp,
  jsonRequest,
  studentHeaders,
  TEST_INTERNAL_API_TOKEN,
  TEST_WEBHOOK_SECRET,
} from '../helpers'

const PUBLIC: AccessConfig = { visibility: 'public', courses: [], roles: [] }
const PATH = '/hub/internal/activity-by-authors'

/** Item da resposta (contrato consumido pelo members). */
interface ActivityItem {
  authorId: string
  clubThreads: number
  clubComments: number
  lastClubActivityAt: string | null
  showcasePublished: number
  showcasePlays: number
  lastShowcaseAt: string | null
}

describe('activity-by-authors (rota interna HMAC — uso por ferramenta)', () => {
  let ctx: ReturnType<typeof buildApp>
  /** Relógio injetado: cada passo do teste avança 1min p/ ordenar os createdAt. */
  let now: Date
  let clubChannelId: string

  const tick = () => {
    now = new Date(now.getTime() + 60_000)
  }

  beforeEach(async () => {
    now = new Date('2026-08-01T12:00:00.000Z')
    ctx = buildApp({ clock: () => now })
    // Clube: fórum de postagem livre SEM pré-moderação (conteúdo nasce `visible`);
    // o caso "pendente não conta / aprovar conta" tem um espaço próprio no teste.
    const club = await ctx.repo.createSpace({
      slug: 'clube-dos-criadores',
      name: 'Clube dos Criadores',
      description: null,
      iconUrl: null,
      audience: 'kids',
      accessConfig: PUBLIC,
      requiresApproval: false,
      teaserWhenLocked: false,
      status: 'active',
    })
    const geral = await ctx.repo.createChannel(club.id, {
      slug: 'geral',
      name: 'Geral',
      topic: null,
      accessConfig: null,
      postingPolicy: 'members',
      requiresApproval: null,
      status: 'active',
    })
    clubChannelId = geral.id
    // Mural: parede staff_only. SEM pré-moderação de propósito: o comentário da
    // criança num post de vitrine nasce `visible` — o teste prova que ele fica fora
    // do Clube POR CAUSA do tópico-pai vitrine, não por estar pendente.
    const mural = await ctx.repo.createSpace({
      slug: 'mural-dos-criadores',
      name: 'Mural dos Criadores',
      description: null,
      iconUrl: null,
      audience: 'kids',
      accessConfig: PUBLIC,
      requiresApproval: false,
      teaserWhenLocked: false,
      status: 'active',
    })
    await ctx.repo.createChannel(mural.id, {
      slug: 'parede',
      name: 'Parede',
      topic: null,
      accessConfig: null,
      postingPolicy: 'staff_only',
      requiresApproval: null,
      status: 'active',
    })
  })

  const child = (id: string) => studentHeaders(id, { 'x-auth-profile-name': 'Sofia' })

  const signedRequest = (bodyStr: string, secret = TEST_WEBHOOK_SECRET) => {
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

  const query = async (authorIds: string[]) => {
    const res = await ctx.app.handle(signedRequest(JSON.stringify({ authorIds })))
    expect(res.status).toBe(200)
    return ((await res.json()) as { items: ActivityItem[] }).items
  }

  /** Cria um tópico do Clube (nasce visível) e devolve o id. */
  const createClubThread = async (kid: string): Promise<string> => {
    const res = await ctx.app.handle(
      jsonRequest('POST', `/hub/channels/${clubChannelId}/threads`, {
        headers: child(kid),
        body: { title: `Tópico ${randomUUID().slice(0, 8)}`, body: 'Alguém joga comigo?' },
      }),
    )
    expect(res.status).toBe(201)
    return ((await res.json()) as { id: string }).id
  }

  const createComment = async (kid: string, threadId: string) => {
    const res = await ctx.app.handle(
      jsonRequest('POST', `/hub/threads/${threadId}/comments`, {
        headers: child(kid),
        body: { body: 'Eu jogo!' },
      }),
    )
    expect(res.status).toBe(201)
    return ((await res.json()) as { id: string }).id
  }

  /** Publica uma vitrine standalone no Mural (posse do Estúdio via fake) e devolve o thread id. */
  const publishShowcase = async (kid: string, playId: string): Promise<string> => {
    ctx.members.communitiesByUser.set(kid, new Set(['estudio-completo']))
    const res = await ctx.app.handle(
      jsonRequest('POST', '/hub/internal/showcase-thread-studio-standalone', {
        headers: child(kid),
        body: {
          spaceSlug: 'mural-dos-criadores',
          title: 'Meu jogo livre',
          description: 'Fiz no Estúdio Completo!',
          coverImageUrl: 'https://cdn.example.com/capa.png',
          playId,
          clientIdempotencyKey: randomUUID(),
        },
      }),
    )
    expect(res.status).toBe(200)
    return ((await res.json()) as { thread: { id: string } }).thread.id
  }

  const hitPlay = async (playId: string) => {
    const res = await ctx.app.handle(
      jsonRequest('GET', `/hub/internal/studio-play/${playId}?count=1`, {
        headers: { 'x-internal-token': TEST_INTERNAL_API_TOKEN },
      }),
    )
    expect(res.status).toBe(200)
  }

  test('agrega Clube × Mural por autor; TODO id pedido volta (sem atividade → zeros/nulls)', async () => {
    const kidA = randomUUID()
    const kidB = randomUUID()

    await createClubThread(kidA)
    tick()
    const t2 = await createClubThread(kidA)
    tick()
    const commentAt = now.toISOString()
    await createComment(kidA, t2)
    tick()
    const showcaseAt = now.toISOString()
    const playId = randomUUID()
    await publishShowcase(kidA, playId)
    await hitPlay(playId)
    await hitPlay(playId)

    const items = await query([kidA, kidB])
    expect(items.length).toBe(2)
    // Ordem = a pedida; kidA com os agregados dos DOIS mundos.
    expect(items[0]).toEqual({
      authorId: kidA,
      clubThreads: 2,
      clubComments: 1,
      // O comentário é o item do Clube mais novo (threads vieram antes).
      lastClubActivityAt: commentAt,
      showcasePublished: 1,
      showcasePlays: 2,
      lastShowcaseAt: showcaseAt,
    })
    // Sem atividade → zeros e nulls (o id NUNCA some da resposta).
    expect(items[1]).toEqual({
      authorId: kidB,
      clubThreads: 0,
      clubComments: 0,
      lastClubActivityAt: null,
      showcasePublished: 0,
      showcasePlays: 0,
      lastShowcaseAt: null,
    })
  })

  test('comentário em post de VITRINE não conta como Clube (nem vira vitrine do comentarista)', async () => {
    const author = randomUUID()
    const commenter = randomUUID()
    const showcaseThreadId = await publishShowcase(author, randomUUID())
    tick()
    const commentId = await createComment(commenter, showcaseThreadId)
    // Sanidade: o comentário nasceu VISÍVEL (a exclusão abaixo é pelo pai-vitrine,
    // não por moderação pendente).
    expect(ctx.threadRepo.comments.find((c) => c.id === commentId)?.status).toBe('visible')

    const [item] = await query([commenter])
    expect(item).toEqual({
      authorId: commenter,
      clubThreads: 0,
      clubComments: 0,
      lastClubActivityAt: null,
      showcasePublished: 0,
      showcasePlays: 0,
      lastShowcaseAt: null,
    })
  })

  test('comentário visível deixa de contar quando o tópico pai do Clube é ocultado', async () => {
    const author = randomUUID()
    const commenter = randomUUID()
    const threadId = await createClubThread(author)
    await createComment(commenter, threadId)

    let [item] = await query([commenter])
    expect(item?.clubComments).toBe(1)

    const hidden = await ctx.app.handle(
      jsonRequest('POST', `/hub/admin/threads/${threadId}/hide`, { headers: adminHeaders() }),
    )
    expect(hidden.status).toBe(200)

    ;[item] = await query([commenter])
    expect(item?.clubComments).toBe(0)
    expect(item?.lastClubActivityAt).toBeNull()
  })

  test('só conteúdo APROVADO conta (mesma régua do XP): pendente fora; aprovar passa a contar; vitrine oculta sai', async () => {
    // Espaço do Clube COM pré-moderação: o tópico da criança nasce `pending`.
    const moderated = await ctx.repo.createSpace({
      slug: 'clube-moderado',
      name: 'Clube Moderado',
      description: null,
      iconUrl: null,
      audience: 'kids',
      accessConfig: PUBLIC,
      requiresApproval: true,
      teaserWhenLocked: false,
      status: 'active',
    })
    const channel = await ctx.repo.createChannel(moderated.id, {
      slug: 'geral',
      name: 'Geral',
      topic: null,
      accessConfig: null,
      postingPolicy: 'members',
      requiresApproval: null,
      status: 'active',
    })
    const kid = randomUUID()
    const res = await ctx.app.handle(
      jsonRequest('POST', `/hub/channels/${channel.id}/threads`, {
        headers: child(kid),
        body: { title: 'Aguardando', body: 'Ainda pendente' },
      }),
    )
    expect(res.status).toBe(201)
    const threadId = ((await res.json()) as { id: string }).id

    let [item] = await query([kid])
    expect(item?.clubThreads).toBe(0)
    expect(item?.lastClubActivityAt).toBeNull()

    // Aprovado (visible) → passa a contar.
    const approve = await ctx.app.handle(
      jsonRequest('POST', `/hub/admin/threads/${threadId}/approve`, { headers: adminHeaders() }),
    )
    expect(approve.status).toBe(200)
    ;[item] = await query([kid])
    expect(item?.clubThreads).toBe(1)
    expect(item?.lastClubActivityAt).not.toBeNull()

    // Vitrine OCULTA também sai da conta do Mural.
    const showcaseThreadId = await publishShowcase(kid, randomUUID())
    ;[item] = await query([kid])
    expect(item?.showcasePublished).toBe(1)
    ctx.threadRepo.threads = ctx.threadRepo.threads.map((t) =>
      t.id === showcaseThreadId ? { ...t, status: 'hidden' } : t,
    )
    ;[item] = await query([kid])
    expect(item?.showcasePublished).toBe(0)
    expect(item?.lastShowcaseAt).toBeNull()
  })

  test('authorIds duplicados: dedupe interno — UM item por id distinto', async () => {
    const kid = randomUUID()
    await createClubThread(kid)
    const other = randomUUID()
    const items = await query([kid, kid, other])
    expect(items.length).toBe(2)
    expect(items[0]?.authorId).toBe(kid)
    expect(items[0]?.clubThreads).toBe(1)
    expect(items[1]?.authorId).toBe(other)
  })

  test('sem HMAC → 401 ANTES da validação do corpo; segredo errado → 401; corpo inválido com HMAC → 400', async () => {
    // Sem assinatura + corpo INVÁLIDO: a autenticação vem primeiro (401, nunca 400).
    const unsigned = await ctx.app.handle(jsonRequest('POST', PATH, { body: {} }))
    expect(unsigned.status).toBe(401)

    // Assinado com o segredo ERRADO → 401.
    const bad = await ctx.app.handle(
      signedRequest(JSON.stringify({ authorIds: [randomUUID()] }), 'segredo-errado-123456'),
    )
    expect(bad.status).toBe(401)

    // HMAC válido, corpo fora do contrato → validação (lista vazia, teto 50, uuid lixo).
    const empty = await ctx.app.handle(signedRequest(JSON.stringify({ authorIds: [] })))
    expect(empty.status).toBe(400)
    const tooMany = await ctx.app.handle(
      signedRequest(JSON.stringify({ authorIds: Array.from({ length: 51 }, () => randomUUID()) })),
    )
    expect(tooMany.status).toBe(400)
    const junk = await ctx.app.handle(signedRequest(JSON.stringify({ authorIds: ['nao-e-uuid'] })))
    expect(junk.status).toBe(400)
  })
})
