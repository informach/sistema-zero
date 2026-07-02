import { describe, expect, it } from 'bun:test'
import type { VectorShape } from '../vector/model'
import { activeShapesOf, previousShapesOf, withActiveShapes } from './assetEdit'
import {
  createPixelSpriteAsset,
  createVectorBackgroundAsset,
  createVectorSpriteAsset,
  createVectorTilesetAsset,
  type VectorSpriteAsset,
} from './project'

function rect(id: string): VectorShape {
  return {
    id,
    type: 'rect',
    x: 0,
    y: 0,
    w: 4,
    h: 4,
    rx: 0,
    fill: '#ff2121',
    stroke: null,
    opacity: 1,
    rotation: 0,
  }
}

/** Sprite vetorial com 1 animação de 2 quadros (a=1 shape, b=vazio). */
function spriteWithTwoFrames(): VectorSpriteAsset {
  const asset = createVectorSpriteAsset({ name: 'v', frameSize: 64 })
  const animation = asset.animations[0]
  if (!animation) throw new Error('animação esperada')
  return { ...asset, animations: [{ ...animation, frames: [[rect('a')], []] }] }
}

describe('activeShapesOf / withActiveShapes', () => {
  it('background: o documento inteiro', () => {
    const asset = { ...createVectorBackgroundAsset({ name: 'b', width: 100, height: 50 }) }
    asset.shapes = [rect('a')]
    const doc = activeShapesOf(asset, { animationId: null, frameIndex: 0 })
    expect(doc?.width).toBe(100)
    expect(doc?.height).toBe(50)
    expect(doc?.shapes).toBe(asset.shapes)

    const next = [rect('b')]
    const out = withActiveShapes(asset, { animationId: null, frameIndex: 0 }, next)
    expect(out.kind === 'vector-background' && out.shapes).toBe(next)
  })

  it('sprite: quadro da animação ativa, com clamp de índice e dims do frame', () => {
    const asset = spriteWithTwoFrames()
    const doc = activeShapesOf(asset, { animationId: null, frameIndex: 0 })
    expect(doc?.width).toBe(64)
    expect(doc?.shapes[0]?.id).toBe('a')
    // Índice além do fim clampa no último quadro (vazio).
    expect(activeShapesOf(asset, { animationId: null, frameIndex: 99 })?.shapes).toEqual([])
  })

  it('withActiveShapes troca SÓ o quadro ativo (structural sharing)', () => {
    const asset = spriteWithTwoFrames()
    const next = [rect('novo')]
    const out = withActiveShapes(asset, { animationId: null, frameIndex: 1 }, next)
    expect(out).not.toBe(asset)
    if (out.kind !== 'vector-sprite') throw new Error('kind esperado')
    expect(out.animations[0]?.frames[1]).toBe(next)
    // O quadro 0 continua a MESMA referência.
    expect(out.animations[0]?.frames[0]).toBe(asset.animations[0]?.frames[0] as never)
  })

  it('tileset: frameIndex é o índice do TILE', () => {
    const asset = createVectorTilesetAsset({ name: 't', tileSize: 32 })
    const withTiles = { ...asset, tiles: [[rect('t0')], [rect('t1')]], solid: [false, false] }
    const doc = activeShapesOf(withTiles, { animationId: null, frameIndex: 1 })
    expect(doc?.width).toBe(32)
    expect(doc?.shapes[0]?.id).toBe('t1')

    const next = [rect('t1b')]
    const out = withActiveShapes(withTiles, { animationId: null, frameIndex: 1 }, next)
    if (out.kind !== 'vector-tileset') throw new Error('kind esperado')
    expect(out.tiles[1]).toBe(next)
    expect(out.tiles[0]).toBe(withTiles.tiles[0] as never)
  })

  it('kinds sem shapes: null e no-op', () => {
    const pixel = createPixelSpriteAsset({ name: 'p', frameSize: 8 })
    expect(activeShapesOf(pixel, { animationId: null, frameIndex: 0 })).toBeNull()
    expect(withActiveShapes(pixel, { animationId: null, frameIndex: 0 }, [rect('x')])).toBe(pixel)
  })
})

describe('previousShapesOf (onion vetorial)', () => {
  it('devolve o quadro anterior; null no primeiro quadro e fora do vector-sprite', () => {
    const asset = spriteWithTwoFrames()
    expect(previousShapesOf(asset, { animationId: null, frameIndex: 1 })?.[0]?.id).toBe('a')
    expect(previousShapesOf(asset, { animationId: null, frameIndex: 0 })).toBeNull()
    const background = createVectorBackgroundAsset({ name: 'b', width: 10, height: 10 })
    expect(previousShapesOf(background, { animationId: null, frameIndex: 1 })).toBeNull()
  })
})
