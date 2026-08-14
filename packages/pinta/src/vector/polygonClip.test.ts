/**
 * O clipper (08/2026). Os casos difíceis aqui NÃO são exóticos: são o que uma
 * criança produz em dois minutos encaixando formas na grade. Dois quadrados
 * iguais, dois encostados dividindo uma aresta inteira, um cantinho tocando o
 * outro. É por isso que eles vêm antes dos casos "bonitos".
 *
 * `polyArea` é a régua de trabalho: um número só que pega anel faltando, anel
 * duplicado e orientação errada de uma vez.
 */
import { describe, expect, it } from 'bun:test'
import {
  clipPolys,
  type Poly,
  pointInPoly,
  polyArea,
  polyToPathD,
  signedArea,
  windingNumber,
} from './polygonClip'

/** Quadrado no sentido do `makePolygon` (horário na tela = área positiva). */
function quad(x: number, y: number, w: number, h: number): Poly {
  return [
    [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ],
  ]
}

function esperaOk(poly: Poly | null): Poly {
  if (poly === null) throw new Error('o encadeamento não fechou')
  return poly
}

describe('a base: área com sinal e "está dentro?"', () => {
  it('o quadrado no sentido do makePolygon tem área POSITIVA', () => {
    // Não é convenção arbitrária: é a que o `makePolygon` já produz, então um
    // resultado de mistura gira no mesmo sentido de uma estrela desenhada ao lado.
    expect(signedArea(quad(0, 0, 10, 10)[0] ?? [])).toBe(100)
  })

  it('a regra é NONZERO: o miolo de uma ESTRELA fica pintado', () => {
    // ⚠️ Uma gravatinha NÃO serve de prova: os dois lóbulos dela são cobertos
    // uma vez cada, e aí par-ímpar e nonzero concordam. Quem separa as duas
    // regras é a estrela de cinco pontas, cujo miolo é coberto DUAS vezes no
    // mesmo sentido: par-ímpar o deixaria VAZADO.
    const estrela: Poly = [
      [0, 2, 4, 1, 3].map((k) => {
        const rad = ((-90 + k * 72) * Math.PI) / 180
        return { x: Math.cos(rad) * 10, y: Math.sin(rad) * 10 }
      }),
    ]
    expect(pointInPoly({ x: 0, y: 0 }, estrela)).toBe(true)
    expect(Math.abs(windingNumber({ x: 0, y: 0 }, estrela))).toBe(2)
    // A ponta de cima é coberta UMA vez: dentro nas duas regras.
    expect(pointInPoly({ x: 0, y: -8 }, estrela)).toBe(true)
    // E fora da estrela continua fora.
    expect(pointInPoly({ x: 9, y: 9 }, estrela)).toBe(false)
  })
})

describe('⚠️ as degenerescências (é isso que a criança produz)', () => {
  it('⭐⭐ dois quadrados IDÊNTICOS', () => {
    const a = quad(0, 0, 10, 10)
    const b = quad(0, 0, 10, 10)

    const uniao = esperaOk(clipPolys(a, b, 'union'))
    expect(uniao).toHaveLength(1)
    expect(polyArea(uniao)).toBe(100)
    // ⚠️ ANTI-VÁCUO: a área e a contagem de anéis passam mesmo com as OITO
    // arestas coincidentes duplicadas no resultado. Só o número de pontos
    // reprova, e é ele que prova que as coincidentes foram tratadas.
    expect(uniao[0]).toHaveLength(4)

    const inter = esperaOk(clipPolys(a, b, 'intersect'))
    expect(polyArea(inter)).toBe(100)
    expect(inter[0]).toHaveLength(4)

    expect(esperaOk(clipPolys(a, b, 'difference'))).toEqual([])
    expect(esperaOk(clipPolys(a, b, 'xor'))).toEqual([])
  })

  it('⭐ dois quadrados que dividem uma ARESTA INTEIRA', () => {
    const a = quad(0, 0, 10, 10)
    const b = quad(10, 0, 10, 10)

    const uniao = esperaOk(clipPolys(a, b, 'union'))
    expect(uniao).toHaveLength(1)
    expect(polyArea(uniao)).toBe(200)
    // ⚠️ ANTI-VÁCUO: o meio da antiga aresta compartilhada agora é MIOLO. Se a
    // costura sobrevivesse, a área ainda daria 200 e este ponto reprovaria.
    expect(pointInPoly({ x: 10, y: 5 }, uniao)).toBe(true)

    expect(esperaOk(clipPolys(a, b, 'intersect'))).toEqual([])
    expect(polyArea(esperaOk(clipPolys(a, b, 'difference')))).toBe(100)
    expect(polyArea(esperaOk(clipPolys(a, b, 'xor')))).toBe(200)
  })

  it('⭐⭐ sobreposição colinear PARCIAL (o T-junction na forma mais dura)', () => {
    // A aresta direita de A tem que ser partida em y=2 E y=8, e o pedaço do
    // meio tem que sumir.
    const a = quad(0, 0, 10, 10)
    const b = quad(10, 2, 10, 6)
    const uniao = esperaOk(clipPolys(a, b, 'union'))
    expect(uniao).toHaveLength(1)
    expect(polyArea(uniao)).toBe(160)
    // ⚠️ ANTI-VÁCUO: a lista EXATA. Um corte faltando vira 6 pontos com área
    // errada; o pedaço do meio sobrevivente vira um espinho de área zero, que
    // a área não acusa.
    expect(uniao[0]).toHaveLength(8)
  })

  it('⭐ encostar num PONTO só não trava o encadeamento', () => {
    // O triângulo toca o quadrado num vértice único. Sem o teste de ponta em
    // cima de aresta, a cadeia fica pendurada e a operação inteira recusa.
    const a = quad(0, 0, 10, 10)
    const bico: Poly = [
      [
        { x: 10, y: 5 },
        { x: 20, y: 2 },
        { x: 20, y: 8 },
      ],
    ]
    const uniao = clipPolys(a, bico, 'union')
    // ⚠️ ANTI-VÁCUO: o que se cobra aqui é NÃO ter recusado.
    expect(uniao).not.toBeNull()
    expect(esperaOk(uniao)).toHaveLength(2)
    expect(polyArea(esperaOk(uniao))).toBeCloseTo(130, 6)
    expect(esperaOk(clipPolys(a, bico, 'intersect'))).toEqual([])
  })

  it('⭐ quadrados que se tocam só no CANTO viram dois anéis simples', () => {
    const a = quad(0, 0, 10, 10)
    const b = quad(10, 10, 10, 10)
    const uniao = esperaOk(clipPolys(a, b, 'union'))
    // ⚠️ ANTI-VÁCUO: um oito tem a MESMA área e um anel só de 8 pontos. É esta
    // asserção que trava a regra do menor giro no encadeamento.
    expect(uniao).toHaveLength(2)
    expect(uniao[0]).toHaveLength(4)
    expect(uniao[1]).toHaveLength(4)
    expect(polyArea(uniao)).toBe(200)
  })
})

describe('as quatro contas', () => {
  it('união de dois quadrados que se cruzam', () => {
    const uniao = esperaOk(clipPolys(quad(0, 0, 10, 10), quad(5, 5, 10, 10), 'union'))
    expect(uniao).toHaveLength(1)
    expect(polyArea(uniao)).toBe(175)
    expect(polyArea(uniao)).not.toBe(200) // a sobreposição não foi removida
    expect(polyArea(uniao)).not.toBe(100) // um operando sumiu
  })

  it('a interseção é o quadradinho do meio, nas coordenadas exatas', () => {
    const inter = esperaOk(clipPolys(quad(0, 0, 10, 10), quad(5, 5, 10, 10), 'intersect'))
    expect(inter).toHaveLength(1)
    expect(polyArea(inter)).toBe(25)
    const pontos = [...(inter[0] ?? [])].sort((p, q) => p.x - q.x || p.y - q.y)
    expect(pontos).toEqual([
      { x: 5, y: 5 },
      { x: 5, y: 10 },
      { x: 10, y: 5 },
      { x: 10, y: 10 },
    ])
  })

  it('⭐⭐ a diferença abre um BURACO de verdade', () => {
    const rosca = esperaOk(clipPolys(quad(0, 0, 20, 20), quad(5, 5, 10, 10), 'difference'))
    expect(rosca).toHaveLength(2)
    const areas = rosca.map((r) => Math.abs(signedArea(r))).sort((x, y) => y - x)
    expect(areas).toEqual([400, 100])
    // O invariante do nonzero: o furo gira ao CONTRÁRIO do externo.
    expect(Math.sign(signedArea(rosca[0] ?? []))).not.toBe(Math.sign(signedArea(rosca[1] ?? [])))
    // ⚠️ ANTI-VÁCUO, e é a metade que importa: a soma das áreas passa igual com
    // o furo girando para o mesmo lado do externo, e aí ele apareceria PINTADO
    // na tela. Só a amostra de ponto reprova isso.
    expect(pointInPoly({ x: 10, y: 10 }, rosca)).toBe(false)
    expect(pointInPoly({ x: 2, y: 2 }, rosca)).toBe(true)
  })

  it('o ou-exclusivo tira o pedaço em comum', () => {
    const xor = esperaOk(clipPolys(quad(0, 0, 10, 10), quad(5, 5, 10, 10), 'xor'))
    expect(polyArea(xor)).toBe(150)
    expect(pointInPoly({ x: 7, y: 7 }, xor)).toBe(false)
    expect(pointInPoly({ x: 2, y: 2 }, xor)).toBe(true)
    expect(pointInPoly({ x: 13, y: 13 }, xor)).toBe(true)
  })

  it('⭐⭐ as quatro fecham a INCLUSÃO-EXCLUSÃO, sem constante na mão', () => {
    // Cruza as quatro operações entre si. Qualquer bug numa delas quebra pelo
    // menos uma identidade, e nenhuma conta foi feita a mão aqui.
    const pares: Array<[Poly, Poly, string]> = [
      [quad(0, 0, 10, 10), quad(5, 5, 10, 10), 'cruzados'],
      [quad(0, 0, 20, 20), quad(5, 5, 10, 10), 'um dentro do outro'],
      [quad(0, 0, 10, 10), quad(3, 3, 4, 30), 'atravessando'],
      [
        quad(0, 0, 12, 12),
        [
          [
            { x: 6, y: 0 },
            { x: 18, y: 6 },
            { x: 6, y: 12 },
          ],
        ],
        'triângulo',
      ],
    ]
    for (const [a, b, nome] of pares) {
      const uniao = polyArea(esperaOk(clipPolys(a, b, 'union')))
      const inter = polyArea(esperaOk(clipPolys(a, b, 'intersect')))
      const menos = polyArea(esperaOk(clipPolys(a, b, 'difference')))
      const xor = polyArea(esperaOk(clipPolys(a, b, 'xor')))
      expect(`${nome}: ${uniao + inter}`).toBe(`${nome}: ${polyArea(a) + polyArea(b)}`)
      expect(`${nome}: ${xor}`).toBe(`${nome}: ${uniao - inter}`)
      expect(`${nome}: ${menos}`).toBe(`${nome}: ${polyArea(a) - inter}`)
    }
  })
})

describe('aninhamento e realimentação', () => {
  it('⭐ ilha DENTRO do furo continua pintada', () => {
    // A regra "o maior é o de fora" deixaria a ilha vazada. Quem resolve é a
    // profundidade: par pintado, ímpar furo.
    const rosca = esperaOk(clipPolys(quad(0, 0, 30, 30), quad(5, 5, 20, 20), 'difference'))
    const comIlha = esperaOk(clipPolys(rosca, quad(10, 10, 10, 10), 'union'))
    expect(comIlha).toHaveLength(3)
    expect(pointInPoly({ x: 2, y: 2 }, comIlha)).toBe(true)
    expect(pointInPoly({ x: 7, y: 7 }, comIlha)).toBe(false)
    expect(pointInPoly({ x: 15, y: 15 }, comIlha)).toBe(true)
  })

  it('⭐ um resultado com furo volta a ser OPERANDO sem caso especial', () => {
    // É o que faz a dobra N-ária funcionar: o winding soma sobre todos os
    // anéis, então o furo do passo anterior lê como "fora" no passo seguinte.
    const rosca = esperaOk(clipPolys(quad(0, 0, 20, 20), quad(5, 5, 10, 10), 'difference'))
    expect(polyArea(rosca)).toBe(300)
    const cortada = esperaOk(clipPolys(rosca, quad(0, 0, 20, 10), 'difference'))
    // Some a metade de cima da rosca: 300 menos os 200 do topo mais os 50 de
    // furo que já estavam lá em cima.
    expect(polyArea(cortada)).toBe(150)
  })
})

describe('a saída', () => {
  it('o `d` sai no dialeto do parsePathD, um bloco por anel', () => {
    const rosca = esperaOk(clipPolys(quad(0, 0, 20, 20), quad(5, 5, 10, 10), 'difference'))
    const d = polyToPathD(rosca)
    expect(d.match(/M /g)).toHaveLength(2)
    expect(d.match(/Z/g)).toHaveLength(2)
    // Nada fora de M/L/Z, nada em minúscula, nada colado.
    expect(d).toMatch(/^[MLZ0-9 .-]+$/)
    expect(d).not.toMatch(/[ACQSTHVmlzacqsthv]/)
  })
})
