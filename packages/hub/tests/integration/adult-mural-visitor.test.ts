import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { CREATOR_SHOWCASE_SLUGS } from '@sistemazero/core/creations'
import type { AccessConfig } from '../../src/domain/access/access-config'
import { buildApp, jsonRequest, publishStudioRequest, studentHeaders } from '../helpers'

/**
 * Presente adulto (20/10/2026): depois dos 7 dias, a regra adulta é a do Kids. A conta fica com a
 * chave de visita `adult-mural-dos-criadores-visitante` (só leitura da Mostra adulta), o jogo
 * publicado continua na parede e o link público segue abrindo.
 */
const ADULT_FULL = 'adult-mural-dos-criadores'
const ADULT_VISITOR = 'adult-mural-dos-criadores-visitante'

function gated(ref: string): AccessConfig {
  return { visibility: 'community_gated', courses: [], communities: [ref], roles: [] }
}

async function setup() {
  const ctx = buildApp()
  for (const [audience, ref] of [
    ['kids', 'mural-dos-criadores'],
    ['adult', ADULT_FULL],
  ] as const) {
    const space = await ctx.repo.createSpace({
      slug: CREATOR_SHOWCASE_SLUGS[audience],
      name: `Mural ${audience}`,
      description: null,
      iconUrl: null,
      audience,
      accessConfig: gated(ref),
      requiresApproval: false,
      teaserWhenLocked: true,
      status: 'active',
    })
    await ctx.repo.createChannel(space.id, {
      slug: 'parede',
      name: 'Parede',
      topic: null,
      accessConfig: null,
      postingPolicy: 'staff_only',
      requiresApproval: null,
      status: 'active',
    })
  }
  return ctx
}

const detail = async (ctx: Awaited<ReturnType<typeof setup>>, slug: string, userId: string) => {
  const res = await ctx.app.handle(
    jsonRequest('GET', `/hub/spaces/${slug}`, { headers: studentHeaders(userId) }),
  )
  return { status: res.status, body: (await res.json()) as Record<string, unknown> }
}

test('visitante adulto lê a Mostra adulta sem interagir; a visita nunca cruza de público', async () => {
  const ctx = await setup()
  const visitor = randomUUID()
  ctx.members.communitiesByUser.set(visitor, new Set([ADULT_VISITOR]))

  const adult = await detail(ctx, CREATOR_SHOWCASE_SLUGS.adult, visitor)
  expect(adult.status).toBe(200)
  expect(adult.body).toMatchObject({ locked: false, canInteract: false })
  const list = await ctx.app.handle(
    jsonRequest('GET', '/hub/spaces?audience=adult', { headers: studentHeaders(visitor) }),
  )
  expect(((await list.json()) as { items: unknown[] }).items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ slug: CREATOR_SHOWCASE_SLUGS.adult, canInteract: false }),
    ]),
  )
  const channels = await ctx.app.handle(
    jsonRequest('GET', `/hub/spaces/${CREATOR_SHOWCASE_SLUGS.adult}/channels`, {
      headers: studentHeaders(visitor),
    }),
  )
  expect(channels.status).toBe(200)

  // A visita adulta não abre o Mural Kids, e a visita Kids não abre a Mostra adulta.
  expect((await detail(ctx, CREATOR_SHOWCASE_SLUGS.kids, visitor)).body).toMatchObject({
    locked: true,
  })
  const kidsVisitor = randomUUID()
  ctx.members.communitiesByUser.set(kidsVisitor, new Set(['mural-dos-criadores-visitante']))
  expect((await detail(ctx, CREATOR_SHOWCASE_SLUGS.adult, kidsVisitor)).body).toMatchObject({
    locked: true,
  })

  // O pleno adulto interage; o mesmo cadastro volta à leitura quando o pleno vence.
  ctx.members.communitiesByUser.set(visitor, new Set([ADULT_VISITOR, ADULT_FULL]))
  expect((await detail(ctx, CREATOR_SHOWCASE_SLUGS.adult, visitor)).body).toMatchObject({
    canInteract: true,
  })
  ctx.members.communitiesByUser.set(visitor, new Set([ADULT_VISITOR]))
  expect((await detail(ctx, CREATOR_SHOWCASE_SLUGS.adult, visitor)).body).toMatchObject({
    canInteract: false,
  })
})

test('presente adulto: publica durante o Mural pleno; depois dos 7 dias o jogo fica, o link abre e a conta só lê', async () => {
  const ctx = await setup()
  const userId = randomUUID()
  ctx.members.grantsByUser.set(userId, new Set(['adult-estudio-completo']))
  ctx.members.adultCapabilities.set(userId, ['studio'])
  ctx.members.communitiesByUser.set(userId, new Set([ADULT_FULL, ADULT_VISITOR]))
  const publish = () =>
    publishStudioRequest(
      ctx.app,
      jsonRequest('POST', '/hub/internal/showcase-thread-studio-standalone', {
        headers: studentHeaders(userId),
        body: {
          spaceSlug: CREATOR_SHOWCASE_SLUGS.adult,
          title: 'Meu jogo do presente',
          description: 'Feito no curso do presente.',
          playId: randomUUID(),
          clientIdempotencyKey: randomUUID(),
        },
      }),
    )
  expect((await publish()).status).toBe(200)
  const thread = ctx.threadRepo.threads[0]
  if (!thread?.playId) throw new Error('Publicação ausente')

  // Fim do presente: só a visita permanente sobra.
  ctx.members.communitiesByUser.set(userId, new Set([ADULT_VISITOR]))
  expect((await publish()).status).toBe(403)
  expect(ctx.threadRepo.threads).toHaveLength(1)

  const headers = studentHeaders(userId)
  const read = await ctx.app.handle(jsonRequest('GET', `/hub/threads/${thread.id}`, { headers }))
  expect(read.status).toBe(200)
  const comment = await ctx.app.handle(
    jsonRequest('POST', `/hub/threads/${thread.id}/comments`, {
      headers,
      body: { body: 'Ainda posso comentar?' },
    }),
  )
  expect(comment.status).toBe(403)
  const reaction = await ctx.app.handle(
    jsonRequest('POST', `/hub/threads/${thread.id}/reactions`, {
      headers,
      body: { emoji: '👍' },
    }),
  )
  expect(reaction.status).toBe(403)

  // Controle: o 403 vem da chave de visita, não da rota nem do canal. O pleno adulto comenta e reage.
  const member = randomUUID()
  ctx.members.communitiesByUser.set(member, new Set([ADULT_FULL]))
  const memberComment = await ctx.app.handle(
    jsonRequest('POST', `/hub/threads/${thread.id}/comments`, {
      headers: studentHeaders(member),
      body: { body: 'Adorei o jogo.' },
    }),
  )
  expect(memberComment.status).toBe(201)
  const memberReaction = await ctx.app.handle(
    jsonRequest('POST', `/hub/threads/${thread.id}/reactions`, {
      headers: studentHeaders(member),
      body: { emoji: '👍' },
    }),
  )
  expect(memberReaction.status).toBe(200)

  // O link público `/jogar/<playId>` não depende do acesso do autor.
  const play = await ctx.app.handle(
    new Request(`http://localhost/hub/internal/studio-play/${thread.playId}?audience=adult`, {
      headers: studentHeaders(randomUUID()),
    }),
  )
  expect(await play.json()).toMatchObject({ visible: true, audience: 'adult' })
})
