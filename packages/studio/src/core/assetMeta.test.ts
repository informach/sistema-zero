import { describe, expect, it } from 'bun:test'
import { sanitizeProjectAssets, sanitizeSpriteMeta, sanitizeTilesetMeta } from './project'

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
