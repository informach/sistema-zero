import { describe, expect, it } from 'bun:test'
import {
  createBitmap,
  createPixelSpriteAsset,
  createVectorSpriteAsset,
  type PixelSpriteAsset,
} from '../core/project'
import { decodeGif } from '../testing/gifDecode'
import { DEFAULT_STYLE, makeRect } from '../vector/shapes'
import { gifBlob, pixelAnimationGif, rasterCameOutBlank, vectorAnimationGif } from './animationGif'

/**
 * Sprite 2×2 de UMA camada com os quadros pedidos (índices de paleta crus).
 * O 2×2 é escrito à mão porque o menor quadro que a UI cria é 8×8 — aqui o que
 * importa é conseguir listar os pixels esperados um a um.
 */
function sprite(frames: number[][], extra: Partial<PixelSpriteAsset['animations'][0]> = {}) {
  const base = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
  const asset: PixelSpriteAsset = {
    ...base,
    frameWidth: 2,
    frameHeight: 2,
    layers: [{ id: 'l1', name: 'Camada 1', visible: true }],
    animations: [
      {
        id: 'a1',
        name: 'andar',
        fps: 8,
        loop: true,
        frames: frames.map((values) => {
          const bitmap = createBitmap(2, 2)
          values.forEach((value, i) => {
            bitmap.data[i] = value
          })
          return [bitmap]
        }),
        ...extra,
      },
    ],
  }
  return asset
}

describe('pixelAnimationGif', () => {
  it('leva TODOS os quadros da animação, na ordem', () => {
    const asset = sprite([
      [1, 1, 1, 1],
      [2, 2, 2, 2],
      [0, 3, 3, 0],
    ])
    const bytes = pixelAnimationGif(asset, asset.animations[0] as never)
    expect(bytes).not.toBeNull()
    const gif = decodeGif(bytes as Uint8Array)
    expect(gif.frames).toHaveLength(3)
    expect(gif.width).toBe(2)
    expect(gif.height).toBe(2)
    expect(gif.frames.map((f) => Array.from(f.indices))).toEqual([
      [1, 1, 1, 1],
      [2, 2, 2, 2],
      [0, 3, 3, 0],
    ])
  })

  it('o índice do desenho é o MESMO índice do GIF, com as cores da paleta do asset', () => {
    const asset = sprite([[1, 2, 3, 0]])
    const gif = decodeGif(pixelAnimationGif(asset, asset.animations[0] as never) as Uint8Array)
    // Paleta arcade: 1 = branco, 2 = vermelho.
    expect(gif.palette[1]).toEqual([255, 255, 255])
    expect(gif.palette[2]).toEqual([255, 0x21, 0x21])
    expect(gif.frames[0]?.transparentIndex).toBe(0)
  })

  it('o tempo do quadro vem do fps da animação', () => {
    const asset = sprite(
      [
        [1, 1, 1, 1],
        [2, 2, 2, 2],
      ],
      { fps: 4 },
    )
    const gif = decodeGif(pixelAnimationGif(asset, asset.animations[0] as never) as Uint8Array)
    // 4 quadros por segundo = 250 ms = 25 centésimos.
    expect(gif.frames.map((f) => f.delayCs)).toEqual([25, 25])
  })

  it('animação SUAVE exporta com as pontas mais demoradas, como na prévia', () => {
    const asset = sprite(
      [
        [1, 1, 1, 1],
        [2, 2, 2, 2],
        [3, 3, 3, 3],
        [4, 4, 4, 4],
      ],
      { fps: 4, easing: 'ease' },
    )
    const gif = decodeGif(pixelAnimationGif(asset, asset.animations[0] as never) as Uint8Array)
    const delays = gif.frames.map((f) => f.delayCs)
    expect(delays).toHaveLength(4)
    // Devagar nas pontas, rápido no meio — e simétrico.
    expect(delays[0]).toBeGreaterThan(delays[1] as number)
    expect(delays[3]).toBeGreaterThan(delays[2] as number)
    expect(delays[0]).toBe(delays[3] as number)
    // A passada inteira continua durando 1 s (4 quadros a 4 fps).
    expect(delays.reduce((a, b) => a + b, 0)).toBe(100)
  })

  it('`loop: false` sai sem a extensão de repetição (toca uma vez e para)', () => {
    const asset = sprite(
      [
        [1, 1, 1, 1],
        [2, 2, 2, 2],
      ],
      { loop: false },
    )
    const gif = decodeGif(pixelAnimationGif(asset, asset.animations[0] as never) as Uint8Array)
    expect(gif.loop).toBe(false)
  })

  it('camada ESCONDIDA não vai para o GIF', () => {
    const base = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
    const visivel = createBitmap(2, 2)
    visivel.data[0] = 3
    const escondida = createBitmap(2, 2)
    escondida.data[1] = 9
    const asset: PixelSpriteAsset = {
      ...base,
      frameWidth: 2,
      frameHeight: 2,
      layers: [
        { id: 'l1', name: 'Camada 1', visible: true },
        { id: 'l2', name: 'Camada 2', visible: false },
      ],
      animations: [{ id: 'a1', name: 'andar', fps: 8, loop: true, frames: [[visivel, escondida]] }],
    }
    const gif = decodeGif(pixelAnimationGif(asset, asset.animations[0] as never) as Uint8Array)
    expect(Array.from(gif.frames[0]?.indices ?? [])).toEqual([3, 0, 0, 0])
  })

  it('ampliar é repetição EXATA de pixel — nada de borrado', () => {
    const asset = sprite([[1, 2, 3, 0]])
    const gif = decodeGif(pixelAnimationGif(asset, asset.animations[0] as never, 2) as Uint8Array)
    expect(gif.width).toBe(4)
    expect(gif.height).toBe(4)
    // Cada pixel virou um bloco 2×2, e só índices que existiam no desenho.
    expect(Array.from(gif.frames[0]?.indices ?? [])).toEqual([
      1, 1, 2, 2, 1, 1, 2, 2, 3, 3, 0, 0, 3, 3, 0, 0,
    ])
  })

  it('animação sem quadro nenhum devolve null (o botão avisa em vez de baixar vazio)', () => {
    const base = createPixelSpriteAsset({ name: 'heroi', frameSize: 2 })
    const asset: PixelSpriteAsset = {
      ...base,
      animations: [{ id: 'a1', name: 'vazia', fps: 8, loop: true, frames: [] }],
    }
    expect(pixelAnimationGif(asset, asset.animations[0] as never)).toBeNull()
  })
})

describe('vectorAnimationGif', () => {
  it('sem canvas de verdade devolve null em vez de quebrar (happy-dom)', async () => {
    const asset = createVectorSpriteAsset({ name: 'nave', frameSize: 16 })
    expect(await vectorAnimationGif(asset, asset.animations[0] as never)).toBeNull()
  })

  it('animação sem quadro devolve null sem nem tentar rasterizar', async () => {
    const base = createVectorSpriteAsset({ name: 'nave', frameSize: 16 })
    const asset = {
      ...base,
      animations: [{ id: 'a1', name: 'vazia', fps: 8, loop: true, frames: [] }],
    }
    expect(await vectorAnimationGif(asset, asset.animations[0] as never)).toBeNull()
  })
})

describe('gifBlob', () => {
  it('vira um Blob com o tipo que o navegador (e o anexo do hub) reconhecem', () => {
    const blob = gifBlob(Uint8Array.from([0x47, 0x49, 0x46]))
    expect(blob.type).toBe('image/gif')
    expect(blob.size).toBe(3)
  })
})

describe('rasterCameOutBlank (o raster falhou EM BRANCO?)', () => {
  const forma = () => makeRect({ x: 0, y: 0 }, { x: 8, y: 8 }, DEFAULT_STYLE)

  it('desenho COM forma que não rendeu um pixel opaco = falha do raster', () => {
    // Só o slot transparente na paleta: nada foi desenhado, mas havia o que desenhar.
    expect(rasterCameOutBlank([[forma()]], 1)).toBe(true)
  })

  it('desenho com forma que rendeu cor NÃO é falha', () => {
    expect(rasterCameOutBlank([[forma()]], 2)).toBe(false)
  })

  it('animação legitimamente VAZIA não vira erro', () => {
    expect(rasterCameOutBlank([[], []], 1)).toBe(false)
  })

  it('tudo ESCONDIDO é vazio de verdade, não falha do raster', () => {
    // Recusar aqui seria dizer "não consegui" para algo que funcionou.
    expect(rasterCameOutBlank([[{ ...forma(), hidden: true }]], 1)).toBe(false)
  })
})
