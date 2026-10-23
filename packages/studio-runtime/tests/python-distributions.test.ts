import { expect, test } from 'bun:test'
import { canonicalJson } from '@sistemazero/core/creations'
import {
  StudioPythonDistributionSchema,
  studioPythonDeploymentRoute,
  studioPythonRuntimeRoute,
  verifyStudioPythonDeployment,
} from '@sistemazero/core/studio/python-runtime-distribution'
import {
  createStudioRuntimeRelease,
  type StudioRuntimeReleaseStatus,
} from '@sistemazero/core/studio/runtime-catalog'
import { sha256 } from '../src/artifacts'
import {
  createPythonDistributionServer,
  storePythonRuntimeDistribution,
} from '../src/python-distributions'
import { pythonDistributionFixture as fixture } from './python-distribution-fixture'

test('current distribution metadata cannot repin an existing immutable runtime marker', async () => {
  const f = await fixture({ standalone: true })
  await f.store()
  const marker = f.objects.get(`${f.prefix}complete.json`)
  if (!marker) throw new Error('Missing current marker')
  const before = new Uint8Array(marker.bytes)
  // A metadata-only variant is still a different immutable distribution.
  const distribution = StudioPythonDistributionSchema.parse({
    ...f.deployment.distribution,
    pyodideVersion: '314.0.8',
  })
  await expect(
    storePythonRuntimeDistribution({
      bucket: f.bucket,
      deployment: { release: f.deployment.release, distribution },
      read: async (path) => {
        const bytes = f.contents.get(path)
        if (!bytes) throw new Error('Fixture missing')
        return bytes
      },
    }),
  ).rejects.toThrow('imutável')
  expect(f.objects.get(`${f.prefix}complete.json`)?.bytes).toEqual(before)
})

test('deployment metadata exposes only an approved complete distribution and rechecks revocation', async () => {
  const f = await fixture()
  const url = `https://runtime.example${studioPythonDeploymentRoute(f.deployment.release.manifestSha256)}`
  const read = (method = 'GET') => f.serve(new Request(url, { method }), f.bucket)
  expect((await read()).status).toBe(404)
  await f.store()
  const response = await read()
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('no-store')
  expect(response.headers.get('access-control-allow-origin')).toBe('*')
  const deployment = await verifyStudioPythonDeployment(await response.json())
  expect(deployment.release.manifestSha256).toBe(f.deployment.release.manifestSha256)
  expect(deployment.distribution).toEqual(f.deployment.distribution)
  const head = await read('HEAD')
  expect(head.status).toBe(200)
  expect(await head.text()).toBe('')
  expect(head.headers.get('content-length')).toBe(response.headers.get('content-length'))
  f.status('retired')
  expect((await read()).status).toBe(200)
  f.status('revoked')
  expect((await read()).status).toBe(404)
  f.status('active')
  f.objects.delete(`${f.prefix}complete.json`)
  expect((await read()).status).toBe(404)
})

test('distribution closure and hash match the approved release, including defensive capture', async () => {
  const { deployment } = await fixture()
  const input = structuredClone(deployment)
  const pending = verifyStudioPythonDeployment(input)
  input.distribution.files[0]!.sha256 = '0'.repeat(64)
  expect((await pending).distribution.files[0]!.sha256).toBe(
    deployment.distribution.files[0]!.sha256,
  )
  await expect(verifyStudioPythonDeployment(input)).rejects.toThrow('artefatos')
  await expect(
    verifyStudioPythonDeployment({
      ...deployment,
      release: { ...deployment.release, manifestSha256: '0'.repeat(64) },
    }),
  ).rejects.toThrow('release')
  for (const files of [
    deployment.distribution.files.slice(1),
    [...deployment.distribution.files, deployment.distribution.files[0]],
  ])
    expect(
      StudioPythonDistributionSchema.safeParse({ ...deployment.distribution, files }).success,
    ).toBe(false)
  expect(
    StudioPythonDistributionSchema.safeParse({
      ...deployment.distribution,
      files: deployment.distribution.files.map((file) => ({ ...file, bytes: 129 * 1024 * 1024 })),
    }).success,
  ).toBe(false)
})

test('incomplete uploads cannot execute; retry and concurrent uploads preserve immutable files', async () => {
  const f = await fixture()
  let index = 0
  await expect(
    f.store(async (path) => {
      if (++index === 4) throw new Error('connection lost')
      return f.contents.get(path)!
    }),
  ).rejects.toThrow('connection lost')
  expect(f.objects.has(`${f.prefix}complete.json`)).toBe(false)
  expect((await f.serve(new Request(`${f.url}frame.html`), f.bucket)).status).toBe(404)
  // Complete sequentially, then concurrently repeat: no delete or replacement operation exists.
  await f.store()
  const count = f.counts().puts
  await Promise.all([f.store(), f.store()])
  expect(f.counts().puts).toBe(count)
  const response = await f.serve(new Request(`${f.url}frame.html`), f.bucket)
  expect(response.status).toBe(200)
  expect(await response.text()).toBe('fixture:frame.html')
})

test('mismatched bytes and preexisting corrupt storage fail closed without replacing existing objects', async () => {
  const f = await fixture()
  await expect(f.store(async () => new Uint8Array([1, 2, 3]))).rejects.toThrow('Integridade')
  expect(f.counts().puts).toBe(0)
  f.objects.set(`${f.prefix}files/frame.html`, { bytes: new Uint8Array([1]) })
  await expect(f.store()).rejects.toThrow('diferente')
  expect(f.objects.get(`${f.prefix}files/frame.html`)!.bytes).toEqual(new Uint8Array([1]))
  expect(f.objects.has(`${f.prefix}complete.json`)).toBe(false)
})

test('anonymous editor/player requests share immutable artifacts with isolated policy and correct caching', async () => {
  const f = await fixture()
  await f.store()
  const entry = await f.serve(new Request(`${f.url}frame.html`), f.bucket)
  expect(entry.headers.get('Cache-Control')).toBe('no-store')
  const analysis = await f.serve(new Request(`${f.url}analysis.html`), f.bucket)
  expect(analysis.status).toBe(200)
  expect(analysis.headers.get('Cache-Control')).toBe('no-store')
  expect(entry.headers.get('Content-Security-Policy')).toContain(`connect-src data: blob: ${f.url}`)
  expect(entry.headers.get('Content-Security-Policy')).toContain(
    "frame-ancestors 'self' https://app.example https://play.example",
  )
  expect(entry.headers.get('Content-Security-Policy')).toContain(
    "require-trusted-types-for 'script'",
  )
  expect(entry.headers.get('Content-Security-Policy')).not.toContain('allow-same-origin')
  expect(entry.headers.get('Cross-Origin-Embedder-Policy')).toBeNull()
  expect(entry.headers.get('Access-Control-Allow-Origin')).toBe('*')
  await entry.body!.cancel()
  const wasm = await f.serve(new Request(`${f.url}pyodide.asm.wasm`), f.bucket)
  expect(wasm.headers.get('Content-Type')).toBe('application/wasm')
  expect(wasm.headers.get('Cache-Control')).toContain('immutable')
  const tag = wasm.headers.get('ETag')!
  await wasm.body!.cancel()
  const before = f.counts().cancellations
  const cached = await f.serve(
    new Request(`${f.url}pyodide.asm.wasm`, { headers: { 'If-None-Match': tag } }),
    f.bucket,
  )
  expect(cached.status).toBe(304)
  expect(await cached.text()).toBe('')
  const head = await f.serve(new Request(`${f.url}worker.mjs`, { method: 'HEAD' }), f.bucket)
  expect(head.status).toBe(200)
  expect(await head.text()).toBe('')
  expect(f.counts().cancellations - before).toBe(4)
})

test('unknown files, forged completion, absent checksums, malformed requests and revoked versions never stream', async () => {
  const f = await fixture()
  await f.store()
  for (const path of [
    'unknown.mjs',
    'complete.json',
    'distribution.json',
    'frame.html?latest=1',
    '%66rame.html',
  ])
    expect((await f.serve(new Request(`${f.url}${path}`), f.bucket)).status).toBe(404)
  expect(
    (await f.serve(new Request(`${f.url}frame.html`, { method: 'POST' }), f.bucket)).status,
  ).toBe(404)
  const marker = f.objects.get(`${f.prefix}complete.json`)!
  f.objects.set(`${f.prefix}complete.json`, { bytes: marker.bytes })
  expect((await f.serve(new Request(`${f.url}frame.html`), f.bucket)).status).toBe(404)
  f.objects.set(`${f.prefix}complete.json`, marker)
  const frame = f.objects.get(`${f.prefix}files/frame.html`)!
  f.objects.set(`${f.prefix}files/frame.html`, { ...frame, hash: new ArrayBuffer(32) })
  expect((await f.serve(new Request(`${f.url}frame.html`), f.bucket)).status).toBe(404)
  f.objects.set(`${f.prefix}files/frame.html`, frame)
  for (const status of ['revoked', undefined] as const) {
    f.status(status)
    const reads = f.counts().reads
    expect((await f.serve(new Request(`${f.url}frame.html`), f.bucket)).status).toBe(404)
    expect(f.counts().reads).toBe(reads)
  }
  f.status('retired')
  const retired = await f.serve(new Request(`${f.url}frame.html`), f.bucket)
  expect(retired.status).toBe(200)
  await retired.body!.cancel()
  const revokingBucket = {
    ...f.bucket,
    async get(key: string) {
      const result = await f.bucket.get(key)
      if (key.includes('/files/')) f.status('revoked')
      return result
    },
  }
  expect((await f.serve(new Request(`${f.url}frame.html`), revokingBucket)).status).toBe(404)
})

test('server configuration captures the approved descriptors and rejects unsafe parent origins', async () => {
  const f = await fixture()
  for (const parent of [
    '*',
    'null',
    'https://app.example/path',
    'http://app.example',
    'https://u:p@app.example',
  ])
    await expect(
      createPythonDistributionServer({
        approvedDeployments: [f.deployment],
        parentOrigins: [parent],
        status: () => 'active',
      }),
    ).rejects.toThrow()
  const verified = await verifyStudioPythonDeployment(f.deployment)
  expect(verified.distributionSha256).toBe(
    await sha256(new TextEncoder().encode(canonicalJson(f.deployment.distribution))),
  )
  expect(verified.release.manifestSha256).not.toBe(verified.distributionSha256)
  expect(Object.isFrozen(verified.distribution.files[0])).toBe(true)
})

test('approval array, later descriptors and status callback are captured before verification awaits', async () => {
  const f = await fixture()
  await f.store()
  const alternate = structuredClone(f.deployment)
  alternate.release = await createStudioRuntimeRelease({
    ...alternate.release.manifest,
    releaseId: 'fixture-2',
  })
  await storePythonRuntimeDistribution({
    bucket: f.bucket,
    deployment: alternate,
    read: async (path) => f.contents.get(path)!,
  })
  const approvedDeployments = [structuredClone(f.deployment)]
  const options = {
    approvedDeployments,
    parentOrigins: ['https://app.example'],
    status: (): StudioRuntimeReleaseStatus => 'active',
  }
  const pending = createPythonDistributionServer(options)
  approvedDeployments.push(alternate)
  options.status = () => 'revoked'
  const serve = await pending
  const original = await serve(new Request(`${f.url}frame.html`), f.bucket)
  expect(original.status).toBe(200)
  await original.body!.cancel()
  const alternateURL = `https://runtime.example${studioPythonRuntimeRoute(alternate.release.manifestSha256)}frame.html`
  expect((await serve(new Request(alternateURL), f.bucket)).status).toBe(404)
  const mutableAlternate = structuredClone(alternate)
  const secondPending = createPythonDistributionServer({
    approvedDeployments: [f.deployment, mutableAlternate],
    parentOrigins: ['https://app.example'],
    status: () => 'active',
  })
  mutableAlternate.distribution.files[0]!.sha256 = '0'.repeat(64)
  const second = await secondPending
  const captured = await second(new Request(alternateURL), f.bucket)
  expect(captured.status).toBe(200)
  await captured.body!.cancel()
})

test('policy exceptions after a storage read cancel every unreturned body', async () => {
  const f = await fixture()
  await f.store()
  let fileRead = false
  const bucket = {
    async get(key: string) {
      const object = await f.bucket.get(key)
      if (key === `${f.prefix}files/pyodide.asm.wasm`) fileRead = true
      return object
    },
  }
  const serve = await createPythonDistributionServer({
    approvedDeployments: [f.deployment],
    parentOrigins: ['https://app.example'],
    status: () => {
      if (fileRead) throw new Error('operational policy unavailable')
      return 'active'
    },
  })
  let before = f.counts().cancellations
  expect((await serve(new Request(`${f.url}pyodide.asm.wasm`), bucket)).status).toBe(404)
  expect(f.counts().cancellations - before).toBe(2)
  before = f.counts().cancellations
  expect(
    (await f.serve(new Request(`${f.url.replace('https:', 'http:')}pyodide.asm.wasm`), f.bucket))
      .status,
  ).toBe(404)
  expect(f.counts().cancellations - before).toBe(2)
})
