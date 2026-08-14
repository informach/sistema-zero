import { describe, expect, it } from 'bun:test'
import {
  createPixelBackgroundAsset,
  createTilemapAsset,
  createTilesetAsset,
  type PintaAsset,
} from '../core/project'
import { assetBytes, createEditorStore as createEditorStoreBase } from './editorStore'

const waitForAutosave = () => Bun.sleep(60)
type EditorStoreOptions = Parameters<typeof createEditorStoreBase>[0]
const createEditorStore = (options: EditorStoreOptions) =>
  createEditorStoreBase({ ...options, autosaveDelayMs: 10 })

function makeAsset(): PintaAsset {
  return createPixelBackgroundAsset({ name: 'ceu', width: 4, height: 4 })
}

function edited(asset: PintaAsset): PintaAsset {
  if (asset.kind !== 'pixel-background') throw new Error('background esperado')
  const cel = asset.cels[0]
  if (!cel) throw new Error('cel esperado')
  const data = new Uint8Array(cel.data)
  data[0] = (data[0] ?? 0) + 1
  return { ...asset, cels: [{ ...cel, data }, ...asset.cels.slice(1)] }
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

describe('editorStore — commitLinked (transação cross-asset: tileset + mapas)', () => {
  it('undo restaura os mapas ANTES; redo reaplica os mapas DEPOIS', () => {
    const tileset = createTilesetAsset({ name: 'pecas', tileSize: 16 })
    const mapBefore = createTilemapAsset({ name: 'fase', tilesetId: tileset.id, cols: 2, rows: 1 })
    const mapAfter = { ...mapBefore, updatedAt: mapBefore.updatedAt + 1 }
    const store = createEditorStore({
      asset: tileset,
      persist: async () => {},
    })

    store.getState().commitLinked(
      { ...tileset, updatedAt: tileset.updatedAt + 1 },
      {
        before: [mapBefore],
        after: [mapAfter],
      },
    )
    expect(store.getState().linkedAssets?.[0]).toBe(mapAfter)
    expect(store.getState().canUndo).toBe(true)

    store.getState().undo()
    expect(store.getState().linkedAssets?.[0]).toBe(mapBefore)
    expect(store.getState().asset.id).toBe(tileset.id)

    store.getState().redo()
    expect(store.getState().linkedAssets?.[0]).toBe(mapAfter)
  })

  it('undo ATRAVÉS de uma edição comum (pincel) ainda restaura os mapas do remap anterior', () => {
    const tileset = createTilesetAsset({ name: 'pecas', tileSize: 16 })
    const mapBefore = createTilemapAsset({ name: 'fase', tilesetId: tileset.id, cols: 2, rows: 1 })
    const mapAfter = { ...mapBefore, updatedAt: mapBefore.updatedAt + 1 }
    const store = createEditorStore({
      asset: tileset,
      persist: async () => {},
    })

    // 1) add peça (remap): mapas A→B. 2) editar a peça (comum): mapas não mudam.
    store.getState().commitLinked(
      { ...tileset, updatedAt: tileset.updatedAt + 1 },
      {
        before: [mapBefore],
        after: [mapAfter],
      },
    )
    store
      .getState()
      .commit({ ...store.getState().asset, updatedAt: store.getState().asset.updatedAt + 1 })

    store.getState().undo() // desfaz o pincel
    store.getState().undo() // desfaz o add → mapas VOLTAM p/ o antes
    expect(store.getState().linkedAssets?.[0]).toBe(mapBefore)
  })

  it('editor sem assets ligados (sprite/mapa) segue igual — undo comum', () => {
    const asset = makeAsset()
    const store = createEditorStore({ asset, persist: async () => {} })
    store.getState().commit(edited(asset))
    store.getState().undo()
    expect(store.getState().canRedo).toBe(true) // zero regressão no caminho comum
  })

  it('persiste asset principal e mapas ligados na mesma operação observável', async () => {
    const tileset = createTilesetAsset({ name: 'pecas', tileSize: 16 })
    const mapBefore = createTilemapAsset({ name: 'fase', tilesetId: tileset.id, cols: 2, rows: 1 })
    const mapAfter = { ...mapBefore, updatedAt: mapBefore.updatedAt + 1 }
    const calls: Array<{ asset: PintaAsset; linked: readonly PintaAsset[] }> = []
    const store = createEditorStore({
      asset: tileset,
      persist: async (asset, linked) => {
        calls.push({ asset, linked })
      },
    })

    store
      .getState()
      .commitLinked(
        { ...tileset, updatedAt: tileset.updatedAt + 1 },
        { before: [mapBefore], after: [mapAfter] },
      )
    await store.getState().flush()
    expect(calls).toHaveLength(1)
    expect(calls[0]?.linked).toEqual([mapAfter])
    expect(store.getState().saveState).toBe('saved')
  })

  it('só publica asset principal e mapas ligados depois da persistência confirmar', async () => {
    const tileset = createTilesetAsset({ name: 'pecas', tileSize: 16 })
    const mapBefore = createTilemapAsset({ name: 'fase', tilesetId: tileset.id, cols: 2, rows: 1 })
    const mapAfter = { ...mapBefore, updatedAt: mapBefore.updatedAt + 1 }
    const published: PintaAsset[][] = []
    let confirmSave: (() => void) | undefined
    const store = createEditorStore({
      asset: tileset,
      persist: () =>
        new Promise<void>((resolve) => {
          confirmSave = resolve
        }),
      onSaved: (asset, linked) => published.push([asset, ...linked]),
    })

    store
      .getState()
      .commitLinked(
        { ...tileset, updatedAt: tileset.updatedAt + 1 },
        { before: [mapBefore], after: [mapAfter] },
      )
    expect(store.getState().saveState).toBe('pending')
    expect(store.getState().dirty).toBe(true)
    expect(store.getState().linkedAssets).toEqual([mapAfter])

    const flushing = store.getState().flush()
    await Bun.sleep(0)
    expect(published).toHaveLength(0)
    confirmSave?.()
    expect(await flushing).toEqual({ ok: true })
    expect(published).toEqual([[expect.objectContaining({ id: tileset.id }), mapAfter]])
    expect(store.getState().dirty).toBe(false)
    expect(store.getState().savedAsset).toBe(published[0]![0]!)
  })

  it('falha ao persistir mapas ligados mantém o editor sujo e mostra erro', async () => {
    const tileset = createTilesetAsset({ name: 'pecas', tileSize: 16 })
    const map = createTilemapAsset({ name: 'fase', tilesetId: tileset.id, cols: 2, rows: 1 })
    const store = createEditorStore({
      asset: tileset,
      persist: async (_asset, linked) => {
        if (linked.length > 0) throw new Error('quota cheia')
      },
    })
    store.getState().commitLinked(tileset, { before: [map], after: [map] })
    await store.getState().flush()
    expect(store.getState().saveState).toBe('error')
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
    const confirmedBeforeFailure = store.getState().savedAsset
    store.getState().commit(edited(asset))
    const failed = await store.getState().flush()
    expect(failed).toEqual({ ok: false, error: 'quota cheia' })
    expect(store.getState().saveState).toBe('error')
    expect(store.getState().dirty).toBe(true)
    expect(store.getState().savedAsset).toBe(confirmedBeforeFailure)

    fail = false
    expect(await store.getState().flush()).toEqual({ ok: true })
    expect(saves).toBe(1)
    expect(store.getState().saveState).toBe('saved')
    expect(store.getState().savedAsset).toBe(store.getState().asset)
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

  /**
   * ⚠️ A FIGURA carrega o PNG inteiro em base64. Sem contá-lo, o orçamento de
   * 16 MB do undo acharia que ela pesa ~128 bytes e a sessão comeria RAM em
   * silêncio — exatamente o modo de falha que o CLAUDE.md documenta.
   */
  it('conta o PNG da figura (senão o orçamento do undo mente)', async () => {
    const { createVectorBackgroundAsset } = await import('../core/project')
    const vazio = createVectorBackgroundAsset({ name: 'c', width: 64, height: 64 })
    const src = `data:image/png;base64,${'A'.repeat(50_000)}`
    const figura = {
      id: 'f1',
      type: 'image' as const,
      x: 0,
      y: 0,
      w: 32,
      h: 32,
      src,
      fill: 'none',
      stroke: null,
      opacity: 1,
      rotation: 0,
    }
    const comFigura = assetBytes({ ...vazio, shapes: [figura] })
    expect(comFigura - assetBytes(vazio)).toBeGreaterThanOrEqual(src.length * 2)
  })
})
