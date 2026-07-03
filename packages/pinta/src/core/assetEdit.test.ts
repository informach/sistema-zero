import { describe, expect, it } from 'bun:test'
import { activeBitmapOf, previousFrameOf, withActiveBitmap } from './assetEdit'
import { createBitmap, createPixelBackgroundAsset, createPixelSpriteAsset } from './project'

describe('activeBitmapOf / withActiveBitmap', () => {
  it('background: o próprio bitmap', () => {
    const asset = createPixelBackgroundAsset({ name: 'ceu', width: 8, height: 8 })
    expect(activeBitmapOf(asset, { animationId: null, frameIndex: 0 })).toBe(asset.bitmap)
    const next = createBitmap(8, 8)
    const out = withActiveBitmap(asset, { animationId: null, frameIndex: 0 }, next)
    expect(out.kind === 'pixel-background' && out.bitmap).toBe(next)
  })

  it('sprite: animationId null cai na primeira; índice é clampado', () => {
    const asset = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
    const frame = asset.animations[0]?.frames[0] ?? null
    expect(activeBitmapOf(asset, { animationId: null, frameIndex: 0 })).toBe(frame)
    expect(activeBitmapOf(asset, { animationId: null, frameIndex: 99 })).toBe(frame)
    expect(activeBitmapOf(asset, { animationId: 'nao-existe', frameIndex: 0 })).toBe(frame)
  })

  it('withActiveBitmap troca SÓ o quadro ativo (structural sharing)', () => {
    const asset = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
    const animation = asset.animations[0]
    if (!animation) throw new Error('animação esperada')
    const second = createBitmap(8, 8)
    const withTwo = {
      ...asset,
      animations: [{ ...animation, frames: [...animation.frames, second] }],
    }
    const replacement = createBitmap(8, 8)
    const out = withActiveBitmap(withTwo, { animationId: animation.id, frameIndex: 1 }, replacement)
    if (out.kind !== 'pixel-sprite') throw new Error('sprite esperado')
    expect(out.animations[0]?.frames[0] ?? null).toBe(withTwo.animations[0]?.frames[0] ?? null)
    expect(out.animations[0]?.frames[1] ?? null).toBe(replacement)
  })

  it('previousFrameOf: null no primeiro quadro, anterior nos demais', () => {
    const asset = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
    const animation = asset.animations[0]
    if (!animation) throw new Error('animação esperada')
    const second = createBitmap(8, 8)
    const withTwo = {
      ...asset,
      animations: [{ ...animation, frames: [...animation.frames, second] }],
    }
    expect(previousFrameOf(withTwo, { animationId: null, frameIndex: 0 })).toBeNull()
    expect(previousFrameOf(withTwo, { animationId: null, frameIndex: 1 })).toBe(
      animation.frames[0] ?? null,
    )
  })
})
