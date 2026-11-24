import { expect, test } from 'bun:test'
import { IDBFactory } from 'fake-indexeddb'
import { createEmptyProject } from '../core/project'
import { readValue, writeInOneTransaction } from './idbTransaction'
import {
  loadProjectBlocksById,
  loadProjectById,
  loadProjectMetaById,
  loadProjectShellById,
  loadProjectSummariesByIds,
  loadProjectSummaryById,
} from './persistence'
import { projectMetaKey } from './projectStorageKeys'
import type { ProjectStorageScope } from './projectStorageRuntime'

const loaders = {
  document: loadProjectById,
  shell: loadProjectShellById,
  metadata: loadProjectMetaById,
  blocks: loadProjectBlocksById,
  summary: loadProjectSummaryById,
  summaries: (id: string, scope: ProjectStorageScope) => loadProjectSummariesByIds([id], scope),
}
for (const [name, load] of Object.entries(loaders))
  test(`direct ${name} read migrates a flat v2 project without opening the list`, async () => {
    const identity = `historical-loader-${crypto.randomUUID()}`
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
    const id = 'flat-v2'
    const source = {
      ...createEmptyProject(id, 'Projeto antigo'),
      formatVersion: 1,
      mode: 'code' as const,
      ir: null,
      blocksState: null,
      files: {
        'index.html': '<html><body></body></html>',
        'style.css': '',
        'script.js': 'const pontos = 4;',
      },
    }
    try {
      await writeInOneTransaction(scope.store, { puts: [[`sz:v2:project:${id}`, source]] })
      expect(await readValue(scope.store, projectMetaKey(id))).toBeUndefined()
      await load(id, scope)
      expect(await readValue(scope.store, projectMetaKey(id))).toMatchObject({
        id,
        name: source.name,
      })
      expect(await readValue(scope.store, `sz:v2:project:${id}`)).toBeUndefined()
    } finally {
      database.close()
    }
  })
