import { describe, expect, test } from 'bun:test'
import { expandSelection } from './gallerySelection'
import type { PintaAsset } from './project'
import { createPixelSpriteAsset, createTilemapAsset, createTilesetAsset } from './projectConfig'

function fixtures(): {
  sprite: PintaAsset
  tileset: PintaAsset
  mapa: PintaAsset
  mapaOrfao: PintaAsset
} {
  const sprite = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
  const tileset = createTilesetAsset({ name: 'pecas', tileSize: 8 })
  const mapa = createTilemapAsset({ name: 'fase', tilesetId: tileset.id, cols: 2, rows: 2 })
  const mapaOrfao = createTilemapAsset({
    name: 'perdido',
    tilesetId: 'nao-existe',
    cols: 2,
    rows: 2,
  })
  return { sprite, tileset, mapa, mapaOrfao }
}

describe('expandSelection — o pack leva as dependências junto', () => {
  test('seleção simples devolve só os escolhidos, na ordem da galeria', () => {
    const { sprite, tileset, mapa } = fixtures()
    const out = expandSelection([sprite, tileset, mapa], new Set([sprite.id]))
    expect(out.assets.map((a) => a.id)).toEqual([sprite.id])
    expect(out.autoIncludedTilesetIds).toEqual([])
  })

  test('mapa selecionado AUTO-INCLUI o tileset dele (peças antes do mapa)', () => {
    const { sprite, tileset, mapa } = fixtures()
    // Galeria com o mapa ANTES do tileset: a saída ainda ordena peças primeiro.
    const out = expandSelection([sprite, mapa, tileset], new Set([mapa.id]))
    expect(out.assets.map((a) => a.id)).toEqual([tileset.id, mapa.id])
    expect(out.autoIncludedTilesetIds).toEqual([tileset.id])
  })

  test('tileset JÁ selecionado não duplica nem conta como auto-incluído', () => {
    const { tileset, mapa } = fixtures()
    const out = expandSelection([tileset, mapa], new Set([mapa.id, tileset.id]))
    expect(out.assets.map((a) => a.id)).toEqual([tileset.id, mapa.id])
    expect(out.autoIncludedTilesetIds).toEqual([])
  })

  test('dois mapas do MESMO tileset incluem a peça uma vez só', () => {
    const { tileset } = fixtures()
    const m1 = createTilemapAsset({ name: 'fase-1', tilesetId: tileset.id, cols: 2, rows: 2 })
    const m2 = createTilemapAsset({ name: 'fase-2', tilesetId: tileset.id, cols: 2, rows: 2 })
    const out = expandSelection([tileset, m1, m2], new Set([m1.id, m2.id]))
    expect(out.assets.map((a) => a.id)).toEqual([tileset.id, m1.id, m2.id])
    expect(out.autoIncludedTilesetIds).toEqual([tileset.id])
  })

  test('mapa cujo tileset NÃO existe entra mesmo assim (paridade com "Baixar tudo")', () => {
    const { mapaOrfao } = fixtures()
    const out = expandSelection([mapaOrfao], new Set([mapaOrfao.id]))
    expect(out.assets.map((a) => a.id)).toEqual([mapaOrfao.id])
    expect(out.autoIncludedTilesetIds).toEqual([])
  })

  test('ids desconhecidos na seleção são ignorados', () => {
    const { sprite } = fixtures()
    const out = expandSelection([sprite], new Set([sprite.id, 'fantasma']))
    expect(out.assets.map((a) => a.id)).toEqual([sprite.id])
  })
})
