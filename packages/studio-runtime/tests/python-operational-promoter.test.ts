import { expect, test } from 'bun:test'
import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { createPromotionHandler, readPromotionBody } from '../promotion-worker/handler'
import {
  authorizePromotion,
  captureOperationalPlan,
  createPromotionRequest,
  encodePromotionFrame,
  frameFiles,
  PROMOTION_FRAME_LIMIT,
  promotionAuthorization,
  promotionFrameBytes,
} from '../promotion-worker/protocol'
import { runOperationalPromotionCommand } from '../scripts/promote-python-runtime-worker'
import { sha256 } from '../src/artifacts'
import { pythonDistributionFixture } from './python-distribution-fixture'

const now = 1_800_000_000_000,
  key = 'ab'.repeat(32)
const versionId = '11111111-2222-3333-4444-555555555555'
async function fixture() {
  const storage = await pythonDistributionFixture({ compressed: true })
  const frame = encodePromotionFrame(storage.deployment.distribution.files, storage.contents)
  const body = {
    version: 1,
    kind: 'studio.python.operational-promotion',
    approval: {
      version: 1,
      kind: 'studio.python.operational-promotion-approval',
      planSha256: 'a'.repeat(64),
      distributionSha256: await sha256Hex(canonicalJson(storage.deployment.distribution)),
      qualificationSha256: 'b'.repeat(64),
      workerName: `sistemazero-python-promoter-staging-${'a'.repeat(12)}`,
      operatorOrigin: 'https://operator.example',
      notBefore: now - 1000,
      expiresAt: now + 60_000,
    },
    environment: 'staging',
    accountId: '1'.repeat(32),
    bucketName: 'sistemazero-studio-artifacts-staging',
    deployment: storage.deployment,
    configuration: {
      version: 1,
      parentOrigins: ['https://app.example'],
      deployments: [{ status: 'active', deployment: storage.deployment }],
    },
    frameSha256: await sha256(frame),
    frameBytes: frame.byteLength,
  }
  const plan = await captureOperationalPlan({
    ...body,
    operationalSha256: await sha256Hex(canonicalJson(body)),
  })
  const raw = { ...body, operationalSha256: plan.operationalSha256 }
  const headers = async () => {
    const nonce = '12'.repeat(16),
      expiresAt = now + 30_000
    return new Headers({
      Authorization: `SZ-Promotion-1 ${await promotionAuthorization({ plan, versionId, nonce, expiresAt, key })}`,
      'X-Promotion-Nonce': nonce,
      'X-Promotion-Expires': String(expiresAt),
      'X-Promotion-Version': versionId,
      'Content-Type': 'application/vnd.sistemazero.python-promotion',
      'Content-Length': String(frame.byteLength),
    })
  }
  const request = async (payload: BodyInit = frame) =>
    new Request(`${plan.approval.operatorOrigin}/execute/${plan.operationalSha256}`, {
      method: 'POST',
      headers: await headers(),
      body: payload,
    })
  const env = {
    PYTHON_RUNTIME: storage.bucket,
    OPERATOR_HMAC_KEY: key,
    CF_VERSION_METADATA: { id: versionId },
  }
  return { storage, frame, raw, plan, request, env }
}

test('fixed frame returns views without per-file copies; malformed/order/trailing/over-budget refused', () => {
  const files = [
    { path: 'first', bytes: 2 },
    { path: 'second', bytes: 1 },
  ]
  const frame = encodePromotionFrame(
    files,
    new Map([
      ['first', new Uint8Array([1, 2])],
      ['second', new Uint8Array([3])],
    ]),
  )
  const views = frameFiles(frame, files)
  expect(views.get('first')!.buffer).toBe(frame.buffer)
  expect(views.get('second')!.buffer).toBe(frame.buffer)
  for (const malformed of [
    frame.subarray(0, -1),
    new Uint8Array([...frame, 0]),
    new Uint8Array(frame).fill(0, 0, 8),
  ])
    expect(() => frameFiles(malformed, files)).toThrow()
  expect(() => frameFiles(frame, [...files].reverse())).toThrow()
  expect(() => promotionFrameBytes([{ bytes: PROMOTION_FRAME_LIMIT }])).toThrow()
})

test('unconfigured Worker and missing explicit approval are fail closed without I/O', async () => {
  const f = await fixture()
  expect((await createPromotionHandler(null)(await f.request(), f.env)).status).toBe(503)
  await expect(runOperationalPromotionCommand(['prepare'])).rejects.toThrow()
  await expect(captureOperationalPlan({ ...f.raw, approval: undefined })).rejects.toThrow()
  expect(f.storage.counts().puts).toBe(0)
})

test('private request factory binds the exact frame and does not perform I/O', async () => {
  const f = await fixture(),
    options = {
      plan: f.plan,
      frame: f.frame,
      key,
      versionId,
      nonce: '12'.repeat(16),
      expiresAt: now + 30_000,
    }
  const request = await createPromotionRequest(options)
  expect(await authorizePromotion(request, f.plan, key, versionId, now)).toBe(options.nonce)
  expect(f.storage.counts().puts).toBe(0)
  await expect(
    createPromotionRequest({ ...options, frame: new Uint8Array(f.frame.byteLength) }),
  ).rejects.toThrow()
})

test('HMAC binds exact plan/origin/version/nonce/expiry; auth negatives precede storage', async () => {
  const f = await fixture(),
    handler = createPromotionHandler(f.raw, () => now)
  for (const mutate of [
    (request: Request) => request.headers.set('Authorization', `SZ-Promotion-1 ${'0'.repeat(64)}`),
    (request: Request) => request.headers.set('X-Promotion-Nonce', '34'.repeat(16)),
    (request: Request) =>
      request.headers.set('X-Promotion-Version', '22222222-2222-3333-4444-555555555555'),
    (request: Request) => request.headers.set('X-Promotion-Expires', String(now - 1)),
    (request: Request) => request.headers.set('Content-Length', String(f.frame.byteLength + 1)),
  ]) {
    const request = await f.request()
    mutate(request)
    expect((await handler(request, f.env)).status).toBe(401)
    expect(request.bodyUsed).toBe(false)
  }
  const request = await f.request()
  await expect(
    authorizePromotion(
      new Request('https://other.example/execute/no', request),
      f.plan,
      key,
      versionId,
      now,
    ),
  ).rejects.toThrow()
  expect(
    (await createPromotionHandler(f.raw, () => now + 60_001)(await f.request(), f.env)).status,
  ).toBe(401)
  expect(f.storage.counts().puts).toBe(0)
})

test('synthetic storage port: real store functions keep marker/config order, readback and idempotence', async () => {
  const f = await fixture(),
    written: string[] = []
  const env = {
    ...f.env,
    PYTHON_RUNTIME: {
      get: f.storage.bucket.get,
      put: async (...args: Parameters<typeof f.storage.bucket.put>) => {
        written.push(args[0])
        return f.storage.bucket.put(...args)
      },
    },
  }
  const handler = createPromotionHandler(f.raw, () => now)
  const response = await handler(await f.request(), env)
  expect(response.status).toBe(200)
  const receipt = await response.json()
  expect(receipt).toHaveProperty('verifiedObjects', f.storage.contents.size + 2)
  expect(receipt).toHaveProperty('bodyCleanupConfirmed', true)
  expect(written.at(-2)).toEndWith('/complete.json')
  expect(written.at(-1)).toStartWith('runtime-configs/')
  const before = f.storage.counts().puts
  expect((await handler(await f.request(), env)).status).toBe(200)
  expect(f.storage.counts().puts).toBe(before)
  // This is a synthetic port contract test, not native conditional/checksum qualification.
})

test('one isolate admits one body; second authorized request429 is never read', async () => {
  const f = await fixture(),
    handler = createPromotionHandler(f.raw, () => now)
  let entered!: () => void, controller!: ReadableStreamDefaultController<Uint8Array>
  const reading = new Promise<void>((resolve) => {
    entered = resolve
  })
  const body = new ReadableStream<Uint8Array>(
    {
      start(value) {
        controller = value
      },
      pull() {
        entered()
      },
    },
    { highWaterMark: 0 },
  )
  const first = handler(await f.request(body), f.env)
  await reading
  let secondReads = 0
  const second = await f.request(
    new ReadableStream(
      {
        pull() {
          secondReads++
        },
      },
      { highWaterMark: 0 },
    ),
  )
  expect((await handler(second, f.env)).status).toBe(429)
  expect(secondReads).toBe(0)
  controller.enqueue(f.frame)
  controller.close()
  expect((await first).status).toBe(200)
})

test('primary and falsy cleanup rejections stay separate and raw data never reaches receipt', async () => {
  const f = await fixture(),
    handler = createPromotionHandler(f.raw, () => now)
  const body = new ReadableStream({
    cancel() {
      return Promise.reject(false)
    },
  })
  const env = {
    ...f.env,
    PYTHON_RUNTIME: {
      put: f.storage.bucket.put,
      async get() {
        return { body, size: 1, checksums: {} }
      },
    },
  }
  const response = await handler(await f.request(), env)
  expect(response.status).toBe(500)
  const receipt = await response.json()
  expect(receipt).toHaveProperty('failures.0.stage', 'readback')
  expect(receipt).toHaveProperty(
    'failures',
    expect.arrayContaining([expect.objectContaining({ stage: 'body-cleanup', type: 'boolean' })]),
  )
  expect(receipt).toHaveProperty('bodyCleanupConfirmed', false)
  expect(JSON.stringify(receipt)).not.toContain('stack')
})

test('tampered body is refused before any write; frame reader preserves abort and falsy cleanup', async () => {
  const f = await fixture(),
    frame = new Uint8Array(f.frame)
  frame[frame.length - 1] ^= 1
  expect(
    (await createPromotionHandler(f.raw, () => now)(await f.request(frame), f.env)).status,
  ).toBe(500)
  expect(f.storage.counts().puts).toBe(0)
  const stop = new AbortController()
  const body = new ReadableStream<Uint8Array>(
    {
      pull() {
        stop.abort(undefined)
      },
      cancel() {
        throw false
      },
    },
    { highWaterMark: 0 },
  )
  let rejected = false
  try {
    await readPromotionBody(
      new Request('https://public.example', { method: 'POST', body }),
      12,
      stop.signal,
    )
  } catch (error) {
    rejected = true
    expect(error).toBeInstanceOf(AggregateError)
    expect((error as AggregateError).errors[1]).toBe(false)
  }
  expect(rejected).toBe(true)
})

test('undefined native-port failure before marker remains primary; retry fills immutable partial files', async () => {
  const f = await fixture(),
    handler = createPromotionHandler(f.raw, () => now)
  let calls = 0
  const failing = {
    ...f.env,
    PYTHON_RUNTIME: {
      get: f.storage.bucket.get,
      async put(...args: Parameters<typeof f.storage.bucket.put>) {
        if (++calls === 2) throw undefined
        return f.storage.bucket.put(...args)
      },
    },
  }
  const response = await handler(await f.request(), failing)
  expect(response.status).toBe(500)
  expect(await response.json()).toHaveProperty('failures', [
    { stage: 'distribution', type: 'undefined', nullRejection: false },
  ])
  expect([...f.storage.objects.keys()].some((name) => name.endsWith('/complete.json'))).toBe(false)
  expect(f.storage.counts().puts).toBe(1)
  expect((await handler(await f.request(), f.env)).status).toBe(200)
  expect(f.storage.counts().puts).toBe(f.storage.contents.size + 2)
})

test('expiry immediately after native-port object acquisition still closes its real stream', async () => {
  const f = await fixture()
  let clock = now,
    cancelled = 0
  const handler = createPromotionHandler(f.raw, () => clock)
  const env = {
    ...f.env,
    PYTHON_RUNTIME: {
      put: f.storage.bucket.put,
      async get() {
        clock = now + 31_000
        return {
          size: 1,
          checksums: {},
          body: new ReadableStream({
            cancel() {
              cancelled++
            },
          }),
        }
      },
    },
  }
  const response = await handler(await f.request(), env)
  expect(response.status).toBe(500)
  const receipt = await response.json()
  expect(receipt).toHaveProperty('failures.0.stage', 'readback')
  expect(receipt).toHaveProperty('bodyCleanupConfirmed', true)
  expect(cancelled).toBe(1)
})

test('abort during an actual pending stream read settles it and cancels once before rejection', async () => {
  const stop = new AbortController(),
    primary = new Error('public abort fixture')
  let cancelled = 0,
    pulled = 0
  const body = new ReadableStream<Uint8Array>(
    {
      pull() {
        pulled++
        queueMicrotask(() => stop.abort(primary))
      },
      cancel() {
        cancelled++
      },
    },
    { highWaterMark: 0 },
  )
  let caught: unknown
  try {
    await readPromotionBody(
      new Request('https://public.example', { method: 'POST', body }),
      12,
      stop.signal,
    )
  } catch (error) {
    caught = error
  }
  expect(caught).toBe(primary)
  expect(pulled).toBe(1)
  expect(cancelled).toBe(1)
})
