import { describe, expect, it } from 'bun:test'
import { addAnimation, addFrame } from '../animation/frames'
import { createBitmap, createPixelSpriteAsset, type PixelSpriteAsset } from '../core/project'
import { packSpritesheet, spritesheetMetadata, spritesheetRecipe } from './spritesheet'

/** Sprite com 2 animações: "parado" (2 quadros) e "andar" (3 quadros). */
function makeSprite(): PixelSpriteAsset {
  let asset = createPixelSpriteAsset({ name: 'heroi', frameSize: 16 })
  const parado = asset.animations[0]?.id
  if (!parado) throw new Error('animação esperada')
  asset = addFrame(asset, parado, 0)
  const added = addAnimation(asset)
  asset = added.asset
  if (!added.animationId) throw new Error('animação esperada')
  asset = addFrame(asset, added.animationId, 0)
  asset = addFrame(asset, added.animationId, 0)
  return asset
}

describe('packSpritesheet — geometria', () => {
  it('uma LINHA por animação, columns = max(frames)', () => {
    const pack = packSpritesheet(makeSprite())
    expect(pack.rows).toBe(2)
    expect(pack.columns).toBe(3)
    expect(pack.frameWidth).toBe(16)

    const [parado, andar] = pack.animations
    expect(parado).toEqual({
      name: 'parado',
      row: 0,
      frames: 2,
      from: 0,
      to: 1,
      fps: 8,
      loop: true,
    })
    expect(andar?.from).toBe(3)
    expect(andar?.to).toBe(5)
  })

  it('células cobrem cada quadro na sua linha/coluna', () => {
    const pack = packSpritesheet(makeSprite())
    expect(pack.cells).toHaveLength(5)
    expect(pack.cells.filter((c) => c.row === 0)).toHaveLength(2)
    expect(pack.cells.filter((c) => c.row === 1)).toHaveLength(3)
  })

  it('a célula leva o desenho ACHATADO (todas as camadas), não só a de baixo', () => {
    const base = createPixelSpriteAsset({ name: 'heroi', frameSize: 4 })
    const fundo = createBitmap(4, 4)
    fundo.data[0] = 3
    const topo = createBitmap(4, 4)
    topo.data[1] = 7
    const escondida = createBitmap(4, 4)
    escondida.data[2] = 9
    const asset: PixelSpriteAsset = {
      ...base,
      layers: [
        { id: 'l1', name: 'Camada 1', visible: true },
        { id: 'l2', name: 'Camada 2', visible: true },
        { id: 'l3', name: 'Camada 3', visible: false },
      ],
      animations: [
        { id: 'a1', name: 'parado', fps: 8, loop: true, frames: [[fundo, topo, escondida]] },
      ],
    }
    const cell = packSpritesheet(asset).cells[0]
    // As duas visíveis entram; a escondida NÃO vai para o jogo.
    expect(Array.from(cell?.bitmap.data.slice(0, 3) ?? [])).toEqual([3, 7, 0])
  })

  it('camada TRANCADA e visível ENTRA na folha (lock ≠ hidden)', () => {
    const base = createPixelSpriteAsset({ name: 'heroi', frameSize: 4 })
    const fundo = createBitmap(4, 4)
    fundo.data[0] = 3
    const trancada = createBitmap(4, 4)
    trancada.data[1] = 7
    const asset: PixelSpriteAsset = {
      ...base,
      layers: [
        { id: 'l1', name: 'Camada 1', visible: true },
        { id: 'l2', name: 'Camada 2', visible: true, locked: true },
      ],
      animations: [{ id: 'a1', name: 'parado', fps: 8, loop: true, frames: [[fundo, trancada]] }],
    }
    const cell = packSpritesheet(asset).cells[0]
    expect(Array.from(cell?.bitmap.data.slice(0, 2) ?? [])).toEqual([3, 7])
  })
})

describe('GUARDA de compatibilidade com o runtime do Studio', () => {
  // Reimplementa a conta de packages/studio/src/official-extensions/game-2d/
  // runtime.ts (drawFrame): cols = floor(sheetW/fw); sx=(i%cols)*fw;
  // sy=floor(i/cols)*fh. Cada índice from..to da receita PRECISA cair no
  // quadro certo da folha que empacotamos.
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

  it('todo from..to aponta para o quadro certo da folha', () => {
    const asset = makeSprite()
    const pack = packSpritesheet(asset)
    const sheetW = pack.columns * pack.frameWidth

    for (const meta of pack.animations) {
      for (let k = 0; k < meta.frames; k += 1) {
        const index = meta.from + k
        const { sx, sy } = studioSourceRect(sheetW, pack.frameWidth, pack.frameHeight, index)
        // O quadro k da animação está na célula (col=k, row=meta.row).
        expect(sx).toBe(k * pack.frameWidth)
        expect(sy).toBe(meta.row * pack.frameHeight)
      }
    }
  })

  it('animação de 1 quadro num sprite de 1 animação: from=to=0', () => {
    const single = createPixelSpriteAsset({ name: 'solo', frameSize: 8 })
    const pack = packSpritesheet(single)
    expect(pack.columns).toBe(1)
    expect(pack.animations[0]?.from).toBe(0)
    expect(pack.animations[0]?.to).toBe(0)
  })
})

describe('metadados + receita', () => {
  it('o JSON carrega os números do bloco', () => {
    const meta = JSON.parse(spritesheetMetadata(packSpritesheet(makeSprite())))
    expect(meta.frameWidth).toBe(16)
    expect(meta.animations[1].from).toBe(3)
    expect(meta.animations[1].fps).toBe(8)
  })

  it('a receita fala PT com os números certos', () => {
    const recipe = spritesheetRecipe(packSpritesheet(makeSprite()))
    expect(recipe).toContain('16 × 16')
    expect(recipe).toContain('Animação "andar": do quadro 3 ao 5, velocidade 8.')
  })
})
