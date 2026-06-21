import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { AccessConfig } from '../../src/domain/access/access-config'
import type {
  ChannelFields,
  SpaceFields,
} from '../../src/domain/ports/community-admin-repository.port'
import {
  adminHeaders,
  buildApp,
  jsonRequest,
  studentHeaders,
  TEST_INTERNAL_API_TOKEN,
} from '../helpers'

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

async function seedSpace(ctx: ReturnType<typeof buildApp>, over: Partial<SpaceFields> = {}) {
  return ctx.repo.createSpace(spaceFields({ slug: `s-${randomUUID().slice(0, 6)}`, ...over }))
}
async function seedChannel(ctx: ReturnType<typeof buildApp>, spaceId: string) {
  return ctx.repo.createChannel(spaceId, channelFields({ slug: `c-${randomUUID().slice(0, 6)}` }))
}
const postThread = (
  ctx: ReturnType<typeof buildApp>,
  channelId: string,
  headers: Record<string, string>,
) =>
  ctx.app.handle(
    jsonRequest('POST', `/hub/channels/${channelId}/threads`, {
      headers,
      body: { title: 'T', body: 'corpo' },
    }),
  )

describe('endurecimento (achados do full review)', () => {
  // #1 — mute por CANAL não vaza para os outros canais do servidor.
  test('mute escopado a um canal não bloqueia outro canal; mute de servidor bloqueia ambos', async () => {
    const ctx = buildApp()
    const space = await seedSpace(ctx)
    const chA = await seedChannel(ctx, space.id)
    const chB = await seedChannel(ctx, space.id)
    const user = randomUUID()

    // Mute só no canal A.
    await ctx.app.handle(
      jsonRequest('POST', '/hub/admin/mutes', {
        headers: adminHeaders(),
        body: { userId: user, spaceId: space.id, channelId: chA.id },
      }),
    )
    expect((await postThread(ctx, chA.id, studentHeaders(user))).status).toBe(403)
    expect((await postThread(ctx, chB.id, studentHeaders(user))).status).toBe(201)

    // Mute do servidor inteiro (channelId ausente) → bloqueia o canal B também.
    await ctx.app.handle(
      jsonRequest('POST', '/hub/admin/mutes', {
        headers: adminHeaders(),
        body: { userId: user, spaceId: space.id },
      }),
    )
    expect((await postThread(ctx, chB.id, studentHeaders(user))).status).toBe(403)
  })

  // #11 — re-silenciar o mesmo escopo NÃO duplica linhas.
  test('mute repetido no mesmo escopo não acumula linhas ativas', async () => {
    const ctx = buildApp()
    const space = await seedSpace(ctx)
    const user = randomUUID()
    for (let i = 0; i < 3; i++) {
      await ctx.app.handle(
        jsonRequest('POST', '/hub/admin/mutes', {
          headers: adminHeaders(),
          body: { userId: user, spaceId: space.id },
        }),
      )
    }
    const list = (await (
      await ctx.app.handle(
        jsonRequest('GET', `/hub/admin/mutes-bans?spaceId=${space.id}`, {
          headers: adminHeaders(),
        }),
      )
    ).json()) as { items: unknown[] }
    expect(list.items).toHaveLength(1)
  })

  // #5 — header de status AUSENTE (não passou pela borda) → 403, não bypass.
  test('rota admin com x-auth-user-status ausente → 403', async () => {
    const ctx = buildApp({ requireAdmin: true })
    const res = await ctx.app.handle(
      jsonRequest('GET', '/hub/admin/spaces', {
        headers: {
          'content-type': 'application/json',
          'x-auth-user-id': randomUUID(),
          'x-auth-user-role': 'admin',
          'x-internal-token': TEST_INTERNAL_API_TOKEN,
          // sem x-auth-user-status
        },
      }),
    )
    expect(res.status).toBe(403)
  })

  // #6 — corpo acima do teto → 413 explícito (não 422 confuso).
  test('corpo acima do teto → 413', async () => {
    const ctx = buildApp()
    const space = await seedSpace(ctx)
    const channel = await seedChannel(ctx, space.id)
    const res = await ctx.app.handle(
      jsonRequest('POST', `/hub/channels/${channel.id}/threads`, {
        headers: studentHeaders(randomUUID()),
        body: { title: 'T', body: 'a'.repeat(70_000) }, // > 64KB no JSON
      }),
    )
    expect(res.status).toBe(413)
  })

  // #7 — storageRef fora do bucket de UGC → 400.
  test('register com storageRef sem prefixo r2ugc: → 400', async () => {
    const ctx = buildApp()
    const res = await ctx.app.handle(
      jsonRequest('POST', '/hub/attachments', {
        headers: studentHeaders(randomUUID()),
        body: {
          kind: 'image',
          mime: 'image/webp',
          sizeBytes: 1024,
          originalName: 'foto.webp',
          storageRef: 'http://evil/x',
        },
      }),
    )
    expect(res.status).toBe(400)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('VALIDATION_ERROR')
  })

  // #3 — anexo de tópico OCULTADO não é resolvível nem pelo autor.
  test('resolve de anexo em tópico oculto → 404 mesmo para o autor', async () => {
    const ctx = buildApp()
    const space = await seedSpace(ctx)
    const channel = await seedChannel(ctx, space.id)
    const author = randomUUID()
    const headers = studentHeaders(author)

    const reg = await ctx.app.handle(
      jsonRequest('POST', '/hub/attachments', {
        headers,
        body: {
          kind: 'image',
          mime: 'image/webp',
          sizeBytes: 1024,
          originalName: 'foto.webp',
          storageRef: `r2ugc:hub/${randomUUID()}`,
        },
      }),
    )
    const { id: attachmentId } = (await reg.json()) as { id: string }
    const thread = (await (
      await ctx.app.handle(
        jsonRequest('POST', `/hub/channels/${channel.id}/threads`, {
          headers,
          body: { title: 'T', body: 'b', attachmentIds: [attachmentId] },
        }),
      )
    ).json()) as { id: string }

    // Autor resolve enquanto visível.
    expect(
      (
        await ctx.app.handle(
          jsonRequest('GET', `/hub/attachments/${attachmentId}/resolve`, { headers }),
        )
      ).status,
    ).toBe(200)

    // Admin oculta o tópico → o anexo some até para o autor.
    await ctx.app.handle(
      jsonRequest('POST', `/hub/admin/threads/${thread.id}/hide`, { headers: adminHeaders() }),
    )
    expect(
      (
        await ctx.app.handle(
          jsonRequest('GET', `/hub/attachments/${attachmentId}/resolve`, { headers }),
        )
      ).status,
    ).toBe(404)
  })
})
