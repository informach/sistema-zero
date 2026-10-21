import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { canonicalJson } from '@sistemazero/core/creations'
import {
  isStudioPythonPublication,
  StudioPythonPublicationManifestV2Schema,
  studioPythonPublicationRecipeText,
} from '@sistemazero/core/studio'
import { sha256 } from '../src/artifacts'
import {
  collectPublicationGarbage,
  currentPublishedSource,
  type PublicationBucket,
  publicationCommand,
  publicationKey,
  publicationRetention,
  publishedRevisionPrefix,
  purgePublication,
} from '../src/publications'
import { memoryArtifactBucket } from './artifact-bucket'

/** Stored objects written by the v1 recipe code (commit 46318c9e7), byte for byte. */
const V1 = JSON.parse(
  readFileSync(new URL('./fixtures/python-publication-v1.json', import.meta.url), 'utf8'),
) as {
  input: Record<string, unknown> & { playId: string; source: string; requestId: string }
  objects: Record<string, string>
}
const encoder = new TextEncoder()
const HOURS_72 = 72 * 60 * 60 * 1000

async function loadV1(storage = memoryArtifactBucket()) {
  for (const [key, text] of Object.entries(V1.objects)) await storage.bucket.put(key, text)
  return storage
}
function v1Bytes(storage: ReturnType<typeof memoryArtifactBucket>) {
  return Object.fromEntries(
    Object.keys(V1.objects).map((key) => [key, new TextDecoder().decode(storage.objects.get(key))]),
  )
}
function age(storage: ReturnType<typeof memoryArtifactBucket>) {
  for (const key of storage.objects.keys()) storage.uploaded.set(key, new Date(0))
}
function storeRuntime(storage: ReturnType<typeof memoryArtifactBucket>, manifestSha256: string) {
  const keys = [
    `runtimes/${manifestSha256}/files/pyodide.asm.wasm`,
    `runtimes/${manifestSha256}/files/frame.html`,
    `runtimes/${manifestSha256}/complete.json`,
  ]
  for (const key of keys) {
    storage.objects.set(key, encoder.encode(key))
    storage.uploaded.set(key, new Date(0))
  }
  return keys
}

async function pythonFixture(
  kind: 'classic' | 'pro',
  storage = memoryArtifactBucket(),
  manifestSha256 = 'd'.repeat(64),
) {
  const runtime = { profileId: 'python-browser', releaseId: '2.0.0', manifestSha256 }
  const content = 'import turtle\nturtle.forward(100)\n'
  const project = {
    formatVersion: 3,
    programmingLanguage: 'python',
    kind,
    runtime,
    id: `python-${kind}`,
    name: 'Corrida Turtle',
    createdAt: 100,
    updatedAt: 100,
    // Authoring order differs from canonical order on purpose.
    installedExtensions: [
      { id: 'python-turtle', version: '1.0.0', installedAt: 300 },
      { id: 'python-audio', version: '2.1.0', installedAt: 200 },
    ],
    python: {
      entrypoint: kind === 'pro' ? 'game/main.py' : 'main.py',
      dependencyLock: {
        lockVersion: 1,
        target: 'browser',
        pythonVersion: '3.13.2',
        runtimeManifestSha256: manifestSha256,
        requirementsSha256: await sha256(encoder.encode('')),
        packages: [],
      },
    },
    ir: null,
    blocksState: null,
    ...(kind === 'classic'
      ? { mode: 'bridge', files: { 'main.py': content } }
      : {
          mode: 'code',
          tree: { game: { kind: 'dir' }, 'game/main.py': { kind: 'file', content } },
          proMeta: { templateId: 'python-empty' },
        }),
  }
  const input = {
    operation: 'promote-python',
    playId: crypto.randomUUID(),
    owner: 'b'.repeat(64),
    projectId: project.id,
    requestId: crypto.randomUUID(),
    expectedVersion: 0,
    parentOrigin: 'https://kids.test',
    source: JSON.stringify(project),
    approval: { kind: 'python-browser' as const, runtime, snapshotSha256: 'c'.repeat(64) },
  }
  async function publish(changes: Record<string, unknown> = {}) {
    const result = await publicationCommand(storage.bucket, { ...input, ...changes }, 200)
    if (!isStudioPythonPublication(result)) throw new Error('Missing Python publication')
    return result
  }
  return { ...storage, input, project, publish }
}

async function storedRecipe(bucket: PublicationBucket, playId: string, revision: string) {
  return (await bucket.get(`${publishedRevisionPrefix(playId, revision)}manifest.json`))!.text()
}

for (const kind of ['classic', 'pro'] as const) {
  test(`${kind} Python revisions retain a canonical v2 recipe with runtime, extensions, entrypoint and lock`, async () => {
    const f = await pythonFixture(kind)
    const state = await f.publish()
    const text = await storedRecipe(f.bucket, state.playId, state.activeRevision)
    const recipe = StudioPythonPublicationManifestV2Schema.parse(JSON.parse(text))
    expect(JSON.parse(text)).toEqual({
      version: 2,
      programmingLanguage: 'python',
      kind,
      sourceHash: await sha256(encoder.encode(f.input.source)),
      approval: f.input.approval,
      entrypoint: f.project.python.entrypoint,
      extensions: [
        { id: 'python-audio', version: '2.1.0' },
        { id: 'python-turtle', version: '1.0.0' },
      ],
      dependencyLock: f.project.python.dependencyLock,
    })
    // Survives normalization: parse → canonical serialization reproduces the stored bytes/hash.
    expect(studioPythonPublicationRecipeText(recipe)).toBe(text)
    expect(state.revisions[0]?.artifactHash).toBe(await sha256(encoder.encode(text)))
    expect(await currentPublishedSource(f.bucket, state.playId)).toEqual({
      source: f.input.source,
      publication: state,
    })
    // Lost response: the same request returns the committed publication without new objects.
    const before = f.objects.size
    expect(await f.publish()).toEqual(state)
    expect(f.objects.size).toBe(before)
    expect(publicationRetention(state.revisions).runtimes).toEqual(
      new Set([f.project.runtime.manifestSha256]),
    )
  })
}

test('a v2 recipe is rejected when not canonical, not bound to the source, or rehashed with other dependencies', async () => {
  const mutations: ((recipe: Record<string, unknown>, text: string) => string)[] = [
    (_recipe, text) => JSON.stringify(JSON.parse(text), null, 2),
    (recipe) => canonicalJson({ ...recipe, extensions: [] }),
    (recipe) => canonicalJson({ ...recipe, entrypoint: 'other.py' }),
    (recipe) =>
      JSON.stringify({ ...recipe, extensions: [...(recipe.extensions as unknown[])].reverse() }),
    (recipe) => JSON.stringify({ ...recipe, runtimeUrl: 'https://untrusted.test/pyodide.mjs' }),
  ]
  for (const mutate of mutations) {
    const f = await pythonFixture('classic')
    const state = await f.publish()
    const prefix = publishedRevisionPrefix(state.playId, state.activeRevision)
    const text = await storedRecipe(f.bucket, state.playId, state.activeRevision)
    const tampered = mutate(JSON.parse(text), text)
    expect(tampered).not.toBe(text)
    await f.bucket.put(`${prefix}manifest.json`, tampered)
    // An attacker able to rewrite the pointer hash still cannot bind another closure.
    const record = JSON.parse(await (await f.bucket.get(publicationKey(state.playId)))!.text())
    record.revisions[0].artifactHash = await sha256(encoder.encode(tampered))
    await f.bucket.put(publicationKey(state.playId), JSON.stringify(record))
    await expect(currentPublishedSource(f.bucket, state.playId)).rejects.toThrow('Receita')
  }
})

test('a real v1 publication keeps playing, replays idempotently and is never rewritten by later v2 revisions', async () => {
  const storage = await loadV1()
  const playId = V1.input.playId
  const original = await currentPublishedSource(storage.bucket, playId)
  expect(original?.source).toBe(V1.input.source)
  const v1Revision = original!.publication.activeRevision
  const v1Recipe = JSON.parse(await storedRecipe(storage.bucket, playId, v1Revision))
  expect(v1Recipe.version).toBe(1)

  // The original request's lost response: same input, still recognized after v2 shipped.
  const replay = await publicationCommand(storage.bucket, V1.input, 300)
  expect(replay).toEqual(original!.publication)
  expect(storage.objects.size).toBe(Object.keys(V1.objects).length)
  await expect(
    publicationCommand(storage.bucket, {
      ...V1.input,
      approval: { ...(V1.input.approval as object), snapshotSha256: 'e'.repeat(64) },
    }),
  ).rejects.toThrow('outro conteúdo')

  // A new revision of the same publication is v2; the v1 objects stay byte-identical.
  const source = JSON.stringify({ ...JSON.parse(V1.input.source), name: 'Corrida Turtle v2' })
  const updated = await publicationCommand(
    storage.bucket,
    { ...V1.input, source, requestId: crypto.randomUUID(), expectedVersion: 1 },
    400,
  )
  if (!isStudioPythonPublication(updated)) throw new Error('Missing Python publication')
  expect(updated.revisions).toHaveLength(2)
  const nextRecipe = JSON.parse(await storedRecipe(storage.bucket, playId, updated.activeRevision))
  expect(nextRecipe.version).toBe(2)
  const v1Keys = Object.keys(V1.objects).filter((key) => key.startsWith('published/'))
  expect(Object.fromEntries(v1Keys.map((key) => [key, v1Bytes(storage)[key]]))).toEqual(
    Object.fromEntries(v1Keys.map((key) => [key, V1.objects[key]])),
  )

  // Explicit disable/restore of the legacy revision keeps its semantics.
  const disabled = await publicationCommand(storage.bucket, {
    ...V1.input,
    operation: 'activate',
    requestId: crypto.randomUUID(),
    expectedVersion: 2,
    revision: v1Revision,
    disabled: true,
  })
  expect(disabled).toMatchObject({ disabled: true, activeRevision: v1Revision })
  expect(await currentPublishedSource(storage.bucket, playId)).toBeNull()
  await publicationCommand(storage.bucket, {
    ...V1.input,
    operation: 'activate',
    requestId: crypto.randomUUID(),
    expectedVersion: 3,
    revision: v1Revision,
    disabled: false,
  })
  expect((await currentPublishedSource(storage.bucket, playId))?.source).toBe(V1.input.source)

  // Both recipe versions and the shared runtime survive collection.
  const runtime = storeRuntime(storage, 'a'.repeat(64))
  age(storage)
  expect(await collectPublicationGarbage(storage.bucket, HOURS_72)).toMatchObject({ removed: 0 })
  for (const key of [...v1Keys, ...runtime]) expect(storage.objects.has(key)).toBe(true)
  expect((await currentPublishedSource(storage.bucket, playId))?.source).toBe(V1.input.source)
})

test('GC keeps runtimes referenced by v1/v2 revisions, history and disabled publications, removing only orphan revisions', async () => {
  const storage = await loadV1()
  // Listing that ignores its prefix: shared runtime bytes must still be untouchable.
  const unfiltered = {
    ...storage.bucket,
    async list(options: { prefix: string; limit: number; cursor?: string }) {
      return storage.bucket.list({ ...options, prefix: '' })
    },
  } satisfies PublicationBucket
  const v2 = await pythonFixture('pro', storage, 'd'.repeat(64))
  const first = await v2.publish()
  await v2.publish({
    requestId: crypto.randomUUID(),
    expectedVersion: 1,
    source: JSON.stringify({ ...v2.project, name: 'Outra' }),
  })
  await publicationCommand(storage.bucket, {
    ...v2.input,
    operation: 'activate',
    requestId: crypto.randomUUID(),
    expectedVersion: 2,
    revision: first.activeRevision,
    disabled: true,
  })
  const referenced = [
    ...storeRuntime(storage, 'a'.repeat(64)),
    ...storeRuntime(storage, 'd'.repeat(64)),
  ]
  const unreferenced = storeRuntime(storage, 'f'.repeat(64))
  const orphan = `${publishedRevisionPrefix(first.playId, 'e'.repeat(64))}manifest.json`
  await storage.bucket.put(orphan, '{}')
  age(storage)
  const published = [...storage.objects.keys()].filter(
    (key) => key.startsWith('published/') && key !== orphan,
  )
  expect(published).toHaveLength(6)

  expect(await collectPublicationGarbage(unfiltered, HOURS_72)).toMatchObject({
    removed: 1,
    unreadable: 0,
  })
  expect(storage.objects.has(orphan)).toBe(false)
  for (const key of [...published, ...referenced, ...unreferenced])
    expect(storage.objects.has(key)).toBe(true)
  // Rerun is idempotent.
  expect(await collectPublicationGarbage(unfiltered, HOURS_72)).toMatchObject({ removed: 0 })

  const record = JSON.parse(await (await storage.bucket.get(publicationKey(first.playId)))!.text())
  expect(publicationRetention(record.revisions).runtimes).toEqual(new Set(['d'.repeat(64)]))
  expect(publicationRetention(record.revisions).revisions.size).toBe(2)

  // Moderation keeps its tombstone semantics and removes only that publication's revisions.
  await purgePublication(unfiltered, first.playId)
  expect(await currentPublishedSource(storage.bucket, first.playId)).toBeNull()
  await expect(v2.publish({ requestId: crypto.randomUUID() })).rejects.toThrow('mudou')
  expect(
    [...storage.objects.keys()].some((key) => key.startsWith(`published/${first.playId}/`)),
  ).toBe(false)
  for (const key of [...referenced, ...unreferenced]) expect(storage.objects.has(key)).toBe(true)
  expect((await currentPublishedSource(storage.bucket, V1.input.playId))?.source).toBe(
    V1.input.source,
  )
})

test('GC failure mid-page is safe: nothing referenced is lost, the cursor is not advanced and a rerun completes', async () => {
  const storage = await loadV1()
  const f = await pythonFixture('classic', storage)
  const state = await f.publish()
  const orphans = [
    `${publishedRevisionPrefix(state.playId, 'e'.repeat(64))}source.json`,
    `${publishedRevisionPrefix(V1.input.playId, 'e'.repeat(64))}source.json`,
  ]
  for (const key of orphans) await storage.bucket.put(key, 'orphan')
  const runtime = storeRuntime(storage, 'd'.repeat(64))
  age(storage)
  const retained = [...storage.objects.keys()].filter((key) => !orphans.includes(key))
  let failures = 1
  const flaky = {
    ...storage.bucket,
    async delete(keys: string[]) {
      if (failures-- > 0) throw new Error('R2 unavailable')
      return storage.bucket.delete(keys)
    },
  } satisfies PublicationBucket
  await expect(collectPublicationGarbage(flaky, HOURS_72)).rejects.toThrow('R2 unavailable')
  expect(await storage.bucket.get('maintenance/publications-cursor.json')).toBeNull()
  for (const key of [...retained, ...orphans]) expect(storage.objects.has(key)).toBe(true)
  expect(await collectPublicationGarbage(flaky, HOURS_72)).toMatchObject({ removed: 2 })
  for (const key of retained) expect(storage.objects.has(key)).toBe(true)
  for (const key of runtime) expect(storage.objects.has(key)).toBe(true)
  expect((await currentPublishedSource(storage.bucket, state.playId))?.source).toBe(f.input.source)
  expect((await currentPublishedSource(storage.bucket, V1.input.playId))?.source).toBe(
    V1.input.source,
  )
})

test('an unreadable publication record retains all of its objects without stalling collection of others', async () => {
  const storage = await loadV1()
  const f = await pythonFixture('classic', storage)
  const state = await f.publish()
  const v1Orphan = `${publishedRevisionPrefix(V1.input.playId, 'e'.repeat(64))}source.json`
  const otherOrphan = `${publishedRevisionPrefix(state.playId, 'e'.repeat(64))}source.json`
  await storage.bucket.put(v1Orphan, 'unknown')
  await storage.bucket.put(otherOrphan, 'orphan')
  await storage.bucket.put(publicationKey(V1.input.playId), '{"truncated":')
  age(storage)
  const v1Published = [...storage.objects.keys()].filter((key) =>
    key.startsWith(`published/${V1.input.playId}/`),
  )
  expect(await collectPublicationGarbage(storage.bucket, HOURS_72)).toMatchObject({
    removed: 1,
    unreadable: 1,
  })
  for (const key of v1Published) expect(storage.objects.has(key)).toBe(true)
  expect(storage.objects.has(otherOrphan)).toBe(false)
  expect(
    JSON.parse(await (await storage.bucket.get('maintenance/publications-cursor.json'))!.text()),
  ).toEqual({})
})
