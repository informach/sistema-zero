import { expect, test } from 'bun:test'
import { isStudioProPublication, studioProPublicationUrl } from '@sistemazero/core/studio'
import { artifactPrefix, sha256, storeArtifact } from '../src/artifacts'
import {
  collectPublicationGarbage,
  createPublicationAuthorizer,
  currentPublishedSource,
  publicationCommand,
  publishedRevisionPrefix,
  purgePublication,
  servePublishedArtifact,
} from '../src/publications'
import { memoryArtifactBucket } from './artifact-bucket'

async function fixture() {
  const storage = memoryArtifactBucket()
  const files = new Map([
    ['index.html', new TextEncoder().encode('<script type="module" src="./main.js"></script>')],
    ['main.js', new TextEncoder().encode('fetch("./hero.png")')],
    ['hero.png', new Uint8Array([137, 80, 78, 71, 0, 255])],
    ['__studio-proof.png', new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 1, 2])],
  ])
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
  const artifact = await storeArtifact({
    bucket: storage.bucket,
    origin: 'https://runtime.test',
    parentOrigin: 'https://kids.test',
    manifest,
    validation: { profileVersion: 1, runtimeFingerprint: '1'.repeat(64) },
    read: async (path) => {
      const bytes = files.get(path)
      if (!bytes) throw new Error('Missing fixture')
      return bytes
    },
    now: 100,
  })
  const input = {
    operation: 'promote',
    playId: crypto.randomUUID(),
    requestId: crypto.randomUUID(),
    owner: 'a'.repeat(64),
    projectId: 'my-game',
    expectedVersion: 0,
    artifactId: artifact.id,
    artifactHash: artifact.sha256,
    parentOrigin: 'https://kids.test',
    source: JSON.stringify({
      tree: { 'main.js': { kind: 'file', content: 'console.log("a")' } },
      assets: ['original'],
    }),
  }
  const publish = async (changes = {}) => {
    const result = await publicationCommand(storage.bucket, { ...input, ...changes }, 200)
    if (!isStudioProPublication(result)) throw new Error('No publication')
    return result
  }
  return { ...storage, input, artifact, publish, files }
}

test('promotion survives preview expiry/deletion, preserves exact source/art and never invokes a compiler on read', async () => {
  const f = await fixture(),
    state = await f.publish()
  await f.bucket.delete(
    [...f.objects.keys()].filter((key) => key.startsWith(artifactPrefix(f.artifact.id))),
  )
  const url = studioProPublicationUrl('https://runtime.test', state.playId, state.activeRevision)
  const response = await servePublishedArtifact(new Request(url), f.bucket, async () => true)
  expect(response.status).toBe(200)
  expect(await response.text()).toContain('./main.js')
  expect(response.headers.get('content-security-policy')).toContain(
    'sandbox allow-scripts allow-pointer-lock',
  )
  expect(response.headers.get('content-security-policy')).not.toContain('allow-same-origin')
  expect(response.headers.get('cache-control')).toContain('must-revalidate')
  expect(
    new Uint8Array(
      await (
        await servePublishedArtifact(
          new Request(url.replace('index.html', 'hero.png')),
          f.bucket,
          async () => true,
        )
      ).arrayBuffer(),
    ),
  ).toEqual(f.files.get('hero.png')!)
  f.input.source = JSON.stringify({ assets: ['edited Pinta artwork'] })
  expect((await currentPublishedSource(f.bucket, state.playId))?.source).not.toBe(f.input.source)
  expect(
    await publicationCommand(f.bucket, {
      ...f.input,
      operation: 'source',
      revision: state.activeRevision,
    }),
  ).toMatchObject({ publication: state })
})

test('verified cover checks the retained manifest and file before returning bytes', async () => {
  const f = await fixture(),
    state = await f.publish()
  const request = { operation: 'cover', playId: state.playId, owner: f.input.owner }
  expect(await publicationCommand(f.bucket, request)).toEqual({
    png: Buffer.from(f.files.get('__studio-proof.png')!).toString('base64'),
  })
  const key = `${publishedRevisionPrefix(state.playId, state.activeRevision)}manifest.json`
  const manifest = JSON.parse(await (await f.bucket.get(key))!.text())
  manifest.files.pop()
  await f.bucket.put(key, JSON.stringify(manifest))
  await expect(publicationCommand(f.bucket, request)).rejects.toThrow('Captura inválida')
})

test('moderation leaves a tombstone that prevents stale or new requests from resurrecting the link', async () => {
  const f = await fixture(),
    initial = await f.publish()
  expect(await purgePublication(f.bucket, initial.playId)).toEqual({ deleted: true })
  expect(await currentPublishedSource(f.bucket, initial.playId)).toBeNull()
  expect([...f.objects.keys()].some((key) => key.startsWith(`published/${initial.playId}/`))).toBe(
    false,
  )
  await expect(f.publish({ expectedVersion: 1, requestId: crypto.randomUUID() })).rejects.toThrow(
    'mudou',
  )
  await expect(f.publish({ expectedVersion: 0, requestId: crypto.randomUUID() })).rejects.toThrow(
    'mudou',
  )
  expect(await purgePublication(f.bucket, initial.playId)).toEqual({ deleted: true })
  expect(await currentPublishedSource(f.bucket, initial.playId)).toBeNull()
})

test('bounded collection retains all history, fresh orphan copies and ambiguous successful commits', async () => {
  const f = await fixture(),
    first = await f.publish()
  await f.publish({ expectedVersion: 1, requestId: crypto.randomUUID(), source: 'second' })
  const orphan = `${publishedRevisionPrefix(first.playId, 'e'.repeat(64))}files/old.js`
  const fresh = `${publishedRevisionPrefix(first.playId, 'f'.repeat(64))}files/new.js`
  await f.bucket.put(orphan, 'old')
  for (const key of f.objects.keys())
    if (key.startsWith('published/')) f.uploaded.set(key, new Date(0))
  await f.bucket.put(fresh, 'fresh')
  const result = await collectPublicationGarbage(f.bucket)
  expect(result.removed).toBe(1)
  expect(f.objects.has(orphan)).toBe(false)
  expect(f.objects.has(fresh)).toBe(true)
  expect(
    await publicationCommand(f.bucket, {
      ...f.input,
      operation: 'source',
      revision: first.activeRevision,
    }),
  ).toMatchObject({ source: f.input.source })
  expect((await currentPublishedSource(f.bucket, first.playId))?.source).toBe('second')
})

test('only validated, intact, current previews can be promoted, with no pointer on failure', async () => {
  for (const mutation of ['unvalidated', 'expired', 'hash', 'bytes']) {
    const f = await fixture(),
      key = `${artifactPrefix(f.artifact.id)}manifest.json`
    const stored = await f.bucket.get(key)
    const metadata = JSON.parse(await stored!.text())
    if (mutation === 'unvalidated') metadata.validated = false
    if (mutation === 'expired') metadata.expiresAt = 100
    await f.bucket.put(key, JSON.stringify(metadata))
    if (mutation === 'bytes')
      await f.bucket.put(`${artifactPrefix(f.artifact.id)}files/hero.png`, new Uint8Array(6))
    await expect(
      f.publish(mutation === 'hash' ? { artifactHash: '0'.repeat(64) } : {}),
    ).rejects.toThrow()
    expect(await currentPublishedSource(f.bucket, f.input.playId)).toBeNull()
    expect([...f.objects.keys()].filter((k) => k.startsWith('published/'))).toEqual([])
  }
})

test('idempotency, owner checks, concurrent CAS, rollback and disable preserve the previous valid revision', async () => {
  const f = await fixture(),
    initial = await f.publish()
  expect(await f.publish()).toEqual(initial)
  await expect(f.publish({ source: 'different' })).rejects.toThrow('outra fonte')
  await expect(f.publish({ owner: 'b'.repeat(64) })).rejects.toThrow('não encontrada')
  const updates = await Promise.allSettled(
    [1, 2].map((n) =>
      f.publish({ requestId: crypto.randomUUID(), expectedVersion: 1, source: `revision ${n}` }),
    ),
  )
  expect(updates.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
  expect(updates.filter((r) => r.status === 'rejected')).toHaveLength(1)
  const current = await currentPublishedSource(f.bucket, initial.playId)
  expect(current?.publication.version).toBe(2)
  const activation = {
    ...f.input,
    operation: 'activate',
    requestId: crypto.randomUUID(),
    expectedVersion: 2,
    revision: initial.activeRevision,
    disabled: false,
  }
  const rollback = await publicationCommand(f.bucket, activation)
  expect(rollback).toMatchObject({ activeRevision: initial.activeRevision, version: 3 })
  expect(await publicationCommand(f.bucket, activation)).toEqual(rollback)
  const oldUrl = studioProPublicationUrl(
    'https://runtime.test',
    initial.playId,
    current!.publication.activeRevision,
  )
  expect(
    (await servePublishedArtifact(new Request(oldUrl), f.bucket, async () => true)).status,
  ).toBe(404)
  expect((await currentPublishedSource(f.bucket, initial.playId))?.source).toBe(f.input.source)
  await publicationCommand(f.bucket, {
    ...activation,
    requestId: crypto.randomUUID(),
    expectedVersion: 3,
    disabled: true,
  })
  expect(await currentPublishedSource(f.bucket, initial.playId)).toBeNull()
  const url = studioProPublicationUrl(
    'https://runtime.test',
    initial.playId,
    initial.activeRevision,
  )
  expect((await servePublishedArtifact(new Request(url), f.bucket, async () => true)).status).toBe(
    404,
  )
})

test('moderation gates HTML, materials and conditional reads; authorization failure closes access', async () => {
  const f = await fixture(),
    state = await f.publish()
  const url = studioProPublicationUrl('https://runtime.test', state.playId, state.activeRevision)
  for (const path of ['index.html', 'hero.png']) {
    const request = new Request(url.replace('index.html', path))
    const allowed = await servePublishedArtifact(request, f.bucket, async () => true)
    expect(allowed.status).toBe(200)
    expect(
      (
        await servePublishedArtifact(
          new Request(request, { headers: { 'If-None-Match': allowed.headers.get('etag')! } }),
          f.bucket,
          async () => false,
        )
      ).status,
    ).toBe(404)
  }
  let calls = 0
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const authorize = createPublicationAuthorizer(
    'https://kids.test/api/internal/studio-play',
    'private',
    async (_url, init) => {
      calls++
      expect(init?.redirect).toBe('error')
      await gate
      return Response.json({ visible: calls === 1 })
    },
  )
  const a = authorize(state.playId),
    b = authorize(state.playId)
  release()
  expect(await a).toBe(true)
  expect(await b).toBe(true)
  expect(calls).toBe(1)
  expect(await authorize(state.playId)).toBe(false)
  expect(await createPublicationAuthorizer(undefined, 'private')(state.playId)).toBe(false)
})
