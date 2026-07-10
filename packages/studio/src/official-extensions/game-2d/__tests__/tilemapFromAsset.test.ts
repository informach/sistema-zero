import { describe, expect, it, spyOn } from 'bun:test'
import { gameTwoDRuntime } from '../runtime'

/**
 * "Criar mapa do meu desenho" (v0.22.0): o runtime monta o mapa inteiro a
 * partir do metadado semeado em `window.__SZGAME_ASSET_META` (grade, tamanho
 * do tile, sólidos e a FOLHA embutida). Sem metadado → mapa vazio + aviso no
 * console (desenhar/colidir viram no-op; o jogo nunca quebra).
 */

interface TileMap {
  rows: number[][]
  solid: number[]
  tile: number
  tileset: { image: { url?: string } }
}

interface Api {
  createTileMapFromAsset: (name: string) => TileMap
  drawTileMap: (ctx: unknown, map: TileMap, x: number, y: number) => void
  collideTileMap: (sprite: unknown, map: TileMap) => void
}

const META = {
  'meu-mapa': {
    tilemap: {
      tileSize: 16,
      cols: 4,
      rows: 2,
      grid: '0 1 1 .;. . 2 .',
      solid: [1, 2],
      tileset: { dataUrl: 'data:image/png;base64,AAAA', width: 48, height: 16 },
    },
  },
}

function load(meta?: Record<string, unknown>): Api {
  const win = {
    addEventListener() {},
    SZGame2D: undefined,
    performance: { now: () => 0 },
    devicePixelRatio: 1,
    __SZGAME_ASSET_META: meta,
  } as unknown as Record<string, unknown>
  new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, () => 0)
  return win.SZGame2D as Api
}

describe('createTileMapFromAsset', () => {
  it('monta o mapa do metadado: grade parseada, sólidos e folha embutida', () => {
    const api = load(META)
    const map = api.createTileMapFromAsset('meu-mapa')
    expect(map.rows).toEqual([
      [0, 1, 1, -1],
      [-1, -1, 2, -1],
    ])
    expect(map.solid).toEqual([1, 2])
    expect(map.tile).toBe(16)
  })

  it('sem metadado (nome errado ou asset comum): mapa vazio + aviso, nada quebra', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const api = load(META)
      const map = api.createTileMapFromAsset('nao-existe')
      expect(map.rows).toEqual([])
      expect(warn).toHaveBeenCalled()
      const ctx = { canvas: { width: 100, height: 100 } }
      expect(() => api.drawTileMap(ctx, map, 0, 0)).not.toThrow()
      expect(() =>
        api.collideTileMap({ x: 0, y: 0, w: 10, h: 10, vx: 0, vy: 0 }, map),
      ).not.toThrow()
    } finally {
      warn.mockRestore()
    }
  })

  it('sem __SZGAME_ASSET_META no window: idem (retrocompat total)', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const api = load(undefined)
      const map = api.createTileMapFromAsset('meu-mapa')
      expect(map.rows).toEqual([])
    } finally {
      warn.mockRestore()
    }
  })
})
