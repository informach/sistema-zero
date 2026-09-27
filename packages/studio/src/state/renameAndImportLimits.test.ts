import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { Project } from '#core'
import { fakeIdbPuts, fakeIdbWrites, fakeUseStore, resetFakeIdb } from '../testing/fakeIdbStore'

// Mesmo arranjo de mock de persistence.test.ts: bun:test não hoista mocks, então
// declaramos o objeto antes do mock.module e importamos os módulos sob teste
// DEPOIS, dinamicamente. O mock de idb-keyval NÃO é restaurado (registry global
// compartilhado; IndexedDB real não existe no happy-dom — no-op é seguro).
const idb = {
  createStore: mock((dbName: string) => fakeUseStore(dbName)),
  del: mock(async () => undefined),
  delMany: mock(async () => undefined),
  get: mock(async (): Promise<unknown> => undefined),
  getMany: mock(async (): Promise<unknown[]> => []),
  keys: mock(async (): Promise<unknown[]> => []),
  set: mock(async () => undefined),
  setMany: mock(async () => undefined),
}

mock.module('idb-keyval', () => ({
  createStore: idb.createStore,
  del: idb.del,
  delMany: idb.delMany,
  get: idb.get,
  getMany: idb.getMany,
  keys: idb.keys,
  set: idb.set,
  setMany: idb.setMany,
}))

const { PROJECT_FILE_LIMITS, useProjectStore } = await import('./projectStore')

function clearIdbMocks() {
  idb.createStore.mockClear()
  idb.del.mockClear()
  idb.delMany.mockClear()
  idb.get.mockClear()
  idb.getMany.mockClear()
  idb.keys.mockClear()
  idb.set.mockClear()
  idb.setMany.mockClear()
  resetFakeIdb()
}

describe('renameProject (escrita só-metadado, #4)', () => {
  beforeEach(() => {
    clearIdbMocks()
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  afterEach(() => {
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  it('renomeia sem reescrever files/state e preserva edições não salvas do editor aberto', async () => {
    // Registro de meta NO DISCO (snapshot antigo). O editor aberto já avançou os
    // arquivos para "edição em voo" — que NÃO pode ser sobrescrita pelo rename.
    idb.get.mockResolvedValueOnce({
      id: 'p-rename',
      name: 'Nome antigo',
      createdAt: 100,
      updatedAt: 200,
      mode: 'code',
      installedExtensions: [],
    })

    const live: Project = {
      id: 'p-rename',
      name: 'Nome antigo',
      createdAt: 100,
      updatedAt: 200,
      mode: 'code',
      files: {
        'index.html': '<h1>edição em voo</h1>',
        'style.css': 'h1 { color: lime; }',
        'script.js': 'console.log("não salvo");',
      },
      extraFiles: [{ name: 'extra.js', language: 'javascript', content: 'export const x = 1;' }],
      ir: null,
      blocksState: null,
      installedExtensions: [],
    }
    // Carrega a store viva e marca como sujo (há edição não salva).
    useProjectStore.setState({ project: live, isDirty: true, saveError: null })

    await useProjectStore.getState().renameProject('p-rename', 'Nome novo')

    // 1) A escrita no disco foi SÓ no registro de meta — nunca a gravação do projeto
    //    inteiro (que reescreveria meta+files+state a partir do snapshot estale do disco).
    expect(fakeIdbWrites()).toHaveLength(1)
    const puts = fakeIdbPuts(fakeIdbWrites()[0])
    expect([...puts.keys()]).toEqual(['sz:v2:project-meta:p-rename'])
    const value = puts.get('sz:v2:project-meta:p-rename') as Record<string, unknown>
    expect(value.name).toBe('Nome novo')
    // O registro de meta NÃO carrega files/state — eles ficam intocados no disco.
    expect(value).not.toHaveProperty('files')
    expect(value).not.toHaveProperty('blocksState')

    // 2) A store viva ganhou o nome novo SEM clobberar a edição em voo.
    const after = useProjectStore.getState().project
    expect(after?.name).toBe('Nome novo')
    expect(after?.files['index.html']).toBe('<h1>edição em voo</h1>')
    expect(after?.files['script.js']).toBe('console.log("não salvo");')
    expect(after?.extraFiles?.[0]?.content).toBe('export const x = 1;')
  })

  it('é no-op no disco quando não há registro de meta (projeto inexistente)', async () => {
    idb.get.mockResolvedValueOnce(undefined)

    await useProjectStore.getState().renameProject('inexistente', 'Qualquer')

    expect(idb.set).not.toHaveBeenCalled()
    expect(fakeIdbWrites()).toHaveLength(0)
  })
})

describe('importProjectFromJSON (teto combinado no import, #5)', () => {
  beforeEach(() => {
    clearIdbMocks()
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  afterEach(() => {
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  it('recusa importação acima do teto combinado sem descartar extras nem gravar', async () => {
    const big = 'a'.repeat(PROJECT_FILE_LIMITS.maxFileChars)
    const room = PROJECT_FILE_LIMITS.maxTotalChars - 3 * PROJECT_FILE_LIMITS.maxFileChars
    const extra = 'b'.repeat(Math.min(room, PROJECT_FILE_LIMITS.maxFileChars))

    const original = {
      name: 'Import gordo',
      files: {
        'index.html': big,
        'style.css': big,
        'script.js': big,
      },
      extraFiles: [
        { name: 'um.js', content: extra },
        { name: 'dois.js', content: extra },
      ],
    }
    await expect(useProjectStore.getState().importProjectFromJSON(original)).rejects.toThrow()
    expect(original.extraFiles.map((file) => file.name)).toEqual(['um.js', 'dois.js'])
    expect(fakeIdbWrites()).toHaveLength(0)
  })
})
