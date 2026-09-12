import { describe, expect, mock, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { GalleryDeliveryPlan } from '@sistemazero/core/learning'
import { assetToJson, createLessonAsset } from '@sistemazero/pinta/assets'
import type { SessionUser } from '../src/lib/types'
import type { CallOpts } from '../src/server/gateway'

mock.module('server-only', () => ({}))
const { createGalleryDeliveryRoutes } = await import('../src/routes/gallery-delivery')
const user: SessionUser = {
  id: randomUUID(),
  email: '',
  firstName: 'Aluno',
  lastName: '',
  role: 'customer',
  status: 'active',
  activeProfile: { accountId: randomUUID() },
}
const lessonId = randomUUID(),
  blockId = randomUUID(),
  requestId = randomUUID()
const asset = createLessonAsset('pixel-sprite', 16)
if (!asset) throw new Error('Missing drawing fixture')
const input = { requestId, revision: 'a'.repeat(32), items: [{ itemId: asset.id, revision: 1 }] }
const ctx = { params: Promise.resolve({ lessonId, blockId }) }
const req = (body: unknown = input, viewer = user.id) =>
  new Request('https://kids.test/api', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-sz-viewer': viewer },
    body: JSON.stringify(body),
  })
function setup(current: SessionUser | null = user) {
  let plan: GalleryDeliveryPlan = {
    completed: false,
    snapshot: {
      kind: 'gallery-delivery',
      version: 1,
      requestId,
      tool: 'pinta',
      items: [
        {
          ...input.items[0]!,
          name: 'Dino',
          kind: 'pixel-sprite',
          storageKey: 'snapshot',
          parts: [],
        },
      ],
    },
    copies: [{ source: 'original', destination: 'snapshot' }],
  }
  const calls: { path: string; opts: CallOpts }[] = [],
    copied: string[] = []
  let failCopy = false,
    invalidFile = false
  const route = createGalleryDeliveryRoutes(
    { getSession: async () => current },
    {
      gatewayFetch: async (path, opts) => {
        calls.push({ path, opts })
        return { status: 200, body: plan }
      },
      gatewayFetchHmac: async (path, opts) => {
        calls.push({ path, opts })
        return { status: 200, body: { submittedAt: 'now' } }
      },
    },
    {
      read: async () => (invalidFile ? {} : JSON.parse(assetToJson(asset))),
      copy: async (source, destination) => {
        if (failCopy) throw new Error('Falha na cópia')
        copied.push(`${source}:${destination}`)
      },
    },
  )
  return {
    route,
    calls,
    copied,
    fail: () => {
      failCopy = true
    },
    invalid: () => {
      invalidFile = true
    },
    confirmed: () => {
      plan = { completed: true, result: { submittedAt: 'earlier' } }
    },
  }
}
describe('gallery delivery BFF confirmation', () => {
  test('server-owned copies precede signed commit; account comes from the active profile', async () => {
    const env = setup()
    expect((await env.route.POST(req(), ctx)).status).toBe(200)
    expect(env.copied).toEqual(['original:snapshot'])
    expect(env.calls[1]?.opts.body).toMatchObject({
      actor: { userId: user.id, accountId: user.activeProfile?.accountId, privileged: false },
      input,
    })
    expect(env.calls[1]?.path).toBe(
      `/members/internal/lessons/${lessonId}/blocks/${blockId}/gallery-commit`,
    )
  })
  test('failed copy or invalid cloud file never reaches confirmation', async () => {
    for (const kind of ['copy', 'invalid']) {
      const env = setup()
      if (kind === 'copy') env.fail()
      else env.invalid()
      expect((await env.route.POST(req(), ctx)).status).toBe(503)
      expect(env.calls).toHaveLength(1)
    }
  })
  test('retry after a lost confirmation does not overwrite the immutable copy', async () => {
    const env = setup()
    env.confirmed()
    expect(await (await env.route.POST(req(), ctx)).json()).toEqual({ submittedAt: 'earlier' })
    expect(env.copied).toHaveLength(0)
    expect(env.calls).toHaveLength(1)
  })
  test('profile changes, readonly support and injected owners/keys cannot submit', async () => {
    const env = setup()
    expect((await env.route.POST(req(input, randomUUID()), ctx)).status).toBe(409)
    expect((await env.route.POST(req({ ...input, accountId: user.id }), ctx)).status).toBe(400)
    expect(
      (
        await env.route.POST(
          req({ ...input, items: [{ ...input.items[0], storageKey: 'someone-else' }] }),
          ctx,
        )
      ).status,
    ).toBe(400)
    expect(env.calls).toHaveLength(0)
    const readonly = setup({ ...user, act: { sub: randomUUID(), mode: 'readonly' } })
    expect((await readonly.route.POST(req(), ctx)).status).toBe(403)
    expect(readonly.calls).toHaveLength(0)
  })
})
