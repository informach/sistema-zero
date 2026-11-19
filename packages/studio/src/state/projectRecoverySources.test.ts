import { expect, test } from 'bun:test'
import { IDBFactory } from 'fake-indexeddb'
import { buildProProject } from '../core/proProject'
import { localSnapshotsEqual } from '../project-migrations/localTransaction'
import {
  conditionalGeneration,
  readAllKeys,
  readValue,
  writeInOneTransaction,
} from './idbTransaction'
import { decodeProjectJsonGraph } from './projectJsonGraphDecode'
import { commitProjectRecovery, type RecoveryWrite } from './projectStorageCoordinator'
import { projectFilesKey, projectMetaKey, projectRecoveryKey } from './projectStorageKeys'
import { projectStorageEntries } from './projectStorageRecords'
import type { ProjectStorageScope } from './projectStorageRuntime'

for (const version of [3, 4] as const)
  for (const future of [false, true])
    test(`ancestral archive preserves storage namespace and future format: v${version}/${future}`, async () => {
      const identity = `ancestor-${crypto.randomUUID()}`
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = new IDBFactory().open(identity, 1)
        request.onupgradeneeded = () => request.result.createObjectStore('kv')
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      const scope: ProjectStorageScope = {
        identity,
        namespace: '',
        store: (mode, callback) =>
          Promise.resolve(callback(database.transaction('kv', mode).objectStore('kv'))),
      }
      try {
        const project = buildProProject(
          'ancestor-project',
          'Ancestor',
          { 'main.ts': { kind: 'file', content: 'parent' } },
          'dev',
          'vanilla-vite',
        )
        const parent: RecoveryWrite = {
          version: 1,
          projectId: project.id,
          head: { version: 1, writer: 'parent', token: 'parent-token', base: null, sequence: 1 },
          applications: [],
          write: {
            puts: projectStorageEntries(project, version).map(([key, value]) => [
              key,
              future && key === projectMetaKey(project.id, version)
                ? { ...(value as object), formatVersion: 9999 }
                : value,
            ]),
          },
        }
        const parentKey = projectRecoveryKey(project.id, 'parent', version)
        await readValue(scope.store, parentKey) // Opening prepares the transport before synchronous writes.
        await writeInOneTransaction(scope.store, { puts: [[parentKey, parent]] })
        const child: RecoveryWrite = {
          ...parent,
          head: { ...parent.head, writer: 'child', token: 'child-token', sequence: 2 },
          replacesRecovery: [{ key: parentKey, token: parent.head.token }],
          write: { puts: projectStorageEntries({ ...project, name: 'Descendant' }, version) },
        }
        const operation = commitProjectRecovery(
          scope,
          child,
          conditionalGeneration(identity),
          false,
          undefined,
          version,
        )
        if (future) {
          await expect(operation).rejects.toThrow()
          expect(localSnapshotsEqual(await readValue(scope.store, parentKey), parent)).toBe(true)
          expect(await readValue(scope.store, projectFilesKey(project.id, version))).toBeUndefined()
        } else {
          await operation
          expect(await readValue(scope.store, parentKey)).toBeUndefined()
          const prefix =
            version === 4
              ? `sz:v4:project-backup:${project.id}:recovery-`
              : `sz:project-backup:${project.id}:recovery-`
          const keys = (await readAllKeys(scope.store)).filter((key) =>
            String(key).startsWith(prefix),
          )
          expect(keys).toHaveLength(1)
          const archive = (await readValue(scope.store, keys[0]!)) as { encoded: string }
          expect(localSnapshotsEqual(decodeProjectJsonGraph(archive!.encoded), parent)).toBe(true)
        }
      } finally {
        database.close()
      }
    })
