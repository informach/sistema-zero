import { describe, expect, it } from 'bun:test'
import { createPixelBackgroundAsset, type PintaAsset } from '../core/project'
import { assetBytes, createEditorStore, setAutosaveDelayForTests } from './editorStore'

setAutosaveDelayForTests(10)
const waitForAutosave = () => Bun.sleep(60)

function makeAsset(): PintaAsset {
  return createPixelBackgroundAsset({ name: 'ceu', width: 4, height: 4 })
}

function edited(asset: PintaAsset): PintaAsset {
  if (asset.kind !== 'pixel-background') throw new Error('background esperado')
  const data = new Uint8Array(asset.bitmap.data)
  data[0] = (data[0] ?? 0) + 1
  return { ...asset, bitmap: { ...asset.bitmap, data } }
}

describe('editorStore — commit/undo/redo', () => {
  it('commit grava história e bumpa updatedAt', () => {
    const asset = makeAsset()
    const store = createEditorStore({ asset, persist: async () => {} })
    store.getState().commit(edited(asset))
    expect(store.getState().canUndo).toBe(true)
    expect(store.getState().asset.updatedAt).toBeGreaterThanOrEqual(asset.updatedAt)

    store.getState().undo()
    expect(store.getState().asset.kind === 'pixel-background' && store.getState().canRedo).toBe(
      true,
    )
    store.getState().redo()
    expect(store.getState().canRedo).toBe(false)
  })

  it('replace NÃO gasta undo', () => {
    const asset = makeAsset()
    const store = createEditorStore({ asset, persist: async () => {} })
    store.getState().replace(edited(asset))
    expect(store.getState().canUndo).toBe(false)
  })
})

describe('editorStore — autosave debounced + flush', () => {
  it('salva sozinho após o debounce e avisa a galeria (onSaved)', async () => {
    const asset = makeAsset()
    const persisted: PintaAsset[] = []
    const saved: PintaAsset[] = []
    const store = createEditorStore({
      asset,
      persist: async (a) => {
        persisted.push(a)
      },
      onSaved: (a) => saved.push(a),
    })
    store.getState().commit(edited(asset))
    await waitForAutosave()
    expect(persisted).toHaveLength(1)
    expect(saved).toHaveLength(1)
    expect(store.getState().saveState).toBe('saved')
  })

  it('flush salva imediatamente (sem esperar o debounce)', async () => {
    const asset = makeAsset()
    const persisted: PintaAsset[] = []
    const store = createEditorStore({
      asset,
      persist: async (a) => {
        persisted.push(a)
      },
    })
    store.getState().commit(edited(asset))
    await store.getState().flush()
    expect(persisted).toHaveLength(1)
  })

  it('falha de persistência vira badge de erro e continua sujo (retry no próximo flush)', async () => {
    const asset = makeAsset()
    let fail = true
    let saves = 0
    const store = createEditorStore({
      asset,
      persist: async () => {
        if (fail) throw new Error('quota cheia')
        saves += 1
      },
    })
    store.getState().commit(edited(asset))
    await store.getState().flush()
    expect(store.getState().saveState).toBe('error')

    fail = false
    await store.getState().flush()
    expect(saves).toBe(1)
    expect(store.getState().saveState).toBe('saved')
  })

  it('sem edição não persiste nada', async () => {
    const asset = makeAsset()
    let saves = 0
    const store = createEditorStore({
      asset,
      persist: async () => {
        saves += 1
      },
    })
    await store.getState().flush()
    await waitForAutosave()
    expect(saves).toBe(0)
  })
})

describe('assetBytes', () => {
  it('mede os bitmaps dominantes', () => {
    const asset = makeAsset()
    expect(assetBytes(asset)).toBeGreaterThan(16)
  })

  it('kinds vetoriais crescem com o número de shapes (orçamento do undo)', async () => {
    const { createVectorSpriteAsset, createVectorTilesetAsset } = await import('../core/project')
    const sprite = createVectorSpriteAsset({ name: 'v', frameSize: 32 })
    const empty = assetBytes(sprite)
    const shape = {
      id: 's1',
      type: 'rect' as const,
      x: 0,
      y: 0,
      w: 4,
      h: 4,
      rx: 0,
      fill: '#ff2121',
      stroke: null,
      opacity: 1,
      rotation: 0,
    }
    const animation = sprite.animations[0]
    if (!animation) throw new Error('animação esperada')
    const withShapes = {
      ...sprite,
      animations: [{ ...animation, frames: [[shape, shape, shape]] }],
    }
    expect(assetBytes(withShapes)).toBeGreaterThan(empty)

    const tileset = createVectorTilesetAsset({ name: 't', tileSize: 16 })
    expect(
      assetBytes({ ...tileset, tiles: [[shape], [shape]], solid: [false, false] }),
    ).toBeGreaterThan(assetBytes(tileset))
  })
})
