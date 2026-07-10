import { describe, expect, it } from 'bun:test'
import {
  assetMetaManifest,
  PROJECT_ASSET_LIMITS,
  sanitizeProjectAssets,
  sanitizeSpriteMeta,
  sanitizeTilemapMeta,
  sanitizeTilesetMeta,
} from './project'

const DATA = 'data:image/png;base64,AAAA'

describe('sanitizeSpriteMeta (metadado de animação do Pinta)', () => {
  it('preserva animações válidas com from/to/fps/loop', () => {
    const meta = sanitizeSpriteMeta({
      frameW: 16,
      frameH: 16,
      animations: [
        { name: 'andar', from: 0, to: 3, fps: 8, loop: true },
        { name: 'pular', from: 8, to: 10, fps: 12, loop: false },
      ],
    })
    expect(meta).toEqual({
      frameW: 16,
      frameH: 16,
      animations: [
        { name: 'andar', from: 0, to: 3, fps: 8, loop: true },
        { name: 'pular', from: 8, to: 10, fps: 12, loop: false },
      ],
    })
  })

  it('descarta animação inválida (to<from, fps<=0, sem nome, duplicada) e mantém as válidas', () => {
    const meta = sanitizeSpriteMeta({
      frameW: 16,
      frameH: 16,
      animations: [
        { name: 'ok', from: 0, to: 2, fps: 6, loop: false },
        { name: 'ruim', from: 5, to: 2, fps: 6, loop: false }, // to < from
        { name: '', from: 0, to: 1, fps: 6, loop: false }, // sem nome
        { name: 'ok', from: 3, to: 4, fps: 6, loop: false }, // duplicada
        { name: 'semfps', from: 0, to: 1, fps: 0, loop: false }, // fps inválido
      ],
    })
    expect(meta?.animations.map((a) => a.name)).toEqual(['ok'])
  })

  it('undefined quando frameW/H inválido, animations não-array ou nenhuma válida', () => {
    expect(sanitizeSpriteMeta({ frameW: 0, frameH: 16, animations: [] })).toBeUndefined()
    expect(sanitizeSpriteMeta({ frameW: 16, frameH: 16, animations: 'x' })).toBeUndefined()
    expect(sanitizeSpriteMeta({ frameW: 16, frameH: 16, animations: [] })).toBeUndefined()
    expect(sanitizeSpriteMeta(null)).toBeUndefined()
  })
})

describe('sanitizeTilesetMeta (metadado de tiles do Pinta)', () => {
  it('deduplica + ordena os índices sólidos; vazio/ausente é válido', () => {
    expect(sanitizeTilesetMeta({ tileSize: 16, solid: [3, 1, 1, 0] })).toEqual({
      tileSize: 16,
      solid: [0, 1, 3],
    })
    expect(sanitizeTilesetMeta({ tileSize: 16, solid: [] })).toEqual({ tileSize: 16, solid: [] })
    expect(sanitizeTilesetMeta({ tileSize: 16 })).toEqual({ tileSize: 16, solid: [] })
  })

  it('undefined sem tileSize válido', () => {
    expect(sanitizeTilesetMeta({ tileSize: 0, solid: [1] })).toBeUndefined()
    expect(sanitizeTilesetMeta(null)).toBeUndefined()
  })
})

describe('sanitizeProjectAssets — metadado do Pinta (nunca derruba o asset)', () => {
  it('preserva sprite/tileset válidos no asset', () => {
    const [asset] = sanitizeProjectAssets([
      {
        id: 'a',
        name: 'heroi',
        kind: 'image',
        dataUrl: DATA,
        source: 'library',
        sprite: {
          frameW: 16,
          frameH: 16,
          animations: [{ name: 'andar', from: 0, to: 3, fps: 8, loop: true }],
        },
      },
    ])
    expect(asset?.sprite?.animations[0]?.name).toBe('andar')
  })

  it('DESCARTA metadado inválido mas MANTÉM o asset', () => {
    const [asset] = sanitizeProjectAssets([
      {
        id: 'a',
        name: 'pecas',
        kind: 'image',
        dataUrl: DATA,
        source: 'library',
        tileset: { tileSize: 0, solid: [1] }, // tileSize inválido
        sprite: 'lixo', // não-objeto
      },
    ])
    expect(asset?.name).toBe('pecas')
    expect(asset?.tileset).toBeUndefined()
    expect(asset?.sprite).toBeUndefined()
  })

  it('sobrevive ao round-trip JSON (stringify → parse → sanitize)', () => {
    const input = [
      {
        id: 'a',
        name: 'pecas',
        kind: 'image',
        dataUrl: DATA,
        source: 'library',
        tileset: { tileSize: 16, solid: [1, 2] },
      },
    ]
    const [asset] = sanitizeProjectAssets(JSON.parse(JSON.stringify(input)))
    expect(asset?.tileset).toEqual({ tileSize: 16, solid: [1, 2] })
  })
})

const TILEMAP_META = {
  tileSize: 16,
  cols: 4,
  rows: 2,
  grid: '0 1 1 .;. . 2 .',
  solid: [2, 1, 1],
  tileset: { dataUrl: DATA, width: 48, height: 16 },
}

describe('sanitizeTilemapMeta (metadado de MAPA do Pinta/fatiador)', () => {
  it('preserva um mapa válido (solid deduplicado/ordenado)', () => {
    const meta = sanitizeTilemapMeta(JSON.parse(JSON.stringify(TILEMAP_META)))
    expect(meta).toEqual({
      tileSize: 16,
      cols: 4,
      rows: 2,
      grid: '0 1 1 .;. . 2 .',
      solid: [1, 2],
      tileset: { dataUrl: DATA, width: 48, height: 16 },
    })
  })

  it('tudo-ou-nada: sem folha embutida válida → undefined', () => {
    expect(sanitizeTilemapMeta({ ...TILEMAP_META, tileset: undefined })).toBeUndefined()
    expect(
      sanitizeTilemapMeta({
        ...TILEMAP_META,
        tileset: { dataUrl: 'http://evil/tiles.png', width: 48, height: 16 },
      }),
    ).toBeUndefined()
    expect(
      sanitizeTilemapMeta({
        ...TILEMAP_META,
        tileset: { dataUrl: DATA, width: 0, height: 16 },
      }),
    ).toBeUndefined()
  })

  it('folha acima do teto próprio → undefined', () => {
    const big = `data:image/png;base64,${'A'.repeat(PROJECT_ASSET_LIMITS.maxTilemapSheetChars)}`
    expect(
      sanitizeTilemapMeta({ ...TILEMAP_META, tileset: { dataUrl: big, width: 8, height: 8 } }),
    ).toBeUndefined()
  })

  it('grade vazia ou acima do teto → undefined', () => {
    expect(sanitizeTilemapMeta({ ...TILEMAP_META, grid: '   ' })).toBeUndefined()
    expect(
      sanitizeTilemapMeta({
        ...TILEMAP_META,
        grid: '0 '.repeat(PROJECT_ASSET_LIMITS.maxTilemapGridChars),
      }),
    ).toBeUndefined()
  })

  it('cols/rows inválidos ou acima do teto → undefined; solid vazio é válido', () => {
    expect(sanitizeTilemapMeta({ ...TILEMAP_META, cols: 0 })).toBeUndefined()
    expect(
      sanitizeTilemapMeta({ ...TILEMAP_META, rows: PROJECT_ASSET_LIMITS.maxTilemapDim + 1 }),
    ).toBeUndefined()
    const semSolid = sanitizeTilemapMeta({ ...TILEMAP_META, solid: [] })
    expect(semSolid?.solid).toEqual([])
    const solidLixo = sanitizeTilemapMeta({ ...TILEMAP_META, solid: ['x', -1, 3] })
    expect(solidLixo?.solid).toEqual([3])
  })

  it('sanitizeProjectAssets preserva tilemap válido e descarta inválido SEM derrubar o asset', () => {
    const input = [
      {
        id: 'a',
        name: 'meu-mapa',
        kind: 'image',
        dataUrl: DATA,
        source: 'library',
        tilemap: TILEMAP_META,
      },
      {
        id: 'b',
        name: 'mapa-quebrado',
        kind: 'image',
        dataUrl: DATA,
        source: 'library',
        tilemap: { ...TILEMAP_META, grid: '' },
      },
    ]
    const assets = sanitizeProjectAssets(JSON.parse(JSON.stringify(input)))
    expect(assets.length).toBe(2)
    expect(assets[0]?.tilemap?.grid).toBe('0 1 1 .;. . 2 .')
    expect(assets[1]?.tilemap).toBeUndefined()
  })
})

describe('assetMetaManifest (manifesto de metadados p/ o preview)', () => {
  it('só entra asset de imagem COM tilemap; entradas malformadas são ignoradas', () => {
    const assets = sanitizeProjectAssets(
      JSON.parse(
        JSON.stringify([
          {
            id: 'a',
            name: 'meu-mapa',
            kind: 'image',
            dataUrl: DATA,
            source: 'library',
            tilemap: TILEMAP_META,
          },
          { id: 'b', name: 'heroi', kind: 'image', dataUrl: DATA, source: 'upload' },
        ]),
      ),
    )
    const meta = assetMetaManifest(assets)
    expect(Object.keys(meta)).toEqual(['meu-mapa'])
    expect(meta['meu-mapa']?.tilemap.tileSize).toBe(16)
    expect(assetMetaManifest(null)).toEqual({})
    expect(assetMetaManifest(undefined)).toEqual({})
  })
})
