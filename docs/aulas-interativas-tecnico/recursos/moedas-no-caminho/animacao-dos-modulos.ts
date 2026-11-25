/**
 * Animação do módulo de Moedas no caminho (página do curso no Kids), com as artes do jogo 2D do
 * curso (moedas-2d.szproject.json) nas posições do jogo: o cenário praia tropical, o farol ao
 * fundo, as cinco moedas no caminho e o baú no canto de baixo. O personagem sai da ponte, anda pelo
 * caminho pegando uma moeda de cada vez (a faixa do alto acende uma moeda por moeda pega, que é o
 * contador subindo), desce até o baú, e o baú abre com 5 moedas. Depois tudo volta, em loop de 5 s.
 * Monta, exporta e cadastra: scripts/cursos/animacao-do-modulo.ts.
 */
import { artesDoProjeto, Cena } from '../../../../scripts/cursos/lib/edisvg'

export const curso = {
  slug: 'jornada-faisca-poder-1',
  pasta: 'docs/aulas-interativas/faisca/poder-moedas-no-caminho',
}

/** Quique dos passos: um degrau de -3 a cada 3 quadros entre `inicio` e `fim`, sobre `base`. */
function passos(inicio: number, fim: number, de: number, ate: number): [number, number][] {
  const quadros: [number, number][] = []
  for (let f = inicio, k = 0; f <= fim; f += 3, k++) {
    const p = (f - inicio) / (fim - inicio)
    quadros.push([f, de + (ate - de) * p - (k % 2 ? 3 : 0)])
  }
  return quadros
}

export const animacoes = [
  {
    modulo: 1,
    titulo: 'Moedas no caminho',
    montar() {
      const arte = artesDoProjeto(
        'docs/aulas-interativas/faisca/poder-moedas-no-caminho/moedas-2d.szproject.json',
      )
      const c = new Cena({
        chave: 'moedas-no-caminho-m1',
        titulo: 'Moedas no caminho · o baú abre com 5 moedas',
        largura: 480,
        altura: 360,
        quadros: 150,
      })
      c.svg('Cenário', arte['praia-tropical']!, { x: 0, y: 0, ancora: [0, 0] })
      c.svg('Farol', arte['farol-listrado-apagado']!, { x: 328, y: 40, ancora: [0, 0] })
      const fechado = c.svg('Baú fechado', arte['bau-fechado']!, {
        x: 52,
        y: 294,
        escala: 0.8,
        ancora: [32, 32],
      })
      const aberto = c.svg('Baú aberto', arte['bau-aberto']!, {
        x: 52,
        y: 294,
        escala: 0.8,
        ancora: [32, 32],
        opacidade: 0,
      })
      // As moedas do caminho, nas posições do jogo (centro em y 178), e o quadro em que cada uma é
      // pega (o personagem anda da direita para a esquerda).
      const caminho = [
        { x: 344, pega: 16 },
        { x: 272, pega: 32 },
        { x: 217, pega: 44 },
        { x: 162, pega: 56 },
        { x: 107, pega: 68 },
      ]
      const moedas = caminho.map((m, i) =>
        c.svg(`Moeda ${i + 1}`, arte.moeda!, { x: m.x, y: 178, escala: 0.75, ancora: [16, 16] }),
      )
      const estrela = 'M0-10L2.5-2.5 10 0 2.5 2.5 0 10-2.5 2.5-10 0-2.5-2.5Z'
      const faiscas = [
        [22, 258],
        [84, 262],
        [52, 238],
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
        x: 380,
        y: 205,
        ancora: [32, 62],
      })
      // A faixa do alto: cinco moedas apagadas que acendem uma a uma.
      c.forma(
        'Faixa das moedas',
        'rect',
        { x: 8, y: 10, width: 136, height: 36, rx: 10, fill: '#143d35', opacity: 0.88 },
        [76, 28],
      )
      const contador = caminho.map((_, i) =>
        c.svg(`Moeda do contador ${i + 1}`, arte.moeda!, {
          x: 28 + i * 24,
          y: 28,
          escala: 0.6,
          ancora: [16, 16],
          opacidade: 30,
        }),
      )

      // Cada moeda do caminho sobe e some quando é pega, e volta no recomeço.
      for (const [i, m] of caminho.entries()) {
        c.trilha(moedas[i]!, 'opacity', [
          [0, 100],
          [m.pega, 100],
          [m.pega + 6, 0],
          [126, 0],
          [136, 100],
          [150, 100],
        ])
        c.trilha(moedas[i]!, 'y', [
          [0, 0],
          [m.pega, 0, 'sai'],
          [m.pega + 6, -14],
          [m.pega + 7, 0, 'segura'],
          [150, 0],
        ])
        for (const eixo of ['sx', 'sy'] as const)
          c.trilha(moedas[i]!, eixo, [
            [0, 1],
            [m.pega, 1],
            [m.pega + 4, 1.4],
            [m.pega + 6, 1.2],
            [126, 0.3, 'segura'],
            [127, 0.3],
            [136, 1],
            [150, 1],
          ])
        // A moeda do contador acende logo depois (o contador sobe) e apaga no recomeço.
        c.trilha(contador[i]!, 'opacity', [
          [0, 30],
          [m.pega + 2, 30],
          [m.pega + 5, 100],
          [126, 100],
          [134, 30],
          [150, 30],
        ])
        for (const eixo of ['sx', 'sy'] as const)
          c.trilha(contador[i]!, eixo, [
            [0, 1],
            [m.pega + 2, 1],
            [m.pega + 5, 1.35],
            [m.pega + 9, 1],
            [150, 1],
          ])
      }
      // O personagem anda para a esquerda (virado para a esquerda), desce até o baú, pula quando
      // o baú abre, some e volta ao começo.
      c.trilha(pessoa, 'x', [
        [0, 0],
        [8, 0],
        [78, -320],
        [125, -320, 'segura'],
        [126, 0],
        [150, 0],
      ])
      c.trilha(pessoa, 'y', [
        [0, 0],
        ...passos(8, 78, 0, 0),
        ...passos(81, 96, 0, 62),
        [102, 62, 'sai'],
        [109, 40, 'entra'],
        [116, 62],
        [125, 62, 'segura'],
        [126, 0],
        [150, 0],
      ])
      c.trilha(pessoa, 'sx', [
        [0, -1],
        [150, -1],
      ])
      c.trilha(pessoa, 'opacity', [
        [0, 100],
        [118, 100],
        [124, 0],
        [128, 0],
        [138, 100],
        [150, 100],
      ])
      // O baú abre com as cinco moedas, com faíscas, e fecha no recomeço.
      c.trilha(fechado, 'opacity', [
        [0, 100],
        [96, 100],
        [100, 0],
        [124, 0],
        [130, 100],
        [150, 100],
      ])
      c.trilha(aberto, 'opacity', [
        [0, 0],
        [96, 0],
        [100, 100],
        [124, 100],
        [130, 0],
        [150, 0],
      ])
      c.trilha(aberto, 'sy', [
        [0, 0.7],
        [96, 0.7],
        [101, 1.12],
        [105, 1],
        [126, 1],
        [130, 0.7],
        [150, 0.7],
      ])
      for (const [i, f] of faiscas.entries()) {
        const ini = 100 + i * 4
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
      return c
    },
  },
]
