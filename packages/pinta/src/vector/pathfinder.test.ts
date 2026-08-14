/**
 * Misturar formas: a orquestração (08/2026).
 *
 * A geometria já está travada no `polygonClip.test.ts`. O que se cobra AQUI é a
 * outra metade, que nenhuma asserção de área pega: quem sobrevive, com que id,
 * em que lugar da pilha, com qual cor, e o que acontece quando não dá.
 */
import { describe, expect, it } from 'bun:test'
import { shapeToPoly } from './flatten'
import { parsePathD } from './geometry'
import { MAX_PATH_CHARS, sanitizeVectorShape, type VectorShape } from './model'
import {
  isPathfinderEligible,
  type PathfinderOp,
  type PathfinderRefusal,
  pathfinderShapes,
} from './pathfinder'
import { polyArea } from './polygonClip'

const estilo = { stroke: null, opacity: 1, rotation: 0 } as const

function quad(id: string, x: number, lado = 10, fill = '#ff2121'): VectorShape {
  return { ...estilo, id, fill, type: 'rect', x, y: 0, w: lado, h: lado, rx: 0 }
}

function areaDe(shape: VectorShape): number {
  const flat = shapeToPoly(shape)
  if (!flat.ok) throw new Error('esperava achatar o resultado')
  return polyArea(flat.poly)
}

function esperaOk(r: ReturnType<typeof pathfinderShapes>) {
  if (!r.ok) throw new Error(`esperava sucesso, veio ${r.reason}`)
  return r
}

describe('quem pode entrar na mistura', () => {
  it('forma fechada entra; linha, texto e figura não', () => {
    expect(isPathfinderEligible(quad('a', 0))).toBe(true)
    expect(
      isPathfinderEligible({
        ...estilo,
        id: 'e',
        fill: '#000',
        type: 'ellipse',
        cx: 0,
        cy: 0,
        rx: 5,
        ry: 5,
      }),
    ).toBe(true)
    expect(
      isPathfinderEligible({
        ...estilo,
        id: 'l',
        fill: 'none',
        type: 'line',
        x1: 0,
        y1: 0,
        x2: 5,
        y2: 5,
      }),
    ).toBe(false)
    expect(
      isPathfinderEligible({
        ...estilo,
        id: 't',
        fill: '#000',
        type: 'text',
        x: 0,
        y: 0,
        text: 'oi',
        fontSize: 12,
      }),
    ).toBe(false)
  })

  it('⭐ traço só entra FECHADO, e um resultado com FURO continua entrando', () => {
    const rabisco: VectorShape = {
      ...estilo,
      id: 'p',
      fill: 'none',
      type: 'path',
      d: 'M 0 0 C 1 1 2 2 3 3',
    }
    expect(isPathfinderEligible(rabisco)).toBe(false)
    const fechado: VectorShape = {
      ...estilo,
      id: 'p',
      fill: '#000',
      type: 'path',
      d: 'M 0 0 L 4 0 L 4 4 Z',
    }
    expect(isPathfinderEligible(fechado)).toBe(true)
    // Dois sub-caminhos (o formato de uma rosca): tem que continuar servindo.
    const rosca: VectorShape = {
      ...estilo,
      id: 'r',
      fill: '#000',
      type: 'path',
      d: 'M 0 0 L 9 0 L 9 9 L 0 9 Z M 3 3 L 6 3 L 6 6 L 3 6 Z',
    }
    expect(isPathfinderEligible(rosca)).toBe(true)
  })
})

describe('⭐⭐ a identidade do resultado', () => {
  const meio = quad('meio', 40, 4, '#0000ff')

  it('o resultado guarda o ID e o LUGAR do de TRÁS', () => {
    // Uma forma NÃO selecionada no meio da pilha prova que o lugar foi mantido.
    const doc = [quad('fundo', 0), meio, quad('frente', 5, 10, '#78dc52')]
    const r = esperaOk(pathfinderShapes(doc, ['fundo', 'frente'], 'unir'))
    expect(r.shapes.map((s) => s.id)).toEqual(['fundo', 'meio'])
    expect(r.resultId).toBe('fundo')
  })

  it('o ESTILO é o do de trás, não o do de cima', () => {
    const r = esperaOk(
      pathfinderShapes(
        [quad('fundo', 0), quad('frente', 5, 10, '#78dc52')],
        ['fundo', 'frente'],
        'unir',
      ),
    )
    expect(r.shapes[0]?.fill).toBe('#ff2121')
    expect(r.shapes[0]?.rotation).toBe(0)
  })

  it('⚠️ ANTI-VÁCUO: "de trás" é o do FUNDO DO ARRAY, não o primeiro id passado', () => {
    // Ids na ordem INVERTIDA de propósito. Uma implementação que lesse `ids[0]`
    // (ou a ordem em que a criança tocou) devolveria 'frente' e pintaria o
    // resultado de verde. Toda asserção de GEOMETRIA passaria igual: só estas
    // duas morrem.
    const doc = [quad('fundo', 0), quad('frente', 5, 10, '#78dc52')]
    const r = esperaOk(pathfinderShapes(doc, ['frente', 'fundo'], 'unir'))
    expect(r.resultId).toBe('fundo')
    expect(r.shapes[0]?.fill).toBe('#ff2121')
  })

  it('⚠️ ANTI-VÁCUO: trocar a ordem do array TROCA o "menos frente"', () => {
    // Se o z-order fosse ignorado, os dois recortes dariam a mesma coisa e o
    // teste de "menos frente funciona" passaria à toa.
    const a = quad('a', 0, 10)
    const c = quad('c', 5, 10)
    const ac = esperaOk(pathfinderShapes([a, c], ['a', 'c'], 'menos-frente'))
    const ca = esperaOk(pathfinderShapes([c, a], ['a', 'c'], 'menos-frente'))
    expect(ac.resultId).toBe('a')
    expect(ca.resultId).toBe('c')
    expect(ac.shapes[0]).not.toEqual(ca.shapes[0])
  })

  it('o grupo do de trás é preservado, e a chave SOME quando não há grupo', () => {
    const comGrupo: VectorShape = { ...quad('fundo', 0), groupId: 'g1' }
    const r = esperaOk(pathfinderShapes([comGrupo, quad('frente', 5)], ['fundo', 'frente'], 'unir'))
    expect(r.shapes[0]?.groupId).toBe('g1')

    const semGrupo = esperaOk(pathfinderShapes([quad('a', 0), quad('b', 5)], ['a', 'b'], 'unir'))
    expect(Object.hasOwn(semGrupo.shapes[0] ?? {}, 'groupId')).toBe(false)
  })

  it('⚠️ forma ESCONDIDA não participa e NÃO some do desenho', () => {
    const escondida: VectorShape = { ...quad('oculta', 5), hidden: true }
    const doc = [quad('a', 0), escondida, quad('c', 3)]
    const r = esperaOk(pathfinderShapes(doc, ['a', 'oculta', 'c'], 'unir'))
    expect(r.shapes.map((s) => s.id).sort()).toEqual(['a', 'oculta'])
    // A escondida sobreviveu intacta, com o `hidden` no lugar.
    expect(r.shapes.find((s) => s.id === 'oculta')?.hidden).toBe(true)
  })
})

describe('as quatro contas, ponta a ponta', () => {
  it('unir dois quadrados cruzados', () => {
    const r = esperaOk(pathfinderShapes([quad('a', 0), quad('b', 5)], ['a', 'b'], 'unir'))
    expect(r.shapes).toHaveLength(1)
    expect(areaDe(r.shapes[0] as VectorShape)).toBeCloseTo(150, 6)
  })

  it('⭐ "menos frente" tira TODAS as da frente, não só a primeira', () => {
    const doc = [quad('fundo', 0, 20), quad('f1', 0, 10), quad('f2', 12, 8)]
    const r = esperaOk(pathfinderShapes(doc, ['fundo', 'f1', 'f2'], 'menos-frente'))
    // 400 menos o quadrado de 10 (100) menos o de 8 (64).
    expect(areaDe(r.shapes[0] as VectorShape)).toBeCloseTo(236, 6)
    // ⚠️ ANTI-VÁCUO: tirando só a primeira daria 300.
    expect(areaDe(r.shapes[0] as VectorShape)).not.toBeCloseTo(300, 1)
  })

  it('a interseção e o ou-exclusivo', () => {
    const inter = esperaOk(pathfinderShapes([quad('a', 0), quad('b', 5)], ['a', 'b'], 'intersecao'))
    expect(areaDe(inter.shapes[0] as VectorShape)).toBeCloseTo(50, 6)
    const xor = esperaOk(pathfinderShapes([quad('a', 0), quad('b', 5)], ['a', 'b'], 'excluir'))
    expect(areaDe(xor.shapes[0] as VectorShape)).toBeCloseTo(100, 6)
  })

  it('⭐ excluir TRÊS formas segue a regra do ÍMPAR', () => {
    const doc = [quad('a', 0, 12), quad('b', 6, 12), { ...quad('c', 0, 12), y: 6 } as VectorShape]
    const r = esperaOk(pathfinderShapes(doc, ['a', 'b', 'c'], 'excluir'))
    // 3 × 144 menos 2 × (as três interseções de 72, 72, 36) mais 4 × (o miolo
    // triplo de 36) = 432 - 360 + 144 = 216.
    expect(areaDe(r.shapes[0] as VectorShape)).toBeCloseTo(216, 4)
    // ⚠️ ANTI-VÁCUO: "união menos a interseção de todas" daria 252.
    expect(areaDe(r.shapes[0] as VectorShape)).not.toBeCloseTo(252, 1)
  })

  it('⭐⭐ formas GIRADAS entram já assadas', () => {
    const reto = quad('a', 0, 100)
    const girado: VectorShape = { ...quad('b', 0, 100, '#78dc52'), rotation: 45 }
    const uniao = esperaOk(pathfinderShapes([reto, girado], ['a', 'b'], 'unir'))
    const inter = esperaOk(pathfinderShapes([reto, girado], ['a', 'b'], 'intersecao'))
    const areaUniao = areaDe(uniao.shapes[0] as VectorShape)
    const areaInter = areaDe(inter.shapes[0] as VectorShape)
    // A soma fecha a inclusão-exclusão. ⚠️ Precisão 0 e não 2: o `d` grava em
    // DUAS CASAS (`round2`), então um quadrado de 100px acumula ~0.2 de área só
    // no arredondamento do disco. Cobrar mais que isso seria cobrar que o
    // formato de gravação tenha mais precisão do que tem.
    expect(areaUniao + areaInter).toBeCloseTo(20000, 0)
    // ⚠️ ANTI-VÁCUO, e é ESTA a asserção que morde: quem ignora a rotação
    // devolve 10000 nas duas (os quadrados coincidem) e AINDA ASSIM satisfaz a
    // soma acima. Só a desigualdade separa as duas implementações.
    expect(areaUniao).toBeGreaterThan(10000)
    expect(areaInter).toBeLessThan(10000)
  })

  it('regressão: retângulo arredondado e estrela rotacionados não quebram o encadeamento', () => {
    const rect: VectorShape = {
      ...estilo,
      id: 'a',
      fill: '#ff2121',
      type: 'rect',
      x: 15.647074785083532,
      y: 6.042078994214535,
      w: 33.0291034700349,
      h: 112.06025712192059,
      rx: 4.61853242944926,
      rotation: 66.72139638103545,
    }
    const points = [
      [-1.2590943067334566, 10.346268031280488],
      [2.993040266865661, 43.940715060660224],
      [27.844458633121413, 20.93909501277829],
      [9.50768838986504, 49.40715389791876],
      [43.33013570245618, 47.76107448647042],
      [10.984439229665114, 57.782224087782105],
      [37.952016496399075, 78.26190416351892],
      [6.732304656065997, 65.147137209876],
      [14.226582762601314, 98.16990685906961],
      [-1.2590943067334586, 68.05576856248081],
      [-16.74477137606823, 98.16990685906961],
      [-9.25049326953291, 65.147137209876],
      [-40.47020510986599, 78.26190416351893],
      [-13.502627843132032, 57.782224087782105],
      [-45.8483243159231, 47.761074486470434],
      [-12.025877003331964, 49.40715389791877],
      [-30.362647246588335, 20.939095012778296],
      [-5.511228880332576, 43.940715060660224],
    ].map(([x, y]) => ({ x: x ?? 0, y: y ?? 0 }))
    const star: VectorShape = {
      ...estilo,
      id: 'b',
      fill: '#78dc52',
      type: 'polygon',
      points,
      rotation: 86.33470606058836,
    }

    const result = pathfinderShapes([rect, star], ['a', 'b'], 'intersecao')
    expect(result.ok).toBe(true)
    if (result.ok) expect(areaDe(result.shapes[0] as VectorShape)).toBeGreaterThan(1)
  })
})

describe('orçamento de trabalho', () => {
  it('recusa 500 elipses com saída grande sem bloquear a thread por segundos', () => {
    const shapes: VectorShape[] = Array.from({ length: 500 }, (_, index) => {
      const disconnected = Math.max(0, index - 2)
      return {
        ...estilo,
        id: `e${index}`,
        fill: '#ff2121',
        type: 'ellipse',
        cx: index === 0 ? 10 : index === 1 ? 15 : 40 + (disconnected % 25) * 20,
        cy: index < 2 ? 20 : 20 + Math.floor(disconnected / 25) * 20,
        rx: 8,
        ry: 8,
      }
    })
    const startedAt = performance.now()
    const result = pathfinderShapes(
      shapes,
      shapes.map((shape) => shape.id),
      'unir',
    )
    const elapsedMs = performance.now() - startedAt

    expect(result).toEqual({ ok: false, reason: 'too-big' })
    expect(elapsedMs).toBeLessThan(500)
  })
})

describe('as recusas', () => {
  const casos: Array<[string, VectorShape[], string[], PathfinderOp, PathfinderRefusal]> = [
    [
      'linha na seleção',
      [
        quad('a', 0),
        { ...estilo, id: 'l', fill: 'none', type: 'line', x1: 0, y1: 0, x2: 9, y2: 9 },
      ],
      ['a', 'l'],
      'unir',
      'not-shapes',
    ],
    [
      'traço aberto',
      [quad('a', 0), { ...estilo, id: 'p', fill: 'none', type: 'path', d: 'M 0 0 C 1 1 2 2 3 3' }],
      ['a', 'p'],
      'unir',
      'open-path',
    ],
    ['uma forma só', [quad('a', 0)], ['a'], 'unir', 'needs-two'],
    ['nem se encostam', [quad('a', 0), quad('b', 500)], ['a', 'b'], 'unir', 'apart'],
  ]

  for (const [nome, doc, ids, op, esperado] of casos) {
    it(`recusa: ${nome}`, () => {
      const r = pathfinderShapes(doc, ids, op)
      expect(r.ok).toBe(false)
      expect(r.ok === false && r.reason).toBe(esperado)
    })
  }

  it('⭐⭐ "tirar a da frente" que não tira NADA é recusa, não perda de desenho', () => {
    // Achado do full review. O `apart` pergunta "nenhum par se encosta?", e com
    // TRÊS formas as duas da frente podem se encostar ENTRE SI enquanto nenhuma
    // toca a base. A guarda não disparava, a conta devolvia a base intacta, e o
    // efeito era o pior possível: as duas da frente SUMIAM do desenho e nada foi
    // recortado. Não é clique morto, é perda de desenho.
    const base = quad('base', 0, 10)
    const f1 = { ...quad('f1', 200, 10), y: 200 } as VectorShape
    const f2 = { ...quad('f2', 210, 10), y: 210 } as VectorShape
    const r = pathfinderShapes([base, f1, f2], ['base', 'f1', 'f2'], 'menos-frente')
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.reason).toBe('apart')
  })

  it('⚠️ ANTI-VÁCUO: tirar a da frente que TIRA de verdade segue passando', () => {
    // A metade que morre se a guarda ficar apertada demais.
    const doc = [
      quad('base', 0, 40),
      quad('f1', 10, 10),
      { ...quad('f2', 200, 10), y: 200 } as VectorShape,
    ]
    const r = pathfinderShapes(doc, ['base', 'f1', 'f2'], 'menos-frente')
    expect(r.ok).toBe(true)
    if (r.ok) expect(areaDe(r.shapes[0] as VectorShape)).toBeCloseTo(1500, 6)
  })

  it('traço num formato que não sei ler NÃO diz que ele está aberto', () => {
    // O `d` com arco é ilegível, não aberto: mandar a criança "fechar" é uma
    // instrução que ela não tem como seguir.
    const torto: VectorShape = {
      ...estilo,
      id: 'x',
      fill: '#000',
      type: 'path',
      d: 'M 0 0 A 5 5 0 0 1 10 10 Z',
    }
    const r = pathfinderShapes([quad('q', 0), torto], ['q', 'x'], 'unir')
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.reason).toBe('bad-path')
  })

  it('interseção que só encosta na borda não sobra nada', () => {
    const r = pathfinderShapes([quad('a', 0), quad('b', 10)], ['a', 'b'], 'intersecao')
    expect(r.ok === false && r.reason).toBe('empty')
  })

  it('⭐ recusa NÃO mexe no desenho (nada de meia-mistura)', () => {
    const doc = [quad('a', 0), quad('b', 500)]
    const antes = structuredClone(doc)
    pathfinderShapes(doc, ['a', 'b'], 'unir')
    expect(doc).toEqual(antes)
  })
})

describe('⭐⭐ o `d` de saída sobrevive ao caminho inteiro', () => {
  // A rede mais valiosa do arquivo: um `d` fora do dialeto DESENHA bem no
  // editor e SOME da galeria no próximo load, em silêncio. É a mesma família do
  // bitmap que não casava com o quadro no lote do redimensionar.
  const cenarios: Array<[string, VectorShape[], PathfinderOp]> = [
    ['dois quadrados', [quad('a', 0), quad('b', 5)], 'unir'],
    [
      'círculo e quadrado',
      [
        quad('a', 0, 60),
        { ...estilo, id: 'c', fill: '#000', type: 'ellipse', cx: 50, cy: 30, rx: 25, ry: 25 },
      ],
      'menos-frente',
    ],
    [
      'girados',
      [quad('a', 0, 40), { ...quad('b', 10, 40), rotation: 33 } as VectorShape],
      'excluir',
    ],
    [
      'cantos redondos',
      [
        { ...quad('a', 0, 50), rx: 12 } as VectorShape,
        { ...estilo, id: 'c', fill: '#000', type: 'ellipse', cx: 40, cy: 25, rx: 20, ry: 12 },
      ],
      'intersecao',
    ],
  ]

  for (const [nome, doc, op] of cenarios) {
    it(`${nome}: parsePathD aceita, sanitize preserva, cabe no teto`, () => {
      const r = esperaOk(
        pathfinderShapes(
          doc,
          doc.map((s) => s.id),
          op,
        ),
      )
      const forma = r.shapes[0]
      if (forma?.type !== 'path') throw new Error('esperava um traço')
      expect(parsePathD(forma.d)).not.toBeNull()
      expect(forma.d.length).toBeLessThanOrEqual(MAX_PATH_CHARS)
      // Nada de A/Q/S/T, nada em minúscula, nada colado.
      expect(forma.d).toMatch(/^[MLZ0-9 .-]+$/)
      // E o round-trip pelo portão que descarta em silêncio.
      expect(sanitizeVectorShape(structuredClone(forma))).toEqual(forma)
    })
  }
})

describe('a realimentação', () => {
  it('⭐ o resultado de uma mistura entra na SEGUINTE', () => {
    const rosca = esperaOk(
      pathfinderShapes([quad('a', 0, 20), quad('b', 5, 10)], ['a', 'b'], 'menos-frente'),
    )
    const comFuro = rosca.shapes[0] as VectorShape
    expect(areaDe(comFuro)).toBeCloseTo(300, 6)
    // A rosca (com furo) agora é operando de uma união.
    const doc = [comFuro, quad('c', 20, 10, '#78dc52')]
    const segunda = esperaOk(pathfinderShapes(doc, [comFuro.id, 'c'], 'unir'))
    expect(areaDe(segunda.shapes[0] as VectorShape)).toBeCloseTo(400, 6)
  })
})
