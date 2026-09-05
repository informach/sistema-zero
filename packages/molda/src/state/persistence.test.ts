import { beforeEach, describe, expect, spyOn, test } from 'bun:test'
import { assetBytes } from '../core/bytes'
import { makeModel, makeSky, makeTexture } from '../testing/fixtures'
import { clearIdbMock, idbMockDbNames, idbMockStore } from '../testing/idbMock'
import { createMemoryPersistence } from './memoryPersistence'
import {
  createMoldaPersistence,
  getDefaultMoldaPersistence,
  isMoldaAssetOpen,
  isStorageBudgetError,
  markMoldaAssetClosed,
  markMoldaAssetOpen,
  moldaDbNameFor,
  resetMoldaPersistenceForTests,
  setMoldaStorageNamespace,
  subscribeMoldaAssetOpenState,
} from './persistence'

beforeEach(() => {
  clearIdbMock()
  resetMoldaPersistenceForTests()
  setMoldaStorageNamespace('')
})

describe('persistência local', () => {
  test('salva e relê os três tipos, com Uint8Array intacto', async () => {
    const p = createMoldaPersistence({ namespace: 't1' })
    const model = makeModel()
    await p.save(model)
    await p.saveMany([makeTexture(), makeSky()])
    const all = await p.loadAll()
    expect(all.map((a) => a.kind).sort()).toEqual(['model', 'sky', 'texture'])
    const loaded = all.find((a) => a.id === model.id)
    expect(loaded).toEqual(model)
    if (loaded?.kind === 'model') {
      expect(loaded.parts[0]?.faces.py?.data).toBeInstanceOf(Uint8Array)
    }
  })

  test('namespaces são bancos separados', async () => {
    const a = createMoldaPersistence({ namespace: 'perfil-a' })
    const b = createMoldaPersistence({ namespace: 'perfil-b' })
    await a.save(makeSky())
    expect(await b.loadAll()).toEqual([])
    expect(idbMockDbNames()).toContain(`${moldaDbNameFor('perfil-a')}/assets`)
  })

  test('remove e removeMany', async () => {
    const p = createMoldaPersistence({ namespace: 't3' })
    await p.saveMany([makeModel(), makeTexture(), makeSky()])
    await p.remove('model-1')
    await p.removeMany(['texture-1'])
    expect((await p.loadAll()).map((a) => a.id)).toEqual(['sky-1'])
  })

  test('load(id) relê UMA criação pelo sanitize; ausente ou ilegível é null', async () => {
    const p = createMoldaPersistence({ namespace: 't3b' })
    const model = makeModel()
    await p.saveMany([model, makeSky()])
    const loaded = await p.load(model.id)
    expect(loaded).toEqual(model)
    if (loaded?.kind === 'model') expect(loaded.parts[0]?.faces.py?.data).toBeInstanceOf(Uint8Array)
    expect(await p.load('nope')).toBeNull()
    idbMockStore(moldaDbNameFor('t3b')).set('molda:asset:lixo', { kind: 'model', id: 'a:b' })
    expect(await p.load('lixo')).toBeNull()
    const memory = createMemoryPersistence([makeSky()])
    expect((await memory.load('sky-1'))?.kind).toBe('sky')
    expect(await memory.load('x')).toBeNull()
  })

  test('registro ilegível some sem derrubar os outros', async () => {
    const p = createMoldaPersistence({ namespace: 't4' })
    await p.save(makeSky())
    idbMockStore(moldaDbNameFor('t4')).set('molda:asset:lixo', { kind: 'model', id: 'a:b' })
    idbMockStore(moldaDbNameFor('t4')).set('outra-chave', 42)
    const all = await p.loadAll()
    expect(all.map((a) => a.id)).toEqual(['sky-1'])
  })

  test('orçamento: estourar lança MoldaStorageBudgetError antes de gravar', async () => {
    // Céu ≈ 512 B; modelo da fixture ≈ 1,1 KB; textura ≈ 320 B.
    const p = createMoldaPersistence({ namespace: 't5', maxBytes: 1_000 })
    await p.save(makeSky())
    let caught: unknown = null
    try {
      await p.save(makeModel())
    } catch (error) {
      caught = error
    }
    expect(isStorageBudgetError(caught)).toBe(true)
    expect((await p.loadAll()).map((a) => a.id)).toEqual(['sky-1'])
    // Substituir o MESMO registro conta a diferença, não a soma.
    await p.save({ ...makeSky(), name: 'outro-nome' })
    // saveMany é tudo ou nada.
    let batchError: unknown = null
    try {
      await p.saveMany([makeTexture(), makeModel()])
    } catch (error) {
      batchError = error
    }
    expect(isStorageBudgetError(batchError)).toBe(true)
    expect((await p.loadAll()).map((a) => a.id)).toEqual(['sky-1'])
  })

  test('saveMany conta ids repetidos uma vez e preserva a última versão', async () => {
    const first = makeSky()
    const last = { ...first, name: 'ceu-final' }
    const p = createMoldaPersistence({ namespace: 't5-duplicate', maxBytes: assetBytes(last) })

    await p.saveMany([first, last])

    expect(await p.loadAll()).toEqual([last])
  })

  test('a instância padrão é uma por namespace', () => {
    setMoldaStorageNamespace('x')
    const a = getDefaultMoldaPersistence()
    expect(getDefaultMoldaPersistence()).toBe(a)
    setMoldaStorageNamespace('y')
    expect(getDefaultMoldaPersistence()).not.toBe(a)
  })

  test('dispose fecha transmissor e receptores uma vez', () => {
    const close = spyOn(BroadcastChannel.prototype, 'close')
    const persistence = createMoldaPersistence({ namespace: 'descartavel' })
    const unsubscribe = persistence.subscribe?.(() => {})
    const dispose = Reflect.get(persistence, 'dispose')

    expect(typeof dispose).toBe('function')
    if (typeof dispose === 'function') {
      dispose.call(persistence)
      dispose.call(persistence)
    }
    unsubscribe?.()

    expect(close).toHaveBeenCalledTimes(2)
    close.mockRestore()
  })

  test('trocar o namespace libera a instância padrão anterior', () => {
    const close = spyOn(BroadcastChannel.prototype, 'close')
    setMoldaStorageNamespace('perfil-anterior')
    getDefaultMoldaPersistence()

    setMoldaStorageNamespace('perfil-novo')

    expect(close).toHaveBeenCalledTimes(1)
    close.mockRestore()
  })

  test('reset fecha os canais das instâncias padrão antes de esquecê-las', () => {
    const close = spyOn(BroadcastChannel.prototype, 'close')
    setMoldaStorageNamespace('padrao-descartavel')
    getDefaultMoldaPersistence()

    resetMoldaPersistenceForTests()

    expect(close).toHaveBeenCalledTimes(1)
    close.mockRestore()
  })

  test('escritas são serializadas por banco', async () => {
    const p = createMoldaPersistence({ namespace: 't7' })
    const sky = makeSky()
    await Promise.all([
      p.save(sky),
      p.save({ ...sky, name: 'b' }),
      p.remove(sky.id),
      p.save({ ...sky, name: 'd' }),
    ])
    const all = await p.loadAll()
    expect(all).toHaveLength(1)
    expect(all[0]?.name).toBe('d')
  })
})

describe('registro de criações abertas', () => {
  test('marca, consulta e avisa', () => {
    let calls = 0
    const off = subscribeMoldaAssetOpenState(() => {
      calls += 1
    })
    markMoldaAssetOpen('a')
    markMoldaAssetOpen('a')
    expect(isMoldaAssetOpen('a')).toBe(true)
    expect(calls).toBe(1)
    markMoldaAssetClosed('a')
    markMoldaAssetClosed('a')
    expect(isMoldaAssetOpen('a')).toBe(false)
    expect(calls).toBe(2)
    off()
  })
})
