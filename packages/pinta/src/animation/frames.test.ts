import { describe, expect, it } from 'bun:test'
import { createPixelSpriteAsset, PINTA_LIMITS, type PixelSpriteAsset } from '../core/project'
import {
  addAnimation,
  addFrame,
  duplicateAnimation,
  duplicateFrame,
  moveFrame,
  removeAnimation,
  removeFrame,
  renameAnimation,
  setAnimationEasing,
  setAnimationFps,
  setAnimationLoop,
} from './frames'

function sprite(): PixelSpriteAsset {
  return createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
}

function animId(asset: PixelSpriteAsset): string {
  const id = asset.animations[0]?.id
  if (!id) throw new Error('animação esperada')
  return id
}

describe('quadros', () => {
  it('addFrame insere quadro VAZIO após o índice', () => {
    const base = sprite()
    const marked = { ...base }
    const firstFrame = marked.animations[0]?.frames[0]
    // Um quadro de pixel é a PILHA de cels (um por camada).
    if (firstFrame?.[0]) firstFrame[0].data[0] = 5
    const out = addFrame(marked, animId(marked), 0)
    expect(out.animations[0]?.frames).toHaveLength(2)
    expect(out.animations[0]?.frames[1]?.[0]?.data[0]).toBe(0)
    // structural sharing: o quadro original é a MESMA referência.
    expect(out.animations[0]?.frames[0]).toBe(firstFrame as never)
  })

  it('duplicateFrame copia o bitmap (referência NOVA, mesmo conteúdo)', () => {
    const base = sprite()
    const frame = base.animations[0]?.frames[0]
    if (frame?.[0]) frame[0].data[3] = 7
    const out = duplicateFrame(base, animId(base), 0)
    const copy = out.animations[0]?.frames[1]
    expect(copy?.[0]?.data[3]).toBe(7)
    expect(copy?.[0]).not.toBe(frame?.[0] as never)
  })

  it('removeFrame nunca deixa a animação vazia', () => {
    const base = sprite()
    expect(removeFrame(base, animId(base), 0)).toBe(base)
    const two = addFrame(base, animId(base), 0)
    const out = removeFrame(two, animId(two), 1)
    expect(out.animations[0]?.frames).toHaveLength(1)
  })

  it('moveFrame troca posições e respeita as bordas', () => {
    let asset = sprite()
    const frame0 = asset.animations[0]?.frames[0]
    if (frame0?.[0]) frame0[0].data[0] = 1
    asset = addFrame(asset, animId(asset), 0)
    const moved = moveFrame(asset, animId(asset), 0, 1)
    expect(moved.animations[0]?.frames[1]?.[0]?.data[0]).toBe(1)
    expect(moveFrame(asset, animId(asset), 0, -1)).toBe(asset)
  })

  it('quota de quadros: addFrame/duplicateFrame viram no-op no teto', () => {
    let asset = sprite()
    for (let i = 0; i < PINTA_LIMITS.maxFramesPerAnimation + 2; i += 1) {
      asset = addFrame(asset, animId(asset), 0)
    }
    expect(asset.animations[0]?.frames).toHaveLength(PINTA_LIMITS.maxFramesPerAnimation)
    expect(duplicateFrame(asset, animId(asset), 0)).toBe(asset)
  })
})

describe('animações', () => {
  it('addAnimation cria com nome sugerido e 1 quadro vazio', () => {
    const { asset, animationId } = addAnimation(sprite())
    expect(animationId).not.toBeNull()
    expect(asset.animations).toHaveLength(2)
    expect(asset.animations[1]?.name).toBe('andar')
    expect(asset.animations[1]?.frames).toHaveLength(1)
  })

  it('quota de animações → animationId null', () => {
    let current = sprite()
    for (let i = 0; i < PINTA_LIMITS.maxAnimations + 2; i += 1) {
      current = addAnimation(current).asset
    }
    expect(current.animations).toHaveLength(PINTA_LIMITS.maxAnimations)
    expect(addAnimation(current).animationId).toBeNull()
  })

  it('renameAnimation apara e limita o nome; vazio é no-op', () => {
    const base = sprite()
    const out = renameAnimation(base, animId(base), '  Correr Muito  ')
    expect(out.animations[0]?.name).toBe('Correr Muito')
    expect(renameAnimation(base, animId(base), '   ')).toBe(base)
  })

  it('rename e duplicação mantêm nomes únicos', () => {
    const base = sprite()
    const firstDuplicate = duplicateAnimation(base, animId(base)).asset
    const secondDuplicate = duplicateAnimation(firstDuplicate, animId(firstDuplicate)).asset
    expect(secondDuplicate.animations.map((animation) => animation.name)).toEqual([
      'parado',
      'parado 3',
      'parado 2',
    ])

    const duplicateId = secondDuplicate.animations[2]?.id
    if (!duplicateId) throw new Error('cópia esperada')
    const renamed = renameAnimation(secondDuplicate, duplicateId, 'parado')
    expect(new Set(renamed.animations.map((animation) => animation.name)).size).toBe(3)
  })

  it('duplicateAnimation clona quadros com referências novas', () => {
    const base = sprite()
    const frame = base.animations[0]?.frames[0]
    if (frame?.[0]) frame[0].data[0] = 9
    const { asset, animationId } = duplicateAnimation(base, animId(base))
    expect(animationId).not.toBeNull()
    const copy = asset.animations[1]
    expect(copy?.name).toBe('parado 2')
    expect(copy?.frames[0]?.[0]?.data[0]).toBe(9)
    expect(copy?.frames[0]?.[0]).not.toBe(frame?.[0] as never)
  })

  it('removeAnimation nunca deixa o sprite sem nenhuma', () => {
    const base = sprite()
    expect(removeAnimation(base, animId(base))).toBe(base)
    const { asset } = addAnimation(base)
    const out = removeAnimation(asset, animId(asset))
    expect(out.animations).toHaveLength(1)
  })

  it('setAnimationFps clampa 1–30; setAnimationLoop alterna', () => {
    const base = sprite()
    expect(setAnimationFps(base, animId(base), 999).animations[0]?.fps).toBe(30)
    expect(setAnimationFps(base, animId(base), 0).animations[0]?.fps).toBe(1)
    // Sem mudança → mesma referência (não suja autosave).
    expect(setAnimationFps(base, animId(base), 8)).toBe(base)
    expect(setAnimationLoop(base, animId(base), false).animations[0]?.loop).toBe(false)
  })

  it('setAnimationEasing grava "ease" e omite "linear" (ausente = padrão)', () => {
    const base = sprite()
    // Padrão é linear (ausente) → setar linear é no-op.
    expect(setAnimationEasing(base, animId(base), 'linear')).toBe(base)
    const eased = setAnimationEasing(base, animId(base), 'ease')
    expect(eased.animations[0]?.easing).toBe('ease')
    // Voltar para linear REMOVE a chave (asset idêntico ao histórico).
    const back = setAnimationEasing(eased, animId(eased), 'linear')
    expect(back.animations[0]?.easing).toBeUndefined()
    expect('easing' in (back.animations[0] ?? {})).toBe(false)
  })
})
