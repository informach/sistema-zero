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
  platform: number[]
  tile: number
  tileset: { image: { url?: string } }
}

interface Sprite {
  x: number
  y: number
  w: number
  h: number
  vx: number
  vy: number
  onGround?: boolean
}

interface Api {
  createTileMap: (opts: {
    image: string
    tile: number
    solid: string
    platform?: string
    grid: string
  }) => TileMap
  createTileMapFromAsset: (name: string) => TileMap
  drawTileMap: (ctx: unknown, map: TileMap, x: number, y: number) => void
  collideTileMap: (sprite: Sprite, map: TileMap) => void
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

  it('meta.platform chega ao mapa (dedup contra solid é do sanitizer, aqui só transporta)', () => {
    const api = load({
      'com-plataforma': {
        tilemap: { ...META['meu-mapa'].tilemap, platform: [3] },
      },
    })
    const map = api.createTileMapFromAsset('com-plataforma')
    expect(map.platform).toEqual([3])
  })
})

describe('colisão PLATAFORMA (one-way)', () => {
  // grid '0 0;2 2' → linha 1 (y 16..32) é toda plataforma (tile 2). tile = 16.
  function platformMap(api: Api): TileMap {
    return api.createTileMap({ image: '', tile: 16, solid: '', platform: '2', grid: '0 0;2 2' })
  }

  it('caindo por cima (vy>0, pé anterior no topo ou acima): POUSA e fica no chão', () => {
    const api = load({})
    const map = platformMap(api)
    // pé anterior = y+h-vy = 5+16-5 = 16 = topo da plataforma → pousa
    const s: Sprite = { x: 0, y: 5, w: 16, h: 16, vx: 0, vy: 5 }
    api.collideTileMap(s, map)
    expect(s.y).toBe(0) // encostou o pé no topo (16) → y = 16-16
    expect(s.vy).toBe(0)
    expect(s.onGround).toBe(true)
  })

  it('subindo (vy<0): ATRAVESSA (não segura)', () => {
    const api = load({})
    const map = platformMap(api)
    const s: Sprite = { x: 0, y: 20, w: 16, h: 16, vx: 0, vy: -5 }
    api.collideTileMap(s, map)
    expect(s.y).toBe(20) // intacto
    expect(s.vy).toBe(-5)
  })

  it('andando de lado dentro dela (vy=0): ATRAVESSA', () => {
    const api = load({})
    const map = platformMap(api)
    const s: Sprite = { x: 0, y: 20, w: 16, h: 16, vx: 3, vy: 0 }
    api.collideTileMap(s, map)
    expect(s.y).toBe(20)
    expect(s.vx).toBe(3) // plataforma nunca empurra de lado
  })

  it('caindo mas já ABAIXO do topo (pé anterior passou): ATRAVESSA (não gruda de volta)', () => {
    const api = load({})
    const map = platformMap(api)
    // pé anterior = 20+16-5 = 31 > topo+1 → não pousa
    const s: Sprite = { x: 0, y: 20, w: 16, h: 16, vx: 0, vy: 5 }
    api.collideTileMap(s, map)
    expect(s.y).toBe(20)
  })
})
