import { describe, expect, it } from 'bun:test'
import {
  createBitmap,
  createPixelBackgroundAsset,
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  createVectorAsset,
  normalizeAssetName,
  PINTA_LIMITS,
  sanitizePintaAsset,
} from './project'

describe('normalizeAssetName', () => {
  it('kebab-case ASCII, remove acentos', () => {
    expect(normalizeAssetName('Herói do Mar')).toBe('heroi-do-mar')
    expect(normalizeAssetName('  meu_sprite  ')).toBe('meu-sprite')
    expect(normalizeAssetName('---a---')).toBe('a')
  })

  it('vazio/só símbolos/longo demais → null', () => {
    expect(normalizeAssetName('')).toBeNull()
    expect(normalizeAssetName('!!!')).toBeNull()
    expect(normalizeAssetName('a'.repeat(PINTA_LIMITS.maxNameChars + 1))).toBeNull()
  })
})

describe('fábricas', () => {
  it('sprite nasce com a animação "parado" de 1 quadro', () => {
    const sprite = createPixelSpriteAsset({ name: 'heroi', frameSize: 16 })
    expect(sprite.animations).toHaveLength(1)
    expect(sprite.animations[0]?.name).toBe('parado')
    expect(sprite.animations[0]?.frames[0]?.width).toBe(16)
    expect(sprite.frameWidth).toBe(16)
  })

  it('tamanho de quadro é clampado aos limites', () => {
    expect(createPixelSpriteAsset({ name: 'a', frameSize: 4 }).frameWidth).toBe(
      PINTA_LIMITS.minFrameSize,
    )
    expect(createPixelSpriteAsset({ name: 'a', frameSize: 999 }).frameWidth).toBe(
      PINTA_LIMITS.maxFrameSize,
    )
  })

  it('tilemap nasce com a camada "Chão" cheia de -1', () => {
    const tilemap = createTilemapAsset({ name: 'fase', tilesetId: 't1', cols: 3, rows: 2 })
    expect(tilemap.layers).toHaveLength(1)
    expect(tilemap.layers[0]?.name).toBe('Chão')
    expect([...(tilemap.layers[0]?.cells ?? [])]).toEqual([-1, -1, -1, -1, -1, -1])
  })
})

describe('sanitizePintaAsset (dados do disco/import — nunca lança)', () => {
  it('round-trip das fábricas', () => {
    const assets = [
      createPixelSpriteAsset({ name: 'heroi', frameSize: 16 }),
      createPixelBackgroundAsset({ name: 'ceu', width: 160, height: 120 }),
      createTilesetAsset({ name: 'pecas', tileSize: 16 }),
      createTilemapAsset({ name: 'fase', tilesetId: 't1', cols: 4, rows: 3 }),
      createVectorAsset({ name: 'livre', width: 480, height: 360 }),
    ]
    for (const asset of assets) {
      const out = sanitizePintaAsset(asset)
      expect(out).not.toBeNull()
      expect(out?.kind).toBe(asset.kind)
      expect(out?.name).toBe(asset.name)
    }
  })

  it('lixo → null', () => {
    expect(sanitizePintaAsset(null)).toBeNull()
    expect(sanitizePintaAsset('oi')).toBeNull()
    expect(sanitizePintaAsset({})).toBeNull()
    expect(sanitizePintaAsset({ kind: 'pixel-sprite' })).toBeNull()
    expect(sanitizePintaAsset({ kind: 'desconhecido', id: 'x', name: 'a' })).toBeNull()
  })

  it('quadro com tamanho errado é descartado; animação vazia derruba o sprite', () => {
    const sprite = createPixelSpriteAsset({ name: 'heroi', frameSize: 16 })
    const broken = {
      ...sprite,
      animations: [{ ...sprite.animations[0], frames: [createBitmap(8, 8)] }],
    }
    expect(sanitizePintaAsset(broken)).toBeNull()
  })

  it('excedentes são recortados pelas quotas (animações)', () => {
    const sprite = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
    const base = sprite.animations[0]
    if (!base) throw new Error('animação esperada')
    const spread = {
      ...sprite,
      animations: Array.from({ length: PINTA_LIMITS.maxAnimations + 5 }, (_, i) => ({
        ...base,
        id: `anim-${i}`,
      })),
    }
    const out = sanitizePintaAsset(spread)
    expect(out?.kind).toBe('pixel-sprite')
    if (out?.kind !== 'pixel-sprite') return
    expect(out.animations).toHaveLength(PINTA_LIMITS.maxAnimations)
  })

  it('nome é re-normalizado; id com ":" (separador de chave) é rejeitado', () => {
    const background = createPixelBackgroundAsset({ name: 'ceu', width: 8, height: 8 })
    const out = sanitizePintaAsset({ ...background, name: 'Céu Azul' })
    expect(out?.name).toBe('ceu-azul')
    expect(sanitizePintaAsset({ ...background, id: 'a:b' })).toBeNull()
  })

  it('paleta desconhecida cai no default', () => {
    const background = createPixelBackgroundAsset({ name: 'ceu', width: 8, height: 8 })
    const out = sanitizePintaAsset({ ...background, paletteId: 'neon' })
    expect(out?.kind === 'pixel-background' && out.paletteId).toBe('arcade')
  })

  it('tileset: solid é realinhado ao número de tiles', () => {
    const tileset = createTilesetAsset({ name: 'pecas', tileSize: 16 })
    const out = sanitizePintaAsset({ ...tileset, solid: [true, true, true] })
    expect(out?.kind === 'tileset' && out.solid).toEqual([true])
  })
})
