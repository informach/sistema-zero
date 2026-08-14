import { describe, expect, it, test } from 'bun:test'
import { bmp } from '../testing/fixtures'
import { resizeAsset, resizeBitmapCanvas, resizeCuts, resizeTargetOf } from './assetResize'
import type { PintaAsset, PixelSpriteAsset, TilemapAsset } from './project'
import { sanitizePintaAsset } from './project'
import {
  createPixelBackgroundAsset,
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  createVectorBackgroundAsset,
  createVectorSpriteAsset,
} from './projectConfig'

describe('resizeBitmapCanvas', () => {
  test('crescer centraliza e o desenho fica inteiro', () => {
    const antes = bmp(['12', '34'])
    const depois = resizeBitmapCanvas(antes, 4, 4, 'center')
    expect(depois.width).toBe(4)
    expect(depois.height).toBe(4)
    // (4-2)/2 = 1 → o 2x2 cai no miolo.
    expect([...depois.data]).toEqual([0, 0, 0, 0, 0, 1, 2, 0, 0, 3, 4, 0, 0, 0, 0, 0])
  })

  test('crescer no canto não move o desenho', () => {
    const depois = resizeBitmapCanvas(bmp(['12', '34']), 4, 3, 'top-left')
    expect([...depois.data]).toEqual([1, 2, 0, 0, 3, 4, 0, 0, 0, 0, 0, 0])
  })

  test('encolher CORTA o que fica de fora', () => {
    const depois = resizeBitmapCanvas(bmp(['12', '34']), 1, 1, 'top-left')
    expect([...depois.data]).toEqual([1])
  })

  test('mesmo tamanho devolve o MESMO objeto (a UI usa isso para não commitar)', () => {
    const antes = bmp(['12', '34'])
    expect(resizeBitmapCanvas(antes, 2, 2)).toBe(antes)
  })
})

describe('resizeTargetOf', () => {
  test('peças ficam de fora: o tamanho do tile é whitelist do motor', () => {
    expect(resizeTargetOf(createTilesetAsset({ name: 'pecas', tileSize: 16 }))).toBeNull()
  })

  test('personagem responde o quadro; mapa responde em CÉLULAS', () => {
    const heroi = createPixelSpriteAsset({ name: 'heroi', frameSize: 32 })
    expect(resizeTargetOf(heroi)).toMatchObject({ width: 32, height: 32, unit: 'pixels' })
    const mapa = createTilemapAsset({ name: 'mapa', tilesetId: 'x', cols: 4, rows: 3 })
    expect(resizeTargetOf(mapa)).toMatchObject({ width: 4, height: 3, unit: 'cells' })
  })
})

describe('resizeAsset', () => {
  /**
   * ⚠️⚠️ A rede que importa. `frameWidth`/`frameHeight` e TODOS os bitmaps têm que
   * andar juntos: um quadro que diz 128x32 com bitmap 128x128 é DESCARTADO pelo
   * sanitize e o desenho some da galeria sem erro nenhum. Aconteceu de verdade ao
   * destravar o quadro deitado na fábrica.
   */
  test('⭐ o personagem redimensionado SOBREVIVE ao sanitize, com todos os quadros', () => {
    const heroi = createPixelSpriteAsset({ name: 'heroi', frameSize: 16 })
    // Duas animações, duas camadas, dois quadros: o pior caso da travessia.
    const animacao = heroi.animations[0]
    if (!animacao) throw new Error('animação esperada')
    animacao.frames = [
      [bmp(Array(16).fill('1'.repeat(16))), bmp(Array(16).fill('2'.repeat(16)))],
      [bmp(Array(16).fill('3'.repeat(16))), bmp(Array(16).fill('4'.repeat(16)))],
    ]
    heroi.layers = [
      { id: 'a', name: 'Camada 1', visible: true },
      { id: 'b', name: 'Camada 2', visible: true },
    ]
    heroi.animations.push({ ...animacao, id: 'outra', name: 'andando' })

    const maior = resizeAsset(heroi, 128, 32) as PixelSpriteAsset
    expect(maior.frameWidth).toBe(128)
    expect(maior.frameHeight).toBe(32)
    for (const anim of maior.animations) {
      for (const frame of anim.frames) {
        expect(frame.length).toBe(2)
        for (const cel of frame) {
          expect([cel.width, cel.height]).toEqual([128, 32])
          expect(cel.data.length).toBe(128 * 32)
        }
      }
    }
    // ⚠️ `structuredClone`, NUNCA JSON: o JSON transforma Uint8Array em objeto e o
    // sanitize recusaria por outro motivo — o teste passaria pela razão errada. O
    // IndexedDB usa structured clone, que é o caminho real.
    expect(sanitizePintaAsset(structuredClone(maior))).not.toBeNull()
  })

  test('anti-vácuo: um quadro deixado para trás É descartado pelo sanitize', () => {
    // Se a travessia esquecer um cel, o asset inteiro some. É por isso que a op é
    // uma só — este caso prova que o perigo é real, não teórico.
    const heroi = createPixelSpriteAsset({ name: 'heroi', frameSize: 16 })
    const quebrado = { ...heroi, frameWidth: 128, frameHeight: 32 }
    expect(sanitizePintaAsset(structuredClone(quebrado))).toBeNull()
  })

  test('o cenário leva todas as camadas', () => {
    const cenario = createPixelBackgroundAsset({ name: 'ceu', width: 8, height: 8 })
    cenario.layers = [
      { id: 'a', name: 'Camada 1', visible: true },
      { id: 'b', name: 'Camada 2', visible: true },
    ]
    cenario.cels = [bmp(Array(8).fill('1'.repeat(8))), bmp(Array(8).fill('2'.repeat(8)))]
    const maior = resizeAsset(cenario, 20, 12)
    if (maior?.kind !== 'pixel-background') throw new Error('cenário esperado')
    expect(maior.cels.length).toBe(2)
    for (const cel of maior.cels) expect([cel.width, cel.height]).toEqual([20, 12])
    expect(sanitizePintaAsset(structuredClone(maior))).not.toBeNull()
  })

  test('no vetor basta o quadro: as formas guardam as coordenadas delas', () => {
    const nave = createVectorSpriteAsset({ name: 'nave', frameSize: 64 })
    const maior = resizeAsset(nave, 128, 32)
    if (maior?.kind !== 'vector-sprite') throw new Error('vetor esperado')
    expect([maior.frameWidth, maior.frameHeight]).toEqual([128, 32])
    expect(maior.animations).toEqual(nave.animations)
  })

  test('o mapa cresce em células e preserva o que já estava desenhado', () => {
    const mapa = createTilemapAsset({ name: 'fase', tilesetId: 'x', cols: 2, rows: 2 })
    const camada = mapa.layers[0]
    if (!camada) throw new Error('camada esperada')
    camada.cells = Int16Array.from([5, 6, 7, 8])
    const maior = resizeAsset(mapa, 4, 4, 'top-left') as TilemapAsset
    expect([maior.cols, maior.rows]).toEqual([4, 4])
    expect([...(maior.layers[0]?.cells ?? [])]).toEqual([
      5, 6, -1, -1, 7, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    ])
    expect(sanitizePintaAsset(structuredClone(maior))).not.toBeNull()
  })

  test('peças recusam, e o mesmo tamanho devolve o MESMO asset', () => {
    const pecas = createTilesetAsset({ name: 'pecas', tileSize: 16 })
    expect(resizeAsset(pecas, 32, 32)).toBeNull()
    const heroi = createPixelSpriteAsset({ name: 'heroi', frameSize: 32 })
    expect(resizeAsset(heroi, 32, 32)).toBe(heroi)
  })

  test('o pedido é clampado nos limites do kind', () => {
    const heroi = createPixelSpriteAsset({ name: 'heroi', frameSize: 32 })
    const enorme = resizeAsset(heroi, 9999, 2) as PixelSpriteAsset
    expect([enorme.frameWidth, enorme.frameHeight]).toEqual([128, 8])
  })
})

describe('resizeCuts', () => {
  test('avisa só quando algum lado ENCOLHE', () => {
    const heroi = createPixelSpriteAsset({ name: 'heroi', frameSize: 32 })
    expect(resizeCuts(heroi, 64, 64)).toBe(false)
    expect(resizeCuts(heroi, 64, 16)).toBe(true)
    expect(resizeCuts(createTilesetAsset({ name: 'p', tileSize: 16 }), 8, 8)).toBe(false)
  })
})

describe('⭐ o VETOR obedece a mesma âncora que o pixel (full review 14/08)', () => {
  /**
   * Achado do review: o mesmo diálogo prometia duas coisas. Crescer 32→128
   * centralizava a arte no pixel e deixava a forma vetorial colada no canto
   * (medido: x=8 com o quadro novo centrado em 64).
   */
  function comUmQuadrado(x: number, y: number, lado: number) {
    let asset = createVectorSpriteAsset({ name: 'v', frameSize: 32 })
    const anim = asset.animations[0]
    if (!anim) throw new Error('animação esperada')
    asset = {
      ...asset,
      animations: [
        {
          ...anim,
          frames: [
            [
              {
                id: 's1',
                type: 'rect',
                x,
                y,
                w: lado,
                h: lado,
                rx: 0,
                fill: '#ff2121',
                stroke: null,
                opacity: 1,
                rotation: 0,
              },
            ],
          ],
        },
      ],
    }
    return asset
  }

  function primeiraForma(asset: PintaAsset | null) {
    if (asset?.kind !== 'vector-sprite') throw new Error('sprite vetorial esperado')
    const forma = asset.animations[0]?.frames[0]?.[0]
    if (forma?.type !== 'rect') throw new Error('retângulo esperado')
    return forma
  }

  it('crescer leva a forma junto para o MEIO', () => {
    const forma = primeiraForma(resizeAsset(comUmQuadrado(8, 8, 16), 128, 128))
    // O centro da forma (16,16) tinha que virar o centro do quadro novo (64,64).
    expect([forma.x + forma.w / 2, forma.y + forma.h / 2]).toEqual([64, 64])
  })

  it('⚠️ ANTI-VÁCUO: sem mover, a forma ficaria a 48px do lugar certo', () => {
    // A régua que prova que o conserto fez algo. 8 era o valor ANTIGO.
    const forma = primeiraForma(resizeAsset(comUmQuadrado(8, 8, 16), 128, 128))
    expect(forma.x).not.toBe(8)
    expect(forma.x).toBe(56)
  })

  it('a âncora canto-superior não move nada', () => {
    const forma = primeiraForma(resizeAsset(comUmQuadrado(8, 8, 16), 128, 128, 'top-left'))
    expect([forma.x, forma.y]).toEqual([8, 8])
  })

  it('o FUNDO vetorial segue a mesma regra', () => {
    const fundo = createVectorBackgroundAsset({ name: 'f', width: 100, height: 100 })
    const comForma = {
      ...fundo,
      shapes: [
        {
          id: 's',
          type: 'rect' as const,
          x: 0,
          y: 0,
          w: 20,
          h: 20,
          rx: 0,
          fill: '#ff2121',
          stroke: null,
          opacity: 1,
          rotation: 0,
        },
      ],
    }
    const maior = resizeAsset(comForma, 200, 200)
    if (maior?.kind !== 'vector-background') throw new Error('fundo esperado')
    expect(maior.shapes[0]?.type === 'rect' && maior.shapes[0].x).toBe(50)
  })
})
