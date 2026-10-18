import { describe, expect, test } from 'bun:test'
import { sha256Hex, studioContentFingerprint } from '@sistemazero/core/creations'
import { StudioProjectDocumentSchema } from '@sistemazero/core/studio/project-document'
import { IDBFactory } from 'fake-indexeddb'
import { preparePythonExecutionSnapshot } from '../runtime/python/snapshot'
import { prepareEditableStudioProject } from './editableProjectValidation'
import { documentFixture } from './fixtures/projectDocuments'
import { readValues } from './idbTransaction'
import {
  loadProjectAssetsById,
  loadProjectById,
  loadProjectShellById,
  loadProjectSummaryById,
  persistProject,
} from './persistence'
import {
  bindProjectToDurableHead,
  coordinatedProjectWrite,
  loadRecoverableProjectDraft,
  recoverProjectWrites,
  stageProjectExit,
} from './projectStorageCoordinator'
import { projectHeadKey, projectMetaKey, projectThumbKey } from './projectStorageKeys'
import { projectStorageEntries } from './projectStorageRecords'
import {
  advanceLocalRevision,
  ProjectWriteConflict,
  readLocalRevision,
} from './projectStorageRevision'
import type { ProjectStorageScope } from './projectStorageRuntime'

function database(): ProjectStorageScope {
  const identity = `documents-${crypto.randomUUID()}`
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const request = new IDBFactory().open(identity, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('kv')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return {
    identity,
    namespace: '',
    store: async (mode, callback) =>
      callback((await opening).transaction('kv', mode).objectStore('kv')),
  }
}

describe('language-independent project partitions and transaction coordinator', () => {
  for (const language of ['javascript', 'python'] as const)
    for (const kind of ['classic', 'pro'] as const)
      test(`${language}/${kind}: the public writer and language reader preserve a complete revision`, async () => {
        const scope = database()
        const fixture = documentFixture(language, kind)
        fixture.assets = [
          { id: 'hero', name: 'hero', kind: 'image', dataUrl: 'data:image/png;base64,aGVybw==' },
        ]
        fixture.coverAssetName = 'hero'
        const project = await prepareEditableStudioProject(fixture)
        if (!project) throw new Error('fixture')
        await persistProject(project, {}, scope)
        const loaded = await prepareEditableStudioProject(await loadProjectById(project.id, scope))
        expect(StudioProjectDocumentSchema.parse(loaded)).toEqual(
          StudioProjectDocumentSchema.parse(project),
        )
        expect(readLocalRevision(loaded!)?.lineage.durableToken).toBe(
          readLocalRevision(project)?.lineage.durableToken,
        )
        const edited = advanceLocalRevision(loaded!, { ...loaded!, name: 'Nova revisão' })
        await persistProject(edited, { exit: true }, scope)
        const recovered = await loadRecoverableProjectDraft(scope, project.id)
        expect(StudioProjectDocumentSchema.parse(recovered)).toEqual(
          StudioProjectDocumentSchema.parse(edited),
        )
        expect(readLocalRevision(recovered!)?.lineage.recovery).toBe(true)
        await recoverProjectWrites(scope, project.id)
        expect(
          StudioProjectDocumentSchema.parse(
            await prepareEditableStudioProject(await loadProjectById(project.id, scope)),
          ),
        ).toEqual(StudioProjectDocumentSchema.parse(edited))
        const a = (await prepareEditableStudioProject(await loadProjectById(project.id, scope)))!
        const b = (await prepareEditableStudioProject(await loadProjectById(project.id, scope)))!
        const winner = advanceLocalRevision(a, { ...a, name: 'Vencedor' })
        await persistProject(winner, {}, scope)
        const stale = advanceLocalRevision(b, { ...b, name: 'Outra aba' })
        await persistProject(stale, { exit: true }, scope)
        const copies = await recoverProjectWrites(scope, project.id)
        expect(copies).toHaveLength(1)
        expect(copies[0]).not.toBe(project.id)
        const preserved = StudioProjectDocumentSchema.parse(
          await loadProjectById(copies[0]!, scope),
        )
        expect({ ...preserved, id: stale.id, name: stale.name }).toEqual(
          StudioProjectDocumentSchema.parse(stale),
        )
        expect(StudioProjectDocumentSchema.parse(await loadProjectById(project.id, scope))).toEqual(
          StudioProjectDocumentSchema.parse(winner),
        )
        expect(await recoverProjectWrites(scope, project.id)).toEqual([])
      })

  for (const kind of ['classic', 'pro'] as const)
    test(`Python ${kind}: pending requirements remain editable after saving and reopening`, async () => {
      const scope = database()
      const source = documentFixture('python', kind)
      if (source.programmingLanguage !== 'python') throw new Error('fixture')
      source.assets = []
      const requirements = '# Ainda estou editando as dependências\r\n'
      if (source.kind === 'classic') source.files['requirements.txt'] = requirements
      else source.tree['requirements.txt'] = { kind: 'file', content: requirements }
      const project = (await prepareEditableStudioProject(source))!
      await persistProject(project, {}, scope)
      const reopened = (await prepareEditableStudioProject(
        await loadProjectById(source.id, scope),
      ))!
      expect(StudioProjectDocumentSchema.parse(reopened)).toEqual(
        StudioProjectDocumentSchema.parse(source),
      )
      await expect(preparePythonExecutionSnapshot(reopened)).rejects.toThrow('requirements.txt')
      if (!('python' in reopened)) throw new Error('fixture')
      const resolved = advanceLocalRevision(reopened, {
        ...reopened,
        python: {
          ...reopened.python,
          dependencyLock: {
            ...reopened.python.dependencyLock,
            requirementsSha256: await sha256Hex(requirements),
          },
        },
      })
      await persistProject(resolved, {}, scope)
      const snapshot = await preparePythonExecutionSnapshot(await loadProjectById(source.id, scope))
      expect(snapshot.configuration.python.dependencyLock.requirementsSha256).toBe(
        await sha256Hex(requirements),
      )
      expect(
        new TextDecoder().decode(
          snapshot.files.find((file) => file.path === 'requirements.txt')!.bytes,
        ),
      ).toBe(requirements)
    })

  test('closed Python materials keep their own audio budget during a Pinta synchronization read', async () => {
    const scope = database()
    const project = documentFixture('python', 'classic')
    project.assets = [
      {
        id: 'music',
        name: 'music',
        kind: 'audio',
        source: 'upload',
        proPath: 'music.wav',
        dataUrl: `data:audio/wav;base64,${'AAAA'.repeat(2_000_000)}`,
      },
    ]
    const validated = await prepareEditableStudioProject(project)
    if (!validated) throw new Error('fixture')
    await persistProject(validated, {}, scope)
    expect(await loadProjectAssetsById(project.id, scope)).toEqual(validated.assets!)
  })

  for (const language of ['javascript', 'python'] as const)
    for (const kind of ['classic', 'pro'] as const)
      test(`${language}/${kind}: full document, shell, JSON and fingerprint survive storage`, async () => {
        const scope = database()
        const project = documentFixture(language, kind)
        const fingerprint = await studioContentFingerprint(project)
        await coordinatedProjectWrite(project, { puts: projectStorageEntries(project) }, scope)
        const raw = await loadProjectById(project.id, scope)
        expect(raw).not.toHaveProperty('storageVersion')
        const loaded = StudioProjectDocumentSchema.parse(raw)
        expect(loaded).toEqual(StudioProjectDocumentSchema.parse(project))
        expect(StudioProjectDocumentSchema.parse(JSON.parse(JSON.stringify(raw)))).toEqual(
          StudioProjectDocumentSchema.parse(project),
        )
        expect(await studioContentFingerprint(raw)).toBe(fingerprint)
        const shell = StudioProjectDocumentSchema.parse(
          await loadProjectShellById(project.id, scope),
        )
        expect(shell).toEqual(StudioProjectDocumentSchema.parse(project))
        if (language === 'python' && kind === 'pro') {
          expect(raw).not.toHaveProperty('files')
          expect(raw).not.toHaveProperty('extraFiles')
          expect(raw?.proMeta).not.toHaveProperty('devScript')
        }
      })

  test('recovery commits Python source and environment together after exit', async () => {
    const scope = database()
    const project = documentFixture('python', 'pro')
    await coordinatedProjectWrite(project, { puts: projectStorageEntries(project) }, scope)
    if (project.programmingLanguage !== 'python' || project.kind !== 'pro')
      throw new Error('fixture')
    const edited = advanceLocalRevision(project, {
      ...project,
      python: { ...project.python, entrypoint: 'src/helper.py' },
      tree: { ...project.tree, 'src/helper.py': { kind: 'file' as const, content: 'n = 100' } },
    })
    await stageProjectExit(edited, { puts: projectStorageEntries(edited) }, scope)
    expect(await recoverProjectWrites(scope, project.id)).toEqual([project.id])
    expect(StudioProjectDocumentSchema.parse(await loadProjectById(project.id, scope))).toEqual(
      StudioProjectDocumentSchema.parse(edited),
    )
  })

  test('a stale writer cannot overwrite a configuration-only Python change', async () => {
    const scope = database()
    const first = documentFixture('python', 'pro')
    await coordinatedProjectWrite(first, { puts: projectStorageEntries(first) }, scope)
    const a = StudioProjectDocumentSchema.parse(await loadProjectById(first.id, scope))
    const b = StudioProjectDocumentSchema.parse(await loadProjectById(first.id, scope))
    await bindProjectToDurableHead(a, scope)
    await bindProjectToDurableHead(b, scope)
    if (a.programmingLanguage !== 'python') throw new Error('fixture')
    const next = advanceLocalRevision(a, {
      ...a,
      python: { ...a.python, entrypoint: 'src/helper.py' },
    })
    await coordinatedProjectWrite(next, { puts: projectStorageEntries(next) }, scope)
    const stale = advanceLocalRevision(b, { ...b, name: 'Stale' })
    await expect(
      coordinatedProjectWrite(stale, { puts: projectStorageEntries(stale) }, scope),
    ).rejects.toBeInstanceOf(ProjectWriteConflict)
    expect(StudioProjectDocumentSchema.parse(await loadProjectById(first.id, scope))).toEqual(
      StudioProjectDocumentSchema.parse(next),
    )
  })

  test('a failed partition write preserves the complete previous Python revision', async () => {
    const scope = database()
    const project = documentFixture('python', 'classic')
    await coordinatedProjectWrite(project, { puts: projectStorageEntries(project) }, scope)
    const previousHead = await readValues(scope.store, [projectHeadKey(project.id)])
    const edited = advanceLocalRevision(project, { ...project, name: 'Changed' })
    const failing: ProjectStorageScope = {
      ...scope,
      store: (mode, callback) =>
        scope.store(mode, (store) => {
          const put = store.put.bind(store)
          store.put = ((value: unknown, key?: IDBValidKey) => {
            if (key === projectMetaKey(project.id))
              throw new DOMException('Quota', 'QuotaExceededError')
            return put(value, key)
          }) as typeof store.put
          return callback(store)
        }),
    }
    await expect(
      coordinatedProjectWrite(edited, { puts: projectStorageEntries(edited) }, failing),
    ).rejects.toThrow('Quota')
    expect(await readValues(scope.store, [projectHeadKey(project.id)])).toEqual(previousHead)
    expect(StudioProjectDocumentSchema.parse(await loadProjectById(project.id, scope))).toEqual(
      StudioProjectDocumentSchema.parse(project),
    )
  })

  test('listing a Python project reads only lightweight metadata, never the dependency lock', async () => {
    const scope = database()
    const project = documentFixture('python', 'pro')
    await coordinatedProjectWrite(project, { puts: projectStorageEntries(project) }, scope)
    const [meta] = await readValues(scope.store, [projectMetaKey(project.id)])
    expect(meta).not.toHaveProperty('python')
    expect(meta).toHaveProperty('runtime', project.runtime)
    const reads: IDBValidKey[] = []
    const tracked: ProjectStorageScope = {
      ...scope,
      store: (mode, callback) =>
        scope.store(mode, (store) => {
          const get = store.get.bind(store)
          store.get = ((key: IDBValidKey) => {
            reads.push(key)
            return get(key)
          }) as typeof store.get
          return callback(store)
        }),
    }
    const summary = await loadProjectSummaryById(project.id, tracked)
    expect(summary).toMatchObject({
      programmingLanguage: 'python',
      kind: 'pro',
      runtime: project.runtime,
    })
    expect(reads).toEqual([projectMetaKey(project.id), projectThumbKey(project.id)])
  })
})
