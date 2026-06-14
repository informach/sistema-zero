import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { Project } from '#core'

// Mesmo arranjo de mock de persistence.test.ts: bun:test não hoista mocks, então
// declaramos o objeto antes do mock.module e importamos os módulos sob teste
// DEPOIS, dinamicamente. O mock de idb-keyval NÃO é restaurado (registry global
// compartilhado; IndexedDB real não existe no happy-dom — no-op é seguro).
const idb = {
  createStore: mock(() => ({ name: 'test-store' })),
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

    // 1) A escrita no disco foi SÓ no registro de meta — nunca setMany (que
    //    reescreveria meta+files+state a partir do snapshot estale do disco).
    expect(idb.setMany).not.toHaveBeenCalled()
    expect(idb.set).toHaveBeenCalledTimes(1)
    const [key, value] = idb.set.mock.calls[0] as unknown as [string, Record<string, unknown>]
    expect(key).toBe('sz:project-meta:p-rename')
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
    expect(idb.setMany).not.toHaveBeenCalled()
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

  it('apara extras no IMPORT até caber no teto combinado, não só no reopen', async () => {
    // Canônicos no limite por arquivo (2 MB cada = 6 MB no total) + dois extras
    // de 1,5 MB. Os extras sozinhos (3 MB) passam no sanitizer, mas a soma
    // combinada (9 MB) estoura MAX_TOTAL_CHARS (8 MB): o load apara extras do fim
    // até caber — e o import precisa fazer O MESMO, senão o registro no disco
    // diverge do que é aberto e o primeiro reopen derruba extras em silêncio.
    const big = 'a'.repeat(PROJECT_FILE_LIMITS.maxFileChars) // 2 MB
    const extra = 'b'.repeat(1_500_000) // 1,5 MB

    const imported = await useProjectStore.getState().importProjectFromJSON({
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
    })

    // 6 MB canônicos + 1,5 MB de um extra = 7,5 MB ≤ 8 MB → cabe exatamente 1.
    expect(imported.extraFiles?.map((f) => f.name)).toEqual(['um.js'])

    // E o que foi PERSISTIDO casa com o que foi devolvido (registro no disco já
    // aparado — não há divergência a aflorar no reopen).
    const lastArgs = idb.setMany.mock.calls.at(-1) as unknown as unknown[]
    const records = (lastArgs?.[0] ?? []) as [string, unknown][]
    const filesRecord = records.find(([k]) => k.startsWith('sz:project-files:'))?.[1] as
      | { extraFiles?: Array<{ name: string }> }
      | undefined
    expect(filesRecord?.extraFiles?.map((f) => f.name)).toEqual(['um.js'])
  })
})
