import { describe, expect, mock, test } from 'bun:test'
import { createHash, randomUUID } from 'node:crypto'
import type { GalleryDeliveryPlan } from '@sistemazero/core/learning'
import { assetToJson, createLessonAsset } from '@sistemazero/pinta/assets'
import { authoringFixture } from '../../members/tests/fakes/studio-authoring-policy'
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
function setup(
  current: SessionUser | null = user,
  storageGate: { read?: () => Promise<void>; copy?: () => Promise<void> } = {},
) {
  let plan: GalleryDeliveryPlan = {
    completed: false,
    copyGeneration: randomUUID(),
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
      read: async () => {
        await storageGate.read?.()
        return invalidFile ? {} : JSON.parse(assetToJson(asset))
      },
      copy: async (source, destination) => {
        await storageGate.copy?.()
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

test.each([
  'classic',
  'pro',
] as const)('Python %s gallery delivery sends a small server-owned reference after copies, retaining large assets in storage', async (kind) => {
  for (const split of [false, true]) {
    const { project } = await authoringFixture('python', kind)
    const audio = Buffer.alloc(1_400_044)
    audio.write('RIFF')
    audio.writeUInt32LE(audio.length - 8, 4)
    audio.write('WAVEfmt ', 8)
    audio.writeUInt32LE(16, 16)
    audio.writeUInt16LE(1, 20)
    audio.writeUInt16LE(1, 22)
    audio.writeUInt32LE(8000, 24)
    audio.writeUInt32LE(8000, 28)
    audio.writeUInt16LE(1, 32)
    audio.writeUInt16LE(8, 34)
    audio.write('data', 36)
    audio.writeUInt32LE(audio.length - 44, 40)
    project.assets = [
      {
        id: 'sound',
        name: 'sound',
        kind: 'audio',
        source: 'upload',
        dataUrl: `data:audio/wav;base64,${audio.toString('base64')}`,
      },
    ]
    expect(JSON.stringify(project).length).toBeGreaterThan(1_500_000)
    const hash = createHash('sha256').update(JSON.stringify(project.assets[0])).digest('hex')
    const { assets: _assets, ...program } = project
    const item = {
      itemId: project.id,
      revision: 1,
      name: project.name,
      kind: 'program',
      storageKey: 'copies/project.gz',
      parts: split ? [{ hash, storageKey: `copies/parts/${hash}.gz` }] : [],
    }
    const body = { ...input, items: [{ itemId: project.id, revision: 1 }] }
    const plan: GalleryDeliveryPlan = {
      completed: false,
      copyGeneration: randomUUID(),
      snapshot: { kind: 'gallery-delivery', version: 1, requestId, tool: 'studio', items: [item] },
      copies: [
        { source: 'original/project.gz', destination: item.storageKey },
        ...item.parts.map((part) => ({
          source: `original/${part.hash}.gz`,
          destination: part.storageKey,
        })),
      ],
    }
    let copied = 0
    let committed: CallOpts | undefined
    const signed: string[] = []
    const route = createGalleryDeliveryRoutes(
      { getSession: async () => user },
      {
        gatewayFetch: async () => ({ status: 200, body: plan }),
        gatewayFetchHmac: async (_path, opts) => {
          committed = opts
          return { status: 200, body: { submittedAt: 'now' } }
        },
      },
      {
        read: async () =>
          split ? { format: 'sz-studio-parts', version: 1, program, assets: [hash] } : project,
        copy: async () => {
          copied++
        },
        sign: async (key) => {
          expect(copied).toBe(plan.copies.length)
          signed.push(key)
          return `https://storage.test/${key}?temporary=private`
        },
      },
    )
    expect((await route.POST(req(body), ctx)).status).toBe(200)
    expect(signed).toEqual([item.storageKey, ...item.parts.map((part) => part.storageKey)])
    expect(JSON.stringify(committed?.body).length).toBeLessThan(2000)
    expect(committed?.body).toMatchObject({
      projectForChecks: {
        format: 'sz-studio-gallery-source',
        version: 1,
        itemId: project.id,
        revision: 1,
        source: { storageKey: item.storageKey },
        parts: item.parts,
      },
    })
    expect(project.assets[0]).toMatchObject({ id: 'sound' })
  }
})

test('JavaScript Pro gallery deliveries retain tree and existing inline checks without large assets', async () => {
  const { project } = await authoringFixture('javascript', 'pro')
  const item = {
    itemId: project.id,
    revision: 1,
    name: project.name,
    kind: 'program',
    storageKey: 'copies/project.gz',
    parts: [],
  }
  let committed: CallOpts | undefined
  const route = createGalleryDeliveryRoutes(
    { getSession: async () => user },
    {
      gatewayFetch: async () => ({
        status: 200,
        body: {
          completed: false,
          copyGeneration: randomUUID(),
          snapshot: {
            kind: 'gallery-delivery',
            version: 1,
            requestId,
            tool: 'studio',
            items: [item],
          },
          copies: [{ source: 'original', destination: item.storageKey }],
        },
      }),
      gatewayFetchHmac: async (_path, opts) => {
        committed = opts
        return { status: 200, body: {} }
      },
    },
    { read: async () => project, copy: async () => {} },
  )
  expect(
    (await route.POST(req({ ...input, items: [{ itemId: project.id, revision: 1 }] }), ctx)).status,
  ).toBe(200)
  expect(committed?.body).toMatchObject({
    projectForChecks: { kind: 'pro', tree: 'tree' in project ? project.tree : undefined },
  })
})
describe('gallery delivery BFF confirmation', () => {
  test.each([
    'read',
    'copy',
  ] as const)('withdrawal during a noncooperative %s cannot reach commit', async (stage) => {
    const entered = Promise.withResolvers<void>()
    const release = Promise.withResolvers<void>()
    const controller = new AbortController()
    const env = setup(user, {
      [stage]: async () => {
        entered.resolve()
        await release.promise
      },
    })
    const request = new Request(req(), { signal: controller.signal })
    const pending = env.route.POST(request, ctx)
    try {
      await entered.promise
      controller.abort()
      expect((await pending).status).toBe(499)
      expect(env.calls).toHaveLength(1)
      expect(env.calls[0]?.opts.signal?.aborted).toBe(true)
      release.resolve()
      await new Promise((resolve) => setTimeout(resolve, 20))
      expect(env.calls).toHaveLength(1)
      // Validation reads the isolated destination after copying, so withdrawal here
      // preserves that completed copy but must never admit the signed commit.
      if (stage === 'read') expect(env.copied).toHaveLength(1)
    } finally {
      release.resolve()
      controller.abort()
    }
  })
  test('a pre-aborted gallery delivery does not prepare or copy', async () => {
    const env = setup()
    const controller = new AbortController()
    controller.abort()
    expect(
      (await env.route.POST(new Request(req(), { signal: controller.signal }), ctx)).status,
    ).toBe(499)
    expect(env.calls).toHaveLength(0)
    expect(env.copied).toHaveLength(0)
  })
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
    expect(env.calls[1]?.opts.signal).toBeInstanceOf(AbortSignal)
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
      (await env.route.POST(req({ ...input, copyGeneration: randomUUID() }), ctx)).status,
    ).toBe(400)
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

describe('recado da galeria (14/10/2026)', () => {
  test('o recado falado segue com `messageSpoken` até a confirmação assinada', async () => {
    const env = setup()
    const body = { ...input, message: 'meu dino pula', messageSpoken: true }
    expect((await env.route.POST(req(body), ctx)).status).toBe(200)
    expect(env.calls[0]?.opts.body).toMatchObject({ message: 'meu dino pula', messageSpoken: true })
    expect(env.calls[1]?.opts.body).toMatchObject({
      input: { message: 'meu dino pula', messageSpoken: true },
    })
  })

  test('recado acima de 1000 caracteres (o teto da coluna) é recusado antes do members', async () => {
    const env = setup()
    const res = await env.route.POST(req({ ...input, message: 'a'.repeat(1001) }), ctx)
    expect(res.status).toBe(400)
    expect(env.calls).toHaveLength(0)
  })
})
