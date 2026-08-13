import { describe, expect, it } from 'bun:test'
import { addAnimation, addFrame } from '../animation/frames'
import { createVectorSpriteAsset, type VectorSpriteAsset } from '../core/project'
import type { VectorShape } from '../vector/model'
import { spritesheetMetadata, spritesheetRecipe } from './spritesheet'
import {
  packVectorSpritesheet,
  vectorSheetPngDataUrl,
  vectorSheetPortableSvg,
  vectorSheetSvg,
  vectorStripSvg,
} from './vectorSheet'

function rect(id: string): VectorShape {
  return {
    id,
    type: 'rect',
    x: 2,
    y: 2,
    w: 8,
    h: 8,
    rx: 0,
    fill: '#78dc52',
    stroke: null,
    opacity: 1,
    rotation: 0,
  }
}

/** Sprite vetorial com "parado" (2 quadros) e "andar" (3 quadros), como o pixel. */
function makeSprite(): VectorSpriteAsset {
  let asset = createVectorSpriteAsset({ name: 'heroi-v', frameSize: 64 })
  const parado = asset.animations[0]?.id
  if (!parado) throw new Error('animação esperada')
  asset = addFrame(asset, parado, 0)
  const added = addAnimation(asset)
  asset = added.asset
  if (!added.animationId) throw new Error('animação esperada')
  asset = addFrame(asset, added.animationId, 0)
  asset = addFrame(asset, added.animationId, 0)
  // Um shape no primeiro quadro para o SVG ter conteúdo verificável.
  const first = asset.animations[0]
  if (!first) throw new Error('animação esperada')
  return {
    ...asset,
    animations: [
      { ...first, frames: [[rect('a')], ...first.frames.slice(1)] },
      ...asset.animations.slice(1),
    ],
  }
}

describe('packVectorSpritesheet — a MESMA geometria do pixel', () => {
  it('uma LINHA por animação, columns = max(frames), from/to do bloco', () => {
    const pack = packVectorSpritesheet(makeSprite())
    expect(pack.rows).toBe(2)
    expect(pack.columns).toBe(3)
    expect(pack.frameWidth).toBe(64)
    expect(pack.animations[0]?.from).toBe(0)
    expect(pack.animations[0]?.to).toBe(1)
    expect(pack.animations[1]?.from).toBe(3)
    expect(pack.animations[1]?.to).toBe(5)
    expect(pack.cells).toHaveLength(5)
  })

  it('GUARDA do runtime do Studio: todo from..to cai no quadro certo da folha', () => {
    // Reimplementa a conta de game-2d/runtime.ts (drawFrame) — igual à guarda
    // do pixel; a geometria é compartilhada, então a fórmula vale para os dois.
    function studioSourceRect(
      sheetW: number,
      fw: number,
      fh: number,
      index: number,
    ): { sx: number; sy: number } {
      const cols = Math.max(1, Math.floor(sheetW / fw))
      const i = Math.max(0, Math.floor(index))
      return { sx: (i % cols) * fw, sy: Math.floor(i / cols) * fh }
    }
    const pack = packVectorSpritesheet(makeSprite())
    const sheetW = pack.columns * pack.frameWidth
    for (const meta of pack.animations) {
      for (let k = 0; k < meta.frames; k += 1) {
        const { sx, sy } = studioSourceRect(
          sheetW,
          pack.frameWidth,
          pack.frameHeight,
          meta.from + k,
        )
        expect(sx).toBe(k * pack.frameWidth)
        expect(sy).toBe(meta.row * pack.frameHeight)
      }
    }
  })

  it('metadados e receita saem das MESMAS funções do pixel', () => {
    const pack = packVectorSpritesheet(makeSprite())
    const meta = JSON.parse(spritesheetMetadata(pack))
    expect(meta.frameWidth).toBe(64)
    expect(meta.animations[1].from).toBe(3)
    const recipe = spritesheetRecipe(pack)
    expect(recipe).toContain('Animação "andar": do quadro 3 ao 5, velocidade 8.')
  })
})

describe('vectorSheetSvg — documento puro', () => {
  it('cada célula é um <svg> aninhado na posição certa (clipa por padrão)', () => {
    const svg = vectorSheetSvg(packVectorSpritesheet(makeSprite()))
    expect(svg).toContain('width="192" height="128"')
    // Célula do quadro 0 da linha 0 e do quadro 2 da linha 1.
    expect(svg).toContain('<svg x="0" y="0" width="64" height="64" viewBox="0 0 64 64">')
    expect(svg).toContain('<svg x="128" y="64" width="64" height="64" viewBox="0 0 64 64">')
    // O shape do primeiro quadro está lá (mesmo markup do export).
    expect(svg).toContain('<rect x="2" y="2" width="8" height="8" fill="#78dc52"/>')
  })

  it('a tira de UMA animação tem 1 linha', () => {
    const asset = makeSprite()
    const andar = asset.animations[1]
    if (!andar) throw new Error('animação esperada')
    const svg = vectorStripSvg(asset, andar)
    expect(svg).toContain('width="192" height="64"')
    expect(svg).not.toContain('y="64"')
  })

  it('a folha portátil incorpora a fonte usada nas células', async () => {
    const asset = makeSprite()
    const first = asset.animations[0]?.frames[0]
    if (!first) throw new Error('quadro esperado')
    first.push({
      id: 'texto',
      type: 'text',
      x: 4,
      y: 20,
      text: 'Jogar',
      fontSize: 12,
      fontFamily: 'bungee',
      fill: '#ffffff',
      stroke: null,
      opacity: 1,
      rotation: 0,
    })

    const svg = await vectorSheetPortableSvg(packVectorSpritesheet(asset))
    expect(svg).toContain("font-family:'Bungee'")
    expect(svg).toContain('data:font/woff2;base64,')
    expect(svg).not.toContain("font-family:'Fredoka One'")
  })
})

describe('rasterização (happy-dom)', () => {
  it('devolve null SEM pendurar a suíte (guarda de canvas antes do Image)', async () => {
    const dataUrl = await vectorSheetPngDataUrl(packVectorSpritesheet(makeSprite()))
    expect(dataUrl).toBeNull()
  })
})
