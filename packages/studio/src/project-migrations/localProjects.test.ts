import { describe, expect, it } from 'bun:test'
import { IDBFactory } from 'fake-indexeddb'
import { createEmptyProject } from '../core/project'
import { readAllKeys, readValue, writeInOneTransaction } from '../state/idbTransaction'
import {
  projectBlocksKey,
  projectFilesKey,
  projectMetaKey,
  projectMigrationKey,
} from '../state/projectStorageKeys'
import type { ProjectStorageScope } from '../state/projectStorageRuntime'
import { migrateLocalProject, migrateLocalProjects } from './localProjects'
import { promoteLocalMigration } from './localTransaction'

function database(): ProjectStorageScope {
  const factory = new IDBFactory()
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open('migration', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('kv')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return {
    namespace: '',
    identity: 'migration',
    store: async (mode, callback) =>
      callback((await opening).transaction('kv', mode).objectStore('kv')),
  }
}

function oldProject() {
  return {
    ...createEmptyProject('old', 'Aventura'),
    mode: 'code' as const,
    ir: null,
    formatVersion: 1,
    files: {
      'index.html': '<html><body></body></html>',
      'style.css': '',
      'script.js': 'const pontos = 4;',
    },
  }
}

describe('corte local com IndexedDB transacional', () => {
  it('um original incompleto aparece como pendente e não impede converter os demais', async () => {
    const scope = database()
    const old = oldProject()
    await writeInOneTransaction(scope.store, {
      puts: [
        ['sz:project:old', old],
        ['sz:project-assets:incompleto', { assets: [] }],
      ],
    })
    const result = await migrateLocalProjects(scope, await readAllKeys(scope.store))
    expect(result.changed).toEqual(['old'])
    expect(result.pending).toMatchObject([{ id: 'incompleto', migrationPending: true }])
    expect(await readValue(scope.store, projectMetaKey('old'))).toBeDefined()
    expect(await readValue(scope.store, 'sz:project-assets:incompleto')).toEqual({ assets: [] })
  })
  it('separa blocos que estavam junto da IR e preserva seus valores e identificadores', async () => {
    const scope = database()
    const original = oldProject()
    const blocksState = {
      szBehaviorAreasVersion: 7,
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'sz_frame_start',
            id: 'start',
            inputs: {
              CHILDREN: {
                block: {
                  type: 'sz_js_var_create',
                  id: 'points',
                  fields: { NAME: 'pontos' },
                  inputs: {
                    VALUE: { shadow: { type: 'sz_val_number', id: 'value', fields: { NUM: 37 } } },
                  },
                },
              },
            },
          },
        ],
      },
    }
    await writeInOneTransaction(scope.store, {
      puts: [
        [
          'sz:project-meta:old',
          {
            id: 'old',
            name: original.name,
            createdAt: original.createdAt,
            updatedAt: original.updatedAt,
            mode: 'blocks',
            installedExtensions: [],
          },
        ],
        ['sz:project-files:old', { id: 'old', files: original.files }],
        ['sz:project-state:old', { id: 'old', ir: null, blocksState }],
      ],
    })
    await migrateLocalProject('old', scope)
    expect(await readValue(scope.store, projectBlocksKey('old'))).toEqual({
      id: 'old',
      blocksState,
    })
    expect(await readValue(scope.store, 'sz:project-state:old')).toBeUndefined()
  })
  it('promove o documento e o backup juntos, e uma aba antiga vira outra cópia', async () => {
    const scope = database()
    const original = oldProject()
    await writeInOneTransaction(scope.store, { puts: [['sz:project:old', original]] })
    await migrateLocalProject('old', scope)
    expect(await readValue(scope.store, 'sz:project:old')).toBeUndefined()
    expect(await readValue(scope.store, projectMetaKey('old'))).toMatchObject({
      id: 'old',
      formatVersion: 2,
    })
    const backupKeys = (await readAllKeys(scope.store)).filter((key) =>
      String(key).startsWith('sz:project-backup:'),
    )
    expect(backupKeys).toHaveLength(1)
    expect(await readValue(scope.store, backupKeys[0]!)).toMatchObject({
      records: [original, undefined, undefined, undefined, undefined, undefined, undefined],
    })
    const currentFiles = {
      id: 'old',
      files: { ...original.files, 'script.js': 'const pontos = 99;' },
    }
    await writeInOneTransaction(scope.store, {
      puts: [
        [projectFilesKey('old'), currentFiles],
        [
          'sz:project:old',
          { ...original, files: { ...original.files, 'script.js': 'const pontos = 7;' } },
        ],
      ],
    })
    await migrateLocalProject('old', scope)
    expect(await readValue(scope.store, projectFilesKey('old'))).toEqual(currentFiles)
    const metas = (await readAllKeys(scope.store)).filter((key) =>
      String(key).startsWith('sz:v2:project-meta:recuperado-'),
    )
    expect(metas).toHaveLength(1)
    const recovery = await readValue(scope.store, metas[0]!)
    expect(recovery).toMatchObject({ name: 'Aventura (edição recuperada)', formatVersion: 2 })
    await migrateLocalProject('old', scope)
    expect(
      (await readAllKeys(scope.store)).filter((key) =>
        String(key).startsWith('sz:v2:project-meta:recuperado-'),
      ),
    ).toEqual(metas)
  })

  it('um autosave antigo idêntico não ressuscita um projeto apagado', async () => {
    const scope = database()
    const original = oldProject()
    await writeInOneTransaction(scope.store, { puts: [['sz:project:old', original]] })
    await migrateLocalProject('old', scope)
    const marker = await readValue(scope.store, projectMigrationKey('old'))
    await writeInOneTransaction(scope.store, {
      deletes: [projectMetaKey('old')],
      puts: [
        [projectMigrationKey('old'), marker],
        ['sz:project:old', { ...original, updatedAt: original.updatedAt + 1 }],
      ],
    })
    await migrateLocalProject('old', scope)
    expect(
      (await readAllKeys(scope.store)).filter((key) =>
        String(key).startsWith('sz:v2:project-meta:'),
      ),
    ).toEqual([])
  })

  it('a promoção recusa alteração concorrente e falhas abortam backup e exclusão', async () => {
    const scope = database()
    await writeInOneTransaction(scope.store, { puts: [['source', { value: 2 }]] })
    expect(
      await promoteLocalMigration(scope.store, [['source', { value: 1 }]], {
        puts: [['target', 'old']],
        deletes: ['source'],
      }),
    ).toBe(false)
    expect(await readValue(scope.store, 'target')).toBeUndefined()
    await expect(
      promoteLocalMigration(scope.store, [['source', { value: 2 }]], {
        puts: [
          ['backup', 'saved'],
          ['target', () => {}],
        ],
        deletes: ['source'],
      }),
    ).rejects.toThrow()
    expect(await readValue(scope.store, 'backup')).toBeUndefined()
    expect(await readValue(scope.store, 'source')).toEqual({ value: 2 })
  })

  it('um projeto não conversível mantém os bytes históricos e nenhum registro atual', async () => {
    const scope = database()
    const original = {
      ...oldProject(),
      files: { ...oldProject().files, 'script.js': 'SZGame2D[metodo]()' },
    }
    await writeInOneTransaction(scope.store, { puts: [['sz:project:old', original]] })
    await expect(migrateLocalProject('old', scope)).rejects.toThrow()
    expect(await readValue(scope.store, 'sz:project:old')).toEqual(original)
    expect(await readValue(scope.store, projectMetaKey('old'))).toBeUndefined()
  })
})
