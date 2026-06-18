import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { AccessConfig } from '../../src/domain/access/access-config'
import type {
  ChannelFields,
  SpaceFields,
} from '../../src/domain/ports/community-admin-repository.port'
import { adminHeaders, buildApp, jsonRequest, studentHeaders } from '../helpers'

const PUBLIC: AccessConfig = { visibility: 'public', courses: [], roles: [] }

async function seed(
  ctx: ReturnType<typeof buildApp>,
  over: { space?: Partial<SpaceFields>; channel?: Partial<ChannelFields> } = {},
) {
  const space = await ctx.repo.createSpace({
    slug: `s-${randomUUID().slice(0, 6)}`,
    name: 'S',
    description: null,
    iconUrl: null,
    audience: 'adult',
    accessConfig: PUBLIC,
    requiresApproval: false,
    teaserWhenLocked: false,
    status: 'active',
    ...over.space,
  })
  const channel = await ctx.repo.createChannel(space.id, {
    slug: `c-${randomUUID().slice(0, 6)}`,
    name: 'C',
    topic: null,
    accessConfig: null,
    postingPolicy: 'members',
    requiresApproval: null,
    status: 'active',
    ...over.channel,
  })
  return { spaceId: space.id, spaceSlug: space.slug, channelId: channel.id }
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

describe('moderação', () => {
  test('aprovação: pendente do kid aparece após aprovar', async () => {
    const ctx = buildApp()
    const { spaceId, channelId } = await seed(ctx, {
      space: { audience: 'kids', requiresApproval: true },
    })
    const kid = randomUUID()
    const threadId = (
      (await (await postThread(ctx, channelId, studentHeaders(kid))).json()) as {
        id: string
      }
    ).id

    const pending = (await (
      await ctx.app.handle(
        jsonRequest('GET', `/hub/admin/pending?spaceId=${spaceId}`, { headers: adminHeaders() }),
      )
    ).json()) as { items: Array<{ id: string; type: string }>; total: number }
    expect(pending.total).toBe(1)
    expect(pending.items[0]).toMatchObject({ id: threadId, type: 'thread' })

    const approve = await ctx.app.handle(
      jsonRequest('POST', `/hub/admin/threads/${threadId}/approve`, { headers: adminHeaders() }),
    )
    expect(approve.status).toBe(200)

    const others = (await (
      await ctx.app.handle(
        jsonRequest('GET', `/hub/channels/${channelId}/threads`, {
          headers: studentHeaders(randomUUID()),
        }),
      )
    ).json()) as { items: unknown[] }
    expect(others.items).toHaveLength(1)
  })

  test('denúncia + resolver', async () => {
    const ctx = buildApp()
    const { spaceId, channelId } = await seed(ctx)
    const threadId = (
      (await (await postThread(ctx, channelId, studentHeaders(randomUUID()))).json()) as {
        id: string
      }
    ).id

    const report = await ctx.app.handle(
      jsonRequest('POST', `/hub/threads/${threadId}/report`, {
        headers: studentHeaders(randomUUID()),
        body: { reason: 'spam' },
      }),
    )
    expect(report.status).toBe(200)

    const list = (await (
      await ctx.app.handle(
        jsonRequest('GET', `/hub/admin/reports?spaceId=${spaceId}&status=open`, {
          headers: adminHeaders(),
        }),
      )
    ).json()) as { items: Array<{ id: string }>; total: number }
    expect(list.total).toBe(1)

    const resolved = await ctx.app.handle(
      jsonRequest('POST', `/hub/admin/reports/${list.items[0]?.id}/resolve`, {
        headers: adminHeaders(),
        body: { action: 'resolve' },
      }),
    )
    expect(resolved.status).toBe(200)
  })

  test('ocultar tópico some da listagem do aluno', async () => {
    const ctx = buildApp()
    const { channelId } = await seed(ctx)
    const threadId = (
      (await (await postThread(ctx, channelId, studentHeaders(randomUUID()))).json()) as {
        id: string
      }
    ).id
    await ctx.app.handle(
      jsonRequest('POST', `/hub/admin/threads/${threadId}/hide`, { headers: adminHeaders() }),
    )
    const list = (await (
      await ctx.app.handle(
        jsonRequest('GET', `/hub/channels/${channelId}/threads`, {
          headers: studentHeaders(randomUUID()),
        }),
      )
    ).json()) as { items: unknown[] }
    expect(list.items).toHaveLength(0)
  })

  test('trancar tópico bloqueia comentário do aluno', async () => {
    const ctx = buildApp()
    const { channelId } = await seed(ctx)
    const threadId = (
      (await (await postThread(ctx, channelId, studentHeaders(randomUUID()))).json()) as {
        id: string
      }
    ).id
    await ctx.app.handle(
      jsonRequest('POST', `/hub/admin/threads/${threadId}/lock`, { headers: adminHeaders() }),
    )
    const comment = await ctx.app.handle(
      jsonRequest('POST', `/hub/threads/${threadId}/comments`, {
        headers: studentHeaders(randomUUID()),
        body: { body: 'oi' },
      }),
    )
    expect(comment.status).toBe(403)
  })

  test('silenciar bloqueia post mas permite reagir; banir bloqueia ambos; unmute libera', async () => {
    const ctx = buildApp()
    const { spaceId, channelId } = await seed(ctx)
    const user = randomUUID()
    const threadId = (
      (await (await postThread(ctx, channelId, studentHeaders(randomUUID()))).json()) as {
        id: string
      }
    ).id

    // mute
    await ctx.app.handle(
      jsonRequest('POST', '/hub/admin/mutes', {
        headers: adminHeaders(),
        body: { userId: user, spaceId },
      }),
    )
    const mutedPost = await postThread(ctx, channelId, studentHeaders(user))
    expect(mutedPost.status).toBe(403)
    const mutedReact = await ctx.app.handle(
      jsonRequest('POST', `/hub/threads/${threadId}/reactions`, {
        headers: studentHeaders(user),
        body: { emoji: '👍' },
      }),
    )
    expect(mutedReact.status).toBe(200) // silenciado ainda reage

    // unmute → posta de novo
    await ctx.app.handle(
      jsonRequest('POST', '/hub/admin/mutes/remove', {
        headers: adminHeaders(),
        body: { userId: user, spaceId },
      }),
    )
    expect((await postThread(ctx, channelId, studentHeaders(user))).status).toBe(201)

    // ban → nem posta nem reage
    const banned = randomUUID()
    await ctx.app.handle(
      jsonRequest('POST', '/hub/admin/bans', {
        headers: adminHeaders(),
        body: { userId: banned, spaceId },
      }),
    )
    expect((await postThread(ctx, channelId, studentHeaders(banned))).status).toBe(403)
    const bannedReact = await ctx.app.handle(
      jsonRequest('POST', `/hub/threads/${threadId}/reactions`, {
        headers: studentHeaders(banned),
        body: { emoji: '👍' },
      }),
    )
    expect(bannedReact.status).toBe(403)
  })
})
