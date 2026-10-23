import { expect, test } from 'bun:test'
import { gunzipSync, gzipSync } from 'node:zlib'
import {
  StudioPythonDistributionSchema,
  studioPythonRuntimePrefix,
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
import { pythonDistributionFixture } from './python-distribution-fixture'

async function candidate(compressedInput?: Uint8Array) {
  const f = await pythonDistributionFixture()
  const contents = new Map(f.contents)
  contents.set('frame.mjs', new TextEncoder().encode('export const value = 42;\n'.repeat(100)))
  const compressed = new Uint8Array(compressedInput ?? gzipSync(contents.get('frame.mjs')!))
  const artifactPath = `_http/gzip/${await sha256(compressed)}.gz`
  contents.set(artifactPath, compressed)
  const distribution = {
    ...f.deployment.distribution,
    files: await Promise.all(
      [...contents].map(async ([path, bytes]) => ({
        path,
        bytes: bytes.byteLength,
        sha256: await sha256(bytes),
      })),
    ),
    httpRepresentations: [{ path: 'frame.mjs', encoding: 'gzip' as const, artifactPath }],
  }
  const release = await createStudioRuntimeRelease({
    ...f.deployment.release.manifest,
    artifacts: distribution.files.map(({ path, sha256 }) => ({ path, sha256 })),
  })
  return {
    distribution,
    release,
    contents,
    artifactPath,
    bucket: f.bucket,
    objects: f.objects,
    counts: f.counts,
  }
}

async function prepared() {
  const f = await candidate()
  const deployment = { release: f.release, distribution: f.distribution }
  await storePythonRuntimeDistribution({
    bucket: f.bucket,
    deployment,
    read: async (path) => f.contents.get(path)!,
  })
  let status: StudioRuntimeReleaseStatus = 'active'
  const serve = await createPythonDistributionServer({
    approvedDeployments: [deployment],
    parentOrigins: ['https://app.example'],
    status: () => status,
  })
  const url = `https://runtime.example${studioPythonRuntimeRoute(f.release.manifestSha256)}`
  const request = (headers?: HeadersInit, method = 'GET', path = 'frame.mjs') =>
    new Request(`${url}${path}`, { method, headers })
  return {
    ...f,
    serve,
    request,
    status: (next: StudioRuntimeReleaseStatus) => {
      status = next
    },
  }
}

test('serves negotiated stored gzip with logical MIME/policy and representation-specific validators', async () => {
  const f = await prepared()
  const gzip = await f.serve(f.request({ 'Accept-Encoding': 'gzip, br' }), f.bucket)
  expect(gzip.status).toBe(200)
  expect(gzip.headers.get('Content-Encoding')).toBe('gzip')
  expect(gzip.headers.get('Content-Type')).toBe('text/javascript; charset=utf-8')
  expect(gzip.headers.get('Vary')).toBe('Accept-Encoding')
  expect(gzip.headers.get('Cache-Control')).toContain('immutable')
  expect(gzip.headers.get('Content-Security-Policy')).toContain(
    "frame-ancestors 'self' https://app.example",
  )
  const gzipFile = f.distribution.files.find((file) => file.path === f.artifactPath)!
  expect(gzip.headers.get('Content-Length')).toBe(String(gzipFile.bytes))
  expect(gzip.headers.get('ETag')).toBe(`"${gzipFile.sha256}"`)
  expect(new Uint8Array(gunzipSync(new Uint8Array(await gzip.arrayBuffer())))).toEqual(
    f.contents.get('frame.mjs')!,
  )
  const identity = await f.serve(
    f.request({ 'Accept-Encoding': 'gzip;q=0, identity;q=1' }),
    f.bucket,
  )
  expect(identity.headers.get('Content-Encoding')).toBeNull()
  expect(identity.headers.get('Vary')).toBe('Accept-Encoding')
  expect(identity.headers.get('ETag')).not.toBe(gzip.headers.get('ETag'))
  expect(new Uint8Array(await identity.arrayBuffer())).toEqual(f.contents.get('frame.mjs')!)
  expect((await f.serve(f.request({ 'Accept-Encoding': '*;q=0' }), f.bucket)).status).toBe(406)
  expect((await f.serve(f.request(undefined, 'GET', f.artifactPath), f.bucket)).status).toBe(404)
})

test('HEAD and conditional responses select the same representation and retire every unreturned stream', async () => {
  const f = await prepared()
  const file = f.distribution.files.find((file) => file.path === f.artifactPath)!
  const etag = `"${file.sha256}"`
  let cancellations = f.counts().cancellations
  const head = await f.serve(f.request({ 'Accept-Encoding': 'gzip' }, 'HEAD'), f.bucket)
  expect(head.status).toBe(200)
  expect(head.headers.get('Content-Encoding')).toBe('gzip')
  expect(head.headers.get('Content-Length')).toBe(String(file.bytes))
  expect(head.headers.get('ETag')).toBe(etag)
  expect(await head.text()).toBe('')
  expect(f.counts().cancellations - cancellations).toBe(2)
  cancellations = f.counts().cancellations
  const conditional = await f.serve(
    f.request({ 'Accept-Encoding': 'gzip', 'If-None-Match': `"other", W/${etag}` }),
    f.bucket,
  )
  expect(conditional.status).toBe(304)
  expect(conditional.headers.get('Content-Encoding')).toBe('gzip')
  expect(conditional.headers.get('Vary')).toBe('Accept-Encoding')
  expect(await conditional.text()).toBe('')
  expect(f.counts().cancellations - cancellations).toBe(2)
  const identity = await f.serve(
    f.request({ 'Accept-Encoding': 'identity', 'If-None-Match': etag }),
    f.bucket,
  )
  expect(identity.status).toBe(200)
  await identity.body?.cancel()
})

test('edge negotiation uses authoritative original client encoding before rewritten headers', async () => {
  const f = await prepared()
  const logical = f.distribution.files.find((file) => file.path === 'frame.mjs')!
  const gzip = f.distribution.files.find((file) => file.path === f.artifactPath)!
  for (const item of [
    { original: 'identity', rewritten: 'br, gzip', status: 200, expected: logical, method: 'GET' },
    {
      original: 'gzip;q=0, identity;q=1',
      rewritten: 'br, gzip',
      status: 200,
      expected: logical,
      method: 'HEAD',
    },
    {
      original: 'gzip;q=0, identity;q=0',
      rewritten: 'br, gzip',
      status: 406,
      expected: undefined,
      method: 'GET',
    },
    { original: '', rewritten: 'br, gzip', status: 200, expected: logical, method: 'GET' },
    { original: 'gzip', rewritten: 'identity', status: 200, expected: gzip, method: 'GET' },
  ]) {
    const request = f.request(
      { 'Accept-Encoding': item.rewritten, 'If-None-Match': `W/"${gzip.sha256}"` },
      item.method,
    )
    // Platform metadata, not a caller-controlled header. Model the actual native proxy observation.
    Object.defineProperty(request, 'cf', { value: { clientAcceptEncoding: item.original } })
    const response = await f.serve(request, f.bucket)
    expect(response.status).toBe(item.expected === gzip ? 304 : item.status)
    if (item.expected) {
      expect(response.headers.get('ETag')).toBe(`"${item.expected.sha256}"`)
      expect(response.headers.get('Content-Length')).toBe(String(item.expected.bytes))
      expect(response.headers.get('Content-Encoding')).toBe(item.expected === gzip ? 'gzip' : null)
    }
    if (item.method === 'GET' && item.expected === logical)
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(f.contents.get('frame.mjs')!)
    else await response.body?.cancel()
  }
})

test('missing/corrupt declared gzip and revocation never silently fall back to identity', async () => {
  const f = await prepared()
  const key = `${studioPythonRuntimePrefix(f.release.manifestSha256)}files/${f.artifactPath}`
  const object = f.objects.get(key)!
  f.objects.delete(key)
  expect((await f.serve(f.request({ 'Accept-Encoding': 'gzip' }), f.bucket)).status).toBe(404)
  f.objects.set(key, { bytes: object.bytes, hash: new ArrayBuffer(32) })
  expect((await f.serve(f.request({ 'Accept-Encoding': 'gzip' }), f.bucket)).status).toBe(404)
  f.objects.set(key, object)
  const bucket = {
    async get(path: string) {
      const value = await f.bucket.get(path)
      if (path === key) f.status('revoked')
      return value
    },
  }
  const cancelled = f.counts().cancellations
  expect((await f.serve(f.request({ 'Accept-Encoding': 'gzip' }, 'HEAD'), bucket)).status).toBe(404)
  expect(f.counts().cancellations - cancelled).toBe(2)
})

test('HEAD/304 recheck policy after asynchronous stream retirement; retired releases remain usable', async () => {
  for (const method of ['HEAD', 'GET'] as const) {
    for (const nextStatus of ['revoked', 'retired'] as const) {
      const f = await prepared()
      const file = f.distribution.files.find((file) => file.path === f.artifactPath)!
      const key = `${studioPythonRuntimePrefix(f.release.manifestSha256)}files/${file.path}`
      let entered!: () => void
      let resume!: () => void
      const reached = new Promise<void>((resolve) => {
        entered = resolve
      })
      const gate = new Promise<void>((resolve) => {
        resume = resolve
      })
      const bucket = {
        async get(path: string) {
          const object = await f.bucket.get(path)
          if (path !== key || !object) return object
          return {
            ...object,
            body: new ReadableStream({
              async cancel() {
                entered()
                await gate
                await object.body.cancel()
              },
            }),
          }
        },
      }
      const pending = f.serve(
        f.request(
          {
            'Accept-Encoding': 'gzip',
            ...(method === 'GET' ? { 'If-None-Match': `"${file.sha256}"` } : {}),
          },
          method,
        ),
        bucket,
      )
      try {
        await reached
        f.status(nextStatus)
      } finally {
        resume()
      }
      const response = await pending
      expect(response.status).toBe(nextStatus === 'revoked' ? 404 : method === 'HEAD' ? 200 : 304)
      expect(response.headers.get('Cache-Control')).toBe(
        nextStatus === 'revoked' ? 'no-store' : 'public, max-age=31536000, immutable',
      )
    }
  }
})

test('HTTP representations are optional, closed over declared immutable artifacts and defensively captured', async () => {
  const legacy = await pythonDistributionFixture()
  expect(StudioPythonDistributionSchema.safeParse(legacy.deployment.distribution).success).toBe(
    true,
  )
  const input = await candidate()
  expect(StudioPythonDistributionSchema.safeParse(input.distribution).success).toBe(true)
  const verified = verifyStudioPythonDeployment({
    release: input.release,
    distribution: input.distribution,
  })
  input.distribution.httpRepresentations[0]!.artifactPath = 'worker.mjs'
  const deployment = await verified
  expect(deployment.distribution.httpRepresentations).toEqual([
    { path: 'frame.mjs', encoding: 'gzip', artifactPath: input.artifactPath },
  ])
  expect(Object.isFrozen(deployment.distribution.httpRepresentations)).toBe(true)
  expect(Object.isFrozen(deployment.distribution.httpRepresentations?.[0])).toBe(true)
})

test('upload verifies decoded equality and never completes invalid or overexpanding gzip releases', async () => {
  for (const invalid of [
    new Uint8Array([1, 2, 3]),
    new Uint8Array(gzipSync(new TextEncoder().encode('x'.repeat(2400)))),
    new Uint8Array(gzipSync(new TextEncoder().encode('x'.repeat(1024 * 1024)))),
  ]) {
    const f = await candidate(invalid)
    await expect(
      storePythonRuntimeDistribution({
        bucket: f.bucket,
        deployment: { release: f.release, distribution: f.distribution },
        read: async (path) => f.contents.get(path)!,
      }),
    ).rejects.toThrow('gzip')
    expect(
      f.objects.has(`${studioPythonRuntimePrefix(f.release.manifestSha256)}complete.json`),
    ).toBe(false)
  }
  const f = await candidate()
  await storePythonRuntimeDistribution({
    bucket: f.bucket,
    deployment: { release: f.release, distribution: f.distribution },
    read: async (path) => f.contents.get(path)!,
  })
  expect(f.objects.has(`${studioPythonRuntimePrefix(f.release.manifestSha256)}complete.json`)).toBe(
    true,
  )
})

test('rejects ambiguous, missing, recursive, orphaned or noncanonical HTTP representation references', async () => {
  const { distribution, artifactPath } = await candidate()
  const representation = distribution.httpRepresentations[0]!
  const cases = [
    { httpRepresentations: [{ ...representation, encoding: 'br' }] },
    { httpRepresentations: [{ ...representation, path: 'missing.mjs' }] },
    { httpRepresentations: [{ ...representation, artifactPath: '_http/gzip/missing.gz' }] },
    { httpRepresentations: [{ ...representation, artifactPath: 'worker.mjs' }] },
    { httpRepresentations: [{ ...representation, path: artifactPath }] },
    { httpRepresentations: [representation, representation] },
    { httpRepresentations: [representation, { ...representation, path: 'worker.mjs' }] },
    { httpRepresentations: [] },
    { httpRepresentations: undefined },
    { httpRepresentations: [{ ...representation, unexpected: true }] },
    {
      files: distribution.files.filter((file) => file.path !== artifactPath),
    },
    {
      files: distribution.files.map((file) =>
        file.path === artifactPath ? { ...file, sha256: '0'.repeat(64) } : file,
      ),
    },
  ]
  for (const change of cases)
    expect(StudioPythonDistributionSchema.safeParse({ ...distribution, ...change }).success).toBe(
      false,
    )
  const logical = distribution.files.find((file) => file.path === representation.path)!
  expect(
    StudioPythonDistributionSchema.safeParse({
      ...distribution,
      files: [...distribution.files, { ...logical, path: 'identical.mjs' }],
      httpRepresentations: [representation, { ...representation, path: 'identical.mjs' }],
    }).success,
  ).toBe(true)
})
