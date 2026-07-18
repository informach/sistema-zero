import { beforeEach, describe, expect, it } from 'bun:test'
import { COPY } from '../core/copy'
import { PINTA_LIMITS } from '../core/project'
import { clearIdbMock } from '../testing/idbMock'

const { createGalleryStore } = await import('./galleryStore')
const { setPintaStorageNamespace, listAllAssets } = await import('./persistence')

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
})

describe('galleryStore — modelos prontos', () => {
  it('createFromTemplate cria o sprite com o nome escolhido', async () => {
    const store = createGalleryStore()
    const asset = await store
      .getState()
      .createFromTemplate({ templateId: 'heroi', name: 'meu-heroi' })
    expect(asset?.kind).toBe('pixel-sprite')
    expect(asset?.name).toBe('meu-heroi')
    expect(store.getState().assets).toHaveLength(1)
  })

  it('modelo de MAPA entra com o tileset companheiro (2 assets, tilesetId casado)', async () => {
    const store = createGalleryStore()
    const map = await store
      .getState()
      .createFromTemplate({ templateId: 'fase-plataforma', name: 'minha-fase' })
    expect(map?.kind).toBe('tilemap')
    expect(map?.name).toBe('minha-fase')
    const assets = store.getState().assets
    expect(assets).toHaveLength(2)
    const tileset = assets.find((a) => a.kind === 'tileset')
    if (map?.kind !== 'tilemap' || !tileset) throw new Error('esperava mapa + tileset')
    expect(map.tilesetId).toBe(tileset.id)
  })

  it('projectRef do Pensa é anexado a TODOS os assets do modelo', async () => {
    const store = createGalleryStore()
    await store.getState().createFromTemplate({
      templateId: 'fase-plataforma',
      name: 'fase',
      projectRef: { id: 'p1', name: 'Meu Jogo' },
    })
    for (const a of store.getState().assets) {
      expect(a.projectRef?.id).toBe('p1')
    }
  })

  it('quota: modelo de mapa (2 assets) barra quando não cabem os dois', async () => {
    const store = createGalleryStore()
    // Enche até faltar 1 slot.
    for (let i = 0; i < PINTA_LIMITS.maxAssets - 1; i += 1) {
      await store.getState().create({ kind: 'pixel-sprite', name: `s${i}`, frameSize: 16 })
    }
    const map = await store
      .getState()
      .createFromTemplate({ templateId: 'fase-plataforma', name: 'fase' })
    expect(map).toBeNull()
    expect(store.getState().mutateError).toBe(COPY.gallery.quotaFull)
  })

  it('nome colidindo ganha sufixo (não sobrescreve)', async () => {
    const store = createGalleryStore()
    await store.getState().create({ kind: 'pixel-sprite', name: 'heroi', frameSize: 16 })
    const asset = await store.getState().createFromTemplate({ templateId: 'heroi', name: 'heroi' })
    expect(asset?.name).toBe('heroi-2')
  })
})

describe('galleryStore — CRUD sobre o IndexedDB local', () => {
  it('create persiste, lista e devolve o asset', async () => {
    const store = createGalleryStore()
    const asset = await store
      .getState()
      .create({ kind: 'pixel-sprite', name: 'Meu Herói', frameSize: 16 })
    expect(asset).not.toBeNull()
    expect(asset?.name).toBe('meu-heroi')
    expect(store.getState().assets).toHaveLength(1)
    expect(await listAllAssets()).toHaveLength(1)
  })

  it('create com projectRef (Pensa) anexa o vínculo SANEADO e ele persiste', async () => {
    const store = createGalleryStore()
    const asset = await store.getState().create({
      kind: 'vector-sprite',
      name: 'heroi',
      frameSize: 64,
      projectRef: { id: 'pensa-1', name: 'Corrida Maluca', palette: ['#FF2121', 'lixo'] },
    })
    expect(asset?.projectRef?.name).toBe('Corrida Maluca')
    // Portão único: mesmo saneamento do load (hex minúsculo, inválido cai).
    expect(asset?.projectRef?.palette).toEqual(['#ff2121'])
    const listed = await listAllAssets()
    expect(listed[0]?.projectRef?.id).toBe('pensa-1')
  })

  it('nome inválido/duplicado → null + copy amigável', async () => {
    const store = createGalleryStore()
    expect(
      await store.getState().create({ kind: 'pixel-sprite', name: '!!!', frameSize: 16 }),
    ).toBeNull()
    expect(store.getState().mutateError).toBe(COPY.newAsset.nameInvalid)

    await store.getState().create({ kind: 'pixel-sprite', name: 'heroi', frameSize: 16 })
    expect(
      await store
        .getState()
        .create({ kind: 'pixel-background', name: 'Heroi', width: 8, height: 8 }),
    ).toBeNull()
    expect(store.getState().mutateError).toBe(COPY.newAsset.nameTaken)
  })

  it('rename valida unicidade e persiste', async () => {
    const store = createGalleryStore()
    const a = await store.getState().create({ kind: 'pixel-sprite', name: 'a', frameSize: 16 })
    await store.getState().create({ kind: 'pixel-sprite', name: 'b', frameSize: 16 })
    if (!a) throw new Error('asset esperado')

    expect(await store.getState().rename(a.id, 'b')).toBe(false)
    expect(store.getState().mutateError).toBe(COPY.newAsset.nameTaken)

    expect(await store.getState().rename(a.id, 'Novo Nome')).toBe(true)
    const listed = await listAllAssets()
    expect(listed.some((x) => x.name === 'novo-nome')).toBe(true)
  })

  it('duplicate cria ids NOVOS e nome com sufixo', async () => {
    const store = createGalleryStore()
    const a = await store.getState().create({ kind: 'pixel-sprite', name: 'heroi', frameSize: 16 })
    if (!a) throw new Error('asset esperado')
    const copy = await store.getState().duplicate(a.id)
    expect(copy).not.toBeNull()
    expect(copy?.name).toBe('heroi-2')
    expect(copy?.id).not.toBe(a.id)
    if (copy?.kind === 'pixel-sprite' && a.kind === 'pixel-sprite') {
      expect(copy.animations[0]?.id).not.toBe(a.animations[0]?.id)
    }
    expect(store.getState().assets).toHaveLength(2)
  })

  it('remove apaga do disco e da lista', async () => {
    const store = createGalleryStore()
    const a = await store.getState().create({ kind: 'pixel-sprite', name: 'heroi', frameSize: 16 })
    if (!a) throw new Error('asset esperado')
    expect(await store.getState().remove(a.id)).toBe(true)
    expect(store.getState().assets).toHaveLength(0)
    expect(await listAllAssets()).toHaveLength(0)
  })

  it('quota de assets barra a criação com copy gentil', async () => {
    const store = createGalleryStore()
    for (let i = 0; i < PINTA_LIMITS.maxAssets; i += 1) {
      await store.getState().create({ kind: 'pixel-sprite', name: `s-${i}`, frameSize: 8 })
    }
    expect(store.getState().assets).toHaveLength(PINTA_LIMITS.maxAssets)
    expect(
      await store.getState().create({ kind: 'pixel-sprite', name: 'estourou', frameSize: 8 }),
    ).toBeNull()
    expect(store.getState().mutateError).toBe(COPY.gallery.quotaFull)
  })

  it('load saneia registros corrompidos em silêncio', async () => {
    const store = createGalleryStore()
    await store.getState().create({ kind: 'pixel-sprite', name: 'bom', frameSize: 8 })
    const { idbMockDb } = await import('../testing/idbMock')
    idbMockDb('sistema-zero-pinta').set('pinta:asset:podre', { kind: 'pixel-sprite' })

    const fresh = createGalleryStore()
    await fresh.getState().load()
    expect(fresh.getState().assets).toHaveLength(1)
    expect(fresh.getState().assets[0]?.name).toBe('bom')
  })

  it('importAssets: se o persist do TILESET falhar, o mapa NÃO entra órfão', async () => {
    const { createTilesetAsset, createTilemapAsset } = await import('../core/project')
    const { setIdbWriteGuard } = await import('../testing/idbMock')
    const tileset = createTilesetAsset({ name: 'pecas', tileSize: 16 })
    const map = createTilemapAsset({ name: 'fase', tilesetId: tileset.id, cols: 2, rows: 1 })
    // Simula disco cheio SÓ no tileset (tilesets persistem antes dos mapas).
    setIdbWriteGuard((_key, value) => {
      if ((value as { kind?: string })?.kind === 'tileset') throw new Error('disco cheio')
    })
    const store = createGalleryStore()
    const res = await store.getState().importAssets([tileset, map])
    setIdbWriteGuard(null)
    // Nenhum mapa órfão: o tileset falhou → o mapa é pulado, não importado sem peças.
    expect(store.getState().assets.filter((a) => a.kind === 'tilemap')).toHaveLength(0)
    expect(res.added).toBe(0)
    expect(res.skipped).toBe(2)
  })
})

describe('setPintaStorageNamespace — isolamento por perfil', () => {
  it('galerias de perfis diferentes não se enxergam', async () => {
    setPintaStorageNamespace('perfil-a')
    const storeA = createGalleryStore()
    await storeA.getState().create({ kind: 'pixel-sprite', name: 'do-a', frameSize: 8 })

    setPintaStorageNamespace('perfil-b')
    const storeB = createGalleryStore()
    await storeB.getState().load()
    expect(storeB.getState().assets).toHaveLength(0)

    setPintaStorageNamespace('perfil-a')
    const backA = createGalleryStore()
    await backA.getState().load()
    expect(backA.getState().assets).toHaveLength(1)
  })
})
