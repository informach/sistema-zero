/**
 * Animação do módulo de A Ilha do Farol (página do curso no Kids). O curso é 3D: a animação é
 * uma versão 2D parecida, com os "gêmeos" em SVG dos modelos da cena da Ilha (o aventureiro, a
 * chave dourada, o farol listrado apagado e aceso e o veleiro), tirados do projeto de A Chave do
 * Farol, que é o mesmo jogo em 2D. A profundidade é simulada: a ilha tem espessura, o personagem
 * diminui ao andar para o fundo e a chave gira (a largura oscila como no giro 3D).
 * O personagem vai até a chave, pega, o farol acende e ele pula; depois tudo volta, em loop de 5 s.
 * Monta, exporta e cadastra: scripts/cursos/animacao-do-modulo.ts.
 */
import { artesDoProjeto, Cena } from '../../../../scripts/cursos/lib/edisvg'

export const curso = {
  slug: 'jornada-faisca-base-3d',
  pasta: 'docs/aulas-interativas/faisca/a-ilha-do-farol',
}

/** Passos de caminhada: de `de` a `ate` (deslocamento em y), com um pequeno quique a cada passo. */
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
    titulo: 'Sua aventura em três dimensões',
    montar() {
      const arte = artesDoProjeto(
        'docs/aulas-interativas/faisca/desafio-primeiro-jogo/projeto-final.szproject.json',
      )
      const c = new Cena({
        chave: 'ilha-do-farol-m1',
        titulo: 'A Ilha do Farol · Sua aventura em três dimensões',
        largura: 500,
        altura: 400,
        topo: 70,
        quadros: 150,
      })
      // O mar e a ilha com espessura, nas cores do cenário praia tropical.
      c.forma(
        'Mar fundo',
        'ellipse',
        { cx: 250, cy: 372, rx: 244, ry: 94, fill: '#6e9bff' },
        [250, 372],
      )
      c.forma('Mar', 'ellipse', { cx: 250, cy: 366, rx: 228, ry: 86, fill: '#94d5f5' }, [250, 366])
      c.forma(
        'Espuma',
        'ellipse',
        { cx: 250, cy: 358, rx: 198, ry: 72, fill: '#ffffff' },
        [250, 358],
      )
      c.forma(
        'Lateral da ilha',
        'path',
        { d: 'M65 340A185 64 0 0 0 435 340L435 364A185 64 0 0 1 65 364Z', fill: '#dfc283' },
        [250, 352],
      )
      c.forma(
        'Areia',
        'ellipse',
        { cx: 250, cy: 340, rx: 185, ry: 64, fill: '#fae1ab' },
        [250, 340],
      )
      c.forma(
        'Borda da grama',
        'ellipse',
        { cx: 182, cy: 322, rx: 104, ry: 34, fill: '#0b7a54' },
        [182, 322],
      )
      c.forma(
        'Grama',
        'ellipse',
        { cx: 180, cy: 318, rx: 100, ry: 31, fill: '#29905a' },
        [180, 318],
      )
      const pedra = 'M-16 6L-12-6-3-11 9-9 16-1 13 7Z'
      for (const [i, [x, y, s]] of [
        [404, 352, 1.2],
        [96, 352, 0.9],
      ].entries()) {
        c.forma(
          `Pedra ${i + 1}`,
          'path',
          { d: pedra, fill: '#8f9fb5', transform: `matrix(${s} 0 0 ${s} ${x} ${y})` },
          [x!, y!],
        )
        c.forma(
          `Luz da pedra ${i + 1}`,
          'path',
          {
            d: 'M-12-6-3-11 9-9 2-3Z',
            fill: '#b8c4d6',
            transform: `matrix(${s} 0 0 ${s} ${x} ${y})`,
          },
          [x!, y!],
        )
      }

      const apagado = c.svg('Farol apagado', arte['farol-listrado-apagado']!, {
        x: 322,
        y: 318,
        escala: 1.45,
        ancora: [75.5, 150],
      })
      const aceso = c.svg('Farol aceso', arte['farol-listrado-aceso']!, {
        x: 322,
        y: 318,
        escala: 1.45,
        ancora: [75.5, 150],
        opacidade: 0,
      })
      const brilhoDaLuz = c.forma(
        'Brilho da luz',
        'circle',
        { cx: 321, cy: 169, r: 26, fill: '#ffe08a' },
        [321, 169],
        0,
      )
      const sombraDaChave = c.forma(
        'Sombra da chave',
        'ellipse',
        { cx: 232, cy: 341, rx: 16, ry: 4, fill: '#0f1a33', opacity: 0.18 },
        [232, 341],
      )
      const chave = c.svg('Chave dourada', arte['chave-dourada']!, {
        x: 232,
        y: 314,
        escala: 2.2,
        ancora: [16, 16],
      })
      const estrela = 'M0-10L2.5-2.5 10 0 2.5 2.5 0 10-2.5 2.5-10 0-2.5-2.5Z'
      const faiscas = [
        [211, 290],
        [255, 286],
        [233, 266],
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
        x: 130,
        y: 396,
        escala: 2.1,
        ancora: [32, 62],
      })
      const barco = c.svg('Veleiro', arte.veleiro!, {
        x: 440,
        y: 428,
        escala: 1.15,
        ancora: [44, 80],
      })

      // A chave gira (a largura vai de 1 a -1, como num giro em 3D), flutua e é recolhida.
      c.trilha(chave, 'sx', [
        [0, 1],
        [15, -1],
        [30, 1],
        [45, -1],
        [60, 1],
        [75, -1],
        [90, 1],
        [105, -1],
        [120, 1],
        [135, -1],
        [150, 1],
      ])
      c.trilha(chave, 'y', [
        [0, 0],
        [20, -6],
        [40, 0],
        [54, -3, 'entra'],
        [66, -42],
        [67, 0, 'segura'],
        [124, 0],
        [137, -6],
        [150, 0],
      ])
      c.trilha(chave, 'sy', [
        [0, 1],
        [54, 1],
        [62, 1.3],
        [66, 0.6],
        [124, 0.4],
        [136, 1],
        [150, 1],
      ])
      c.trilha(chave, 'opacity', [
        [0, 100],
        [56, 100],
        [66, 0],
        [124, 0],
        [134, 100],
        [150, 100],
      ])
      c.trilha(sombraDaChave, 'opacity', [
        [0, 100],
        [56, 100],
        [64, 0],
        [124, 0],
        [134, 100],
        [150, 100],
      ])
      c.trilha(sombraDaChave, 'sx', [
        [0, 1],
        [20, 0.8],
        [40, 1],
        [124, 1],
        [137, 0.8],
        [150, 1],
      ])
      for (const [i, f] of faiscas.entries()) {
        const ini = 56 + i * 4
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
      // O personagem anda para o fundo (sobe na tela e diminui), pula quando o farol acende e
      // volta para a frente virado para o outro lado.
      c.trilha(pessoa, 'x', [
        [0, 0],
        [10, 0],
        [52, 70],
        [118, 70],
        [146, 0],
        [150, 0],
      ])
      c.trilha(pessoa, 'y', [
        [0, 0],
        ...passos(10, 52, 0, -51),
        [76, -51, 'sai'],
        [82, -66, 'entra'],
        [88, -51],
        ...passos(118, 145, -51, 0),
        [150, 0],
      ])
      c.trilha(pessoa, 'sy', [
        [0, 1],
        [10, 1],
        [52, 0.82],
        [118, 0.82],
        [146, 1],
        [150, 1],
      ])
      c.trilha(pessoa, 'sx', [
        [0, 1],
        [10, 1],
        [52, 0.82],
        [118, 0.82, 'segura'],
        [119, -0.82],
        [146, -1, 'segura'],
        [147, 1],
        [150, 1],
      ])
      // O farol acende quando a chave é recolhida, com a luz pulsando, e apaga no fim.
      c.trilha(apagado, 'opacity', [
        [0, 100],
        [66, 100],
        [72, 0],
        [120, 0],
        [128, 100],
        [150, 100],
      ])
      c.trilha(aceso, 'opacity', [
        [0, 0],
        [66, 0],
        [72, 100],
        [120, 100],
        [128, 0],
        [150, 0],
      ])
      c.trilha(brilhoDaLuz, 'opacity', [
        [0, 0],
        [68, 0],
        [74, 70],
        [84, 25],
        [94, 70],
        [104, 25],
        [114, 70],
        [122, 0],
        [150, 0],
      ])
      for (const eixo of ['sx', 'sy'] as const)
        c.trilha(brilhoDaLuz, eixo, [
          [0, 0.6],
          [68, 0.6],
          [74, 1.15],
          [84, 0.85],
          [94, 1.15],
          [104, 0.85],
          [114, 1.15],
          [122, 0.6],
          [150, 0.6],
        ])
      // O veleiro balança na água o tempo todo.
      c.trilha(barco, 'rotation', [
        [0, -3],
        [38, 3],
        [75, -3],
        [113, 3],
        [150, -3],
      ])
      c.trilha(barco, 'y', [
        [0, 0],
        [25, -3],
        [50, 0],
        [75, -3],
        [100, 0],
        [125, -3],
        [150, 0],
      ])
      return c
    },
  },
]
