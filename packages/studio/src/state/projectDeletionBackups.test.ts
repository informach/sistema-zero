import { expect, test } from 'bun:test'
import { IDBFactory } from 'fake-indexeddb'
import { createEmptyProject } from '../core/project'
import { listLocalProjectBackups } from '../project-migrations/localBackups'
import { migrateLocalV3Project } from '../project-migrations/localV3'
import { readAllKeys, writeInOneTransaction } from './idbTransaction'
import { deleteProject } from './persistence'
import { projectHeadKey } from './projectStorageKeys'
import { projectStorageEntries } from './projectStorageRecords'
import type { ProjectStorageScope } from './projectStorageRuntime'

// P3 da revisão de 20/11/2026, decisão da dona (21/11): as cópias de segurança que a migração e o
// arquivamento das cópias de saída deixam são apagadas junto com o projeto. Antes nenhum código as
// apagava, e um projeto apagado continuava ocupando o espaço de uma cópia inteira para sempre.

async function fixture() {
  const identity = `delete-backups-${crypto.randomUUID()}`
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = new IDBFactory().open(identity, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('kv')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  const scope: ProjectStorageScope = {
    identity,
    namespace: '',
    exitJournalStorage: globalThis.localStorage,
    store: (mode, callback) =>
      Promise.resolve(callback(database.transaction('kv', mode).objectStore('kv'))),
  }
  const migrated = async (id: string) => {
    const project = createEmptyProject(id, `Jogo ${id}`)
    project.files['script.js'] = `const origem = ${JSON.stringify(id)};`
    await writeInOneTransaction(scope.store, {
      puts: [
        ...projectStorageEntries(project, 3),
        [
          projectHeadKey(id, 3),
          { version: 1, token: `v3-${id}`, writer: 'aba-antiga', base: null, sequence: 1 },
        ],
      ],
    })
    await migrateLocalV3Project(id, scope)
    return project
  }
  return { scope, migrated, close: () => database.close() }
}

test('apagar o projeto leva junto as cópias de segurança dele, e só as dele', async () => {
  const f = await fixture()
  try {
    await f.migrated('jogo')
    // Outro projeto cujo id começa com o mesmo texto: o prefixo da chave não basta para decidir.
    await f.migrated('jogo:outro')
    // A cópia do formato antigo (bundles que migravam para o v3) mora em outra família de chave.
    const legacy = createEmptyProject('jogo', 'Jogo de antes do v3')
    await writeInOneTransaction(f.scope.store, {
      puts: [
        [
          `sz:project-backup:jogo:${'a'.repeat(64)}`,
          {
            version: 1,
            sourceId: 'jogo',
            capturedAt: 5,
            sourceKeys: ['sz:project:jogo'],
            records: [legacy],
          },
        ],
      ],
    })
    expect(await listLocalProjectBackups('jogo', f.scope)).toHaveLength(2)

    await deleteProject('jogo', f.scope)

    expect(await listLocalProjectBackups('jogo', f.scope)).toEqual([])
    const keys = (await readAllKeys(f.scope.store)).map(String)
    expect(keys.filter((key) => key.startsWith('sz:project-backup:jogo:'))).toEqual([])
    // As cópias do outro projeto continuam, e ele continua abrindo como antes.
    expect(await listLocalProjectBackups('jogo:outro', f.scope)).toHaveLength(1)
  } finally {
    f.close()
  }
})

test('uma chave da família das cópias sem o hash no fim não é deste projeto e fica', async () => {
  const f = await fixture()
  try {
    await f.migrated('jogo')
    // Nenhum produtor de cópia escreve uma chave assim: sem prova de que é deste projeto, fica.
    const unknown = 'sz:v4:project-backup:jogo:formato-futuro'
    await writeInOneTransaction(f.scope.store, {
      puts: [[unknown, { version: 9, sourceId: 'jogo', futuro: true }]],
    })

    await deleteProject('jogo', f.scope)

    expect(await listLocalProjectBackups('jogo', f.scope)).toEqual([])
    expect((await readAllKeys(f.scope.store)).map(String)).toContain(unknown)
  } finally {
    f.close()
  }
})

test('uma cópia ilegível não segura o apagar: ela sai junto, decidida pela chave', async () => {
  const f = await fixture()
  try {
    await f.migrated('jogo')
    // Conteúdo que nenhum leitor reconhece, na chave de cópia deste projeto (hash no fim).
    const ilegivel = `sz:v4:project-backup:jogo:recovery-${'b'.repeat(64)}`
    await writeInOneTransaction(f.scope.store, { puts: [[ilegivel, 'lixo']] })

    await deleteProject('jogo', f.scope)

    const keys = (await readAllKeys(f.scope.store)).map(String)
    expect(keys.filter((key) => key.startsWith('sz:v4:project-backup:jogo:'))).toEqual([])
  } finally {
    f.close()
  }
})
