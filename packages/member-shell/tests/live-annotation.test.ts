import { describe, expect, test } from 'bun:test'
import {
  type AnnotationShape,
  type AnnotationStroke,
  addShape,
  annotationShortcut,
  clearLayer,
  commitErase,
  containedBox,
  distanceToShape,
  EMPTY_LAYER,
  eraseAt,
  HISTORY_LIMIT,
  isMeaningfulShape,
  type LaserPoint,
  laserFade,
  liveLaser,
  MAX_STROKE_POINTS,
  pointsAlong,
  previewScale,
  shouldAppendPoint,
  strokeWidthFor,
  toBoxPoint,
  toCanvasPoint,
  undoLayer,
} from '../src/lib/live/annotation'

/**
 * O desenho da professora sobre a tela da sala ao vivo: a parte que não depende do navegador.
 * O compositor (`screen-annotation.ts`) só pinta o que esta régua decide.
 */

const stroke = (id: string, points: [number, number][], width = 8): AnnotationStroke => ({
  id,
  kind: 'pen',
  color: '#ef4444',
  width,
  points: points.map(([x, y]) => ({ x, y })),
})

describe('desfazer e limpar', () => {
  test('cada forma nova é um passo; desfazer volta um passo de cada vez', () => {
    const one = addShape(EMPTY_LAYER, stroke('a', [[0, 0]]))
    const two = addShape(one, stroke('b', [[10, 10]]))
    expect(two.shapes.map((shape) => shape.id)).toEqual(['a', 'b'])
    expect(undoLayer(two).shapes.map((shape) => shape.id)).toEqual(['a'])
    expect(undoLayer(undoLayer(two)).shapes).toEqual([])
    // Sem passo guardado, desfazer não muda nada (e devolve a mesma camada).
    expect(undoLayer(EMPTY_LAYER)).toBe(EMPTY_LAYER)
  })

  test('limpar tudo também se desfaz, e limpar o vazio não gasta passo', () => {
    const drawn = addShape(addShape(EMPTY_LAYER, stroke('a', [[0, 0]])), stroke('b', [[5, 5]]))
    const cleared = clearLayer(drawn)
    expect(cleared.shapes).toEqual([])
    expect(undoLayer(cleared).shapes.map((shape) => shape.id)).toEqual(['a', 'b'])
    expect(clearLayer(EMPTY_LAYER)).toBe(EMPTY_LAYER)
  })

  test(`o desfazer alcança ${HISTORY_LIMIT} passos e esquece os mais antigos`, () => {
    let layer = EMPTY_LAYER
    for (let index = 0; index <= HISTORY_LIMIT; index++)
      layer = addShape(layer, stroke(`s${index}`, [[index, 0]]))
    expect(layer.history).toHaveLength(HISTORY_LIMIT)
    for (let index = 0; index < HISTORY_LIMIT; index++) layer = undoLayer(layer)
    // O primeiro traço ficou além do alcance: ele sobra.
    expect(layer.shapes.map((shape) => shape.id)).toEqual(['s0'])
    expect(undoLayer(layer)).toBe(layer)
  })

  test('uma passada de borracha é UM passo, e borracha que não tocou nada não gasta passo', () => {
    const drawn = addShape(addShape(EMPTY_LAYER, stroke('a', [[0, 0]])), stroke('b', [[100, 0]]))
    const before = drawn.shapes
    const afterFirst = { ...drawn, shapes: eraseAt(drawn.shapes, { x: 0, y: 0 }, 14) }
    const afterSecond = { ...afterFirst, shapes: eraseAt(afterFirst.shapes, { x: 100, y: 0 }, 14) }
    const committed = commitErase(afterSecond, before)
    expect(committed.shapes).toEqual([])
    expect(committed.history).toHaveLength(drawn.history.length + 1)
    expect(undoLayer(committed).shapes.map((shape) => shape.id)).toEqual(['a', 'b'])
    expect(commitErase(drawn, before)).toBe(drawn)
  })
})

describe('borracha', () => {
  const line = stroke(
    'linha',
    [
      [0, 0],
      [100, 0],
    ],
    10,
  )

  test('apaga a forma tocada pela borda do traço, não a que está longe', () => {
    // Raio 14 + metade da espessura (5): a 19 px do traço ainda toca, a 20 não.
    expect(eraseAt([line], { x: 50, y: 19 }, 14)).toEqual([])
    expect(eraseAt([line], { x: 50, y: 20 }, 14)).toEqual([line])
  })

  test('nada tocado devolve a MESMA lista (a camada não muda nem gasta passo)', () => {
    const shapes = [line]
    expect(eraseAt(shapes, { x: 500, y: 500 }, 14)).toBe(shapes)
  })

  test('retângulo e círculo se apagam pela linha, não pelo miolo', () => {
    const rect: AnnotationShape = {
      id: 'r',
      kind: 'rect',
      color: '#22c55e',
      width: 4,
      from: { x: 0, y: 0 },
      to: { x: 200, y: 100 },
    }
    const ellipse: AnnotationShape = { ...rect, id: 'e', kind: 'ellipse' }
    expect(distanceToShape(rect, { x: 200, y: 50 })).toBeCloseTo(0)
    expect(distanceToShape(rect, { x: 100, y: 50 })).toBeCloseTo(50)
    expect(distanceToShape(ellipse, { x: 200, y: 50 })).toBeLessThan(1)
    expect(distanceToShape(ellipse, { x: 100, y: 50 })).toBeGreaterThan(45)
  })

  test('a seta se apaga pela haste e pela ponta; o texto pela caixa', () => {
    const arrow: AnnotationShape = {
      id: 'a',
      kind: 'arrow',
      color: '#3b82f6',
      width: 8,
      from: { x: 0, y: 0 },
      to: { x: 300, y: 0 },
    }
    expect(distanceToShape(arrow, { x: 150, y: 0 })).toBeCloseTo(0)
    expect(distanceToShape(arrow, { x: 150, y: 80 })).toBeCloseTo(80)
    const text: AnnotationShape = {
      id: 't',
      kind: 'text',
      color: '#facc15',
      size: 40,
      at: { x: 10, y: 10 },
      text: 'Olha aqui',
      textWidth: 180,
    }
    expect(distanceToShape(text, { x: 100, y: 30 })).toBe(0)
    expect(distanceToShape(text, { x: 210, y: 30 })).toBe(20)
  })

  test('a borracha arrastada depressa passa por todos os pontos do caminho', () => {
    const path = pointsAlong({ x: 0, y: 0 }, { x: 70, y: 0 }, 7)
    expect(path).toHaveLength(10)
    expect(path.at(-1)).toEqual({ x: 70, y: 0 })
    expect(path[0]).toEqual({ x: 7, y: 0 })
  })
})

describe('traço e formas', () => {
  test('um toque com a caneta é um ponto; arrasto curto de forma não vira forma', () => {
    expect(isMeaningfulShape(stroke('p', [[5, 5]]))).toBe(true)
    const tiny: AnnotationShape = {
      id: 'r',
      kind: 'rect',
      color: '#fff',
      width: 4,
      from: { x: 0, y: 0 },
      to: { x: 3, y: 30 },
    }
    expect(isMeaningfulShape(tiny)).toBe(false)
    expect(isMeaningfulShape({ ...tiny, to: { x: 30, y: 30 } })).toBe(true)
    expect(isMeaningfulShape({ ...tiny, kind: 'arrow', to: { x: 5, y: 0 } })).toBe(false)
    const blank: AnnotationShape = {
      id: 't',
      kind: 'text',
      color: '#fff',
      size: 40,
      at: { x: 0, y: 0 },
      text: '   ',
      textWidth: 0,
    }
    expect(isMeaningfulShape(blank)).toBe(false)
  })

  test('o traço guarda ponto só quando a caneta andou, até o teto', () => {
    const points = [{ x: 0, y: 0 }]
    expect(shouldAppendPoint(points, { x: 1, y: 0 })).toBe(false)
    expect(shouldAppendPoint(points, { x: 2, y: 0 })).toBe(true)
    expect(shouldAppendPoint([], { x: 0, y: 0 })).toBe(true)
    const full = Array.from({ length: MAX_STROKE_POINTS }, (_, x) => ({ x: x * 10, y: 0 }))
    expect(shouldAppendPoint(full, { x: -100, y: 0 })).toBe(false)
  })

  test('o marca-texto é bem mais largo que a caneta', () => {
    expect(strokeWidthFor('pen', 'medium')).toBe(8)
    expect(strokeWidthFor('highlighter', 'medium')).toBe(28)
    expect(strokeWidthFor('rect', 'thick')).toBe(14)
  })
})

describe('da prévia para o quadro do compositor', () => {
  // Prévia de 800x600 mostrando um quadro de 1600x900: a imagem ocupa 800x450, com faixas de 75.
  const box = { left: 100, top: 50, width: 800, height: 600 }
  const size = { width: 1600, height: 900 }

  test('a imagem fica no meio da caixa, com faixas', () => {
    expect(containedBox(box, size)).toEqual({ left: 100, top: 125, width: 800, height: 450 })
    expect(previewScale(box, size)).toBe(0.5)
  })

  test('o centro da prévia é o centro do quadro; o canto é o canto', () => {
    expect(toCanvasPoint({ x: 500, y: 350 }, box, size)).toEqual({ x: 800, y: 450, inside: true })
    expect(toCanvasPoint({ x: 100, y: 125 }, box, size)).toEqual({ x: 0, y: 0, inside: true })
    expect(toCanvasPoint({ x: 900, y: 575 }, box, size)).toEqual({
      x: 1600,
      y: 900,
      inside: true,
    })
  })

  test('na faixa o ponto fica preso à borda e avisa que começou fora', () => {
    expect(toCanvasPoint({ x: 500, y: 60 }, box, size)).toEqual({ x: 800, y: 0, inside: false })
  })

  test('o caminho de volta acha o mesmo lugar (o campo de texto abre onde ela clicou)', () => {
    const point = toCanvasPoint({ x: 321, y: 222 }, box, size)
    const back = toBoxPoint(point, box, size)
    expect(back.x + box.left).toBeCloseTo(321)
    expect(back.y + box.top).toBeCloseTo(222)
  })

  test('prévia sem tamanho (ainda não desenhada) não inventa ponto', () => {
    expect(toCanvasPoint({ x: 1, y: 1 }, { left: 0, top: 0, width: 0, height: 0 }, size)).toEqual({
      x: 0,
      y: 0,
      inside: false,
    })
  })
})

describe('luz mágica', () => {
  const point = (at: number, trail = 0): LaserPoint => ({
    x: at,
    y: 0,
    at,
    trail,
    color: '#ef4444',
  })

  test('o rastro some sozinho depois de 1 segundo', () => {
    const trail = [point(0), point(400), point(900)]
    expect(liveLaser(trail, 500)).toBe(trail)
    expect(liveLaser(trail, 1200).map((item) => item.at)).toEqual([400, 900])
    expect(liveLaser(trail, 1950)).toEqual([])
  })

  test('o brilho apaga com a idade do ponto', () => {
    expect(laserFade(point(0), 0)).toBe(1)
    expect(laserFade(point(0), 500)).toBe(0.5)
    expect(laserFade(point(0), 1000)).toBe(0)
    expect(laserFade(point(0), 5000)).toBe(0)
  })
})

describe('atalhos de teclado', () => {
  const key = (value: string, extra: Partial<KeyboardEventInit> = {}) =>
    annotationShortcut({
      key: value,
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      shiftKey: false,
      ...extra,
    })

  test('uma letra por ferramenta, maiúscula ou minúscula', () => {
    expect(key('p')).toEqual({ type: 'tool', tool: 'pen' })
    expect(key('P', { shiftKey: true })).toEqual({ type: 'tool', tool: 'pen' })
    expect(key('m')).toEqual({ type: 'tool', tool: 'highlighter' })
    expect(key('a')).toEqual({ type: 'tool', tool: 'arrow' })
    expect(key('r')).toEqual({ type: 'tool', tool: 'rect' })
    expect(key('c')).toEqual({ type: 'tool', tool: 'ellipse' })
    expect(key('t')).toEqual({ type: 'tool', tool: 'text' })
    expect(key('e')).toEqual({ type: 'tool', tool: 'eraser' })
    expect(key('l')).toEqual({ type: 'tool', tool: 'laser' })
  })

  test('Ctrl+Z desfaz, Esc sai, Q troca tela e quadro', () => {
    expect(key('z', { ctrlKey: true })).toEqual({ type: 'undo' })
    expect(key('Z', { metaKey: true })).toEqual({ type: 'undo' })
    expect(key('Escape')).toEqual({ type: 'exit' })
    expect(key('q')).toEqual({ type: 'surface' })
  })

  test('atalho do navegador não vira ferramenta', () => {
    expect(key('p', { ctrlKey: true })).toBeNull()
    expect(key('r', { metaKey: true })).toBeNull()
    expect(key('e', { altKey: true })).toBeNull()
    expect(key('z', { ctrlKey: true, shiftKey: true })).toBeNull()
    expect(key('z')).toBeNull()
    expect(key('Enter')).toBeNull()
  })
})
