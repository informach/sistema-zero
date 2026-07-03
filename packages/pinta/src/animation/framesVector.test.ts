/**
 * As MESMAS operações de frames.ts sobre o sprite VETORIAL (a suíte pixel
 * roda intacta ao lado — prova de não-regressão da generalização).
 */
import { describe, expect, it } from 'bun:test'
import { createVectorSpriteAsset, PINTA_LIMITS, type VectorSpriteAsset } from '../core/project'
import type { VectorShape } from '../vector/model'
import {
  addAnimation,
  addFrame,
  duplicateAnimation,
  duplicateFrame,
  moveFrame,
  removeFrame,
} from './frames'

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

function sprite(): VectorSpriteAsset {
  const asset = createVectorSpriteAsset({ name: 'v', frameSize: 64 })
  const animation = asset.animations[0]
  if (!animation) throw new Error('animação esperada')
  return { ...asset, animations: [{ ...animation, frames: [[rect('a')]] }] }
}

function animId(asset: VectorSpriteAsset): string {
  const id = asset.animations[0]?.id
  if (!id) throw new Error('animação esperada')
  return id
}

describe('quadros vetoriais', () => {
  it('addFrame insere quadro VAZIO ([]) após o índice, com structural sharing', () => {
    const base = sprite()
    const out = addFrame(base, animId(base), 0)
    expect(out.animations[0]?.frames).toHaveLength(2)
    expect(out.animations[0]?.frames[1]).toEqual([])
    expect(out.animations[0]?.frames[0]).toBe(base.animations[0]?.frames[0] as never)
  })

  it('duplicateFrame clona os shapes com ids NOVOS (sem colisão de keys no onion)', () => {
    const base = sprite()
    const out = duplicateFrame(base, animId(base), 0)
    const original = out.animations[0]?.frames[0]?.[0]
    const copy = out.animations[0]?.frames[1]?.[0]
    expect(copy?.type).toBe('rect')
    expect(copy?.id).not.toBe(original?.id)
  })

  it('removeFrame nunca esvazia; moveFrame troca posições', () => {
    const base = sprite()
    expect(removeFrame(base, animId(base), 0)).toBe(base)
    let out = addFrame(base, animId(base), 0)
    out = moveFrame(out, animId(out), 0, 1)
    expect(out.animations[0]?.frames[1]?.[0]?.id).toBe('a')
  })

  it('quota de quadros respeitada', () => {
    let out = sprite()
    const id = animId(out)
    for (let i = 0; i < PINTA_LIMITS.maxFramesPerAnimation + 5; i += 1) {
      out = addFrame(out, id, 0)
    }
    expect(out.animations[0]?.frames.length).toBe(PINTA_LIMITS.maxFramesPerAnimation)
  })
})

describe('animações vetoriais', () => {
  it('addAnimation nasce com 1 quadro vazio e nome default seguinte', () => {
    const base = sprite()
    const { asset, animationId } = addAnimation(base)
    expect(animationId).not.toBeNull()
    expect(asset.animations).toHaveLength(2)
    expect(asset.animations[1]?.name).toBe('andar')
    expect(asset.animations[1]?.frames).toEqual([[]])
  })

  it('duplicateAnimation clona quadros com shapes de ids novos', () => {
    const base = sprite()
    const { asset, animationId } = duplicateAnimation(base, animId(base))
    expect(animationId).not.toBeNull()
    expect(asset.animations[1]?.frames[0]?.[0]?.id).not.toBe('a')
  })
})
