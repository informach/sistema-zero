import { expect, test } from 'bun:test'
import { parseStudioArtifactManifest, STUDIO_PRO_ARTIFACT_LIMITS } from '@sistemazero/core/studio'
import { artifactPrefix, serveArtifact, sha256, storeArtifact } from '../src/artifacts'
import { memoryArtifactBucket } from './artifact-bucket'

const now = 10_000
const files = new Map([
  ['index.html', new TextEncoder().encode('<script type="module" src="./main.js"></script>')],
  ['main.js', new TextEncoder().encode('fetch("./model.glb")')],
  ['model.glb', Uint8Array.of(103, 108, 84, 70, 0, 255, 1, 2)],
])
async function setup() {
  const storage = memoryArtifactBucket()
  const manifest = {
    version: 1,
    files: await Promise.all(
      [...files].map(async ([path, bytes]) => ({
        path,
        bytes: bytes.length,
        sha256: await sha256(bytes),
      })),
    ),
  }
  const options = {
    bucket: storage.bucket,
    origin: 'https://runtime.test',
    parentOrigin: 'https://kids.test',
    manifest,
    now,
    read: async (path: string) => files.get(path)!,
  }
  return { ...storage, options }
}

test('commits immutable files then serves real bytes with sandbox CSP and CORS', async () => {
  const f = await setup()
  const artifact = await storeArtifact(f.options)
  const html = await serveArtifact(new Request(artifact.url), f.bucket, now)
  expect(html.status).toBe(200)
  expect(await html.text()).toContain('./main.js')
  expect(html.headers.get('content-security-policy')).toContain(
    'sandbox allow-scripts allow-pointer-lock',
  )
  expect(html.headers.get('content-security-policy')).toContain(
    `connect-src data: blob: https://runtime.test/v1/artifacts/${artifact.id}/`,
  )
  expect(html.headers.get('content-security-policy')).toContain('frame-ancestors https://kids.test')
  expect(html.headers.get('content-security-policy')).not.toContain('allow-same-origin')
  expect(html.headers.get('access-control-allow-origin')).toBe('*')
  const modelUrl = artifact.url.replace('index.html', 'model.glb')
  const model = await serveArtifact(new Request(modelUrl), f.bucket, now)
  expect(new Uint8Array(await model.arrayBuffer())).toEqual(files.get('model.glb')!)
  expect(model.headers.get('content-type')).toBe('model/gltf-binary')
  const etag = model.headers.get('etag')!
  expect(
    (
      await serveArtifact(
        new Request(modelUrl, { headers: { 'If-None-Match': etag } }),
        f.bucket,
        now,
      )
    ).status,
  ).toBe(304)
  expect(
    (await serveArtifact(new Request(modelUrl, { method: 'HEAD' }), f.bucket, now)).headers.get(
      'content-length',
    ),
  ).toBe('8')
  const next = await storeArtifact(f.options)
  expect(next.id).not.toBe(artifact.id)
  expect(next.sha256).toBe(artifact.sha256)
})

test('unknown, encoded traversal, incomplete and expired artifacts are never served', async () => {
  const f = await setup()
  const artifact = await storeArtifact(f.options)
  for (const path of ['unknown.png', '%2findex.html', 'manifest.json']) {
    expect(
      (await serveArtifact(new Request(artifact.url.replace('index.html', path)), f.bucket, now))
        .status,
    ).toBe(404)
  }
  expect(
    (await serveArtifact(new Request(artifact.url), f.bucket, artifact.expiresAt)).status,
  ).toBe(404)
  f.objects.delete(`${artifactPrefix(artifact.id)}manifest.json`)
  expect((await serveArtifact(new Request(artifact.url), f.bucket, now)).status).toBe(404)
})

test('changed build bytes abort publication and remove partial files', async () => {
  const f = await setup()
  await expect(
    storeArtifact({
      ...f.options,
      read: async (path) => (path === 'model.glb' ? Uint8Array.of(0) : files.get(path)!),
    }),
  ).rejects.toThrow('integridade')
  expect(f.objects.size).toBe(0)
})

test('validates output limits, duplicate names and canonical paths before uploading', async () => {
  const f = await setup()
  const file = f.options.manifest.files[0]!
  for (const path of ['../index.html', '/index.html', 'a//b.png', '.env', 'a\\b.js']) {
    expect(() => parseStudioArtifactManifest({ version: 1, files: [{ ...file, path }] })).toThrow()
  }
  expect(() =>
    parseStudioArtifactManifest({ version: 1, files: [file, { ...file, path: 'INDEX.HTML' }] }),
  ).toThrow('duplicados')
  expect(() =>
    parseStudioArtifactManifest({
      version: 1,
      files: [{ ...file, bytes: STUDIO_PRO_ARTIFACT_LIMITS.maxBytes + 1 }],
    }),
  ).toThrow('tamanho')
  expect(f.objects.size).toBe(0)
})
