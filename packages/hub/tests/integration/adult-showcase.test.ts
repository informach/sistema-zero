import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { CREATOR_SHOWCASE_SLUGS } from '@sistemazero/core/creations'
import { canonicalHmacMessage, signHmac } from '@sistemazero/core/security'
import { z } from 'zod'
import {
  adminHeaders,
  buildApp,
  jsonRequest,
  publishStudioRequest,
  studentHeaders,
} from '../helpers'

async function setup(options: Parameters<typeof buildApp>[0] = {}) {
  const ctx = buildApp(options)
  for (const audience of ['kids', 'adult'] as const) {
    const space = await ctx.repo.createSpace({
      slug: CREATOR_SHOWCASE_SLUGS[audience],
      name: `Mostra ${audience}`,
      description: null,
      iconUrl: null,
      audience,
      accessConfig: { visibility: 'public', courses: [], roles: [] },
      requiresApproval: true,
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
const adultBody = () => ({
  spaceSlug: CREATOR_SHOWCASE_SLUGS.adult,
  lessonId: randomUUID(),
  blockId: randomUUID(),
  description: 'Um jogo criado com blocos.',
  playId: randomUUID(),
  clientIdempotencyKey: randomUUID(),
})

test('publicação de aula adulta valida curso, autor e parede adulta; tentativa cruzada não publica', async () => {
  const ctx = await setup()
  const userId = randomUUID()
  ctx.members.showcaseEligibility.audience = 'adult'
  const body = adultBody()
  const publish = (extraHeaders = {}, extraBody = {}) =>
    publishStudioRequest(
      ctx.app,
      jsonRequest('POST', '/hub/internal/showcase-thread-studio', {
        headers: studentHeaders(userId, extraHeaders),
        body: { ...body, ...extraBody },
      }),
    )
  expect(
    (await publish({ 'x-auth-account-id': randomUUID(), 'x-auth-profile-name': 'Criança' })).status,
  ).toBe(403)
  expect((await publish({ 'x-auth-kids-context': 'parent' })).status).toBe(403)
  expect((await publish({}, { spaceSlug: CREATOR_SHOWCASE_SLUGS.kids })).status).toBe(403)
  ctx.members.showcaseEligibility.audience = 'kids'
  expect((await publish()).status).toBe(403)
  expect(ctx.threadRepo.threads).toHaveLength(0)
  ctx.members.showcaseEligibility.audience = 'adult'
  expect((await publish({ 'x-auth-user-name': 'Ana Criadora' })).status).toBe(200)
  expect((await publish()).status).toBe(200)
  expect(ctx.threadRepo.threads).toHaveLength(1)
  expect(ctx.members.showcaseNotifications.every((event) => event.audience === 'adult')).toBe(true)
})

test('criação livre adulta exige licença e jornada adulta; jogo e marcos de plays ficam no público certo', async () => {
  const ctx = await setup()
  const userId = randomUUID()
  const body = { ...adultBody(), title: 'Minha nave' }
  const { lessonId: _lesson, blockId: _block, ...standalone } = body
  const publish = (studioMeta?: { pro: boolean; extensions: string[] }) =>
    publishStudioRequest(
      ctx.app,
      jsonRequest('POST', '/hub/internal/showcase-thread-studio-standalone', {
        headers: studentHeaders(userId),
        body: { ...standalone, studioMeta },
      }),
    )
  ctx.members.mastersKids.add(userId)
  expect((await publish()).status).toBe(403)
  ctx.members.grantsByUser.set(userId, new Set(['adult-estudio-completo']))
  expect((await publish()).status).toBe(403)
  ctx.members.adultCapabilities.set(userId, ['studio'])
  expect((await publish({ pro: true, extensions: [] })).status).toBe(403)
  expect((await publish()).status).toBe(200)
  expect((await publish()).status).toBe(200)
  expect(ctx.threadRepo.threads).toHaveLength(1)
  expect(ctx.members.standaloneShowcases.every((event) => event.audience === 'adult')).toBe(true)
  const play = (audience?: string) =>
    ctx.app.handle(
      new Request(
        `http://localhost/hub/internal/studio-play/${ctx.threadRepo.threads[0]?.playId}?count=1${audience ? `&audience=${audience}` : ''}`,
        { headers: studentHeaders(userId) },
      ),
    )
  const kidsRead = z.object({ visible: z.boolean() }).parse(await (await play()).json())
  expect(kidsRead.visible).toBe(false)
  expect(ctx.threadRepo.threads[0]?.playsCount).toBe(0)
  for (let i = 0; i < 10; i++) {
    const result = await (await play('adult')).json()
    expect(result).toMatchObject({ visible: true, audience: 'adult' })
  }
  expect(ctx.members.playsMilestones).toHaveLength(1)
  expect(ctx.members.playsMilestones[0]).toMatchObject({ audience: 'adult', milestone: 10, userId })
})

test('moderação adulta envia recado e limpeza ao contexto adulto, sem premiar a publicação duas vezes', async () => {
  const cleanup: {
    authorId: string
    playId: string
    coverUrl: string | null
    audience?: string
  }[] = []
  const ctx = await setup({
    studioArtifacts: {
      async cleanupShowcaseArtifacts(args) {
        cleanup.push(args)
        return true
      },
    },
  })
  const userId = randomUUID()
  ctx.members.grantsByUser.set(userId, new Set(['adult-estudio-completo']))
  ctx.members.adultCapabilities.set(userId, ['studio'])
  ctx.members.adultIdentities.set(userId, { displayName: 'Criador escolhido', publicEnabled: true })
  const body = {
    spaceSlug: CREATOR_SHOWCASE_SLUGS.adult,
    title: 'Meu jogo',
    description: 'Um jogo de blocos.',
    playId: randomUUID(),
    clientIdempotencyKey: randomUUID(),
  }
  const publication = await publishStudioRequest(
    ctx.app,
    jsonRequest('POST', '/hub/internal/showcase-thread-studio-standalone', {
      headers: studentHeaders(userId),
      body,
    }),
  )
  expect(publication.status).toBe(200)
  const thread = ctx.threadRepo.threads[0]
  if (!thread?.playId) throw new Error('Publicação ausente')
  expect(thread.authorDisplayName).toBe('Criador escolhido')
  expect(thread.authorPublic).toBe(true)
  expect(thread.authorAccountId).toBe(userId)
  expect(ctx.members.clubContributions).toHaveLength(0)
  expect(
    (
      await ctx.app.handle(
        jsonRequest('POST', `/hub/admin/threads/${thread.id}/hide`, {
          headers: adminHeaders(),
          body: { reason: 'Ajuste a capa.' },
        }),
      )
    ).status,
  ).toBe(200)
  expect(ctx.members.moderationMessages).toHaveLength(1)
  expect(ctx.members.moderationMessages[0]).toMatchObject({
    userId,
    accountId: userId,
    audience: 'adult',
    reason: 'Ajuste a capa.',
  })
  expect(cleanup).toHaveLength(0)
  expect(
    (
      await ctx.app.handle(
        jsonRequest('POST', `/hub/admin/threads/${thread.id}/delete`, { headers: adminHeaders() }),
      )
    ).status,
  ).toBe(200)
  expect(cleanup).toEqual([
    { authorId: userId, audience: 'adult', playId: thread.playId, coverUrl: null },
  ])
})

test('disponibilidade da mostra adulta exige HMAC e conta própria', async () => {
  const ctx = await setup()
  const path = '/hub/internal/adult-community-access'
  const userId = randomUUID()
  const ask = (accountId: string, signed = true) => {
    const body = JSON.stringify({ userId, accountId })
    const ts = Math.floor(Date.now() / 1000)
    const signature = signHmac(
      'test-gateway-hmac-secret-0001',
      canonicalHmacMessage({ method: 'POST', path, body }),
      ts,
    )
    return ctx.app.handle(
      new Request(`http://localhost${path}`, {
        method: 'POST',
        body,
        headers: {
          'content-type': 'application/json',
          ...(signed ? { 'x-signature': `t=${ts},v1=${signature}` } : {}),
        },
      }),
    )
  }
  expect((await ask(userId, false)).status).toBe(401)
  expect(await (await ask(userId)).json()).toEqual({ audience: 'adult', available: true })
  expect(await (await ask(randomUUID())).json()).toEqual({ audience: 'adult', available: false })
  const space = await ctx.repo.findActiveSpaceBySlug(CREATOR_SHOWCASE_SLUGS.adult)
  if (!space) throw new Error('Mostra ausente')
  await ctx.repo.updateSpace({ ...space, status: 'archived' })
  expect(await (await ask(userId)).json()).toEqual({ audience: 'adult', available: false })
})
