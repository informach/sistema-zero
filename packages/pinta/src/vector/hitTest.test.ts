import { describe, expect, it } from 'bun:test'
import { shapeBounds } from './geometry'
import { hitMovableShapeAt, shapeHitAt } from './hitTest'
import type { Vec2, VectorShape } from './model'

type Rect = Extract<VectorShape, { type: 'rect' }>

const BASE = { fill: '#ff2121', stroke: null, opacity: 1, rotation: 0 } as const

function rect(
  id: string,
  box: [number, number, number, number],
  extra: Partial<Omit<Rect, 'type'>> = {},
): VectorShape {
  const [x, y, w, h] = box
  return { id, type: 'rect', x, y, w, h, rx: 0, ...BASE, ...extra }
}

/** Traço vazado (o que o pincel cria): sem miolo, só o contorno. */
function stroke(id: string, d: string, extra: Partial<VectorShape> = {}): VectorShape {
  return {
    id,
    type: 'path',
    d,
    ...BASE,
    fill: 'none',
    stroke: { color: '#000000', width: 4 },
    ...extra,
  } as VectorShape
}

function ellipse(id: string, box: [number, number, number, number], fill = '#ff2121'): VectorShape {
  const [cx, cy, rx, ry] = box
  return {
    id,
    type: 'ellipse',
    cx,
    cy,
    rx,
    ry,
    ...BASE,
    fill,
    stroke: { color: '#000000', width: 2 },
  }
}

function polyline(id: string, points: Vec2[]): VectorShape {
  return {
    id,
    type: 'polygon',
    points,
    ...BASE,
    fill: 'none',
    stroke: { color: '#000000', width: 2 },
  }
}

describe('hitMovableShapeAt: forma vazada (só contorno)', () => {
  it('o miolo da caixa de um zigue-zague NÃO acerta; o fio, com a folga, acerta', () => {
    // De (0,0) a (100,100) e de volta a (200,0): a caixa cobre (0..200, 0..100), mas
    // o ponto (100,20) fica a ~63 unidades dos dois trechos.
    const zigzag = stroke('z', 'M 0 0 L 100 100 L 200 0')
    expect(hitMovableShapeAt([zigzag], { x: 100, y: 20 }, 4)).toBeNull()
    // A 1,4 do fio (dentro da folga 4 + metade do contorno 2) acerta...
    expect(hitMovableShapeAt([zigzag], { x: 50, y: 52 }, 4)).toBe(zigzag)
    // ...a 7 (fora dos 6) não.
    expect(hitMovableShapeAt([zigzag], { x: 50, y: 60 }, 4)).toBeNull()
  })

  it('os pontos de controle da cúbica e o Z entram no contorno', () => {
    const closed = stroke('c', 'M 0 0 C 0 100 100 100 100 0 Z')
    // Sobre o primeiro trecho (âncora -> controle) e sobre o fechamento do Z.
    expect(shapeHitAt(closed, { x: 0, y: 50 })).toBe(true)
    expect(shapeHitAt(closed, { x: 50, y: 0 })).toBe(true)
    // Sem o Z o trecho de volta não existe.
    const open = stroke('o', 'M 0 0 C 0 100 100 100 100 0')
    expect(shapeHitAt(open, { x: 50, y: 0 })).toBe(false)
    expect(shapeHitAt(open, { x: 50, y: 100 })).toBe(true)
  })

  it('círculo "sem cor" por dentro: o miolo não acerta, a borda acerta', () => {
    const anel = ellipse('a', [50, 50, 50, 30], 'none')
    expect(hitMovableShapeAt([anel], { x: 50, y: 50 }, 4)).toBeNull()
    expect(hitMovableShapeAt([anel], { x: 50, y: 22 }, 4)).toBe(anel)
    expect(hitMovableShapeAt([anel], { x: 99, y: 50 }, 4)).toBe(anel)
  })

  it('polilinha (polígono vazado): miolo abre espaço, aresta acerta', () => {
    const tri = polyline('t', [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 100 },
    ])
    expect(hitMovableShapeAt([tri], { x: 50, y: 30 }, 4)).toBeNull()
    expect(hitMovableShapeAt([tri], { x: 50, y: 3 }, 4)).toBe(tri)
  })

  it('linha reta: perto do segmento acerta, longe dentro da caixa não', () => {
    const diagonal: VectorShape = {
      id: 'l',
      type: 'line',
      x1: 0,
      y1: 0,
      x2: 100,
      y2: 100,
      ...BASE,
      fill: 'none',
      stroke: { color: '#000000', width: 2 },
    }
    expect(hitMovableShapeAt([diagonal], { x: 50, y: 52 }, 4)).toBe(diagonal)
    expect(hitMovableShapeAt([diagonal], { x: 90, y: 10 }, 4)).toBeNull()
  })

  it('`d` fora do nosso formato (defensivo): a caixa decide, sem lançar', () => {
    const estranho = stroke('e', 'm 0 0 l 10 10')
    expect(() => hitMovableShapeAt([estranho], { x: 0, y: 0 }, 4)).not.toThrow()
    expect(hitMovableShapeAt([estranho], { x: 0, y: 0 }, 4)).toBe(estranho)
  })
})

describe('hitMovableShapeAt: forma cheia', () => {
  it('a caixa alargada pela folga e por metade do contorno decide', () => {
    const cheio = rect('r', [10, 10, 100, 100], { stroke: { color: '#000000', width: 4 } })
    expect(shapeHitAt(cheio, { x: 60, y: 60 })).toBe(true)
    // O contorno pinta 2 para fora da geometria...
    expect(shapeHitAt(cheio, { x: 112, y: 50 })).toBe(true)
    expect(shapeHitAt(cheio, { x: 113, y: 50 })).toBe(false)
    // ...e a folga do toque soma a isso.
    expect(shapeHitAt(cheio, { x: 116, y: 50 }, 4)).toBe(true)
    expect(shapeHitAt(cheio, { x: 117, y: 50 }, 4)).toBe(false)
  })

  it('círculo cheio segue a equação da elipse: o canto da caixa fica de fora', () => {
    const cheio = ellipse('c', [50, 50, 50, 30])
    expect(shapeHitAt(cheio, { x: 50, y: 50 })).toBe(true)
    expect(shapeHitAt(cheio, { x: 5, y: 25 })).toBe(false)
    expect(shapeHitAt(cheio, { x: 96, y: 50 })).toBe(true)
  })

  it('forma GIRADA é tocada onde aparece, não onde a caixa estava', () => {
    // 100x20 vazado, girado 90 graus em torno de (50,10): na tela vira 20x100.
    const girado = rect('g', [0, 0, 100, 20], {
      fill: 'none',
      stroke: { color: '#000000', width: 2 },
      rotation: 90,
    })
    expect(shapeHitAt(girado, { x: 60, y: 30 })).toBe(true)
    expect(shapeHitAt(girado, { x: 100, y: 10 })).toBe(false)
  })

  it('texto e figura contam como cheios: a caixa vale mesmo sem preenchimento', () => {
    const texto: VectorShape = {
      id: 't',
      type: 'text',
      x: 10,
      y: 40,
      text: 'Oi',
      fontSize: 24,
      ...BASE,
      fill: 'none',
      stroke: { color: '#000000', width: 1 },
    }
    const b = shapeBounds(texto)
    expect(shapeHitAt(texto, { x: b.x + b.width / 2, y: b.y + b.height / 2 })).toBe(true)
    const figura: VectorShape = {
      id: 'i',
      type: 'image',
      x: 0,
      y: 0,
      w: 10,
      h: 10,
      src: 'data:image/png;base64,AAAA',
      ...BASE,
      fill: 'none',
    }
    expect(shapeHitAt(figura, { x: 5, y: 5 })).toBe(true)
  })
})

describe('hitMovableShapeAt: quem entra na varredura', () => {
  it('a mais ao TOPO vence; escondida e sem cor nenhuma são puladas', () => {
    const fundo = rect('fundo', [0, 0, 100, 100])
    const topo = rect('topo', [25, 25, 50, 50], { fill: '#00a0c8' })
    expect(hitMovableShapeAt([fundo, topo], { x: 50, y: 50 })).toBe(topo)
    expect(hitMovableShapeAt([fundo, { ...topo, hidden: true }], { x: 50, y: 50 })).toBe(fundo)
    const fantasma = rect('fantasma', [0, 0, 100, 100], { fill: 'none', stroke: null })
    expect(hitMovableShapeAt([fundo, fantasma], { x: 50, y: 50 })).toBe(fundo)
    expect(hitMovableShapeAt([fantasma], { x: 50, y: 50 })).toBeNull()
    expect(hitMovableShapeAt([fundo, topo], { x: 200, y: 200 })).toBeNull()
  })

  it('trancada nunca BLOQUEIA: a forma livre embaixo continua tocável, e sozinha ela é nada', () => {
    const livre = rect('livre', [0, 0, 100, 100])
    // Traço vazado trancado atravessando a livre, bem em cima do ponto do toque.
    const trancado = stroke('trancado', 'M 0 50 L 200 50', { locked: true })
    expect(hitMovableShapeAt([livre, trancado], { x: 50, y: 50 }, 4)).toBe(livre)
    expect(hitMovableShapeAt([trancado], { x: 50, y: 50 }, 4)).toBeNull()
    // Cheia e trancada por cima: idem.
    const tampa = rect('tampa', [0, 0, 100, 100], { fill: '#00a0c8', locked: true })
    expect(hitMovableShapeAt([livre, tampa], { x: 50, y: 50 })).toBe(livre)
  })
})
