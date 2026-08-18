import { describe, expect, it } from 'bun:test'
import {
  createBitmap,
  createPixelBackgroundAsset,
  createPixelSpriteAsset,
  PINTA_LIMITS,
  type PintaBitmap,
  type PintaPixelLayer,
  type PixelSpriteAsset,
} from '../core/project'
import {
  addPixelLayer,
  flattenCels,
  flattenCelsOrBlank,
  flattenCelsRange,
  hasLockedLayer,
  isLayerLocked,
  layerIndexOf,
  movePixelLayer,
  removePixelLayer,
  renamePixelLayer,
  stackBitmaps,
  togglePixelLayerLocked,
  togglePixelLayerVisible,
  visibleComposite,
} from './layers'

/** Bitmap 2×2 com o primeiro pixel pintado da cor pedida. */
function dot(color: number): PintaBitmap {
  const bitmap = createBitmap(2, 2)
  bitmap.data[0] = color
  return bitmap
}

const LAYERS: PintaPixelLayer[] = [
  { id: 'l1', name: 'Camada 1', visible: true },
  { id: 'l2', name: 'Camada 2', visible: true },
]

/** Sprite com 2 animações × 2 quadros × 2 camadas (pega esquecimento de nível). */
function sprite(): PixelSpriteAsset {
  const base = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
  const frame = (): PintaBitmap[] => [createBitmap(8, 8), createBitmap(8, 8)]
  return {
    ...base,
    layers: [...LAYERS],
    animations: [
      { id: 'a1', name: 'parado', fps: 8, loop: true, frames: [frame(), frame()] },
      { id: 'a2', name: 'andar', fps: 8, loop: true, frames: [frame(), frame()] },
    ],
  }
}

describe('flattenCels', () => {
  it('a camada de CIMA vence onde pintou; transparente deixa ver a de baixo', () => {
    const out = flattenCels([dot(3), dot(0)], LAYERS)
    // O cel de cima está vazio no pixel 0 → aparece o 3 de baixo.
    expect(Array.from(out?.data ?? [])).toEqual([3, 0, 0, 0])

    const coberto = flattenCels([dot(3), dot(7)], LAYERS)
    expect(Array.from(coberto?.data ?? [])).toEqual([7, 0, 0, 0])
  })

  it('camada ESCONDIDA não entra', () => {
    const layers = LAYERS.map((layer, index) =>
      index === 1 ? { ...layer, visible: false } : layer,
    )
    const out = flattenCels([dot(3), dot(7)], layers)
    expect(Array.from(out?.data ?? [])).toEqual([3, 0, 0, 0])
  })

  it('uma camada visível só: devolve o PRÓPRIO cel (sem cópia)', () => {
    const cel = dot(3)
    expect(flattenCels([cel], LAYERS.slice(0, 1))).toBe(cel)
  })

  it('tudo escondido → null', () => {
    const layers = LAYERS.map((l) => ({ ...l, visible: false }))
    expect(flattenCels([dot(3), dot(7)], layers)).toBeNull()
  })

  it('flattenCelsRange pega só a fatia; faixa vazia → null', () => {
    const cels = [dot(1), dot(2), dot(3)]
    const layers = [...LAYERS, { id: 'l3', name: 'Camada 3', visible: true }]
    expect(Array.from(flattenCelsRange(cels, layers, 0, 2)?.data ?? [])).toEqual([2, 0, 0, 0])
    expect(flattenCelsRange(cels, layers, 1, 1)).toBeNull()
  })

  it('stackBitmaps empilha ignorando nulos', () => {
    expect(Array.from(stackBitmaps([dot(1), null, dot(0), undefined]).data)).toEqual([1, 0, 0, 0])
    expect(Array.from(stackBitmaps([dot(1), dot(9)]).data)).toEqual([9, 0, 0, 0])
  })

  it('composto visível exclui a camada ativa quando ela está escondida', () => {
    expect(Array.from(visibleComposite(dot(7), false, dot(3), null).data)).toEqual([3, 0, 0, 0])
    expect(Array.from(visibleComposite(dot(7), false, null, null).data)).toEqual([0, 0, 0, 0])
  })

  it('prévia de tudo escondido vira bitmap transparente nas dimensões do quadro', () => {
    const hidden = LAYERS.map((layer) => ({ ...layer, visible: false }))
    const preview = flattenCelsOrBlank([dot(3), dot(7)], hidden)
    expect([preview.width, preview.height]).toEqual([2, 2])
    expect(Array.from(preview.data)).toEqual([0, 0, 0, 0])
  })
})

describe('layerIndexOf', () => {
  it('id conhecido devolve a posição; desconhecido/null cai na de CIMA', () => {
    const asset = sprite()
    expect(layerIndexOf(asset, 'l1')).toBe(0)
    expect(layerIndexOf(asset, 'l2')).toBe(1)
    expect(layerIndexOf(asset, null)).toBe(1)
    expect(layerIndexOf(asset, 'sumiu')).toBe(1)
  })
})

describe('addPixelLayer / removePixelLayer', () => {
  it('sprite: a camada nova ganha um cel VAZIO em todos os quadros de todas as animações', () => {
    const out = addPixelLayer(sprite())
    expect(out.layers).toHaveLength(3)
    for (const animation of out.animations) {
      for (const cels of animation.frames) expect(cels).toHaveLength(3)
    }
  })

  it('cenário: entra no topo e nomeia sozinha', () => {
    const base = createPixelBackgroundAsset({ name: 'ceu', width: 4, height: 4 })
    const out = addPixelLayer(base)
    expect(out.cels).toHaveLength(2)
    expect(out.layers[1]?.name).toBe('Camada 2')
  })

  it('no teto devolve o MESMO asset (é como a UI detecta o limite)', () => {
    let asset: ReturnType<typeof createPixelBackgroundAsset> = createPixelBackgroundAsset({
      name: 'ceu',
      width: 4,
      height: 4,
    })
    for (let i = 1; i < PINTA_LIMITS.maxPixelLayers; i += 1) asset = addPixelLayer(asset)
    expect(asset.layers).toHaveLength(PINTA_LIMITS.maxPixelLayers)
    expect(addPixelLayer(asset)).toBe(asset)
  })

  it('remover tira o cel junto em todos os quadros; a última camada nunca sai', () => {
    const out = removePixelLayer(sprite(), 'l1')
    expect(out.layers.map((l) => l.id)).toEqual(['l2'])
    for (const animation of out.animations) {
      for (const cels of animation.frames) expect(cels).toHaveLength(1)
    }
    expect(removePixelLayer(out, 'l2')).toBe(out)
    // Id inexistente é no-op.
    expect(removePixelLayer(sprite(), 'sumiu').layers).toHaveLength(2)
  })
})

describe('togglePixelLayerVisible / renamePixelLayer', () => {
  it('olho alterna só a camada pedida', () => {
    const out = togglePixelLayerVisible(sprite(), 'l1')
    expect(out.layers[0]?.visible).toBe(false)
    expect(out.layers[1]?.visible).toBe(true)
  })

  it('renomear apara o nome; vazio e nome igual são no-op', () => {
    const base = sprite()
    expect(renamePixelLayer(base, 'l1', '  roupa  ').layers[0]?.name).toBe('roupa')
    expect(renamePixelLayer(base, 'l1', '   ')).toBe(base)
    expect(renamePixelLayer(base, 'l1', 'Camada 1')).toBe(base)
  })
})

describe('movePixelLayer', () => {
  it('leva os CELS junto em todos os quadros (senão o desenho troca de camada)', () => {
    const base = sprite()
    // Marca o cel da camada de baixo no 1º quadro.
    const first = base.animations[0]?.frames[0]
    if (first?.[0]) first[0].data[0] = 5

    const out = movePixelLayer(base, 'l1', 1)
    expect(out.layers.map((l) => l.id)).toEqual(['l2', 'l1'])
    // O desenho marcado acompanhou a camada até a posição nova.
    expect(out.animations[0]?.frames[0]?.[1]?.data[0]).toBe(5)
    expect(out.animations[0]?.frames[0]?.[0]?.data[0]).toBe(0)
    // As demais animações também foram reordenadas.
    expect(out.animations[1]?.frames[0]).toHaveLength(2)
  })

  it('destino inválido ou igual → MESMO asset', () => {
    const base = sprite()
    expect(movePixelLayer(base, 'l1', 0)).toBe(base)
    expect(movePixelLayer(base, 'l1', -1)).toBe(base)
    expect(movePixelLayer(base, 'l1', 9)).toBe(base)
    expect(movePixelLayer(base, 'sumiu', 1)).toBe(base)
  })
})

describe('togglePixelLayerLocked / isLayerLocked / hasLockedLayer', () => {
  it('trancar EMITE a chave; destrancar a REMOVE (round-trip estrito do wire)', () => {
    const locked = togglePixelLayerLocked(sprite(), 'l1')
    expect(locked.layers[0]?.locked).toBe(true)
    // A vizinha não ganha a chave.
    expect('locked' in (locked.layers[1] ?? {})).toBe(false)

    const unlocked = togglePixelLayerLocked(locked, 'l1')
    expect('locked' in (unlocked.layers[0] ?? {})).toBe(false)
  })

  it('id inexistente → MESMO asset', () => {
    const base = sprite()
    expect(togglePixelLayerLocked(base, 'sumiu')).toBe(base)
  })

  it('isLayerLocked segue a régua da camada ativa (null = a de cima)', () => {
    const base = togglePixelLayerLocked(sprite(), 'l2')
    expect(isLayerLocked(base, 'l2')).toBe(true)
    expect(isLayerLocked(base, 'l1')).toBe(false)
    // l2 é a de CIMA — null cai nela (é a ativa por default).
    expect(isLayerLocked(base, null)).toBe(true)
  })

  it('hasLockedLayer vê qualquer camada trancada (a régua do espelhar/girar)', () => {
    const base = sprite()
    expect(hasLockedLayer(base)).toBe(false)
    expect(hasLockedLayer(togglePixelLayerLocked(base, 'l1'))).toBe(true)
  })

  it('o cadeado NÃO mexe no desenho nem na visibilidade', () => {
    const base = sprite()
    const out = togglePixelLayerLocked(base, 'l1')
    expect(out.layers[0]?.visible).toBe(true)
    expect(out.animations).toBe(base.animations)
  })
})
