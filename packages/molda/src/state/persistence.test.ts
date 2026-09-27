import { beforeEach, describe, expect, spyOn, test } from 'bun:test'
import { indexedAssetBytes, summarizeAsset } from '../core/assetSummary'
import { assetBytes } from '../core/bytes'
import { MoldaUnsupportedVersionError } from '../core/documentVersion'
import type { MoldaAsset } from '../core/model'
import { migrateLegacyModel } from '../scene/migrateLegacy'
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
  test('scene generation beats stale v1 summaries and exposes raw recovery without opening it', async () => {
    const p = createMoldaPersistence({ namespace: 'scene-readonly' })
    const disk = idbMockStore(moldaDbNameFor('scene-readonly'))
    const model = makeModel()
    const scene = migrateLegacyModel(model).document
    const originals = {
      formatVersion: 2,
      records: [{ key: `molda:record:${model.id}`, value: model }],
    }
    disk.set(`molda:record:${model.id}`, { ...model, name: 'antigo' })
    disk.set(`molda:summary:${model.id}`, { ...summarizeAsset(model), formatVersion: 1 })
    disk.set(`molda:scene:${model.id}`, scene)
    disk.set(`molda:scene-originals:${model.id}`, originals)
    const before = new Map(disk)
    expect(await p.listSummaries?.()).toEqual([])
    expect(p.getReadIssues?.()).toEqual([
      { id: model.id, name: model.name, status: 'unsupported', version: 2 },
    ])
    expect(await p.read?.(model.id)).toEqual({ status: 'unsupported', version: 2, raw: scene })
    expect(await p.loadRecovery?.(model.id)).toEqual(originals)
    await expect(p.load(model.id)).rejects.toBeInstanceOf(MoldaUnsupportedVersionError)
    expect(new Map(disk)).toEqual(before)
  })

  test('a scene tombstone hides late v1 records and their indexed summary', async () => {
    const p = createMoldaPersistence({ namespace: 'scene-deleted' })
    const disk = idbMockStore(moldaDbNameFor('scene-deleted'))
    const model = makeModel()
    disk.set(`molda:record:${model.id}`, model)
    disk.set(`molda:summary:${model.id}`, { ...summarizeAsset(model), formatVersion: 1 })
    disk.set(`molda:scene-deleted:${model.id}`, true)
    expect(await p.load(model.id)).toBeNull()
    expect(await p.loadAll()).toEqual([])
    expect(await p.listSummaries?.()).toEqual([])
    await expect(p.save(model)).rejects.toBeInstanceOf(MoldaUnsupportedVersionError)
  })

  test('summaries contain no document payload and follow saves, removals and namespaces', async () => {
    const p = createMoldaPersistence({ namespace: 'summaries' })
    await p.saveMany([makeModel(), makeSky(), makeTexture()])
    expect(await p.listSummaries?.()).toEqual(
      [makeModel(), makeSky(), makeTexture()].map(summarizeAsset),
    )
    await p.save({ ...makeModel(), name: 'resumo-atual' })
    await p.remove('sky-1')
    expect(await p.listSummaries?.()).toEqual([
      summarizeAsset({ ...makeModel(), name: 'resumo-atual' }),
      summarizeAsset(makeTexture()),
    ])
    expect(await createMoldaPersistence({ namespace: 'summary-other' }).listSummaries?.()).toEqual(
      [],
    )
  })

  test('listing legacy summaries never promotes or rewrites records and observes late old-tab edits', async () => {
    const p = createMoldaPersistence({ namespace: 'summaries-legacy' })
    const disk = idbMockStore(moldaDbNameFor('summaries-legacy'))
    const original = { ...makeModel(), unknown: 'keep' }
    disk.set('molda:document:model-1', original)
    expect(await p.listSummaries?.()).toEqual([summarizeAsset(makeModel())])
    expect([...disk]).toEqual([['molda:document:model-1', original]])
    disk.set('molda:document:model-1', { ...original, name: 'outra-aba' })
    expect((await p.listSummaries?.())?.[0]?.name).toBe('outra-aba')
  })

  test('an older indexed-unaware tab cannot change a promoted summary, original or deletion', async () => {
    const p = createMoldaPersistence({ namespace: 'summaries-isolated' })
    const disk = idbMockStore(moldaDbNameFor('summaries-isolated'))
    const original = { ...makeModel(), earliest: true }
    disk.set('molda:document:model-1', makeModel())
    disk.set('molda:recovery:model-1', original)
    await p.save({ ...makeModel(), name: 'promovido' })
    disk.set('molda:document:model-1', { ...makeModel(), name: 'antigo' })
    disk.delete('molda:recovery:model-1')
    disk.set('molda:deleted:model-1', true)
    expect(await p.loadRecovery?.('model-1')).toEqual(original)
    expect((await p.listSummaries?.())?.[0]?.name).toBe('promovido')
    expect((await p.load('model-1'))?.name).toBe('promovido')
    await p.remove('model-1')
    disk.set('molda:document:model-1', makeModel())
    disk.delete('molda:deleted:model-1')
    expect(await p.listSummaries?.()).toEqual([])
    expect(await p.load('model-1')).toBeNull()
  })

  test('missing, malformed and unsupported indexes fall back to guarded point reads', async () => {
    const p = createMoldaPersistence({ namespace: 'summary-recovery' })
    await p.saveMany([makeModel(), makeSky(), makeTexture()])
    const disk = idbMockStore(moldaDbNameFor('summary-recovery'))
    disk.delete('molda:summary:sky-1')
    disk.set('molda:summary:texture-1', {
      ...summarizeAsset(makeTexture()),
      id: 'wrong',
      formatVersion: 1,
    })
    const future = { ...makeModel(), formatVersion: 2, animations: ['keep'] }
    disk.set('molda:record:model-1', future)
    disk.set('molda:summary:model-1', { ...summarizeAsset(makeModel()), formatVersion: 2 })
    expect(await p.listSummaries?.()).toEqual([makeSky(), makeTexture()].map(summarizeAsset))
    expect(p.getReadIssues?.()).toEqual([
      { id: 'model-1', name: makeModel().name, status: 'unsupported', version: 2 },
    ])
    expect(await p.read?.('model-1')).toEqual({ status: 'unsupported', version: 2, raw: future })
    expect(disk.has('molda:summary:sky-1')).toBe(false)
  })

  test('writing over a stored undefined value retains its existence as a recovery record', async () => {
    const p = createMoldaPersistence({ namespace: 'undefined-write' })
    const disk = idbMockStore(moldaDbNameFor('undefined-write'))
    disk.set('molda:record:model-1', undefined)
    await p.save(makeModel())
    expect(disk.has('molda:record-recovery:model-1')).toBe(true)
    expect(disk.get('molda:record-recovery:model-1')).toBeUndefined()
  })

  test('a stored undefined value is corrupt, not permission to resurrect a legacy document', async () => {
    const p = createMoldaPersistence({ namespace: 'undefined-current' })
    const disk = idbMockStore(moldaDbNameFor('undefined-current'))
    disk.set('molda:asset:model-1', makeModel())
    disk.set('molda:document:model-1', undefined)
    expect(await p.read?.('model-1')).toEqual({ status: 'invalid', raw: undefined })
    expect(await p.load('model-1')).toBeNull()
    expect(await p.loadAll()).toEqual([])
    expect(p.getReadIssues?.()).toEqual([{ id: 'model-1', name: 'model-1', status: 'invalid' }])
  })

  test('future documents remain recoverable and reject all writes in an atomic batch', async () => {
    const p = createMoldaPersistence({ namespace: 'future' })
    const raw = { ...makeModel(), formatVersion: 2, animations: [{ name: 'andar' }] }
    const disk = idbMockStore(moldaDbNameFor('future'))
    disk.set('molda:asset:model-1', raw)
    expect(await p.read?.('model-1')).toEqual({ status: 'unsupported', version: 2, raw })
    await expect(p.load('model-1')).rejects.toBeInstanceOf(MoldaUnsupportedVersionError)
    await expect(p.saveMany([makeSky(), makeModel()])).rejects.toBeInstanceOf(
      MoldaUnsupportedVersionError,
    )
    expect(disk.get('molda:asset:model-1')).toEqual(raw)
    expect(await p.load('sky-1')).toBeNull()
  })

  test('lazy promotion retains the exact legacy original, only after a successful write', async () => {
    const p = createMoldaPersistence({ namespace: 'legacy' })
    const original = { ...makeModel(), oldMetadata: { keep: true } }
    const disk = idbMockStore(moldaDbNameFor('legacy'))
    disk.set('molda:asset:model-1', original)
    expect(await p.load('model-1')).toEqual(makeModel())
    expect(await p.loadRecovery?.('model-1')).toBeUndefined()
    const small = createMoldaPersistence({ namespace: 'legacy', maxBytes: 1 })
    await expect(small.save(makeModel())).rejects.toThrow()
    expect(disk.get('molda:asset:model-1')).toEqual(original)
    expect(await p.loadRecovery?.('model-1')).toBeUndefined()
    await p.save({ ...makeModel(), name: 'editado' })
    expect(await p.loadRecovery?.('model-1')).toEqual(original)
    expect(disk.get('molda:record:model-1')).toMatchObject({ formatVersion: 1, name: 'editado' })
    expect(disk.get('molda:asset:model-1')).toBeUndefined()
    await p.save({ ...makeModel(), name: 'mais-edicoes' })
    expect(await p.loadRecovery?.('model-1')).toEqual(original)
  })

  test('canonical records win over late legacy writes and deletion prevents resurrection', async () => {
    const p = createMoldaPersistence({ namespace: 'old-tab' })
    const disk = idbMockStore(moldaDbNameFor('old-tab'))
    disk.set('molda:asset:model-1', makeModel())
    await p.save({ ...makeModel(), name: 'atual' })
    disk.set('molda:asset:model-1', { ...makeModel(), name: 'antigo' })
    expect((await p.load('model-1'))?.name).toBe('atual')
    expect((await p.loadAll()).map((a) => a.name)).toEqual(['atual'])
    await p.remove('model-1')
    disk.set('molda:asset:model-1', makeModel())
    expect(await p.load('model-1')).toBeNull()
    expect(await p.loadAll()).toEqual([])
    expect(await p.loadRecovery?.('model-1')).toBeUndefined()
  })

  test('an invalid canonical record never falls back to a legacy copy or a different id', async () => {
    const p = createMoldaPersistence({ namespace: 'invalid-current' })
    const disk = idbMockStore(moldaDbNameFor('invalid-current'))
    disk.set('molda:asset:model-1', makeModel())
    disk.set('molda:document:model-1', { ...makeModel(), id: 'wrong-id' })
    expect(await p.load('model-1')).toBeNull()
    expect(await p.loadAll()).toEqual([])
    expect(p.getReadIssues?.()).toEqual([
      { id: 'model-1', name: makeModel().name, status: 'invalid' },
    ])
  })

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

  test('native and memory persistence share the atomic revision contract', async () => {
    for (const p of [
      createMemoryPersistence(),
      createMoldaPersistence({ namespace: 'conditional-contract' }),
    ]) {
      const asset = makeSky()
      const next = { ...asset, updatedAt: asset.updatedAt + 1 }
      expect(await p.saveIfUnchanged(asset, null)).toBe(true)
      expect(await p.saveIfUnchanged(next, null)).toBe(false)
      expect(await p.saveIfUnchanged(next, asset.updatedAt)).toBe(true)
      expect(await p.removeIfUnchanged(asset.id, asset.updatedAt)).toBe(false)
      expect(await p.load(asset.id)).toEqual(next)
      expect(await p.removeIfUnchanged(asset.id, next.updatedAt)).toBe(true)
      expect(await p.load(asset.id)).toBeNull()
      p.dispose?.()
    }
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

  test('duas instâncias carregadas compartilham a autoridade do orçamento', async () => {
    const firstAsset = makeTexture()
    const secondAsset = { ...makeTexture(), id: 'texture-2', name: 'pedra' }
    const eachBytes = indexedAssetBytes(firstAsset)
    const maxBytes = eachBytes + Math.floor(eachBytes / 2)
    const first = createMoldaPersistence({ namespace: 't5-shared', maxBytes })
    const second = createMoldaPersistence({ namespace: 't5-shared', maxBytes })
    await Promise.all([first.loadAll(), second.loadAll()])

    await first.save(firstAsset)
    let caught: unknown = null
    try {
      await second.save(secondAsset)
    } catch (error) {
      caught = error
    }

    expect(isStorageBudgetError(caught)).toBe(true)
    expect((await first.loadAll()).map((asset) => asset.id)).toEqual([firstAsset.id])
  })

  test('duas gravações simultâneas no mesmo banco não ultrapassam o orçamento', async () => {
    const firstAsset = makeTexture()
    const secondAsset = { ...makeTexture(), id: 'texture-2', name: 'pedra' }
    const eachBytes = indexedAssetBytes(firstAsset)
    const maxBytes = eachBytes + Math.floor(eachBytes / 2)
    const first = createMoldaPersistence({ namespace: 't5-race', maxBytes })
    const second = createMoldaPersistence({ namespace: 't5-race', maxBytes })
    await Promise.all([first.loadAll(), second.loadAll()])

    const settled = await Promise.allSettled([first.save(firstAsset), second.save(secondAsset)])

    expect(settled.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(settled.filter((result) => result.status === 'rejected')).toHaveLength(1)
    const stored = await first.loadAll()
    expect(stored).toHaveLength(1)
    expect(assetBytes(stored[0] as MoldaAsset)).toBeLessThanOrEqual(maxBytes)
  })

  test('saveMany conta ids repetidos uma vez e preserva a última versão', async () => {
    const first = makeSky()
    const last = { ...first, name: 'ceu-final' }
    const p = createMoldaPersistence({
      namespace: 't5-duplicate',
      maxBytes: indexedAssetBytes(last),
    })

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
