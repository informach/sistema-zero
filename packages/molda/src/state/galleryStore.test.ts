import { describe, expect, test } from 'bun:test'
import type { MoldaAsset } from '../core/model'
import { makeModel, makeSky, makeTexture } from '../testing/fixtures'
import { CHANGED_RELOAD_DELAY_MS, cloneWithNewIds, createGalleryStore } from './galleryStore'
import { createMemoryPersistence } from './memoryPersistence'
import { MoldaStorageBudgetError, markMoldaAssetClosed, markMoldaAssetOpen } from './persistence'

describe('galleryStore', () => {
  test('load ordena da mais recente para a mais antiga', async () => {
    const p = createMemoryPersistence([
      makeSky({ updatedAt: 1 }),
      makeModel({ updatedAt: 3 }),
      makeTexture({ updatedAt: 2 }),
    ])
    const store = createGalleryStore(p)
    await store.getState().load()
    expect(store.getState().loaded).toBe(true)
    expect(store.getState().assets.map((a) => a.id)).toEqual(['model-1', 'texture-1', 'sky-1'])
  })

  test('create normaliza o nome, garante unicidade e grava', async () => {
    const p = createMemoryPersistence()
    const store = createGalleryStore(p, { now: () => 10 })
    await store.getState().load()
    const first = await store.getState().create({ kind: 'sky', name: 'Céu Azul' })
    const second = await store.getState().create({ kind: 'sky', name: 'ceu azul' })
    expect(first.ok && first.asset.name).toBe('ceu-azul')
    expect(second.ok && second.asset.name).toBe('ceu-azul-2')
    expect(await store.getState().create({ kind: 'sky', name: '!!!' })).toEqual({
      ok: false,
      reason: 'invalid-name',
    })
    expect(p.snapshot()).toHaveLength(2)
    const model = await store.getState().create({ kind: 'model', name: 'nave', texelsPerUnit: 8 })
    expect(model.ok && model.asset.kind === 'model' && model.asset.texelsPerUnit).toBe(8)
    expect(model.ok && model.asset.kind === 'model' && model.asset.parts.length).toBe(1)
  })

  test('create devolve storage-budget quando a persistência estoura', async () => {
    const p = createMemoryPersistence()
    p.save = async () => {
      throw new MoldaStorageBudgetError()
    }
    const store = createGalleryStore(p)
    await store.getState().load()
    expect(await store.getState().create({ kind: 'sky', name: 'x' })).toEqual({
      ok: false,
      reason: 'storage-budget',
    })
  })

  test('rename: ok / taken / invalid / missing / open', async () => {
    const p = createMemoryPersistence([makeSky(), makeTexture()])
    const store = createGalleryStore(p)
    await store.getState().load()
    expect(await store.getState().rename('sky-1', 'grama')).toBe('taken')
    expect(await store.getState().rename('sky-1', '???')).toBe('invalid')
    expect(await store.getState().rename('nope', 'x')).toBe('missing')
    markMoldaAssetOpen('sky-1')
    expect(await store.getState().rename('sky-1', 'novo')).toBe('open')
    markMoldaAssetClosed('sky-1')
    expect(await store.getState().rename('sky-1', 'Novo Céu')).toBe('ok')
    expect(store.getState().getById('sky-1')?.name).toBe('novo-ceu')
    expect(p.snapshot().find((a) => a.id === 'sky-1')?.name).toBe('novo-ceu')
  })

  test('duplicate cria ids novos (peças e gêmeos remapeados) com nome -2', async () => {
    // Espelho ligado: a asa (x > 0) ganha um gêmeo no load (syncTwins); o corpo cruza x = 0 e não.
    const model = makeModel({ mirrorX: true })
    const p = createMemoryPersistence([model])
    const store = createGalleryStore(p)
    await store.getState().load()
    const copy = await store.getState().duplicate('model-1')
    expect(copy?.name).toBe('nave-2')
    expect(copy?.id).not.toBe('model-1')
    if (copy?.kind !== 'model') throw new Error('kind')
    const ids = new Set(copy.parts.map((part) => part.id))
    expect(ids.has('body')).toBe(false)
    expect(ids.has('wing')).toBe(false)
    expect(copy.parts).toHaveLength(3)
    const wing = copy.parts.find((part) => !part.mirrorOf && part.shape === 'wedge')
    const twin = copy.parts.find((part) => part.mirrorOf)
    expect(wing?.id).toBeDefined()
    expect(twin?.mirrorOf).toBe(wing?.id ?? '')
    expect(store.getState().assets).toHaveLength(2)
    expect(await store.getState().duplicate('nope')).toBeNull()
  })

  test('remove apaga da lista e do disco', async () => {
    const p = createMemoryPersistence([makeSky(), makeModel()])
    const store = createGalleryStore(p)
    await store.getState().load()
    await store.getState().remove('sky-1')
    expect(store.getState().assets.map((a) => a.id)).toEqual(['model-1'])
    expect(p.snapshot().map((a) => a.id)).toEqual(['model-1'])
  })

  test('importAssets: ids novos, nomes únicos, atômico', async () => {
    const p = createMemoryPersistence([makeSky()])
    const store = createGalleryStore(p)
    await store.getState().load()
    const result = await store.getState().importAssets([makeSky(), makeModel()])
    expect(result).toEqual({ imported: 2 })
    const names = store
      .getState()
      .assets.map((a) => a.name)
      .sort()
    expect(names).toEqual(['fim-de-tarde', 'fim-de-tarde-2', 'nave'])
    expect(new Set(store.getState().assets.map((a) => a.id)).size).toBe(3)

    p.saveMany = async () => {
      throw new MoldaStorageBudgetError()
    }
    const failed = await store.getState().importAssets([makeTexture()])
    expect(failed).toEqual({ imported: 0, reason: 'storage-budget' })
    expect(store.getState().assets).toHaveLength(3)
  })

  test('absorb atualiza sem gravar', async () => {
    const p = createMemoryPersistence([makeSky()])
    const store = createGalleryStore(p)
    await store.getState().load()
    const edited: MoldaAsset = { ...makeSky(), name: 'editado', updatedAt: 999 }
    store.getState().absorb(edited)
    expect(store.getState().getById('sky-1')?.name).toBe('editado')
    expect(p.snapshot()[0]?.name).toBe('fim-de-tarde')
  })

  test('attachPersistence: changed relê (debounce), sync liga o aviso e relê no fim', async () => {
    const p = createMemoryPersistence([makeSky()])
    const store = createGalleryStore(p)
    await store.getState().load()
    const detach = store.getState().attachPersistence()
    p.seed([makeSky(), makeModel()])
    p.emit({ type: 'changed', ids: ['model-1'] })
    p.emit({ type: 'changed' })
    expect(store.getState().assets).toHaveLength(1)
    await Bun.sleep(CHANGED_RELOAD_DELAY_MS + 30)
    expect(store.getState().assets).toHaveLength(2)

    p.emit({ type: 'sync-start' })
    expect(store.getState().syncing).toBe(true)
    p.seed([makeSky()])
    p.emit({ type: 'sync-end' })
    expect(store.getState().syncing).toBe(false)
    await Bun.sleep(0)
    await Bun.sleep(0)
    expect(store.getState().assets).toHaveLength(1)
    detach()
  })

  test('a releitura não regride uma criação ABERTA mais nova em memória', async () => {
    const p = createMemoryPersistence([makeSky({ updatedAt: 5 })])
    const store = createGalleryStore(p)
    await store.getState().load()
    markMoldaAssetOpen('sky-1')
    store.getState().absorb(makeSky({ updatedAt: 50, name: 'na-tela' }))
    await store.getState().reload()
    expect(store.getState().getById('sky-1')?.name).toBe('na-tela')
    markMoldaAssetClosed('sky-1')
    await store.getState().reload()
    expect(store.getState().getById('sky-1')?.name).toBe('fim-de-tarde')
  })

  test('cloneWithNewIds mantém o conteúdo', () => {
    const model = makeModel()
    const copy = cloneWithNewIds(model, 'copia', 7)
    expect(copy.kind === 'model' && copy.parts[0]?.faces.py?.data).toEqual(
      model.parts[0]?.faces.py?.data,
    )
    expect(copy.createdAt).toBe(7)
    expect(copy.name).toBe('copia')
  })
})
