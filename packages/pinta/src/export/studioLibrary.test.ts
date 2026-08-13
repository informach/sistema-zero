import { beforeEach, describe, expect, it } from 'bun:test'
import {
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  createVectorBackgroundAsset,
  createVectorTilesetAsset,
} from '../core/project'
import { clearIdbMock } from '../testing/idbMock'
import { makeRect } from '../vector/shapes'
import type { StudioPayload } from './studioBridge'
import { validateStudioPayloadSize } from './studioBridge'

const { persistAsset, persistAssets, setPintaStorageNamespace } = await import(
  '../state/persistence'
)
const { exportAssetForStudio, listGalleryForStudio } = await import('./studioLibrary')

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
})

function redRect() {
  return makeRect({ x: 1, y: 1 }, { x: 9, y: 9 }, { fill: '#ff0000', stroke: null, opacity: 1 })
}

describe('listGalleryForStudio', () => {
  it('resume todos os desenhos com papel/estilo e ordena por mais recente', async () => {
    const tileset = createTilesetAsset({ name: 'pecas', tileSize: 16 })
    const sprite = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
    const tilemap = createTilemapAsset({ name: 'fase', tilesetId: tileset.id, cols: 2, rows: 2 })
    sprite.updatedAt = 3000
    tileset.updatedAt = 2000
    tilemap.updatedAt = 1000
    await persistAssets([tileset, sprite, tilemap])

    const list = await listGalleryForStudio()
    expect(list.map((s) => s.name)).toEqual(['heroi', 'pecas', 'fase'])
    expect(list[0]).toMatchObject({ role: 'sprite', style: 'pixel' })
    expect(list[1]).toMatchObject({ role: 'tileset', style: 'pixel' })
    // tilemap é papel dos DOIS estilos → style null.
    expect(list[2]).toMatchObject({ role: 'tilemap', style: null })
  })

  it('leva o nome do jogo do Pensa (projectRef) quando o desenho é de um jogo', async () => {
    const doJogo = createPixelSpriteAsset({ name: 'vinculado', frameSize: 8 })
    doJogo.projectRef = { id: 'jogo-1', name: 'meu-jogo' }
    const avulso = createPixelSpriteAsset({ name: 'avulso', frameSize: 8 })
    await persistAssets([doJogo, avulso])

    const list = await listGalleryForStudio()
    expect(list.find((s) => s.name === 'vinculado')?.projectName).toBe('meu-jogo')
    expect(list.find((s) => s.name === 'avulso')?.projectName).toBeUndefined()
  })

  it('miniatura vetorial sai como SVG dataUrl (sem canvas); raster vira null no happy-dom', async () => {
    const vetor = createVectorBackgroundAsset({ name: 'ceu', width: 20, height: 10 })
    vetor.shapes.push(redRect())
    const pixel = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
    const vTileset = createVectorTilesetAsset({ name: 'pecas-v', tileSize: 16 })
    const vMapa = createTilemapAsset({
      name: 'fase-v',
      tilesetId: vTileset.id,
      cols: 2,
      rows: 1,
    })
    await persistAssets([vetor, pixel, vTileset, vMapa])

    const list = await listGalleryForStudio()
    const byName = new Map(list.map((s) => [s.name, s]))
    expect(byName.get('ceu')?.thumbDataUrl).toStartWith('data:image/svg+xml')
    expect(byName.get('ceu')?.thumbDataUrl).toContain(encodeURIComponent('#ff0000'))
    // Mapa de tileset VETORIAL também rende thumb por string (symbol/use).
    expect(byName.get('fase-v')?.thumbDataUrl).toStartWith('data:image/svg+xml')
    // Caminhos de canvas devolvem null gracioso no happy-dom (a UI usa o emoji);
    // a miniatura raster real é QA de browser (contrato pngOrNull existente).
    expect(byName.get('heroi')?.thumbDataUrl).toBeNull()
  })

  it('cacheia a miniatura por updatedAt (mesmo carimbo = mesma thumb, novo = recomputa)', async () => {
    const vetor = createVectorBackgroundAsset({ name: 'ceu', width: 20, height: 10 })
    vetor.shapes.push(redRect())
    vetor.updatedAt = 1000
    await persistAsset(vetor)
    const first = (await listGalleryForStudio())[0]?.thumbDataUrl
    expect(first).toContain(encodeURIComponent('#ff0000'))

    // Mesma updatedAt com conteúdo trocado → cache segura a thumb antiga.
    const azul = {
      ...vetor,
      shapes: [
        makeRect({ x: 0, y: 0 }, { x: 5, y: 5 }, { fill: '#0000ff', stroke: null, opacity: 1 }),
      ],
    }
    await persistAsset(azul)
    expect((await listGalleryForStudio())[0]?.thumbDataUrl).toBe(first ?? '')

    // Carimbo novo → recomputa.
    await persistAsset({ ...azul, updatedAt: 2000 })
    const second = (await listGalleryForStudio())[0]?.thumbDataUrl
    expect(second).toContain(encodeURIComponent('#0000ff'))
  })

  it('respeita o namespace do perfil (host DEVE setar antes)', async () => {
    setPintaStorageNamespace('perfil-a')
    await persistAsset(createPixelSpriteAsset({ name: 'heroi', frameSize: 8 }))
    expect((await listGalleryForStudio()).length).toBe(1)
    setPintaStorageNamespace('perfil-b')
    expect(await listGalleryForStudio()).toEqual([])
  })

  it('não reaproveita miniatura de outro perfil com o mesmo id e updatedAt', async () => {
    const base = createVectorBackgroundAsset({ name: 'mesmo-id', width: 20, height: 10 })
    const red = { ...base, id: 'compartilhado', updatedAt: 1000, shapes: [redRect()] }
    setPintaStorageNamespace('perfil-a')
    await persistAsset(red)
    expect((await listGalleryForStudio())[0]?.thumbDataUrl).toContain(encodeURIComponent('#ff0000'))

    const blue = {
      ...red,
      shapes: [
        makeRect({ x: 1, y: 1 }, { x: 9, y: 9 }, { fill: '#0000ff', stroke: null, opacity: 1 }),
      ],
    }
    setPintaStorageNamespace('perfil-b')
    await persistAsset(blue)

    expect((await listGalleryForStudio())[0]?.thumbDataUrl).toContain(encodeURIComponent('#0000ff'))
  })
})

describe('exportAssetForStudio', () => {
  it('desenho apagado → not-found', async () => {
    expect(await exportAssetForStudio('nao-existe')).toEqual({ ok: false, reason: 'not-found' })
  })

  it('sem canvas (happy-dom) todo raster falha gracioso → raster-failed', async () => {
    const sprite = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
    const vetor = createVectorBackgroundAsset({ name: 'ceu', width: 20, height: 10 })
    await persistAssets([sprite, vetor])
    expect(await exportAssetForStudio(sprite.id)).toEqual({ ok: false, reason: 'raster-failed' })
    expect(await exportAssetForStudio(vetor.id)).toEqual({ ok: false, reason: 'raster-failed' })
  })

  it('tilemap órfão (tileset apagado) → raster-failed', async () => {
    const mapa = createTilemapAsset({ name: 'fase', tilesetId: 'sumiu', cols: 2, rows: 2 })
    await persistAsset(mapa)
    expect(await exportAssetForStudio(mapa.id)).toEqual({ ok: false, reason: 'raster-failed' })
  })
})

// Os tetos (o caminho ok:true do export precisa de canvas → QA de browser; a
// validação de tamanho é pura e testável aqui).
describe('validateStudioPayloadSize', () => {
  const sheet = { dataUrl: 'data:image/png;base64,AA', width: 16, height: 16 }
  const tilemapMeta = { tileSize: 16, cols: 1, rows: 1, grid: '0', solid: [], tileset: sheet }

  it('payload pequeno passa', () => {
    const payload: StudioPayload = { dataUrl: 'data:image/png;base64,AA', width: 8, height: 8 }
    expect(validateStudioPayloadSize(payload)).toBe('ok')
    expect(validateStudioPayloadSize({ ...payload, tilemap: tilemapMeta })).toBe('ok')
  })

  it('dataUrl acima de 800k → asset-too-big', () => {
    const payload: StudioPayload = { dataUrl: 'x'.repeat(800_001), width: 8, height: 8 }
    expect(validateStudioPayloadSize(payload)).toBe('asset-too-big')
  })

  it('folha do mapa acima de 180k → sheet-too-big (tilemap e tilemapFront)', () => {
    const bigSheet = { ...sheet, dataUrl: 'x'.repeat(180_001) }
    const small: StudioPayload = { dataUrl: 'data:image/png;base64,AA', width: 8, height: 8 }
    expect(
      validateStudioPayloadSize({ ...small, tilemap: { ...tilemapMeta, tileset: bigSheet } }),
    ).toBe('sheet-too-big')
    expect(
      validateStudioPayloadSize({
        ...small,
        tilemap: tilemapMeta,
        tilemapFront: { ...tilemapMeta, tileset: bigSheet },
      }),
    ).toBe('sheet-too-big')
  })
})
