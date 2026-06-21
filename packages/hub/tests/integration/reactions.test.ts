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
const channelFields = (slug: string): ChannelFields => ({
  slug,
  name: slug,
  topic: null,
  accessConfig: null,
  postingPolicy: 'members',
  requiresApproval: null,
  status: 'active',
})

async function seed(ctx: ReturnType<typeof buildApp>, audience: 'adult' | 'kids' = 'adult') {
  const space = await ctx.repo.createSpace(
    spaceFields({ slug: `s-${randomUUID().slice(0, 6)}`, audience }),
  )
  const channel = await ctx.repo.createChannel(
    space.id,
    channelFields(`c-${randomUUID().slice(0, 6)}`),
  )
  return { spaceSlug: space.slug, channelId: channel.id }
}

async function createThread(
  ctx: ReturnType<typeof buildApp>,
  channelId: string,
  user: string,
): Promise<string> {
  const r = await ctx.app.handle(
    jsonRequest('POST', `/hub/channels/${channelId}/threads`, {
      headers: studentHeaders(user),
      body: { title: 'T', body: 'corpo' },
    }),
  )
  return ((await r.json()) as { id: string }).id
}

describe('reações', () => {
  test('reagir, contar por emoji, reactedByMe, idempotência e remover', async () => {
    const ctx = buildApp()
    const { channelId } = await seed(ctx)
    const author = randomUUID()
    const other = randomUUID()
    const threadId = await createThread(ctx, channelId, author)

    // author reage 👍 (duas vezes = idempotente)
    for (let i = 0; i < 2; i++) {
      const r = await ctx.app.handle(
        jsonRequest('POST', `/hub/threads/${threadId}/reactions`, {
          headers: studentHeaders(author),
          body: { emoji: '👍' },
        }),
      )
      expect(r.status).toBe(200)
    }
    // other reage 🎉
    await ctx.app.handle(
      jsonRequest('POST', `/hub/threads/${threadId}/reactions`, {
        headers: studentHeaders(other),
        body: { emoji: '🎉' },
      }),
    )

    const seenByAuthor = (await (
      await ctx.app.handle(
        jsonRequest('GET', `/hub/threads/${threadId}`, { headers: studentHeaders(author) }),
      )
    ).json()) as { reactions: Array<{ emoji: string; count: number; reactedByMe: boolean }> }
    const thumbs = seenByAuthor.reactions.find((r) => r.emoji === '👍')
    expect(thumbs).toEqual({ emoji: '👍', count: 1, reactedByMe: true })
    expect(seenByAuthor.reactions.find((r) => r.emoji === '🎉')?.reactedByMe).toBe(false)

    // remove 👍
    const del = await ctx.app.handle(
      jsonRequest('DELETE', `/hub/threads/${threadId}/reactions/${encodeURIComponent('👍')}`, {
        headers: studentHeaders(author),
      }),
    )
    expect(del.status).toBe(200)
    const after = (await (
      await ctx.app.handle(
        jsonRequest('GET', `/hub/threads/${threadId}`, { headers: studentHeaders(author) }),
      )
    ).json()) as { reactions: Array<{ emoji: string }> }
    expect(after.reactions.find((r) => r.emoji === '👍')).toBeUndefined()
  })

  test('kids: emoji fora da allowlist → 400; allowlist ok', async () => {
    const ctx = buildApp()
    const { channelId } = await seed(ctx, 'kids')
    // staff cria o tópico (kids comum cairia em pending, mas reagir independe disso)
    const threadId = await createThread(ctx, channelId, randomUUID())
    const kid = randomUUID()

    const bad = await ctx.app.handle(
      jsonRequest('POST', `/hub/threads/${threadId}/reactions`, {
        headers: studentHeaders(kid),
        body: { emoji: '🤬' },
      }),
    )
    expect(bad.status).toBe(400)

    const ok = await ctx.app.handle(
      jsonRequest('POST', `/hub/threads/${threadId}/reactions`, {
        headers: studentHeaders(kid),
        body: { emoji: '👍' },
      }),
    )
    expect(ok.status).toBe(200)
  })

  test('adulto pode reagir com qualquer emoji', async () => {
    const ctx = buildApp()
    const { channelId } = await seed(ctx, 'adult')
    const threadId = await createThread(ctx, channelId, randomUUID())
    const ok = await ctx.app.handle(
      jsonRequest('POST', `/hub/threads/${threadId}/reactions`, {
        headers: studentHeaders(randomUUID()),
        body: { emoji: '🤬' },
      }),
    )
    expect(ok.status).toBe(200)
  })
})

describe('estado de leitura (novidades)', () => {
  test('hasUnread alterna com /seen e nova atividade', async () => {
    let ms = Date.parse('2026-06-01T00:00:00.000Z')
    const clock = () => {
      ms += 1000
      return new Date(ms)
    }
    const ctx = buildApp({ clock })
    const { spaceSlug, channelId } = await seed(ctx)
    const user = randomUUID()

    await createThread(ctx, channelId, user) // atividade t1
    const before = (await (
      await ctx.app.handle(
        jsonRequest('GET', `/hub/spaces/${spaceSlug}/channels`, { headers: studentHeaders(user) }),
      )
    ).json()) as { items: Array<{ id: string; hasUnread: boolean }> }
    expect(before.items[0]?.hasUnread).toBe(true)

    await ctx.app.handle(
      jsonRequest('POST', `/hub/channels/${channelId}/seen`, { headers: studentHeaders(user) }),
    ) // visto t2 > t1

    const afterSeen = (await (
      await ctx.app.handle(
        jsonRequest('GET', `/hub/spaces/${spaceSlug}/channels`, { headers: studentHeaders(user) }),
      )
    ).json()) as { items: Array<{ hasUnread: boolean }> }
    expect(afterSeen.items[0]?.hasUnread).toBe(false)

    await createThread(ctx, channelId, user) // atividade t3 > t2
    const afterNew = (await (
      await ctx.app.handle(
        jsonRequest('GET', `/hub/spaces/${spaceSlug}/channels`, { headers: studentHeaders(user) }),
      )
    ).json()) as { items: Array<{ hasUnread: boolean }> }
    expect(afterNew.items[0]?.hasUnread).toBe(true)
  })
})
