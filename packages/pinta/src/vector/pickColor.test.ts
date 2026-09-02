import { describe, expect, it } from 'bun:test'
import { shapeBounds } from './geometry'
import type { VectorGradient, VectorShape } from './model'
import { colorAtPoint, hitShapeAt, pickColorAt } from './pickColor'

type Rect = Extract<VectorShape, { type: 'rect' }>

function rect(
  id: string,
  box: [number, number, number, number],
  extra: Partial<Omit<Rect, 'type'>> = {},
): VectorShape {
  const [x, y, w, h] = box
  return {
    id,
    type: 'rect',
    x,
    y,
    w,
    h,
    rx: 0,
    fill: '#ff2121',
    stroke: null,
    opacity: 1,
    rotation: 0,
    ...extra,
  }
}

const linear = (angle: number): VectorGradient => ({
  type: 'linear',
  from: '#111111',
  to: '#eeeeee',
  angle,
})
const radial: VectorGradient = { type: 'radial', from: '#111111', to: '#eeeeee', angle: 0 }

describe('hitShapeAt (a forma sob o toque)', () => {
  it('a forma mais ao TOPO vence, escondida pula, trancada entra, fora é nulo', () => {
    const fundo = rect('fundo', [0, 0, 100, 100])
    const topo = rect('topo', [25, 25, 50, 50], { fill: '#00a0c8' })
    expect(hitShapeAt([fundo, topo], { x: 50, y: 50 })?.id).toBe('topo')
    expect(hitShapeAt([fundo, topo], { x: 5, y: 5 })?.id).toBe('fundo')
    expect(hitShapeAt([fundo, { ...topo, hidden: true }], { x: 50, y: 50 })?.id).toBe('fundo')
    expect(hitShapeAt([fundo, { ...topo, locked: true }], { x: 50, y: 50 })?.id).toBe('topo')
    expect(hitShapeAt([fundo, topo], { x: 200, y: 200 })).toBeNull()
  })

  it('forma SEM COR nenhuma é invisível e não rouba o toque da forma pintada embaixo', () => {
    // "Sem cor" nos dois canais existe (a paleta oferece nos dois): a criança vê
    // o vermelho, então é o vermelho que ela pega. Sozinha, a invisível é vazio.
    const vermelho = rect('vermelho', [0, 0, 100, 100])
    const fantasma = rect('fantasma', [0, 0, 100, 100], { fill: 'none', stroke: null })
    expect(hitShapeAt([vermelho, fantasma], { x: 50, y: 50 })?.id).toBe('vermelho')
    expect(pickColorAt([vermelho, fantasma], { x: 50, y: 50 })?.hex).toBe('#ff2121')
    expect(hitShapeAt([fantasma], { x: 50, y: 50 })).toBeNull()
    const linhaSemCor: VectorShape = {
      id: 'l0',
      type: 'line',
      x1: 0,
      y1: 0,
      x2: 100,
      y2: 100,
      fill: '#ff2121',
      stroke: null,
      opacity: 1,
      rotation: 0,
    }
    expect(hitShapeAt([vermelho, linhaSemCor], { x: 50, y: 50 })?.id).toBe('vermelho')
  })

  it('linha reta é pega pela folga do toque e por metade do contorno (a caixa dela tem altura zero)', () => {
    const reta: VectorShape = {
      id: 'reta',
      type: 'line',
      x1: 0,
      y1: 0,
      x2: 100,
      y2: 0,
      fill: 'none',
      stroke: { color: '#00a0c8', width: 2 },
      opacity: 1,
      rotation: 0,
    }
    // Sem folga só o contorno conta (1 de cada lado): 3 de distância erra...
    expect(hitShapeAt([reta], { x: 50, y: 3 })).toBeNull()
    expect(hitShapeAt([reta], { x: 50, y: 0.9 })?.id).toBe('reta')
    // ...com a folga do toque (4) acerta, e longe continua errando.
    expect(hitShapeAt([reta], { x: 50, y: 3 }, 4)?.id).toBe('reta')
    expect(hitShapeAt([reta], { x: 50, y: 20 }, 4)).toBeNull()
    expect(pickColorAt([reta], { x: 50, y: 3 }, 4)?.hex).toBe('#00a0c8')
  })

  it('forma GIRADA é tocada onde aparece, não onde a caixa estava', () => {
    // 100×20 girado 90° em torno do centro (50,10): na tela vira 20×100, de (40,-40) a (60,60).
    const girado = rect('g', [0, 0, 100, 20], { rotation: 90 })
    expect(hitShapeAt([girado], { x: 50, y: -30 })?.id).toBe('g')
    expect(hitShapeAt([girado], { x: 90, y: 10 })).toBeNull()
  })
})

describe('colorAtPoint (qual cor sai da forma)', () => {
  it('preenchimento sólido vence; sem preenchimento vale o contorno; linha e pincel são contorno', () => {
    const cheio = rect('a', [0, 0, 10, 10], { stroke: { color: '#000000', width: 2 } })
    expect(colorAtPoint(cheio, { x: 5, y: 5 })).toBe('#ff2121')
    const vazado = rect('b', [0, 0, 10, 10], {
      fill: 'none',
      stroke: { color: '#123456', width: 2 },
    })
    expect(colorAtPoint(vazado, { x: 5, y: 5 })).toBe('#123456')
    expect(colorAtPoint(rect('c', [0, 0, 10, 10], { fill: 'none' }), { x: 5, y: 5 })).toBeNull()
    const linha: VectorShape = {
      id: 'l',
      type: 'line',
      x1: 0,
      y1: 0,
      x2: 10,
      y2: 10,
      fill: '#ff2121',
      stroke: { color: '#00a0c8', width: 2 },
      opacity: 1,
      rotation: 0,
    }
    expect(colorAtPoint(linha, { x: 5, y: 5 })).toBe('#00a0c8')
    const pincel: VectorShape = {
      id: 'p',
      type: 'path',
      d: 'M 0 0 L 10 10',
      fill: 'none',
      stroke: { color: '#78dc52', width: 3 },
      opacity: 1,
      rotation: 0,
    }
    expect(colorAtPoint(pincel, { x: 5, y: 5 })).toBe('#78dc52')
  })

  it('figura de pixel art não tem uma cor só (o toque acha a forma, mas não a cor)', () => {
    const figura: VectorShape = {
      id: 'i',
      type: 'image',
      x: 0,
      y: 0,
      w: 10,
      h: 10,
      src: 'data:image/png;base64,AAAA',
      fill: 'none',
      stroke: null,
      opacity: 1,
      rotation: 0,
    }
    expect(colorAtPoint(figura, { x: 5, y: 5 })).toBeNull()
    expect(pickColorAt([figura], { x: 5, y: 5 })).toEqual({ shape: figura, hex: null })
    expect(pickColorAt([figura], { x: 50, y: 50 })).toBeNull()
  })

  it('texto devolve a cor do preenchimento (caixa estimada)', () => {
    const texto: VectorShape = {
      id: 't',
      type: 'text',
      x: 10,
      y: 40,
      text: 'Oi',
      fontSize: 24,
      fill: '#00A0C8',
      stroke: null,
      opacity: 1,
      rotation: 0,
    }
    const b = shapeBounds(texto)
    const dentro = { x: b.x + b.width / 2, y: b.y + b.height / 2 }
    expect(hitShapeAt([texto], dentro)?.id).toBe('t')
    expect(colorAtPoint(texto, dentro)).toBe('#00a0c8')
  })

  it('normaliza hex antigo em maiúsculas', () => {
    const forma = rect('m', [0, 0, 10, 10], { fill: '#FF2121' })
    expect(colorAtPoint(forma, { x: 5, y: 5 })).toBe('#ff2121')
  })

  it('degradê deitado: metade esquerda é o começo, metade direita é o fim', () => {
    const forma = rect('d', [0, 0, 100, 40], { fill: linear(0) })
    expect(colorAtPoint(forma, { x: 20, y: 20 })).toBe('#111111')
    expect(colorAtPoint(forma, { x: 80, y: 20 })).toBe('#eeeeee')
  })

  it('degradê em pé: em cima é o começo, embaixo é o fim', () => {
    const forma = rect('v', [0, 0, 40, 100], { fill: linear(90) })
    expect(colorAtPoint(forma, { x: 20, y: 10 })).toBe('#111111')
    expect(colorAtPoint(forma, { x: 20, y: 90 })).toBe('#eeeeee')
  })

  it('degradê inclinado (45°): a diagonal divide começo e fim', () => {
    const forma = rect('i', [0, 0, 100, 100], { fill: linear(45) })
    expect(colorAtPoint(forma, { x: 10, y: 50 })).toBe('#111111')
    expect(colorAtPoint(forma, { x: 50, y: 10 })).toBe('#111111')
    expect(colorAtPoint(forma, { x: 90, y: 50 })).toBe('#eeeeee')
    expect(colorAtPoint(forma, { x: 50, y: 90 })).toBe('#eeeeee')
  })

  it('degradê redondo numa caixa deitada segue a elipse da caixa', () => {
    const forma = rect('rd', [0, 0, 200, 50], { fill: radial })
    expect(colorAtPoint(forma, { x: 149, y: 25 })).toBe('#111111')
    expect(colorAtPoint(forma, { x: 150, y: 25 })).toBe('#eeeeee')
  })

  it('degradê redondo: o miolo é o começo, o canto é o fim', () => {
    const forma = rect('r', [0, 0, 100, 100], { fill: radial })
    expect(colorAtPoint(forma, { x: 50, y: 50 })).toBe('#111111')
    expect(colorAtPoint(forma, { x: 5, y: 5 })).toBe('#eeeeee')
  })

  it('degradê numa forma GIRADA segue o que a criança vê', () => {
    // Deitado (0°) num retângulo girado 90°: na tela o começo fica EM CIMA e o
    // fim EMBAIXO. Sem desfazer a rotação, o ponto de cima cairia no meio (0,5)
    // e sairia o fim: é o anti-vácuo deste caso.
    const forma = rect('rg', [0, 0, 100, 20], { fill: linear(0), rotation: 90 })
    expect(colorAtPoint(forma, { x: 50, y: -30 })).toBe('#111111')
    expect(colorAtPoint(forma, { x: 50, y: 50 })).toBe('#eeeeee')
  })

  it('caixa sem extensão não vira NaN: sai uma das duas pontas, sempre um hex válido', () => {
    const forma = rect('z', [10, 10, 0, 0], { fill: linear(0) })
    const cor = colorAtPoint(forma, { x: 10, y: 10 })
    expect(cor).not.toBeNull()
    expect(['#111111', '#eeeeee']).toContain(cor as string)
  })
})
