import { describe, expect, it } from 'bun:test'
import { activeBitmapOf, previousFrameOf, removeExtraColor, withActiveBitmap } from './assetEdit'
import { PALETTE_SIZE } from './palette'
import {
  createBitmap,
  createPixelBackgroundAsset,
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  createVectorSpriteAsset,
  type PintaBitmap,
  type PixelSpriteAsset,
  sanitizePintaAsset,
} from './project'

describe('activeBitmapOf / withActiveBitmap', () => {
  it('background: o cel da camada ativa', () => {
    const asset = createPixelBackgroundAsset({ name: 'ceu', width: 8, height: 8 })
    expect(activeBitmapOf(asset, { animationId: null, frameIndex: 0 })).toBe(asset.cels[0] ?? null)
    const next = createBitmap(8, 8)
    const out = withActiveBitmap(asset, { animationId: null, frameIndex: 0 }, next)
    expect(out.kind === 'pixel-background' && out.cels[0]).toBe(next)
  })

  it('sprite: animationId null cai na primeira; índice é clampado', () => {
    const asset = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
    const cel = asset.animations[0]?.frames[0]?.[0] ?? null
    expect(activeBitmapOf(asset, { animationId: null, frameIndex: 0 })).toBe(cel)
    expect(activeBitmapOf(asset, { animationId: null, frameIndex: 99 })).toBe(cel)
    expect(activeBitmapOf(asset, { animationId: 'nao-existe', frameIndex: 0 })).toBe(cel)
  })

  it('withActiveBitmap troca SÓ o cel ativo (structural sharing)', () => {
    const asset = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
    const animation = asset.animations[0]
    if (!animation) throw new Error('animação esperada')
    const second = [createBitmap(8, 8)]
    const withTwo = {
      ...asset,
      animations: [{ ...animation, frames: [...animation.frames, second] }],
    }
    const replacement = createBitmap(8, 8)
    const out = withActiveBitmap(withTwo, { animationId: animation.id, frameIndex: 1 }, replacement)
    if (out.kind !== 'pixel-sprite') throw new Error('sprite esperado')
    expect(out.animations[0]?.frames[0]).toBe(withTwo.animations[0]?.frames[0])
    expect(out.animations[0]?.frames[1]?.[0]).toBe(replacement)
  })

  it('camada ativa: o layerId escolhe o cel; ausente = a de CIMA', () => {
    const base = createPixelBackgroundAsset({ name: 'ceu', width: 4, height: 4 })
    const asset = {
      ...base,
      layers: [
        { id: 'fundo', name: 'Camada 1', visible: true },
        { id: 'topo', name: 'Camada 2', visible: true },
      ],
      cels: [createBitmap(4, 4), createBitmap(4, 4)],
    }
    expect(activeBitmapOf(asset, { animationId: null, frameIndex: 0, layerId: 'fundo' })).toBe(
      asset.cels[0] ?? null,
    )
    // Sem layerId (ou com id que não existe) cai na de cima.
    expect(activeBitmapOf(asset, { animationId: null, frameIndex: 0 })).toBe(asset.cels[1] ?? null)
    expect(activeBitmapOf(asset, { animationId: null, frameIndex: 0, layerId: 'sumiu' })).toBe(
      asset.cels[1] ?? null,
    )

    const next = createBitmap(4, 4)
    const out = withActiveBitmap(
      asset,
      { animationId: null, frameIndex: 0, layerId: 'fundo' },
      next,
    )
    if (out.kind !== 'pixel-background') throw new Error('cenário esperado')
    expect(out.cels[0]).toBe(next)
    // A outra camada segue por referência.
    expect(out.cels[1]).toBe(asset.cels[1])
  })

  it('previousFrameOf: null no primeiro quadro, ACHATADO nos demais', () => {
    const asset = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
    const animation = asset.animations[0]
    if (!animation) throw new Error('animação esperada')
    const second = [createBitmap(8, 8)]
    const withTwo = {
      ...asset,
      animations: [{ ...animation, frames: [...animation.frames, second] }],
    }
    expect(previousFrameOf(withTwo, { animationId: null, frameIndex: 0 })).toBeNull()
    // Uma camada só: o achatado É o próprio cel (sem cópia).
    expect(previousFrameOf(withTwo, { animationId: null, frameIndex: 1 })).toBe(
      animation.frames[0]?.[0] ?? null,
    )
  })
})

/** Bitmap 4×4 com uma cor base (3) e as duas extras (16 e 17) pintadas. */
function paintedBitmap(): PintaBitmap {
  const bitmap = createBitmap(4, 4)
  bitmap.data[0] = 3
  bitmap.data[1] = 16
  bitmap.data[2] = 17
  return bitmap
}

/**
 * Sprite com 2 animações × 2 quadros × 2 CAMADAS, todos pintados, e 2 cores
 * extras — o caso que pega esquecimento de nível no remap.
 */
function spriteWithExtras(): PixelSpriteAsset {
  const base = createPixelSpriteAsset({ name: 'heroi', frameSize: 4 })
  const frame = (): PintaBitmap[] => [paintedBitmap(), paintedBitmap()]
  return {
    ...base,
    extraColors: ['#111111', '#222222'],
    layers: [
      { id: 'l1', name: 'Camada 1', visible: true },
      { id: 'l2', name: 'Camada 2', visible: true },
    ],
    animations: [
      { id: 'a1', name: 'parado', fps: 8, loop: true, frames: [frame(), frame()] },
      { id: 'a2', name: 'andar', fps: 8, loop: true, frames: [frame(), frame()] },
    ],
  }
}

describe('removeExtraColor', () => {
  it('sprite: remapeia TODAS as animações × quadros × CAMADAS', () => {
    const next = removeExtraColor(spriteWithExtras(), PALETTE_SIZE)
    if (next?.kind !== 'pixel-sprite') throw new Error('esperava pixel-sprite')

    expect(next.extraColors).toEqual(['#222222'])
    for (const animation of next.animations) {
      expect(animation.frames).toHaveLength(2)
      for (const cels of animation.frames) {
        expect(cels).toHaveLength(2)
        for (const cel of cels) {
          // 3 intacto · 16 (apagada) → transparente · 17 desce para 16.
          expect(Array.from(cel.data.slice(0, 3))).toEqual([3, 0, 16])
        }
      }
    }
  })

  it('background: remapeia todas as camadas', () => {
    const asset = {
      ...createPixelBackgroundAsset({ name: 'ceu', width: 4, height: 4 }),
      extraColors: ['#111111', '#222222'],
      cels: [paintedBitmap()],
    }
    const next = removeExtraColor(asset, PALETTE_SIZE)
    if (next?.kind !== 'pixel-background') throw new Error('esperava pixel-background')
    expect(Array.from(next.cels[0]?.data.slice(0, 3) ?? [])).toEqual([3, 0, 16])
    expect(next.extraColors).toEqual(['#222222'])
  })

  it('tileset: remapeia todas as peças e preserva solid/platform', () => {
    const base = createTilesetAsset({ name: 'pecas', tileSize: 8 })
    const tile = createBitmap(8, 8)
    tile.data[0] = 16
    tile.data[1] = 17
    const asset = {
      ...base,
      extraColors: ['#111111', '#222222'],
      tiles: [tile, paintedBitmap()],
      solid: [true, false],
      platform: [false, true],
    }
    const next = removeExtraColor(asset, PALETTE_SIZE + 1)
    if (next?.kind !== 'tileset') throw new Error('esperava tileset')

    // Apagou a 17: a 16 fica no lugar, a 17 vira transparente.
    expect(Array.from(next.tiles[0]?.data.slice(0, 2) ?? [])).toEqual([16, 0])
    expect(Array.from(next.tiles[1]?.data.slice(0, 3) ?? [])).toEqual([3, 16, 0])
    expect(next.extraColors).toEqual(['#111111'])
    expect(next.solid).toEqual([true, false])
    expect(next.platform).toEqual([false, true])
  })

  it('última extra removida: a CHAVE extraColors some e o sanitize devolve igual', () => {
    const asset = {
      ...createPixelBackgroundAsset({ name: 'ceu', width: 4, height: 4 }),
      extraColors: ['#111111'],
      cels: [paintedBitmap()],
    }
    const next = removeExtraColor(asset, PALETTE_SIZE)
    if (!next) throw new Error('esperava asset')
    expect('extraColors' in next).toBe(false)
    // Round-trip: o sanitize não re-normaliza nada (byte-idêntico).
    expect(sanitizePintaAsset(next)).toEqual(next)
  })

  it('guardas: cor base, extra fora do alcance e kinds sem paleta → null', () => {
    const sprite = spriteWithExtras()
    expect(removeExtraColor(sprite, 3)).toBeNull()
    expect(removeExtraColor(sprite, PALETTE_SIZE + 2)).toBeNull()

    const semExtras = createPixelSpriteAsset({ name: 'solo', frameSize: 4 })
    expect(removeExtraColor(semExtras, PALETTE_SIZE)).toBeNull()

    const vetor = createVectorSpriteAsset({ name: 'fantasma', frameSize: 32 })
    expect(removeExtraColor(vetor, PALETTE_SIZE)).toBeNull()
    const mapa = createTilemapAsset({ name: 'fase', tilesetId: 'x', cols: 2, rows: 2 })
    expect(removeExtraColor(mapa, PALETTE_SIZE)).toBeNull()
  })
})
