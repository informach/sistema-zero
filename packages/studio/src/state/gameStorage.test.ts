import { beforeEach, describe, expect, it, mock } from 'bun:test'

// gameStorage faz bail cedo se `indexedDB` não existir (happy-dom). Damos um stub
// para o caminho real (createStore→get/set/del mockados) ser exercitado.
const globalWithIdb = globalThis as { indexedDB?: unknown }
globalWithIdb.indexedDB = globalWithIdb.indexedDB ?? {}

// Backend em memória: prova o round-trip write→load sem IndexedDB real.
const backend = new Map<string, unknown>()
const idb = {
  createStore: mock(() => ({ name: 'test-store' })),
  get: mock(async (key: string): Promise<unknown> => backend.get(key)),
  set: mock(async (key: string, value: unknown) => {
    backend.set(key, value)
  }),
  del: mock(async (key: string) => {
    backend.delete(key)
  }),
}

// delMany do delete escreve no MESMO backend (apaga as chaves do projeto),
// para o teste de corrida delete×write provar que nenhum write tardio ressuscita
// o registro.
const delMany = mock(async (kvKeys: string[]) => {
  for (const key of kvKeys) backend.delete(key)
})

mock.module('idb-keyval', () => ({
  createStore: idb.createStore,
  get: idb.get,
  set: idb.set,
  del: idb.del,
  // Exports usados por OUTROS módulos carregados no mesmo processo de teste.
  delMany,
  getMany: mock(async () => []),
  keys: mock(async () => []),
  setMany: mock(async () => undefined),
  update: mock(async () => undefined),
}))

const { loadGameStorage, writeGameStorage, deleteGameStorage, gameStorageKey } = await import(
  './gameStorage'
)
const { deleteProject } = await import('./persistence')

describe('gameStorage', () => {
  beforeEach(() => {
    backend.clear()
  })

  it('round-trip: writeGameStorage → loadGameStorage', async () => {
    await writeGameStorage('proj-1', { fome: '7', nome: 'Rex' })
    expect(backend.get(gameStorageKey('proj-1'))).toEqual({ fome: '7', nome: 'Rex' })
    expect(await loadGameStorage('proj-1')).toEqual({ fome: '7', nome: 'Rex' })
  })

  it('escopo por projeto (chaves não vazam entre projetos)', async () => {
    await writeGameStorage('proj-1', { x: '1' })
    await writeGameStorage('proj-2', { y: '2' })
    expect(await loadGameStorage('proj-1')).toEqual({ x: '1' })
    expect(await loadGameStorage('proj-2')).toEqual({ y: '2' })
  })

  it('clampa o payload antes de persistir (não confia no sandbox)', async () => {
    await writeGameStorage('proj-1', { ok: 'x', '': 'y', n: 1 as unknown as string })
    expect(await loadGameStorage('proj-1')).toEqual({ ok: 'x' })
  })

  it('mapa vazio apaga o registro em vez de gravar lixo', async () => {
    await writeGameStorage('proj-1', { a: '1' })
    expect(backend.has(gameStorageKey('proj-1'))).toBe(true)
    await writeGameStorage('proj-1', {})
    expect(backend.has(gameStorageKey('proj-1'))).toBe(false)
  })

  it('deleteGameStorage remove o registro', async () => {
    await writeGameStorage('proj-1', { a: '1' })
    await deleteGameStorage('proj-1')
    expect(backend.has(gameStorageKey('proj-1'))).toBe(false)
    expect(await loadGameStorage('proj-1')).toEqual({})
  })

  it('projectId vazio é no-op seguro', async () => {
    expect(await loadGameStorage('')).toEqual({})
    await writeGameStorage('', { a: '1' })
    expect(backend.size).toBe(0)
  })

  it('lê registro corrompido como {} (sanitiza)', async () => {
    backend.set(gameStorageKey('proj-1'), 'não é objeto')
    expect(await loadGameStorage('proj-1')).toEqual({})
    backend.set(gameStorageKey('proj-2'), { ok: '1', bad: { nested: true } })
    expect(await loadGameStorage('proj-2')).toEqual({ ok: '1' })
  })

  it('um write do preview que chega APÓS o delete não ressuscita o registro órfão', async () => {
    // Modela a corrida M6: o delete do projeto e um flush do localStorage do
    // bichinho (preview) acontecem juntos. Com a serialização por id + cerca de
    // exclusão, o write tardio é DESCARTADO — não recria sz:game-storage:<id>.
    await deleteProject('race-1')
    // Flush do preview que escapou (timer do storage não cancelado) chega depois.
    await writeGameStorage('race-1', { fome: '9' })

    expect(backend.has(gameStorageKey('race-1'))).toBe(false)
    expect(await loadGameStorage('race-1')).toEqual({})
  })

  it('um write enfileirado ANTES do delete é varrido pelo delMany (sem órfão)', async () => {
    // O write chega primeiro e grava; o delete vem logo atrás no MESMO mutex de
    // escrita por id e o delMany apaga a chave recém-escrita. Sem órfão.
    const writing = writeGameStorage('race-2', { fome: '3' })
    const deleting = deleteProject('race-2')
    await Promise.all([writing, deleting])

    expect(backend.has(gameStorageKey('race-2'))).toBe(false)
    expect(await loadGameStorage('race-2')).toEqual({})
  })
})
