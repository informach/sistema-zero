/**
 * Kinds vetoriais no galleryStore: criação, duplicar com ids novos, relink do
 * tilemap → tileset vetorial no import e o lastStyle do "Criar novo".
 */
import { beforeEach, describe, expect, it } from 'bun:test'
import { clearIdbMock } from '../testing/idbMock'

const { createGalleryStore } = await import('./galleryStore')
const { setPintaStorageNamespace } = await import('./persistence')

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
})

describe('galleryStore — kinds vetoriais', () => {
  it('cria os 3 kinds vetoriais', async () => {
    const store = createGalleryStore()
    const sprite = await store
      .getState()
      .create({ kind: 'vector-sprite', name: 'heroi-v', frameSize: 64 })
    const background = await store
      .getState()
      .create({ kind: 'vector-background', name: 'fundo-v', width: 480, height: 360 })
    const tileset = await store
      .getState()
      .create({ kind: 'vector-tileset', name: 'pecas-v', tileSize: 32 })
    expect(sprite?.kind).toBe('vector-sprite')
    expect(background?.kind).toBe('vector-background')
    expect(tileset?.kind).toBe('vector-tileset')
    if (sprite?.kind !== 'vector-sprite') return
    expect(sprite.frameWidth).toBe(64)
    expect(sprite.animations[0]?.name).toBe('parado')
  })

  it('duplicar um vector-sprite regenera os ids das animações', async () => {
    const store = createGalleryStore()
    const original = await store
      .getState()
      .create({ kind: 'vector-sprite', name: 'heroi-v', frameSize: 32 })
    if (original?.kind !== 'vector-sprite') throw new Error('sprite esperado')
    const copy = await store.getState().duplicate(original.id)
    if (copy?.kind !== 'vector-sprite') throw new Error('cópia esperada')
    expect(copy.id).not.toBe(original.id)
    expect(copy.name).toBe('heroi-v-2')
    expect(copy.animations[0]?.id).not.toBe(original.animations[0]?.id)
  })

  it('importAssets religa o tilemap ao tileset VETORIAL restaurado', async () => {
    const seed = createGalleryStore()
    const tileset = await seed
      .getState()
      .create({ kind: 'vector-tileset', name: 'pecas-v', tileSize: 16 })
    if (!tileset) throw new Error('tileset esperado')
    const tilemap = await seed
      .getState()
      .create({ kind: 'tilemap', name: 'fase-v', tilesetId: tileset.id, cols: 2, rows: 2 })
    if (tilemap?.kind !== 'tilemap') throw new Error('tilemap esperado')

    // Importa os DOIS num perfil limpo: o tilesetId precisa apontar pro clone.
    clearIdbMock()
    const store = createGalleryStore()
    const result = await store.getState().importAssets([tileset, tilemap])
    expect(result.added).toBe(2)
    const imported = store.getState().assets
    const newTileset = imported.find((a) => a.kind === 'vector-tileset')
    const newTilemap = imported.find((a) => a.kind === 'tilemap')
    if (newTilemap?.kind !== 'tilemap' || !newTileset) throw new Error('import esperado')
    expect(newTilemap.tilesetId).toBe(newTileset.id)
    expect(newTileset.id).not.toBe(tileset.id)
  })

  it('lastStyle: começa pixel, acompanha o create e o load do mais recente', async () => {
    const store = createGalleryStore()
    expect(store.getState().lastStyle).toBe('pixel')
    await store
      .getState()
      .create({ kind: 'vector-background', name: 'fundo-v', width: 480, height: 360 })
    expect(store.getState().lastStyle).toBe('vector')
    // Tilemap não tem estilo próprio: não muda o lembrado.
    const tileset = await store
      .getState()
      .create({ kind: 'vector-tileset', name: 'pecas-v', tileSize: 16 })
    if (!tileset) throw new Error('tileset esperado')
    await store
      .getState()
      .create({ kind: 'tilemap', name: 'fase', tilesetId: tileset.id, cols: 2, rows: 2 })
    expect(store.getState().lastStyle).toBe('vector')

    // Um store NOVO (reload) deriva do asset mais recente com estilo.
    const reloaded = createGalleryStore()
    await reloaded.getState().load()
    expect(reloaded.getState().lastStyle).toBe('vector')
  })
})
