import { describe, expect, it } from 'bun:test'
import { sanitizeVectorShape, type Vec2, type VectorShape } from './model'
import {
  editablePathToD,
  fromEditablePath,
  insertNodeAt,
  isSmoothNode,
  makeCorner,
  makeSmooth,
  minNodesFor,
  moveNodes,
  nearestOnPath,
  pointOnSegment,
  removeNodes,
  segmentEnds,
  segmentsForNodes,
  setClosed,
  setHandle,
  setSegmentCurved,
  smoothPath,
  toEditablePath,
} from './pathNodes'
import { smoothStrokeToPath } from './smoothing'

type EditablePathLike = ReturnType<typeof toEditablePath> & object

const base = {
  id: 'a1',
  fill: '#ff0000',
  stroke: { color: '#000000', width: 2 },
  opacity: 1,
  rotation: 0,
} as const

function pathOf(d: string): VectorShape {
  return { ...base, type: 'path', d }
}

function polygonOf(points: Vec2[]): VectorShape {
  return { ...base, type: 'polygon', points }
}

/** Um traço de pincel de verdade (o que a criança desenha à mão). */
function brushPath(): VectorShape {
  const raw: Vec2[] = []
  for (let i = 0; i <= 40; i += 1) raw.push({ x: i * 3, y: 40 + Math.sin(i / 4) * 25 })
  return pathOf(smoothStrokeToPath(raw))
}

describe('toEditablePath / fromEditablePath', () => {
  it('ida e volta de um traço de pincel devolve o MESMO d', () => {
    const shape = brushPath()
    const ep = toEditablePath(shape)
    expect(ep).not.toBeNull()
    if (!ep) return
    expect(ep.closed).toBe(false)
    expect(ep.nodes.length).toBeGreaterThan(3)
    const back = fromEditablePath(shape, ep)
    expect(back.type === 'path' && back.d).toBe(shape.type === 'path' ? shape.d : '')
  })

  it('lê o polígono como fechado e sem alça, e a linha como aberta', () => {
    const poly = toEditablePath(
      polygonOf([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 5, y: 9 },
      ]),
    )
    expect(poly?.closed).toBe(true)
    expect(poly?.nodes.every((n) => n.in === undefined && n.out === undefined)).toBe(true)

    const line = toEditablePath({ ...base, type: 'line', x1: 1, y1: 2, x2: 8, y2: 9 })
    expect(line?.closed).toBe(false)
    expect(line?.nodes.map((n) => n.p)).toEqual([
      { x: 1, y: 2 },
      { x: 8, y: 9 },
    ])
  })

  it('não sabe editar rect/ellipse/text nem d fora do dialeto', () => {
    expect(toEditablePath({ ...base, type: 'rect', x: 0, y: 0, w: 4, h: 4, rx: 0 })).toBeNull()
    expect(
      toEditablePath({ ...base, type: 'text', x: 0, y: 0, text: 'oi', fontSize: 12 }),
    ).toBeNull()
    // relativo e quadrática ficam fora (parsePathD já recusa)
    expect(toEditablePath(pathOf('m 0 0 l 5 5'))).toBeNull()
    expect(toEditablePath(pathOf('M 0 0 Q 1 1 2 2'))).toBeNull()
  })

  /**
   * ⚠️ Defeito real (Fase 2): um trecho com alça de UM lado só é escrito como
   * cúbico com o outro controle EM CIMA da âncora. Na releitura isso virava uma
   * alça degenerada no vizinho, então "ponto de canto" nele não fazia nada e a
   * forma nunca mais perdia a curvatura. Controle colado na âncora não é alça.
   */
  it('a ida e volta não INVENTA alça no vizinho de um trecho meio-curvo', () => {
    const shape = pathOf('M 0 0 C 4 0 10 0 10 0 L 20 0')
    const ep = toEditablePath(shape)
    if (!ep) throw new Error('traço deveria abrir')
    expect(ep.nodes[0]?.out).toEqual({ x: 4, y: 0 })
    expect(ep.nodes[1]?.in).toBeUndefined()
    expect(ep.nodes[1]?.out).toBeUndefined()
    // E o `d` volta igual (o controle colado é reescrito do mesmo jeito).
    const volta = fromEditablePath(shape, ep)
    expect(volta.type === 'path' && volta.d).toBe('M 0 0 C 4 0 10 0 10 0 L 20 0')
  })

  it('recusa vários sub-caminhos em vez de adivinhar', () => {
    expect(toEditablePath(pathOf('M 0 0 L 5 5 M 10 10 L 15 15'))).toBeNull()
  })
})

describe('a conversão polígono → traço (decisão de produto)', () => {
  it('só ARRASTAR um ponto mantém o polígono (o slider de lados sobrevive)', () => {
    const shape = polygonOf([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 9 },
    ])
    const ep = toEditablePath(shape)
    if (!ep) throw new Error('polígono deveria abrir')
    const next = fromEditablePath(shape, moveNodes(ep, [1], { x: 3, y: -2 }))
    expect(next.type).toBe('polygon')
    expect(next.type === 'polygon' && next.points[1]).toEqual({ x: 13, y: -2 })
  })

  it('ganhar curva converte em traço preservando estilo, grupo e olhinho', () => {
    const shape: VectorShape = {
      ...polygonOf([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 5, y: 9 },
      ]),
      groupId: 'g7',
      hidden: true,
      opacity: 0.5,
      rotation: 30,
    }
    const ep = toEditablePath(shape)
    if (!ep) throw new Error('polígono deveria abrir')
    const first = ep.nodes[0]
    if (!first) throw new Error('sem nó')
    first.out = { x: 4, y: -6 }

    const next = fromEditablePath(shape, ep)
    expect(next.type).toBe('path')
    expect(next.id).toBe('a1')
    expect(next.fill).toBe('#ff0000')
    expect(next.stroke).toEqual({ color: '#000000', width: 2 })
    expect(next.opacity).toBe(0.5)
    expect(next.rotation).toBe(30)
    expect(next.groupId).toBe('g7')
    expect(next.hidden).toBe(true)
    // fechado, então o d termina em Z
    expect(next.type === 'path' && next.d.endsWith('Z')).toBe(true)
    expect(sanitizeVectorShape(next)).not.toBeNull()
  })

  it('abrir o caminho também converte (polígono é sempre fechado)', () => {
    const shape = polygonOf([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 9 },
    ])
    const ep = toEditablePath(shape)
    if (!ep) throw new Error('polígono deveria abrir')
    const next = fromEditablePath(shape, setClosed(ep, false))
    expect(next.type).toBe('path')
    expect(next.type === 'path' && next.d.includes('Z')).toBe(false)
  })

  it('a linha vira traço ao ganhar curva, mas continua linha se só arrastar', () => {
    const shape: VectorShape = { ...base, type: 'line', x1: 0, y1: 0, x2: 10, y2: 0 }
    const ep = toEditablePath(shape)
    if (!ep) throw new Error('linha deveria abrir')
    expect(fromEditablePath(shape, moveNodes(ep, [1], { x: 0, y: 5 })).type).toBe('line')
    const curved = toEditablePath(shape)
    if (!curved) throw new Error('linha deveria abrir')
    const head = curved.nodes[0]
    if (!head) throw new Error('sem nó')
    head.out = { x: 3, y: 4 }
    expect(fromEditablePath(shape, curved).type).toBe('path')
  })
})

describe('fechar e abrir o caminho', () => {
  it('fechar reto sela com Z; fechar curvo escreve o C de volta antes do Z', () => {
    const shape = pathOf('M 0 0 L 10 0 L 10 10')
    const ep = toEditablePath(shape)
    if (!ep) throw new Error('traço deveria abrir')

    const reto = fromEditablePath(shape, setClosed(ep, true))
    expect(reto.type === 'path' && reto.d).toBe('M 0 0 L 10 0 L 10 10 Z')

    const curvo = setClosed(ep, true)
    const last = curvo.nodes[curvo.nodes.length - 1]
    if (!last) throw new Error('sem nó')
    last.out = { x: 6, y: 12 }
    const saida = fromEditablePath(shape, curvo)
    expect(saida.type === 'path' && saida.d).toBe('M 0 0 L 10 0 L 10 10 C 6 12 0 0 0 0 Z')
  })

  it('o fechamento curvo volta a ser UM nó na releitura (sem âncora repetida)', () => {
    const shape = pathOf('M 0 0 L 10 0 L 10 10 C 6 12 -4 5 0 0 Z')
    const ep = toEditablePath(shape)
    expect(ep?.nodes.length).toBe(3)
    expect(ep?.closed).toBe(true)
    expect(ep?.nodes[0]?.in).toEqual({ x: -4, y: 5 })
    expect(ep?.nodes[2]?.out).toEqual({ x: 6, y: 12 })
    if (!ep) return
    const volta = fromEditablePath(shape, ep)
    expect(volta.type === 'path' && volta.d).toBe(shape.type === 'path' ? shape.d : '')
  })
})

describe('acrescentar ponto (divisão de Casteljau)', () => {
  it('não deforma a curva: os mesmos 21 pontos antes e depois', () => {
    const shape = brushPath()
    const ep = toEditablePath(shape)
    if (!ep) throw new Error('traço deveria abrir')
    const alvo = 2
    const ends = segmentEnds(ep, alvo)
    if (!ends) throw new Error('segmento deveria existir')

    const amostras: Vec2[] = []
    for (let s = 0; s <= 20; s += 1) amostras.push(pointOnSegment(ends[0], ends[1], s / 20))

    const dividido = insertNodeAt(ep, alvo, 0.37)
    if (!dividido) throw new Error('divisão deveria valer')
    expect(dividido.nodes.length).toBe(ep.nodes.length + 1)

    const esquerda = segmentEnds(dividido, alvo)
    const direita = segmentEnds(dividido, alvo + 1)
    if (!esquerda || !direita) throw new Error('os dois pedaços deveriam existir')
    for (let s = 0; s <= 20; s += 1) {
      const t = s / 20
      // t do pedaço da esquerda vale até 0.37 da curva antiga; depois é a direita
      const antes = amostras[s]
      if (!antes) continue
      const depois =
        t <= 0.37
          ? pointOnSegment(esquerda[0], esquerda[1], t / 0.37)
          : pointOnSegment(direita[0], direita[1], (t - 0.37) / (1 - 0.37))
      expect(Math.hypot(depois.x - antes.x, depois.y - antes.y)).toBeLessThan(0.001)
    }
  })

  it('no segmento reto nasce sem alça, no meio exato', () => {
    const shape = pathOf('M 0 0 L 10 0')
    const ep = toEditablePath(shape)
    if (!ep) throw new Error('traço deveria abrir')
    const dividido = insertNodeAt(ep, 0, 0.5)
    expect(dividido?.nodes[1]?.p).toEqual({ x: 5, y: 0 })
    expect(dividido?.nodes[1]?.in).toBeUndefined()
    expect(dividido?.nodes[1]?.out).toBeUndefined()
    if (!dividido) throw new Error('divisão deveria valer')
    const volta = fromEditablePath(shape, dividido)
    expect(volta.type === 'path' && volta.d).toBe('M 0 0 L 5 0 L 10 0')
  })

  it('divide o segmento de FECHAMENTO de um caminho fechado', () => {
    const shape = polygonOf([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 9 },
    ])
    const ep = toEditablePath(shape)
    if (!ep) throw new Error('polígono deveria abrir')
    const dividido = insertNodeAt(ep, 2, 0.5)
    expect(dividido?.nodes.length).toBe(4)
    expect(dividido?.nodes[3]?.p).toEqual({ x: 2.5, y: 4.5 })
    if (dividido) expect(fromEditablePath(shape, dividido).type).toBe('polygon')
  })

  it('recusa dividir o fechamento de um caminho ABERTO', () => {
    const ep = toEditablePath(pathOf('M 0 0 L 10 0'))
    if (!ep) throw new Error('traço deveria abrir')
    expect(insertNodeAt(ep, 1, 0.5)).toBeNull()
  })
})

describe('apagar ponto', () => {
  it('recusa deixar o traço abaixo de 2 nós e o polígono abaixo de 3', () => {
    const traco = toEditablePath(pathOf('M 0 0 L 10 0 L 10 10'))
    if (!traco) throw new Error('traço deveria abrir')
    expect(removeNodes(traco, [0], MIN_NODES_PATH)).not.toBeNull()
    expect(removeNodes(traco, [0, 1], MIN_NODES_PATH)).toBeNull()

    const poly = polygonOf([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 9 },
      { x: 0, y: 9 },
    ])
    const ep = toEditablePath(poly)
    if (!ep) throw new Error('polígono deveria abrir')
    expect(minNodesFor(poly)).toBe(3)
    expect(removeNodes(ep, [0], minNodesFor(poly))).not.toBeNull()
    expect(removeNodes(ep, [0, 1], minNodesFor(poly))).toBeNull()
  })

  it('o que sobra continua passando pelo sanitize (não some no próximo load)', () => {
    const poly = polygonOf([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 9 },
      { x: 0, y: 9 },
    ])
    const ep = toEditablePath(poly)
    if (!ep) throw new Error('polígono deveria abrir')
    const menor = removeNodes(ep, [3], minNodesFor(poly))
    if (!menor) throw new Error('deveria ter apagado')
    const forma = fromEditablePath(poly, menor)
    expect(forma.type).toBe('polygon')
    expect(sanitizeVectorShape(forma)).not.toBeNull()
  })

  it('nada escolhido é no-op explícito', () => {
    const ep = toEditablePath(pathOf('M 0 0 L 10 0 L 10 10'))
    if (!ep) throw new Error('traço deveria abrir')
    expect(removeNodes(ep, [], MIN_NODES_PATH)).toBeNull()
  })
})

const MIN_NODES_PATH = 2

describe('achar o traço embaixo do dedo', () => {
  it('acha o segmento e o t de um ponto em cima da reta', () => {
    const ep = toEditablePath(pathOf('M 0 0 L 10 0 L 10 10'))
    if (!ep) throw new Error('traço deveria abrir')
    const hit = nearestOnPath(ep, { x: 3, y: 0.5 }, 4)
    expect(hit?.segmentIndex).toBe(0)
    expect(hit?.t).toBeCloseTo(0.3, 1)
    expect(hit?.distance).toBeCloseTo(0.5, 2)
  })

  it('acha um ponto em cima da CURVA de um traço de pincel', () => {
    const shape = brushPath()
    const ep = toEditablePath(shape)
    if (!ep) throw new Error('traço deveria abrir')
    const ends = segmentEnds(ep, 1)
    if (!ends) throw new Error('segmento deveria existir')
    const alvo = pointOnSegment(ends[0], ends[1], 0.6)
    const hit = nearestOnPath(ep, alvo, 2)
    expect(hit).not.toBeNull()
    expect(hit?.segmentIndex).toBe(1)
    expect(hit?.distance).toBeLessThan(0.5)
  })

  it('longe do traço não acerta nada', () => {
    const ep = toEditablePath(pathOf('M 0 0 L 10 0'))
    if (!ep) throw new Error('traço deveria abrir')
    expect(nearestOnPath(ep, { x: 5, y: 90 }, 8)).toBeNull()
  })
})

describe('o pincel entrega nós SUAVES de graça (a decisão central)', () => {
  /**
   * É esta propriedade que permite NÃO guardar "suave/canto" por ponto: a
   * Catmull-Rom escreve saída `p + (p₊₁−p₋₁)/6` e entrada `p − (p₊₁−p₋₁)/6`, que
   * são simétricas em torno da âncora. A folga de 0.02 é o arredondamento de 2
   * casas do `d` (três números independentes, 0.005 cada).
   */
  it('toda alça interior é espelhada em torno da âncora', () => {
    const ep = toEditablePath(brushPath())
    if (!ep) throw new Error('traço deveria abrir')
    let conferidos = 0
    for (let i = 1; i < ep.nodes.length - 1; i += 1) {
      const n = ep.nodes[i]
      if (!n?.in || !n.out) continue
      conferidos += 1
      expect(Math.abs(n.in.x + n.out.x - n.p.x * 2)).toBeLessThanOrEqual(0.02)
      expect(Math.abs(n.in.y + n.out.y - n.p.y * 2)).toBeLessThanOrEqual(0.02)
    }
    expect(conferidos).toBeGreaterThan(5)
  })
})

describe('mover nós', () => {
  it('a alça viaja junto com a âncora', () => {
    const ep = toEditablePath(pathOf('M 0 0 C 2 2 8 8 10 10'))
    if (!ep) throw new Error('traço deveria abrir')
    const movido = moveNodes(ep, [1], { x: 5, y: 0 })
    expect(movido.nodes[1]?.p).toEqual({ x: 15, y: 10 })
    expect(movido.nodes[1]?.in).toEqual({ x: 13, y: 8 })
    // o nó parado não se mexe
    expect(movido.nodes[0]?.out).toEqual({ x: 2, y: 2 })
  })

  it('vários nós de uma vez andam o mesmo tanto', () => {
    const ep = toEditablePath(pathOf('M 0 0 L 10 0 L 10 10'))
    if (!ep) throw new Error('traço deveria abrir')
    const movido = moveNodes(ep, [0, 2], { x: 1, y: 1 })
    expect(movido.nodes.map((n) => n.p)).toEqual([
      { x: 1, y: 1 },
      { x: 10, y: 0 },
      { x: 11, y: 11 },
    ])
  })
})

describe('editablePathToD', () => {
  it('alça de um lado só vira controle na própria âncora', () => {
    const ep = {
      nodes: [{ p: { x: 0, y: 0 }, out: { x: 4, y: 0 } }, { p: { x: 10, y: 0 } }],
      closed: false,
    }
    expect(editablePathToD(ep)).toBe('M 0 0 C 4 0 10 0 10 0')
  })
})

describe('suave x canto', () => {
  it('le o no do pincel como SUAVE e a quina do poligono como canto', () => {
    const brush = toEditablePath(brushPath())
    if (!brush) throw new Error('traço deveria abrir')
    const meio = brush.nodes[3]
    if (!meio) throw new Error('sem nó')
    expect(isSmoothNode(meio)).toBe(true)

    const poly = toEditablePath(
      polygonOf([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 5, y: 9 },
      ]),
    )
    if (!poly) throw new Error('polígono deveria abrir')
    const quina = poly.nodes[1]
    if (!quina) throw new Error('sem nó')
    expect(isSmoothNode(quina)).toBe(false)
  })

  it('"ponto suave" arredonda a quina criando as duas alças espelhadas', () => {
    const ep = toEditablePath(
      polygonOf([
        { x: 0, y: 0 },
        { x: 12, y: 0 },
        { x: 12, y: 12 },
      ]),
    )
    if (!ep) throw new Error('polígono deveria abrir')
    const suave = makeSmooth(ep, [1])
    const no = suave.nodes[1]
    if (!no) throw new Error('sem nó')
    expect(isSmoothNode(no)).toBe(true)
    // Catmull-Rom: a corda vai do vizinho de trás ao da frente, dividida por 6.
    expect(no.out).toEqual({ x: 14, y: 2 })
    expect(no.in).toEqual({ x: 10, y: -2 })
    // Os vizinhos ficam intactos.
    expect(suave.nodes[0]).toEqual(ep.nodes[0])
  })

  it('"ponto suave" num no ja curvo alinha SEM mudar o tamanho das alcas', () => {
    const ep: EditablePathLike = {
      nodes: [
        { p: { x: 0, y: 0 } },
        { p: { x: 10, y: 0 }, in: { x: 6, y: 0 }, out: { x: 10, y: 3 } },
        { p: { x: 20, y: 0 } },
      ],
      closed: false,
    }
    const suave = makeSmooth(ep, [1])
    const no = suave.nodes[1]
    if (!no?.in || !no.out) throw new Error('sem alças')
    expect(isSmoothNode(no)).toBe(true)
    // tamanhos preservados: 4 de entrada e 3 de saída
    expect(Math.hypot(no.p.x - no.in.x, no.p.y - no.in.y)).toBeCloseTo(4, 6)
    expect(Math.hypot(no.out.x - no.p.x, no.out.y - no.p.y)).toBeCloseTo(3, 6)
  })

  it('"ponto de canto" tira as duas alcas (mudanca visivel)', () => {
    const ep = toEditablePath(brushPath())
    if (!ep) throw new Error('traço deveria abrir')
    const canto = makeCorner(ep, [3])
    const no = canto.nodes[3]
    if (!no) throw new Error('sem nó')
    expect(no.in).toBeUndefined()
    expect(no.out).toBeUndefined()
    expect(isSmoothNode(no)).toBe(false)
    // e os vizinhos não perderam as deles
    expect(canto.nodes[2]?.in).toBeDefined()
  })

  it('na ponta de um caminho ABERTO so nasce a alca do lado que existe', () => {
    const ep = toEditablePath(pathOf('M 0 0 L 10 0 L 20 0'))
    if (!ep) throw new Error('traço deveria abrir')
    const suave = makeSmooth(ep, [0, 2])
    expect(suave.nodes[0]?.in).toBeUndefined()
    expect(suave.nodes[0]?.out).toBeDefined()
    expect(suave.nodes[2]?.out).toBeUndefined()
    expect(suave.nodes[2]?.in).toBeDefined()
  })
})

describe('curva x reta no segmento', () => {
  it('virar curva NAO move o desenho: os controles nascem em 1/3 e 2/3 da corda', () => {
    const ep = toEditablePath(pathOf('M 0 0 L 30 60'))
    if (!ep) throw new Error('traço deveria abrir')
    const antes = segmentEnds(ep, 0)
    if (!antes) throw new Error('sem segmento')
    const amostras = Array.from({ length: 21 }, (_, i) =>
      pointOnSegment(antes[0], antes[1], i / 20),
    )

    const curvo = setSegmentCurved(ep, [0], true)
    expect(curvo.nodes[0]?.out).toEqual({ x: 10, y: 20 })
    expect(curvo.nodes[1]?.in).toEqual({ x: 20, y: 40 })
    const depois = segmentEnds(curvo, 0)
    if (!depois) throw new Error('sem segmento')
    for (let i = 0; i <= 20; i += 1) {
      const a = amostras[i]
      const b = pointOnSegment(depois[0], depois[1], i / 20)
      if (!a) continue
      expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeLessThan(1e-9)
    }
  })

  it('virar reta tira as alcas do segmento e o poligono volta a ser poligono', () => {
    const shape = polygonOf([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 9 },
    ])
    const ep = toEditablePath(shape)
    if (!ep) throw new Error('polígono deveria abrir')
    const curvo = setSegmentCurved(ep, [0], true)
    expect(fromEditablePath(shape, curvo).type).toBe('path')
    const reto = setSegmentCurved(curvo, [0], false)
    expect(fromEditablePath(shape, reto).type).toBe('polygon')
  })

  it('um no escolhido pega os DOIS segmentos vizinhos; dois pegam o do meio', () => {
    const ep = toEditablePath(pathOf('M 0 0 L 10 0 L 20 0 L 30 0'))
    if (!ep) throw new Error('traço deveria abrir')
    expect(segmentsForNodes(ep, [1])).toEqual([0, 1])
    expect(segmentsForNodes(ep, [1, 2])).toEqual([1])
    expect(segmentsForNodes(ep, [])).toEqual([])
    // No caminho fechado o último segmento volta ao nó 0.
    const fechado = setClosed(ep, true)
    expect(segmentsForNodes(fechado, [0])).toEqual([0, 3])
  })
})

describe('arrastar a alca', () => {
  const comAlcas: EditablePathLike = {
    nodes: [
      { p: { x: 0, y: 0 } },
      { p: { x: 10, y: 0 }, in: { x: 6, y: 0 }, out: { x: 14, y: 0 } },
      { p: { x: 20, y: 0 } },
    ],
    closed: false,
  }

  it('no SUAVE: mexer numa alca alinha a outra e guarda o tamanho dela', () => {
    const movido = setHandle(comAlcas, 1, 'out', { x: 10, y: 8 }, true)
    const no = movido.nodes[1]
    if (!no?.in) throw new Error('sem alça de entrada')
    expect(no.out).toEqual({ x: 10, y: 8 })
    // a de entrada tinha tamanho 4 e continua com 4, do lado oposto
    expect(no.in).toEqual({ x: 10, y: -4 })
    expect(isSmoothNode(no)).toBe(true)
  })

  it('no de CANTO: a outra alca nao se mexe', () => {
    const movido = setHandle(comAlcas, 1, 'out', { x: 10, y: 8 }, false)
    expect(movido.nodes[1]?.in).toEqual({ x: 6, y: 0 })
    expect(movido.nodes[1]?.out).toEqual({ x: 10, y: 8 })
  })
})

describe('suavizar o traco (botao repetivel)', () => {
  it('cada toque MUDA o traço (nunca fica mudo) e o resultado fica todo SUAVE', () => {
    const ep = toEditablePath(brushPath())
    if (!ep) throw new Error('traço deveria abrir')
    // Cinco toques seguidos: cada um tem que encolher, e nunca crescer.
    let atual = ep
    const tamanhos: number[] = [atual.nodes.length]
    for (let toque = 0; toque < 5; toque += 1) {
      const proximo = smoothPath(atual)
      if (!proximo) break
      expect(proximo.nodes.length).toBeLessThan(atual.nodes.length)
      atual = proximo
      tamanhos.push(atual.nodes.length)
    }
    expect(tamanhos.length).toBeGreaterThan(3)
    for (let i = 1; i < atual.nodes.length - 1; i += 1) {
      const no = atual.nodes[i]
      if (no) expect(isSmoothNode(no)).toBe(true)
    }
  })

  it('no polígono de quinas o PRIMEIRO toque arredonda sem tirar canto', () => {
    const ep = toEditablePath(
      polygonOf([
        { x: 0, y: 0 },
        { x: 40, y: 0 },
        { x: 40, y: 40 },
        { x: 0, y: 40 },
      ]),
    )
    if (!ep) throw new Error('polígono deveria abrir')
    const uma = smoothPath(ep)
    if (!uma) throw new Error('deveria suavizar')
    expect(uma.nodes.length).toBe(4)
    expect(uma.nodes.every((n) => n.in || n.out)).toBe(true)
    // O segundo toque não pode ficar mudo: aí sim aperta a régua e tira canto.
    const duas = smoothPath(uma)
    expect(duas?.nodes.length).toBeLessThan(4)
  })

  it('arredonda um poligono de quinas e preserva o fechado', () => {
    const ep = toEditablePath(
      polygonOf([
        { x: 0, y: 0 },
        { x: 40, y: 0 },
        { x: 40, y: 40 },
        { x: 0, y: 40 },
      ]),
    )
    if (!ep) throw new Error('polígono deveria abrir')
    const suave = smoothPath(ep)
    if (!suave) throw new Error('deveria suavizar')
    expect(suave.closed).toBe(true)
    expect(suave.nodes.some((n) => n.in || n.out)).toBe(true)
  })

  it('nunca reduz um caminho fechado abaixo de 3 nos e mantem a emenda suave', () => {
    const ep = toEditablePath(
      polygonOf([
        { x: 0, y: 0 },
        { x: 40, y: 0 },
        { x: 40, y: 40 },
        { x: 0, y: 40 },
      ]),
    )
    if (!ep) throw new Error('polígono deveria abrir')

    let atual = ep
    for (let toque = 0; toque < 6; toque += 1) {
      const proximo = smoothPath(atual)
      if (!proximo) break
      expect(proximo.closed).toBe(true)
      expect(proximo.nodes.length).toBeGreaterThanOrEqual(3)
      expect(proximo.nodes.every(isSmoothNode)).toBe(true)
      atual = proximo
    }
  })

  it('recusa com menos de 3 pontos', () => {
    const ep = toEditablePath(pathOf('M 0 0 L 10 0'))
    if (!ep) throw new Error('traço deveria abrir')
    expect(smoothPath(ep)).toBeNull()
  })
})
