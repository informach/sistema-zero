import { beforeEach, describe, expect, it } from 'bun:test'
import type { ProjectStorageScope } from './projectStorageRuntime'

// gameStorage faz bail cedo se `indexedDB` não existir (happy-dom). Damos um stub
// para o caminho real (createStore→get/set/del mockados) ser exercitado.
const globalWithIdb = globalThis as { indexedDB?: unknown }
globalWithIdb.indexedDB = globalWithIdb.indexedDB ?? {}

// Backend em memória POR BANCO: sem esta identidade o mock mascarava o bug em
// que projetos namespaced e gameStorage escreviam em bancos diferentes.
const backends = new Map<string, Map<string, unknown>>()
function backendFor(scope: ProjectStorageScope): Map<string, unknown> {
  let backend = backends.get(scope.identity)
  if (!backend) {
    backend = new Map()
    backends.set(scope.identity, backend)
  }
  return backend
}
const { createGameStorageRepository, gameStorageKey } = await import('./gameStorage')
const { captureProjectStorageScope, fenceGameStorageDelete, setProjectStorageNamespace } =
  await import('./projectStorageRuntime')

const repository = createGameStorageRepository({
  get: async (key, scope) => backendFor(scope).get(key),
  set: async (key, value, scope) => {
    backendFor(scope).set(key, value)
  },
  delete: async (key, scope) => {
    backendFor(scope).delete(key)
  },
})
const { load: loadGameStorage, write: writeGameStorage, delete: deleteGameStorage } = repository

function currentBackend(): Map<string, unknown> {
  return backendFor(captureProjectStorageScope())
}

describe('gameStorage', () => {
  beforeEach(() => {
    backends.clear()
    setProjectStorageNamespace('')
  })

  it('round-trip: writeGameStorage → loadGameStorage', async () => {
    await writeGameStorage('proj-1', { fome: '7', nome: 'Rex' })
    expect(currentBackend().get(gameStorageKey('proj-1'))).toEqual({ fome: '7', nome: 'Rex' })
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
    expect(currentBackend().has(gameStorageKey('proj-1'))).toBe(true)
    await writeGameStorage('proj-1', {})
    expect(currentBackend().has(gameStorageKey('proj-1'))).toBe(false)
  })

  it('deleteGameStorage remove o registro', async () => {
    await writeGameStorage('proj-1', { a: '1' })
    await deleteGameStorage('proj-1')
    expect(currentBackend().has(gameStorageKey('proj-1'))).toBe(false)
    expect(await loadGameStorage('proj-1')).toEqual({})
  })

  it('projectId vazio é no-op seguro', async () => {
    expect(await loadGameStorage('')).toEqual({})
    await writeGameStorage('', { a: '1' })
    expect(backends.size).toBe(0)
  })

  it('lê registro corrompido como {} (sanitiza)', async () => {
    const backend = currentBackend()
    backend.set(gameStorageKey('proj-1'), 'não é objeto')
    expect(await loadGameStorage('proj-1')).toEqual({})
    backend.set(gameStorageKey('proj-2'), { ok: '1', bad: { nested: true } })
    expect(await loadGameStorage('proj-2')).toEqual({ ok: '1' })
  })

  it('isola gameStorage por namespace e o delete remove do banco correto', async () => {
    setProjectStorageNamespace('alice')
    await writeGameStorage('mesmo-id', { dono: 'alice' })

    setProjectStorageNamespace('bob')
    expect(await loadGameStorage('mesmo-id')).toEqual({})
    await writeGameStorage('mesmo-id', { dono: 'bob' })

    setProjectStorageNamespace('alice')
    expect(await loadGameStorage('mesmo-id')).toEqual({ dono: 'alice' })
    await deleteGameStorage('mesmo-id')
    expect(await loadGameStorage('mesmo-id')).toEqual({})

    setProjectStorageNamespace('bob')
    expect(await loadGameStorage('mesmo-id')).toEqual({ dono: 'bob' })
  })

  it('um write do preview que chega APÓS o delete não ressuscita o registro órfão', async () => {
    // Modela a corrida M6: o delete do projeto e um flush do localStorage do
    // bichinho (preview) acontecem juntos. Com a serialização por id + cerca de
    // exclusão, o write tardio é DESCARTADO — não recria sz:game-storage:<id>.
    const scope = captureProjectStorageScope()
    fenceGameStorageDelete(scope, 'race-1')
    await deleteGameStorage('race-1')
    // Flush do preview que escapou (timer do storage não cancelado) chega depois.
    await writeGameStorage('race-1', { fome: '9' })

    expect(currentBackend().has(gameStorageKey('race-1'))).toBe(false)
    expect(await loadGameStorage('race-1')).toEqual({})
  })

  it('um write enfileirado ANTES do delete é varrido pelo delMany (sem órfão)', async () => {
    // O write chega primeiro e grava; o delete vem logo atrás no MESMO mutex de
    // escrita por id e o delMany apaga a chave recém-escrita. Sem órfão.
    const writing = writeGameStorage('race-2', { fome: '3' })
    const deleting = deleteGameStorage('race-2')
    await Promise.all([writing, deleting])

    expect(currentBackend().has(gameStorageKey('race-2'))).toBe(false)
    expect(await loadGameStorage('race-2')).toEqual({})
  })
})
