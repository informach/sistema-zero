import { expect, mock, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { prepareEditableStudioProject } from '@sistemazero/studio/editable-project-validation'
import type { ProjectAsset } from '@sistemazero/studio/project'
import { preparePythonExecutionSnapshot } from '@sistemazero/studio/python-snapshot'
import { IDBFactory } from 'fake-indexeddb'
import { authoringFixture } from '../../members/tests/fakes/studio-authoring-policy'
import { buildPythonSourceFiles } from '../../studio/src/export/pythonSource'
import { importProjectSnapshot } from '../../studio/src/projects/importSnapshot'
import { getProjectStorageScope } from '../../studio/src/state/projectStorageRuntime'
import { loadSanitizedProjectById } from '../../studio/src/state/projectStore'

mock.module('server-only', () => ({}))
process.env.JWT_HS256_SECRET ??= 'public-pinta-fixture-secret-with-32-characters'
const { studioPublicProject, publishStudioPythonRevision } = await import(
  '../src/server/studio-publication'
)

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH1QAAAAASUVORK5CYII=',
  'base64',
)
const sha = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex')
function derivedAsset(): ProjectAsset {
  return {
    id: 'derived-frame',
    name: 'heroi',
    kind: 'image',
    source: 'library',
    libId: 'personal:private-drawing',
    libOrigin: 'pinta',
    libRevision: 3,
    dataUrl: `data:image/png;base64,${png.toString('base64')}`,
    width: 1,
    height: 1,
    proPath: 'art/heroi.png',
    license: { name: 'CC0' },
    pintaImage: {
      recipe: {
        version: 1,
        algorithm: 'pinta-image-1',
        drawingId: 'private-drawing',
        selection: { kind: 'frame', animationId: 'private-animation', frameIndex: 0 },
        scale: 1,
      },
      provenance: { sourceSha256: 'a'.repeat(64), dependencies: [] },
      output: { mime: 'image/png', width: 1, height: 1, bytes: png.length, sha256: sha(png) },
    },
  }
}

for (const kind of ['classic', 'pro'] as const) {
  test(`public ${kind} detaches Pinta ownership while preserving playable and exported bytes`, async () => {
    const fixture = await authoringFixture('python', kind)
    const original = await prepareEditableStudioProject({
      ...fixture.project,
      assets: [derivedAsset()],
    })
    if (original?.programmingLanguage !== 'python') throw new Error('Python fixture required')
    const originalJson = JSON.stringify(original)
    const before = await preparePythonExecutionSnapshot(original)
    const projected = studioPublicProject(original)
    const canonical = await prepareEditableStudioProject(projected)
    if (canonical?.programmingLanguage !== 'python') throw new Error('Public Python unreadable')
    const after = await preparePythonExecutionSnapshot(canonical)
    expect(after.revision).toBe(before.revision)
    expect(after.files.map(({ path, bytes }) => [path, sha(bytes)])).toEqual(
      before.files.map(({ path, bytes }) => [path, sha(bytes)]),
    )
    expect(canonical.assets).toEqual([
      {
        id: 'derived-frame',
        name: 'heroi',
        kind: 'image',
        source: 'library',
        dataUrl: `data:image/png;base64,${png.toString('base64')}`,
        width: 1,
        height: 1,
        proPath: 'art/heroi.png',
        license: { name: 'CC0' },
      },
    ])
    expect(JSON.stringify(projected)).not.toContain('private-')
    const exported = await buildPythonSourceFiles(canonical, null)
    expect(exported.files['art/heroi.png']).toEqual(new Uint8Array(png))
    const previousIdb = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB')
    Object.defineProperty(globalThis, 'indexedDB', { value: new IDBFactory(), configurable: true })
    try {
      const namespace = `pinta-public-remix-${crypto.randomUUID()}`
      const remixed = await importProjectSnapshot(canonical, { namespace, silent: true })
      expect(remixed.project.id).not.toBe(canonical.id)
      expect(remixed.warnings).toEqual([])
      const reopened = await loadSanitizedProjectById(
        remixed.project.id,
        getProjectStorageScope(namespace),
      )
      if (reopened?.programmingLanguage !== 'python') throw new Error('Remix unreadable')
      expect(reopened.assets).toEqual(canonical.assets)
      const remixSnapshot = await preparePythonExecutionSnapshot(reopened)
      expect(remixSnapshot.files.map(({ path, bytes }) => [path, sha(bytes)])).toEqual(
        after.files.map(({ path, bytes }) => [path, sha(bytes)]),
      )
    } finally {
      if (previousIdb) Object.defineProperty(globalThis, 'indexedDB', previousIdb)
      else Reflect.deleteProperty(globalThis, 'indexedDB')
    }
    let authorizations = 0
    const stopBeforeNetwork = new Error('Authorized snapshot observed; no network in this test')
    const result = await publishStudioPythonRevision({
      project: original,
      playId: crypto.randomUUID(),
      owner: 'e'.repeat(64),
      requestId: crypto.randomUUID(),
      expectedVersion: 0,
      parentOrigin: 'https://kids.test',
      authorize: async (candidate) => {
        authorizations++
        expect(candidate.revision).toBe(after.revision)
        throw stopBeforeNetwork
      },
    }).then(
      () => null,
      (cause: unknown) => cause,
    )
    expect(authorizations).toBe(1)
    expect(result).toBe(stopBeforeNetwork)
    expect(JSON.stringify(original)).toBe(originalJson)
  })

  test(`public ${kind} validates private derivation integrity before redacting metadata`, async () => {
    const fixture = await authoringFixture('python', kind)
    const original = await prepareEditableStudioProject({
      ...fixture.project,
      assets: [derivedAsset()],
    })
    if (original?.programmingLanguage !== 'python') throw new Error('Python fixture required')
    for (const corruption of ['hash', 'recipe'] as const) {
      const corrupted = structuredClone(original)
      const metadata = corrupted.assets?.[0]?.pintaImage
      if (!metadata) throw new Error('Missing Pinta fixture metadata')
      if (corruption === 'hash') metadata.output.sha256 = '0'.repeat(64)
      else metadata.recipe.scale = 0
      let authorizations = 0
      const error = await publishStudioPythonRevision({
        project: corrupted,
        playId: crypto.randomUUID(),
        owner: 'e'.repeat(64),
        requestId: crypto.randomUUID(),
        expectedVersion: 0,
        parentOrigin: 'https://kids.test',
        authorize: async () => {
          authorizations++
          throw new Error('Must reject corrupt private metadata before authorization')
        },
      }).then(
        () => null,
        (cause: unknown) => cause,
      )
      expect(error).toBeInstanceOf(Error)
      expect(authorizations).toBe(0)
    }
  })
}
