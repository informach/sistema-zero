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
  openClosedPathAt,
  pointOnSegment,
  removeNodes,
  segmentCount,
  segmentEnds,
  segmentsForNodes,
  setClosed,
  setHandle,
  setSegmentCurved,
  smoothPath,
  splitOpenPathAt,
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
    // A FIGURA também não se edita por pontos (o nodeTarget depende deste null).
    expect(
      toEditablePath({
        ...base,
        type: 'image',
        x: 0,
        y: 0,
        w: 4,
        h: 4,
        src: 'data:image/png;base64,AAAA',
      }),
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

describe('suavizar SÓ os pontos escolhidos', () => {
  /** Seis quinas fechadas: nenhum nó nasce com alça. */
  function hexagono(): EditablePathLike {
    const ep = toEditablePath(
      polygonOf([
        { x: 0, y: 20 },
        { x: 20, y: 0 },
        { x: 60, y: 0 },
        { x: 80, y: 20 },
        { x: 60, y: 40 },
        { x: 20, y: 40 },
      ]),
    )
    if (!ep) throw new Error('polígono deveria abrir')
    return ep
  }

  /** Traço reto com um TREMIDO miúdo (±0,5) nos índices 3..8. */
  function tremido(): EditablePathLike {
    const ep = toEditablePath(
      pathOf(
        [
          'M 0 0',
          'L 10 0',
          'L 20 0',
          'L 30 0.5',
          'L 40 -0.5',
          'L 50 0.5',
          'L 60 -0.5',
          'L 70 0.5',
          'L 80 -0.5',
          'L 90 0',
          'L 100 0',
          'L 110 0',
        ].join(' '),
      ),
    )
    if (!ep) throw new Error('traço deveria abrir')
    return ep
  }

  const semAlca = (no: { in?: Vec2; out?: Vec2 }) => no.in === undefined && no.out === undefined

  it('⚠️ escolher DOIS pontos arredonda só aqueles dois (os outros ficam quina)', () => {
    const ep = hexagono()
    const suave = smoothPath(ep, undefined, [1, 2])
    if (!suave) throw new Error('deveria suavizar')

    expect(suave.nodes.length).toBe(6) // trecho de 2 não tem miolo: nada some
    expect(suave.nodes[1]?.in).toBeDefined()
    expect(suave.nodes[1]?.out).toBeDefined()
    expect(suave.nodes[2]?.in).toBeDefined()
    expect(suave.nodes[2]?.out).toBeDefined()
    // ⚠️ A metade que importa: quem NÃO foi escolhido continua quina. Sem ela,
    // a implementação de antes (suaviza tudo) passaria neste teste.
    for (const i of [0, 3, 4, 5]) {
      const no = suave.nodes[i]
      if (!no) throw new Error('nó deveria existir')
      expect(semAlca(no)).toBe(true)
    }
  })

  it('quem ficou de fora sai pela MESMA referência: nem a âncora nem a alça se mexem', () => {
    const ep = tremido()
    const suave = smoothPath(ep, undefined, [3, 4, 5, 6, 7, 8, 9])
    if (!suave) throw new Error('deveria suavizar')

    // Antes do trecho: os três primeiros nós são os MESMOS objetos.
    for (const i of [0, 1, 2]) expect(suave.nodes[i]).toBe(ep.nodes[i])
    // Depois do trecho: os dois últimos também.
    expect(suave.nodes[suave.nodes.length - 1]).toBe(ep.nodes[ep.nodes.length - 1])
    expect(suave.nodes[suave.nodes.length - 2]).toBe(ep.nodes[ep.nodes.length - 2])
  })

  it('some ponto só DENTRO do trecho, e as duas pontas dele ficam presas', () => {
    const ep = tremido()
    const suave = smoothPath(ep, undefined, [3, 4, 5, 6, 7, 8, 9])
    if (!suave) throw new Error('deveria suavizar')

    expect(suave.nodes.length).toBeLessThan(ep.nodes.length)
    const ancoras = suave.nodes.map((n) => `${n.p.x},${n.p.y}`)
    // Todo nó de FORA continua no desenho...
    for (const i of [0, 1, 2, 10, 11]) {
      const no = ep.nodes[i]
      if (!no) throw new Error('nó deveria existir')
      expect(ancoras).toContain(`${no.p.x},${no.p.y}`)
    }
    // ...e as duas PONTAS do trecho também (o RDP nunca tira a primeira nem a
    // última âncora que recebe). É isso que mantém a emenda parada.
    for (const i of [3, 9]) {
      const no = ep.nodes[i]
      if (!no) throw new Error('nó deveria existir')
      expect(ancoras).toContain(`${no.p.x},${no.p.y}`)
    }
    // O que sumiu veio todo do miolo do trecho.
    for (const i of [4, 5, 6, 7, 8]) {
      const no = ep.nodes[i]
      if (!no) throw new Error('nó deveria existir')
      expect(ancoras).not.toContain(`${no.p.x},${no.p.y}`)
    }
  })

  it('escolher TODOS os pontos é igualzinho a não escolher nenhum', () => {
    const ep = toEditablePath(brushPath())
    if (!ep) throw new Error('traço deveria abrir')
    const todos = ep.nodes.map((_, i) => i)

    const inteiro = smoothPath(ep)
    const escolhido = smoothPath(ep, undefined, todos)
    if (!inteiro || !escolhido) throw new Error('deveria suavizar')
    expect(editablePathToD(escolhido)).toBe(editablePathToD(inteiro))
  })

  it('lista VAZIA é o traço inteiro (o botão sem escolha não mudou)', () => {
    const ep = toEditablePath(brushPath())
    if (!ep) throw new Error('traço deveria abrir')
    const inteiro = smoothPath(ep)
    const vazio = smoothPath(ep, undefined, [])
    if (!inteiro || !vazio) throw new Error('deveria suavizar')
    expect(editablePathToD(vazio)).toBe(editablePathToD(inteiro))
  })

  it('num caminho fechado, o ÚLTIMO e o PRIMEIRO ponto são um trecho só', () => {
    const ep = hexagono()
    const suave = smoothPath(ep, undefined, [5, 0])
    if (!suave) throw new Error('deveria suavizar')

    expect(suave.nodes.length).toBe(6)
    expect(suave.nodes[5]?.out).toBeDefined()
    expect(suave.nodes[0]?.in).toBeDefined()
    for (const i of [1, 2, 3, 4]) {
      const no = suave.nodes[i]
      if (!no) throw new Error('nó deveria existir')
      expect(semAlca(no)).toBe(true)
    }
  })

  it('pontos SEPARADOS viram um trecho cada: os dois arredondam e nada some', () => {
    const ep = tremido()
    const suave = smoothPath(ep, undefined, [1, 5])
    if (!suave) throw new Error('deveria suavizar')

    expect(suave.nodes.length).toBe(ep.nodes.length)
    expect(isSmoothNode(suave.nodes[1] as never)).toBe(true)
    expect(isSmoothNode(suave.nodes[5] as never)).toBe(true)
    for (const i of [0, 2, 3, 4, 6, 7, 8, 9, 10, 11]) expect(suave.nodes[i]).toBe(ep.nodes[i])
  })

  it('não fica MUDO na quina, e no segundo toque recusa em vez de fingir', () => {
    const ep = hexagono()
    const uma = smoothPath(ep, undefined, [1, 2])
    if (!uma) throw new Error('o primeiro toque tem que arredondar')
    // Já estão redondos e o trecho não tem miolo para tirar: recusar é o que
    // faz o recado aparecer ("esses pontos já estão o mais lisos que dá").
    expect(smoothPath(uma, undefined, [1, 2])).toBeNull()
  })

  it('suaviza um nó que ainda é canto mesmo quando ele já tem alça', () => {
    const casos = [
      // Uma alça só: ainda há uma quina na passagem pelo nó 1.
      'M 0 0 C 0 0 5 5 10 0 L 20 0',
      // Duas alças fora da mesma reta: também não é um nó suave.
      'M 0 0 C 0 0 5 5 10 0 C 12 6 20 0 20 0',
    ]

    for (const d of casos) {
      const ep = toEditablePath(pathOf(d))
      if (!ep) throw new Error('traço deveria abrir')
      const antes = ep.nodes[1]
      if (!antes) throw new Error('nó do meio deveria existir')
      expect(isSmoothNode(antes)).toBe(false)

      const suave = smoothPath(ep, undefined, [1])
      if (!suave) throw new Error('o nó ainda tem uma quina para suavizar')
      const depois = suave.nodes[1]
      if (!depois) throw new Error('nó suavizado deveria existir')
      expect(isSmoothNode(depois)).toBe(true)
    }
  })

  it('recusa tangente que desaparece na precisão persistida do d', () => {
    const imperceptivel = toEditablePath(pathOf('M 0 0 L 0 1 L 0.01 0'))
    if (!imperceptivel) throw new Error('traço deveria abrir')
    // A tangente não é zero em memória, mas os controles arredondam sobre as
    // âncoras e o parser os descarta: persistir isso seria um undo vazio.
    expect(smoothPath(imperceptivel, undefined, [1])).toBeNull()

    const visivel = toEditablePath(pathOf('M 0 0 L 0 1 L 0.1 0'))
    if (!visivel) throw new Error('traço deveria abrir')
    expect(smoothPath(visivel, undefined, [1])).not.toBeNull()
  })

  it('repetir num trecho converge: nunca cresce e o fechado nunca cai abaixo de 3', () => {
    let atual = hexagono()
    for (let toque = 0; toque < 6; toque += 1) {
      const proximo = smoothPath(atual, undefined, [0, 1, 2, 3])
      if (!proximo) break
      expect(proximo.closed).toBe(true)
      expect(proximo.nodes.length).toBeLessThanOrEqual(atual.nodes.length)
      expect(proximo.nodes.length).toBeGreaterThanOrEqual(3)
      atual = proximo
    }
  })

  it('o traço que sai sobrevive ao sanitize (senão sumiria no próximo load)', () => {
    const shape = pathOf(
      editablePathToD(toEditablePath(brushPath()) as EditablePathLike) || 'M 0 0 L 1 0',
    )
    const ep = toEditablePath(shape)
    if (!ep) throw new Error('traço deveria abrir')
    const suave = smoothPath(ep, undefined, [2, 3, 4, 5])
    if (!suave) throw new Error('deveria suavizar')
    const editada = fromEditablePath(shape, suave)
    expect(sanitizeVectorShape(editada)).not.toBeNull()
    expect(toEditablePath(editada)).not.toBeNull()
  })

  /**
   * ⚠️⚠️ Achados do full review (24/08/2026). Os três nasceram de uma sonda que
   * varreu 926 combinações de forma × escolha atrás de duas coisas: passada que
   * devolve o desenho IGUALZINHO, e trecho que apaga ponto na EMENDA.
   */
  it('⚠️ vizinho no mesmo ponto: RECUSA em vez de gravar um desfazer vazio', () => {
    // Sem a rede final, a tangente zero devolvia o traço idêntico com `ok`: o
    // botão ficava mudo, sem recado, E entrava uma entrada de desfazer que não
    // desfaz nada. Foi a sonda que achou (39 no-ops em 926 combinações).
    const zigue = toEditablePath(pathOf('M 0 0 L 20 20 L 0 0 L 30 30'))
    if (!zigue) throw new Error('traço deveria abrir')
    expect(smoothPath(zigue, undefined, [1])).toBeNull()

    const pontinho = toEditablePath(pathOf('M 5 5 L 5 5 L 5 5 L 5 5 Z'))
    if (!pontinho) throw new Error('traço deveria abrir')
    for (const escolha of [[0], [1], [0, 1], [1, 2]]) {
      expect(smoothPath(pontinho, undefined, escolha)).toBeNull()
    }
  })

  it('⚠️ o nó degenerado do meio do trecho NÃO perde as alças dele', () => {
    // O nó 1 tem os dois vizinhos no MESMO ponto (tangente zero). O nó 3 muda,
    // então a passada vale — e é aí que o degenerado ia embora pelado.
    const ep: EditablePathLike = {
      closed: false,
      nodes: [
        { p: { x: 0, y: 0 } },
        { p: { x: 20, y: 20 }, in: { x: 10, y: 5 }, out: { x: 30, y: 35 } },
        { p: { x: 0, y: 0 } },
        { p: { x: 40, y: 40 } },
      ],
    }
    const suave = smoothPath(ep, undefined, [1, 3])
    if (!suave) throw new Error('o nó 3 tem tangente, então deveria suavizar')
    expect(suave.nodes.length).toBe(4)
    expect(suave.nodes[1]?.in).toEqual({ x: 10, y: 5 })
    expect(suave.nodes[1]?.out).toEqual({ x: 30, y: 35 })
    expect(suave.nodes[3]?.in).toBeDefined()
  })

  it('o trecho que dá a volta APAGA ponto, e só do miolo dele', () => {
    // Os nós 6, 0 e 1 estão na reta que liga 5 a 1 (x + y = 20): escolhendo
    // [5,6,0,1] o RDP prende 5 e 1 e joga fora 6 e 0, que ficam no MIOLO do
    // trecho mesmo ele cruzando a emenda.
    const ep = toEditablePath(
      polygonOf([
        { x: 5, y: 15 },
        { x: 20, y: 0 },
        { x: 60, y: 40 },
        { x: 20, y: 80 },
        { x: 0, y: 80 },
        { x: -20, y: 40 },
        { x: -10, y: 30 },
      ]),
    )
    if (!ep) throw new Error('polígono deveria abrir')
    const suave = smoothPath(ep, undefined, [5, 6, 0, 1])
    if (!suave) throw new Error('deveria suavizar')

    expect(suave.closed).toBe(true)
    expect(suave.nodes.length).toBe(5)
    const ancoras = suave.nodes.map((n) => `${n.p.x},${n.p.y}`)
    expect(ancoras).not.toContain('-10,30') // nó 6, miolo do trecho
    expect(ancoras).not.toContain('5,15') //  nó 0, miolo do trecho
    // As duas pontas do trecho ficaram presas...
    expect(ancoras).toContain('-20,40')
    expect(ancoras).toContain('20,0')
    // ...e quem estava de fora saiu pela MESMA referência.
    for (const i of [2, 3, 4]) {
      const no = ep.nodes[i]
      if (!no) throw new Error('nó deveria existir')
      expect(suave.nodes).toContain(no)
    }
  })
})

describe('abrir no ponto e cortar em dois (a tesoura)', () => {
  /** Amostra o traço inteiro, na ordem, para provar que o desenho não mudou. */
  function samples(ep: EditablePathLike, perSegment = 20): Vec2[] {
    const out: Vec2[] = []
    for (let seg = 0; seg < segmentCount(ep); seg += 1) {
      const ends = segmentEnds(ep, seg)
      if (!ends) continue
      for (let k = 0; k < perSegment; k += 1) {
        out.push(pointOnSegment(ends[0], ends[1], k / perSegment))
      }
    }
    return out
  }

  function closeTo(a: Vec2[], b: Vec2[]): void {
    expect(a.length).toBe(b.length)
    for (const [i, p] of a.entries()) {
      const q = b[i]
      if (!q) throw new Error('amostra faltando')
      expect(p.x).toBeCloseTo(q.x, 9)
      expect(p.y).toBeCloseTo(q.y, 9)
    }
  }

  const quad = (): EditablePathLike => {
    const ep = toEditablePath(
      polygonOf([
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 20 },
        { x: 0, y: 20 },
      ]),
    )
    if (!ep) throw new Error('polígono deveria abrir')
    return ep
  }

  it('abrir no nó 2 põe ele no começo E no fim, e ganha um nó', () => {
    const ep = quad()
    const aberto = openClosedPathAt(ep, 2)
    if (!aberto) throw new Error('deveria abrir')
    expect(aberto.closed).toBe(false)
    expect(aberto.nodes.length).toBe(ep.nodes.length + 1)
    expect(aberto.nodes[0]?.p).toEqual({ x: 20, y: 20 })
    expect(aberto.nodes[4]?.p).toEqual({ x: 20, y: 20 })
    expect(aberto.nodes.map((n) => n.p)).toEqual([
      { x: 20, y: 20 },
      { x: 0, y: 20 },
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 20 },
    ])
  })

  it('o DESENHO não muda: as amostras do laço batem com as do traço aberto', () => {
    // Um laço CURVO, que é onde as alças da emenda podem errar.
    const ep = toEditablePath(pathOf('M 0 0 C 10 -10 30 -10 40 0 C 30 20 10 20 0 0 Z'))
    if (!ep) throw new Error('traço deveria abrir')
    const corte = 1
    const aberto = openClosedPathAt(ep, corte)
    if (!aberto) throw new Error('deveria abrir')
    // ⚠️ Abrir no nó 1 faz o traço COMEÇAR pelo segmento 1: os mesmos pontos,
    // em ordem girada. Comparar cru daria falso negativo.
    const porSegmento = 20
    const doLaco = samples(ep, porSegmento)
    const girado = [...doLaco.slice(corte * porSegmento), ...doLaco.slice(0, corte * porSegmento)]
    closeTo(girado, samples(aberto, porSegmento))
  })

  it('a emenda guarda a alça CERTA de cada lado', () => {
    const ep = toEditablePath(pathOf('M 0 0 C 10 -10 30 -10 40 0 C 30 20 10 20 0 0 Z'))
    if (!ep) throw new Error('traço deveria abrir')
    const original = ep.nodes[0]
    const aberto = openClosedPathAt(ep, 0)
    if (!aberto || !original) throw new Error('deveria abrir')
    const inicio = aberto.nodes[0]
    const fim = aberto.nodes[aberto.nodes.length - 1]
    expect(inicio?.in).toBeUndefined()
    expect(inicio?.out).toEqual(original.out as Vec2)
    expect(fim?.out).toBeUndefined()
    expect(fim?.in).toEqual(original.in as Vec2)
  })

  it('abrir e FECHAR de novo devolve o laço original (a emenda funde)', () => {
    const ep = quad()
    const aberto = openClosedPathAt(ep, 2)
    if (!aberto) throw new Error('deveria abrir')
    // Passa pelo `d` de verdade: é a ida e volta que o editor faz.
    const refechado = toEditablePath(pathOf(editablePathToD(setClosed(aberto, true))))
    expect(refechado?.closed).toBe(true)
    expect(refechado?.nodes.length).toBe(ep.nodes.length)
  })

  it('recusa em caminho já aberto e em índice que não existe', () => {
    const aberto = toEditablePath(pathOf('M 0 0 L 10 0 L 20 10'))
    if (!aberto) throw new Error('traço deveria abrir')
    expect(openClosedPathAt(aberto, 1)).toBeNull()
    expect(openClosedPathAt(quad(), 9)).toBeNull()
    expect(openClosedPathAt(quad(), -1)).toBeNull()
  })

  it('o polígono aberto vira TRAÇO sem Z e sobrevive ao sanitize', () => {
    const forma = polygonOf([
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 20 },
      { x: 0, y: 20 },
    ])
    const ep = toEditablePath(forma)
    if (!ep) throw new Error('polígono deveria abrir')
    const aberto = openClosedPathAt(ep, 1)
    if (!aberto) throw new Error('deveria abrir')
    const nova = fromEditablePath(forma, aberto)
    expect(nova.type).toBe('path')
    expect(nova.type === 'path' && nova.d.includes('Z')).toBe(false)
    expect(sanitizeVectorShape(nova)).not.toBeNull()
  })

  it('cortar um traço aberto no miolo devolve dois pedaços que somam n+1', () => {
    const ep = toEditablePath(pathOf('M 0 0 L 10 0 L 20 0 L 30 0 L 40 0'))
    if (!ep) throw new Error('traço deveria abrir')
    const pedacos = splitOpenPathAt(ep, 2)
    if (!pedacos) throw new Error('deveria cortar')
    const [a, b] = pedacos
    expect(a.nodes.length).toBe(3)
    expect(b.nodes.length).toBe(3)
    expect(a.nodes.length + b.nodes.length).toBe(ep.nodes.length + 1)
    expect(a.closed).toBe(false)
    expect(b.closed).toBe(false)
    // O ponto do corte está nas DUAS pontas.
    expect(a.nodes[a.nodes.length - 1]?.p).toEqual({ x: 20, y: 0 })
    expect(b.nodes[0]?.p).toEqual({ x: 20, y: 0 })
  })

  it('cortar não muda o desenho: A + B cobrem o traço inteiro', () => {
    const ep = toEditablePath(pathOf('M 0 0 C 10 -10 30 -10 40 0 C 50 10 60 10 70 0'))
    if (!ep) throw new Error('traço deveria abrir')
    const pedacos = splitOpenPathAt(ep, 1)
    if (!pedacos) throw new Error('deveria cortar')
    closeTo(samples(ep), [...samples(pedacos[0]), ...samples(pedacos[1])])
  })

  it('recusa nas PONTAS, em caminho fechado e num traço de 2 nós', () => {
    const ep = toEditablePath(pathOf('M 0 0 L 10 0 L 20 0'))
    if (!ep) throw new Error('traço deveria abrir')
    expect(splitOpenPathAt(ep, 0)).toBeNull()
    expect(splitOpenPathAt(ep, 2)).toBeNull()
    expect(splitOpenPathAt(quad(), 1)).toBeNull()
    const reta = toEditablePath(pathOf('M 0 0 L 10 0'))
    if (!reta) throw new Error('traço deveria abrir')
    expect(splitOpenPathAt(reta, 0)).toBeNull()
    expect(splitOpenPathAt(reta, 1)).toBeNull()
  })

  it('com 3 nós o único corte possível deixa os dois pedaços no PISO', () => {
    const ep = toEditablePath(pathOf('M 0 0 L 10 0 L 20 0'))
    if (!ep) throw new Error('traço deveria abrir')
    const pedacos = splitOpenPathAt(ep, 1)
    if (!pedacos) throw new Error('deveria cortar')
    expect(pedacos[0].nodes.length).toBe(2)
    expect(pedacos[1].nodes.length).toBe(2)
  })

  it('os dois pedaços passam pelo sanitize como formas de verdade', () => {
    const forma = pathOf('M 0 0 C 10 -10 30 -10 40 0 C 50 10 60 10 70 0')
    const ep = toEditablePath(forma)
    if (!ep) throw new Error('traço deveria abrir')
    const pedacos = splitOpenPathAt(ep, 1)
    if (!pedacos) throw new Error('deveria cortar')
    for (const pedaco of pedacos) {
      expect(sanitizeVectorShape(fromEditablePath(forma, pedaco))).not.toBeNull()
    }
  })
})
