import { expect, test } from 'bun:test'
import { isStudioPythonPublication } from '@sistemazero/core/studio'
import { sha256 } from '../src/artifacts'
import {
  collectPublicationGarbage,
  currentPublishedSource,
  publicationCommand,
  publicationKey,
  publishedRevisionPrefix,
  purgePublication,
  servePublishedArtifact,
} from '../src/publications'
import { memoryArtifactBucket } from './artifact-bucket'

async function fixture(kind: 'classic' | 'pro' = 'classic') {
  const storage = memoryArtifactBucket()
  const runtime = {
    profileId: 'python-browser',
    releaseId: '1.0.0',
    manifestSha256: 'a'.repeat(64),
  }
  const project = {
    formatVersion: 3,
    programmingLanguage: 'python',
    kind,
    runtime,
    id: 'python-game',
    name: 'Corrida Turtle',
    createdAt: 100,
    updatedAt: 100,
    installedExtensions: [{ id: 'python-turtle', version: '1.0.0', installedAt: 100 }],
    python: {
      entrypoint: 'main.py',
      dependencyLock: {
        lockVersion: 1,
        target: 'browser',
        pythonVersion: '3.13.2',
        runtimeManifestSha256: runtime.manifestSha256,
        requirementsSha256: await sha256(new TextEncoder().encode('')),
        packages: [],
      },
    },
    ir: null,
    blocksState: null,
    ...(kind === 'classic'
      ? { mode: 'bridge', files: { 'main.py': 'import turtle\nturtle.forward(100)\n' } }
      : {
          mode: 'code',
          tree: { 'main.py': { kind: 'file', content: 'import turtle\nturtle.forward(100)\n' } },
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

for (const kind of ['classic', 'pro'] as const) {
  test(`${kind} Python retains exact source and recipe without JS compiler or public artifact URL`, async () => {
    const f = await fixture(kind)
    const state = await f.publish()
    expect(state.kind).toBe(kind)
    expect(state.revisions[0]?.approval).toEqual(f.input.approval)
    expect(state.revisions[0]).not.toHaveProperty('validation')
    expect(state.revisions[0]?.sourceHash).toBe(
      await sha256(new TextEncoder().encode(f.input.source)),
    )
    expect(await currentPublishedSource(f.bucket, state.playId)).toEqual({
      source: f.input.source,
      publication: state,
    })
    expect([...f.objects.keys()].filter((key) => key.startsWith('published/'))).toHaveLength(2)
    expect(await f.publish()).toEqual(state)
    expect(
      await publicationCommand(f.bucket, {
        ...f.input,
        operation: 'source',
        revision: state.activeRevision,
      }),
    ).toEqual({ source: f.input.source, publication: state })
    await expect(publicationCommand(f.bucket, { ...f.input, operation: 'cover' })).rejects.toThrow(
      'capa',
    )
    const url = `https://runtime.test/v1/published/${state.playId}/${state.activeRevision}/index.html`
    expect(
      (await servePublishedArtifact(new Request(url), f.bucket, async () => true)).status,
    ).toBe(404)
  })
}

test('Python promotion rejects malformed, wrong-language, wrong-project, runtime and dependency source before writing', async () => {
  const f = await fixture()
  const sources = [
    '{',
    JSON.stringify({ ...f.project, programmingLanguage: 'javascript' }),
    JSON.stringify({ ...f.project, id: 'another-project' }),
    JSON.stringify({ ...f.project, runtime: { ...f.project.runtime, releaseId: '2.0.0' } }),
    JSON.stringify({ ...f.project, files: { 'main.py': '', '../escape.py': 'bad' } }),
    JSON.stringify({ ...f.project, files: { 'main.py': '', 'requirements.txt': '# changed' } }),
    JSON.stringify({ ...f.project, files: { 'main.py': '', 'requirements.txt': 'pygame-ce' } }),
  ]
  for (const source of sources) await expect(f.publish({ source })).rejects.toThrow()
  await expect(
    f.publish({ approval: { ...f.input.approval, runtimeUrl: 'https://untrusted.test' } }),
  ).rejects.toThrow('Aprovação')
  await expect(f.publish({ source: ' '.repeat(6 * 1024 * 1024 + 1) })).rejects.toThrow('grande')
  expect(f.objects.size).toBe(0)
})

test('all shared valid project ID prefixes remain readable, retryable and updatable after publication', async () => {
  for (const id of ['_game', '-game', 'a', 'x'.repeat(128)]) {
    const f = await fixture()
    const source = JSON.stringify({ ...f.project, id })
    const initial = await f.publish({ projectId: id, source })
    expect((await currentPublishedSource(f.bucket, initial.playId))?.source).toBe(source)
    expect(await publicationCommand(f.bucket, { ...f.input, operation: 'get' })).toEqual(initial)
    expect(await f.publish({ projectId: id, source })).toEqual(initial)
    const updated = await f.publish({
      projectId: id,
      source,
      expectedVersion: 1,
      requestId: crypto.randomUUID(),
    })
    expect(updated.version).toBe(2)
    expect((await currentPublishedSource(f.bucket, initial.playId))?.publication).toEqual(updated)
  }
  for (const id of ['', 'x'.repeat(129), '../game', 'game:other', 'game.name']) {
    const f = await fixture()
    await expect(
      f.publish({ projectId: id, source: JSON.stringify({ ...f.project, id }) }),
    ).rejects.toThrow()
    expect(f.objects.size).toBe(0)
  }
})

test('Python idempotency binds the recipe; language, kind, runtime, owner and project cannot migrate implicitly', async () => {
  const f = await fixture()
  const initial = await f.publish()
  await expect(
    f.publish({ approval: { ...f.input.approval, snapshotSha256: 'd'.repeat(64) } }),
  ).rejects.toThrow('outro conteúdo')
  await expect(f.publish({ owner: 'd'.repeat(64) })).rejects.toThrow('não encontrada')
  const other = await fixture('pro')
  await expect(
    f.publish({ source: other.input.source, requestId: crypto.randomUUID(), expectedVersion: 1 }),
  ).rejects.toThrow('outro projeto ou ambiente')
  const runtime = { ...f.project.runtime, releaseId: '2.0.0' }
  await expect(
    f.publish({
      source: JSON.stringify({ ...f.project, runtime }),
      approval: { ...f.input.approval, runtime },
      requestId: crypto.randomUUID(),
      expectedVersion: 1,
    }),
  ).rejects.toThrow('outro projeto ou ambiente')
  await expect(
    publicationCommand(f.bucket, {
      ...f.input,
      operation: 'promote',
      artifactId: 'e'.repeat(64),
      artifactHash: 'f'.repeat(64),
    }),
  ).rejects.toThrow('compilação JavaScript')
  expect((await currentPublishedSource(f.bucket, initial.playId))?.publication).toEqual(initial)
})

test('Python CAS, restore, disable, moderation and garbage collection preserve only retained immutable revisions', async () => {
  const f = await fixture('pro')
  const first = await f.publish()
  const results = await Promise.allSettled(
    [1, 2].map((n) =>
      f.publish({
        requestId: crypto.randomUUID(),
        expectedVersion: 1,
        source: JSON.stringify({ ...f.project, name: `Name ${n}` }),
      }),
    ),
  )
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
  expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1)
  expect([...f.objects.keys()].filter((key) => key.startsWith('published/'))).toHaveLength(4)
  const activation = {
    ...f.input,
    operation: 'activate',
    requestId: crypto.randomUUID(),
    expectedVersion: 2,
    revision: first.activeRevision,
    disabled: false,
  }
  const restored = await publicationCommand(f.bucket, activation)
  expect(restored).toMatchObject({ version: 3, activeRevision: first.activeRevision })
  expect(await publicationCommand(f.bucket, activation)).toEqual(restored)
  expect((await currentPublishedSource(f.bucket, first.playId))?.source).toBe(f.input.source)
  await publicationCommand(f.bucket, {
    ...activation,
    requestId: crypto.randomUUID(),
    expectedVersion: 3,
    disabled: true,
  })
  expect(await currentPublishedSource(f.bucket, first.playId)).toBeNull()
  for (const key of f.objects.keys()) f.uploaded.set(key, new Date(0))
  const orphan = `${publishedRevisionPrefix(first.playId, 'e'.repeat(64))}source.json`
  await f.bucket.put(orphan, 'orphan')
  f.uploaded.set(orphan, new Date(0))
  expect((await collectPublicationGarbage(f.bucket, 72 * 60 * 60 * 1000)).removed).toBe(1)
  expect([...f.objects.keys()].filter((key) => key.startsWith('published/'))).toHaveLength(4)
  await purgePublication(f.bucket, first.playId)
  expect(await currentPublishedSource(f.bucket, first.playId)).toBeNull()
  await expect(f.publish({ expectedVersion: 0, requestId: crypto.randomUUID() })).rejects.toThrow(
    'mudou',
  )
  expect([...f.objects.keys()].filter((key) => key.startsWith('published/'))).toHaveLength(0)
})

test('Python source resolution rejects missing/tampered source, manifest and approval binding', async () => {
  for (const mutation of ['source', 'missing-manifest', 'manifest', 'approval']) {
    const f = await fixture()
    const state = await f.publish()
    const prefix = publishedRevisionPrefix(state.playId, state.activeRevision)
    if (mutation === 'source') await f.bucket.put(`${prefix}source.json`, '{}')
    if (mutation === 'missing-manifest') await f.bucket.delete([`${prefix}manifest.json`])
    if (mutation === 'manifest') await f.bucket.put(`${prefix}manifest.json`, '{}')
    if (mutation === 'approval') {
      const stored = JSON.parse(await (await f.bucket.get(publicationKey(state.playId)))!.text())
      stored.revisions[0].approval.snapshotSha256 = 'f'.repeat(64)
      await f.bucket.put(publicationKey(state.playId), JSON.stringify(stored))
    }
    await expect(currentPublishedSource(f.bucket, state.playId)).rejects.toThrow()
    await expect(
      publicationCommand(f.bucket, {
        ...f.input,
        operation: 'source',
        revision: state.activeRevision,
      }),
    ).rejects.toThrow()
  }
})
