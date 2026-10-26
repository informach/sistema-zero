import { beforeEach, expect, mock, test } from 'bun:test'
import type { GallerySubmission } from '@sistemazero/core/learning'

mock.module('server-only', () => ({}))
const ownerId = '20000000-0000-4000-8000-000000000001'
const blockId = '20000000-0000-4000-8000-000000000002'
const submissionId = '20000000-0000-4000-8000-000000000003'
const requestId = '20000000-0000-4000-8000-000000000004'
const copyGeneration = '20000000-0000-4000-8000-000000000005'
const hash = 'a'.repeat(64)
const signed: string[] = []
const reads: string[] = []
const runtimeCalls: {
  path: string
  options?: { method?: string; body?: unknown; signal?: AbortSignal }
}[] = []
let result: { status: number; body: unknown }
let failSigning = false
mock.module('@/server/masteries', () => ({
  getMasterySubmission: async (id: string) => {
    reads.push(id)
    return result
  },
}))
mock.module('@/server/r2', () => ({
  r2PresignGetUgc: async (key: string) => {
    signed.push(key)
    if (failSigning) throw new Error('Private storage detail')
    return `https://snapshot.invalid/${key}`
  },
}))
mock.module('@/server/gateway', () => ({
  gatewayFetch: async (
    path: string,
    options?: { method?: string; body?: unknown; signal?: AbortSignal },
  ) => {
    runtimeCalls.push({ path, options })
    return options?.method === 'POST' ? { status: 200, body: { authorized: true } } : result
  },
}))
const { GET } = await import(
  '../../src/app/api/members/journey/masteries/submissions/[id]/gallery/[itemId]/route'
)
const { POST: authorizeRuntime } = await import(
  '../../src/app/api/members/studio/mastery-review-runtime/route'
)
function gallery(generation: string | undefined = copyGeneration): GallerySubmission {
  const prefix = `creations/${ownerId}/lesson-submissions/${blockId}/${requestId}/${generation ? `${generation}/` : ''}frozen-item-3`
  return {
    kind: 'gallery-delivery',
    version: 1,
    requestId,
    copyGeneration: generation,
    tool: 'studio',
    items: [
      {
        itemId: 'frozen-item',
        revision: 3,
        name: 'Jogo entregue',
        kind: 'classic',
        storageKey: `${prefix}/project.gz`,
        parts: [{ hash, storageKey: `${prefix}/parts/${hash}.gz` }],
      },
    ],
  }
}
function install(snapshot = gallery()) {
  result = {
    status: 200,
    body: {
      userId: ownerId,
      evidence: {
        payload: { project: snapshot },
        revision: 'r1',
        createdAt: '2026-10-25T12:00:00Z',
      },
    },
  }
}
async function request(id = submissionId, itemId = 'frozen-item') {
  return GET(
    new Request('http://localhost/api/members/journey/masteries/submissions/fixture/gallery/item'),
    { params: Promise.resolve({ id, itemId }) },
  )
}
beforeEach(() => {
  install()
  reads.length = 0
  runtimeCalls.length = 0
  signed.length = 0
  failSigning = false
})

test('signs only the item and exact asset parts preserved in the authorized mastery snapshot', async () => {
  const response = await request()
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('private, no-store')
  const item = gallery().items[0]!
  expect(signed).toEqual([item.storageKey, item.parts[0]!.storageKey])
  expect(reads).toEqual([submissionId])
  expect(await response.json()).toEqual({
    url: `https://snapshot.invalid/${item.storageKey}`,
    parts: [{ hash, url: `https://snapshot.invalid/${item.parts[0]!.storageKey}` }],
  })
})

test('opens a historical snapshot without a copy generation using its exact legacy prefix', async () => {
  const historical = gallery()
  delete historical.copyGeneration
  historical.items = historical.items.map((item) => ({
    ...item,
    storageKey: item.storageKey.replace(`${copyGeneration}/`, ''),
    parts: item.parts.map((part) => ({
      ...part,
      storageKey: part.storageKey.replace(`${copyGeneration}/`, ''),
    })),
  }))
  install(historical)
  expect((await request()).status).toBe(200)
  expect(signed.every((key) => !key.includes(copyGeneration))).toBe(true)
})

test('does not sign anything after access is denied or a non-gallery evidence is selected', async () => {
  result = { status: 403, body: { error: { code: 'FORBIDDEN', message: 'Sem acesso.' } } }
  expect((await request()).status).toBe(403)
  result = {
    status: 200,
    body: { userId: ownerId, evidence: { payload: { project: { name: 'Raw Studio' } } } },
  }
  expect((await request()).status).toBe(404)
  expect(signed).toEqual([])
})

test('rejects invalid parameters before reading a submission', async () => {
  expect((await request('invalid')).status).toBe(400)
  expect((await request(submissionId, '../other')).status).toBe(400)
  expect(reads).toEqual([])
  expect(signed).toEqual([])
})

test('rejects mismatched owner, generation, request, item revision and part references', async () => {
  const mutations: ((snapshot: GallerySubmission) => void)[] = [
    (value) => {
      value.items[0]!.storageKey = value.items[0]!.storageKey.replace(ownerId, submissionId)
    },
    (value) => {
      value.items[0]!.storageKey = value.items[0]!.storageKey.replace(blockId, 'not-a-block')
    },
    (value) => {
      value.items[0]!.storageKey = value.items[0]!.storageKey.replace(requestId, submissionId)
    },
    (value) => {
      value.items[0]!.storageKey = value.items[0]!.storageKey.replace(copyGeneration, submissionId)
    },
    (value) => {
      value.items[0]!.revision = 4
    },
    (value) => {
      value.items[0]!.revision = -1
    },
    (value) => {
      value.items[0]!.storageKey += '/../../other'
    },
    (value) => {
      value.items[0]!.parts[0]!.storageKey = value.items[0]!.parts[0]!.storageKey.replace(
        ownerId,
        submissionId,
      )
    },
    (value) => {
      value.items[0]!.parts[0]!.hash = 'b'.repeat(64)
    },
    (value) => {
      value.items[0]!.parts.push(value.items[0]!.parts[0]!)
    },
    (value) => {
      value.items.push(value.items[0]!)
    },
  ]
  for (const mutate of mutations) {
    const snapshot = gallery()
    mutate(snapshot)
    install(snapshot)
    expect((await request()).status).toBe(404)
  }
  expect(signed).toEqual([])
})

test('returns a retryable failure without exposing storage configuration', async () => {
  failSigning = true
  const response = await request()
  expect(response.status).toBe(503)
  expect(await response.text()).not.toContain('Private storage detail')
})

test('runtime analysis obtains source locations from the authorized frozen submission and preserves the narrow operation', async () => {
  const request = new Request('http://localhost/api/members/studio/mastery-review-runtime', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      context: { kind: 'mastery-review', submissionId },
      operation: 'analyze',
    }),
  })
  const response = await authorizeRuntime(request)
  expect(response.status).toBe(200)
  expect(runtimeCalls).toHaveLength(2)
  expect(runtimeCalls[0]?.path).toBe(`/members/admin/journey/masteries/submissions/${submissionId}`)
  const item = gallery().items[0]!
  expect(runtimeCalls[1]?.options?.body).toEqual({
    context: { kind: 'mastery-review', submissionId },
    operation: 'analyze',
    gallerySource: {
      format: 'sz-studio-gallery-source',
      version: 1,
      itemId: item.itemId,
      revision: 3,
      source: { storageKey: item.storageKey, url: `https://snapshot.invalid/${item.storageKey}` },
      parts: [
        {
          hash,
          storageKey: item.parts[0]!.storageKey,
          url: `https://snapshot.invalid/${item.parts[0]!.storageKey}`,
        },
      ],
    },
  })
  expect(runtimeCalls.every((call) => call.options?.signal === request.signal)).toBe(true)
})

test('runtime rejects browser supplied source URLs and never signs a source after denied access', async () => {
  const body = { context: { kind: 'mastery-review', submissionId }, operation: 'analyze' }
  const send = (value: unknown) =>
    authorizeRuntime(
      new Request('http://localhost/api/members/studio/mastery-review-runtime', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(value),
      }),
    )
  expect(
    (await send({ ...body, gallerySource: { source: { url: 'https://other.invalid/secret' } } }))
      .status,
  ).toBe(400)
  expect(runtimeCalls).toEqual([])
  result = { status: 403, body: { error: { code: 'FORBIDDEN', message: 'Sem acesso.' } } }
  expect((await send(body)).status).toBe(403)
  expect(runtimeCalls).toHaveLength(1)
  expect(signed).toEqual([])
})
