/**
 * Animação do módulo de Moedas no caminho (página do curso no Kids), no molde das animações do
 * Jardim e da Ilha: fundo transparente e um chão oval com espessura, com as artes do jogo 2D do
 * curso (moedas-2d.szproject.json): o personagem, a moeda, o baú fechado e aberto e as palmeiras do
 * cenário praia tropical. Cinco moedas estão no caminho de areia. O personagem anda pegando uma de
 * cada vez, e cada moeda voa para o seu lugar no contador acima do baú (cinco moedas apagadas que
 * vão sendo preenchidas). Com as cinco, o baú abre, as moedas caem dentro, saem faíscas e o
 * personagem pula. Depois ele volta correndo, as moedas reaparecem atrás dele e o baú fecha, em
 * loop de 5 s. Monta, exporta e cadastra: scripts/cursos/animacao-do-modulo.ts.
 */
import { artesDoProjeto, Cena } from '../../../../scripts/cursos/lib/edisvg'

export const curso = {
  slug: 'jornada-faisca-poder-1',
  pasta: 'docs/aulas-interativas/faisca/poder-moedas-no-caminho',
}

type Quadro = [number, number, ('segura' | 'sai' | 'entra')?]

/** Passos de caminhada: de `de` a `ate` (deslocamento em x), entre os quadros `inicio` e `fim`. */
function andar(inicio: number, fim: number, de: number, ate: number, a = 3) {
  const x: Quadro[] = []
  const y: Quadro[] = []
  for (let f = inicio, k = 0; f <= fim; f += a, k++) {
    x.push([f, de + ((ate - de) * (f - inicio)) / (fim - inicio)])
    y.push([f, k % 2 ? -4 : 0])
  }
  if (x.at(-1)![0] !== fim) {
    x.push([fim, ate])
    y.push([fim, 0])
  }
  return { x, y }
}

/** A primeira palmeira do cenário praia tropical, como uma arte à parte (base do tronco em 66,107). */
function palmeira(cenario: string) {
  const inicio = cenario.indexOf('<path d="M 64 107')
  const fim = cenario.indexOf('fill="#61432f"/>', inicio)
  if (inicio < 0 || fim < 0) throw new Error('A palmeira do cenário praia tropical mudou na arte')
  const partes = cenario.slice(inicio, fim + 'fill="#61432f"/>'.length)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">${partes}</svg>`
}

export const animacoes = [
  {
    modulo: 1,
    titulo: 'Moedas no caminho',
    montar() {
      const arte = artesDoProjeto(`${curso.pasta}/moedas-2d.szproject.json`)
      const c = new Cena({
        chave: 'moedas-no-caminho-m1',
        titulo: 'Moedas no caminho · o baú abre com 5 moedas',
        largura: 500,
        altura: 380,
        topo: 110,
        quadros: 150,
      })
      // O chão com espessura, nas cores do cenário praia tropical, e o caminho de areia.
      c.forma(
        'Lateral do chão',
        'path',
        { d: 'M18 380A232 74 0 0 0 482 380L482 402A232 74 0 0 1 18 402Z', fill: '#0b7a54' },
        [250, 391],
      )
      c.forma(
        'Grama',
        'ellipse',
        { cx: 250, cy: 380, rx: 232, ry: 74, fill: '#29905a' },
        [250, 380],
      )
      c.forma(
        'Luz na grama',
        'ellipse',
        { cx: 238, cy: 368, rx: 178, ry: 50, fill: '#34a065' },
        [238, 368],
      )
      const tufo = 'M-9 0Q-8-12-3-15Q-4-6 0-2Q1-14 5-17Q5-6 3 0Q8-9 12-10Q9-4 8 0Z'
      for (const [i, [x, y]] of [
        [196, 346],
        [138, 444],
        [372, 448],
      ].entries())
        c.forma(
          `Tufo ${i + 1}`,
          'path',
          { d: tufo, fill: '#1c7a4a', transform: `translate(${x} ${y})` },
          [x!, y!],
        )
      const arvore = palmeira(arte['praia-tropical']!)
      const palmeiras = [
        c.svg('Palmeira 1', arvore, { x: 98, y: 334, escala: 2.4, ancora: [66, 107] }),
        c.svg('Palmeira 2', arvore, { x: 300, y: 322, escala: 2.1, ancora: [66, 107] }),
      ]
      c.forma(
        'Borda do caminho',
        'ellipse',
        { cx: 252, cy: 400, rx: 212, ry: 27, fill: '#dfc283' },
        [252, 400],
      )
      c.forma(
        'Caminho',
        'ellipse',
        { cx: 252, cy: 397, rx: 206, ry: 23, fill: '#fae1ab' },
        [252, 397],
      )
      for (const [i, [x, y, rx]] of [
        [120, 410, 4],
        [226, 414, 3],
        [318, 384, 4],
      ].entries())
        c.forma(
          `Pedrinha ${i + 1}`,
          'ellipse',
          { cx: x!, cy: y!, rx: rx!, ry: rx! * 0.6, fill: '#dfc283' },
          [x!, y!],
        )

      // O contador: cinco moedas apagadas em arco acima do baú; cada moeda pega voa para a sua.
      const lugares = [
        [376, 296],
        [400, 289],
        [424, 286],
        [448, 289],
        [472, 296],
      ] as const
      const apagadas = lugares.map(([x, y], i) =>
        c.svg(`Lugar da moeda ${i + 1}`, arte.moeda!, {
          x,
          y,
          escala: 0.8,
          ancora: [16, 16],
          opacidade: 35,
        }),
      )
      const bau = { x: 424, y: 410, boca: 369 }
      c.forma(
        'Sombra do baú',
        'ellipse',
        { cx: bau.x, cy: bau.y, rx: 46, ry: 7, fill: '#7a5132', opacity: 0.25 },
        [bau.x, bau.y],
      )
      const fechado = c.svg('Baú fechado', arte['bau-fechado']!, {
        x: bau.x,
        y: bau.y,
        escala: 1.7,
        ancora: [32, 58],
      })
      const aberto = c.svg('Baú aberto', arte['bau-aberto']!, {
        x: bau.x,
        y: bau.y,
        escala: 1.7,
        ancora: [32, 58],
        opacidade: 0,
      })
      const estrela = 'M0-10L2.5-2.5 10 0 2.5 2.5 0 10-2.5 2.5-10 0-2.5-2.5Z'
      const faiscas = [
        [388, 330],
        [462, 334],
        [424, 306],
      ].map(([x, y], i) =>
        c.forma(
          `Faísca ${i + 1}`,
          'path',
          { d: estrela, fill: '#ffd75e', transform: `translate(${x} ${y})` },
          [x!, y!],
          0,
        ),
      )
      const pessoa = c.svg('Personagem', arte.aventureiro!, {
        x: 76,
        y: 404,
        escala: 2.3,
        ancora: [32, 62],
      })
      // As moedas ficam por cima do personagem, para o voo até o contador aparecer inteiro.
      // `pega`: quando a frente do personagem encosta na moeda; `volta`: quando, na volta
      // correndo, as costas dele já passaram por ela.
      const moedaY = 382
      const caminho = [
        { x: 156, pega: 19, volta: 143 },
        { x: 200, pega: 31, volta: 138 },
        { x: 244, pega: 42, volta: 134 },
        { x: 288, pega: 54, volta: 129 },
        { x: 332, pega: 65, volta: 125 },
      ]
      const moedas = caminho.map((m, i) =>
        c.svg(`Moeda ${i + 1}`, arte.moeda!, {
          x: m.x,
          y: moedaY,
          escala: 1.2,
          ancora: [16, 16],
        }),
      )

      for (const [i, m] of caminho.entries()) {
        const [lx, ly] = lugares[i]!
        const chega = m.pega + 10
        const cai = 86 + i * 3
        const dentro = cai + 8
        // Voa num arco até o lugar no contador, espera as cinco, cai no baú aberto, some e volta
        // ao caminho escondida, para reaparecer quando o personagem passa de volta.
        c.trilha(moedas[i]!, 'x', [
          [0, 0],
          [m.pega, 0],
          [chega, lx - m.x],
          [cai, lx - m.x],
          [dentro, bau.x - m.x, 'segura'],
          [dentro + 1, 0],
          [150, 0],
        ])
        c.trilha(moedas[i]!, 'y', [
          [0, 0],
          [m.pega, 0, 'sai'],
          [m.pega + 6, ly - moedaY - 34, 'entra'],
          [chega, ly - moedaY],
          [cai, ly - moedaY, 'sai'],
          [cai + 3, ly - moedaY - 12, 'entra'],
          [dentro, bau.boca - moedaY, 'segura'],
          [dentro + 1, 0],
          [150, 0],
        ])
        for (const eixo of ['sx', 'sy'] as const)
          c.trilha(moedas[i]!, eixo, [
            [0, 1],
            [m.pega, 1],
            [m.pega + 4, 1.25],
            [chega, 0.67],
            [cai, 0.67],
            [dentro, 0.4, 'segura'],
            [dentro + 1, 0.3],
            [m.volta, 0.3],
            [m.volta + 4, 1.2],
            ...(m.volta + 7 < 150 ? ([[m.volta + 7, 1]] as Quadro[]) : []),
            [150, 1],
          ])
        c.trilha(moedas[i]!, 'opacity', [
          [0, 100],
          [dentro - 2, 100],
          [dentro, 0],
          [m.volta, 0],
          [m.volta + 4, 100],
          [150, 100],
        ])
        // O lugar apagado dá uma piscada quando a moeda chega, some na festa e volta no recomeço.
        for (const eixo of ['sx', 'sy'] as const)
          c.trilha(apagadas[i]!, eixo, [
            [0, 1],
            [chega - 1, 1],
            [chega + 2, 1.3],
            [chega + 5, 1],
            [150, 1],
          ])
        c.trilha(apagadas[i]!, 'opacity', [
          [0, 35],
          [88, 35],
          [96, 0],
          [128, 0],
          [138, 35],
          [150, 35],
        ])
      }

      // O personagem anda pegando as moedas, para diante do baú, pula quando ele abre e volta
      // correndo, virado para o outro lado.
      const ida = andar(10, 78, 0, 264)
      const volta = andar(118, 146, 264, 0, 2)
      c.trilha(pessoa, 'x', [[0, 0], ...ida.x, ...volta.x, [150, 0]])
      c.trilha(pessoa, 'y', [
        [0, 0],
        ...ida.y,
        [100, 0, 'sai'],
        [106, -30, 'entra'],
        [112, 0],
        ...volta.y,
        [150, 0],
      ])
      c.trilha(pessoa, 'sx', [
        [0, 1],
        [114, 1, 'segura'],
        [115, -1],
        [146, -1, 'segura'],
        [147, 1],
        [150, 1],
      ])
      // O baú abre quando o personagem chega com as cinco moedas e fecha no recomeço.
      c.trilha(fechado, 'opacity', [
        [0, 100],
        [82, 100],
        [86, 0],
        [122, 0],
        [128, 100],
        [150, 100],
      ])
      c.trilha(aberto, 'opacity', [
        [0, 0],
        [82, 0],
        [86, 100],
        [122, 100],
        [128, 0],
        [150, 0],
      ])
      c.trilha(aberto, 'sy', [
        [0, 0.8],
        [82, 0.8],
        [87, 1.1],
        [91, 1],
        [101, 1],
        [104, 1.08],
        [108, 1],
        [124, 1],
        [128, 0.8],
        [150, 0.8],
      ])
      for (const [i, f] of faiscas.entries()) {
        const ini = 98 + i * 4
        c.trilha(f, 'opacity', [
          [0, 0],
          [ini, 0],
          [ini + 6, 100],
          [ini + 16, 0],
          [150, 0],
        ])
        for (const eixo of ['sx', 'sy'] as const)
          c.trilha(f, eixo, [
            [0, 0.2],
            [ini, 0.2],
            [ini + 8, 1.2],
            [ini + 16, 0.4],
            [150, 0.2],
          ])
      }
      // As palmeiras balançam devagar o tempo todo.
      for (const [i, p] of palmeiras.entries())
        c.trilha(p, 'rotation', [
          [0, i ? 2 : -2],
          [75, i ? -2 : 2],
          [150, i ? 2 : -2],
        ])
      return c
    },
  },
]
