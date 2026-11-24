/**
 * Animação do módulo de O Jardim Secreto (página do curso no Kids), com as artes do projeto do
 * curso (jardim-2d.szproject.json): o personagem, o regador azul e a flor fechada e aberta.
 * O regador sobe, rega, a flor abre com brilhos e o personagem pula de alegria; depois tudo volta
 * ao começo, em loop de 5 s. Monta, exporta e cadastra: scripts/cursos/animacao-do-modulo.ts.
 */
import { artesDoProjeto, Cena } from '../../../../scripts/cursos/lib/edisvg'

export const curso = {
  slug: 'jornada-faisca-missao',
  pasta: 'docs/aulas-interativas/faisca/o-jardim-secreto',
}

export const animacoes = [
  {
    modulo: 1,
    titulo: 'Faça o jardim florescer',
    montar() {
      const arte = artesDoProjeto(`${curso.pasta}/jardim-2d.szproject.json`)
      const c = new Cena({
        chave: 'jardim-secreto-m1',
        titulo: 'O Jardim Secreto · Faça o jardim florescer',
        largura: 500,
        altura: 410,
        topo: 80,
        quadros: 150,
      })
      // Chão do jardim, nas cores do cenário do curso.
      c.forma(
        'Sombra do chão',
        'ellipse',
        { cx: 250, cy: 404, rx: 222, ry: 74, fill: '#8dbb72' },
        [250, 404],
      )
      c.forma(
        'Grama',
        'ellipse',
        { cx: 250, cy: 392, rx: 222, ry: 74, fill: '#b8d99a' },
        [250, 392],
      )
      c.forma(
        'Luz na grama',
        'ellipse',
        { cx: 236, cy: 380, rx: 168, ry: 46, fill: '#c8e3ad' },
        [236, 380],
      )
      c.forma(
        'Caminho',
        'ellipse',
        { cx: 300, cy: 408, rx: 104, ry: 28, fill: '#f2e4bf' },
        [300, 408],
      )
      const tufo = 'M-9 0Q-8-12-3-15Q-4-6 0-2Q1-14 5-17Q5-6 3 0Q8-9 12-10Q9-4 8 0Z'
      for (const [i, [x, y]] of [
        [112, 428],
        [196, 346],
        [418, 362],
        [404, 432],
      ].entries())
        c.forma(
          `Tufo ${i + 1}`,
          'path',
          { d: tufo, fill: '#7fb069', transform: `translate(${x} ${y})` },
          [x, y],
        )

      const pessoa = c.svg('Personagem', arte.aventureiro!, {
        x: 128,
        y: 405,
        escala: 2.6,
        ancora: [32, 62],
      })
      // A sombra do regador fica no chão (sai da arte e vira uma camada própria, que encolhe
      // quando ele sobe).
      const semSombra = arte['regador-azul']!.replace(/<ellipse cx="47" cy="77"[^>]*\/>/, '')
      if (semSombra === arte['regador-azul']) throw new Error('A sombra do regador mudou na arte')
      const sombra = c.forma(
        'Sombra do regador',
        'ellipse',
        { cx: 257, cy: 442, rx: 47, ry: 9, fill: '#244d50', opacity: 0.15 },
        [257, 442],
      )
      const regador = c.svg('Regador', semSombra, { x: 255, y: 400, escala: 1.3, ancora: [45, 45] })
      const fechada = c.svg('Flor fechada', arte['flor-fechada']!, {
        x: 345,
        y: 400,
        escala: 1.3,
        ancora: [60, 137],
      })
      const aberta = c.svg('Flor aberta', arte['flor-aberta']!, {
        x: 345,
        y: 400,
        escala: 1.3,
        ancora: [60, 137],
        opacidade: 0,
      })
      const gota = 'M0-7C4-1 5 3 0 6C-5 3-4-1 0-7Z'
      const gotas = [
        [318, 206],
        [312, 212],
        [322, 214],
      ].map(([x, y], i) =>
        c.forma(
          `Gota ${i + 1}`,
          'path',
          { d: gota, fill: '#74c7d9', transform: `translate(${x} ${y})` },
          [x!, y!],
          0,
        ),
      )
      const estrela = 'M0-10L2.5-2.5 10 0 2.5 2.5 0 10-2.5 2.5-10 0-2.5-2.5Z'
      const brilhos = [
        [292, 246],
        [400, 262],
        [372, 212],
        [316, 304],
      ].map(([x, y], i) =>
        c.forma(
          `Brilho ${i + 1}`,
          'path',
          { d: estrela, fill: '#ffd75e', transform: `translate(${x} ${y})` },
          [x!, y!],
          0,
        ),
      )

      // O personagem respira o tempo todo e pula quando a flor abre.
      c.trilha(pessoa, 'sy', [
        [0, 1],
        [20, 1.025],
        [40, 1],
        [60, 1.025],
        [80, 1],
        [110, 1.025],
        [130, 1],
        [150, 1],
      ])
      c.trilha(pessoa, 'y', [
        [0, 0],
        [86, 0, 'sai'],
        [93, -18, 'entra'],
        [100, 0],
        [150, 0],
      ])
      // O regador sobe, inclina, rega, volta a ficar em pé e desce.
      c.trilha(regador, 'y', [
        [0, 0],
        [12, 0],
        [36, -215],
        [100, -215],
        [124, 0],
        [150, 0],
      ])
      for (const eixo of ['sx', 'sy'] as const)
        c.trilha(sombra, eixo, [
          [0, 1],
          [12, 1],
          [36, 0.45],
          [100, 0.45],
          [124, 1],
          [150, 1],
        ])
      c.trilha(regador, 'rotation', [
        [0, 0],
        [36, 0],
        [48, 35],
        [88, 35],
        [100, 0],
        [150, 0],
      ])
      for (const [i, g] of gotas.entries()) {
        const ini = 44 + i * 8
        c.trilha(g, 'opacity', [
          [0, 0],
          [ini, 0, 'segura'],
          [ini + 2, 100],
          [ini + 16, 100],
          [ini + 20, 0],
          [150, 0],
        ])
        c.trilha(g, 'y', [
          [0, 0],
          [ini, 0, 'entra'],
          [ini + 20, 54],
          [ini + 21, 0, 'segura'],
          [150, 0],
        ])
        c.trilha(g, 'x', [
          [0, 0],
          [ini, 0],
          [ini + 20, 14 + i * 4],
          [ini + 21, 0, 'segura'],
          [150, 0],
        ])
      }
      // A flor abre (troca de imagem com um pulo de crescimento) e, no fim, volta a fechar.
      c.trilha(fechada, 'opacity', [
        [0, 100],
        [76, 100],
        [82, 0],
        [128, 0],
        [140, 100],
        [150, 100],
      ])
      c.trilha(aberta, 'opacity', [
        [0, 0],
        [76, 0],
        [82, 100],
        [128, 100],
        [140, 0],
        [150, 0],
      ])
      for (const eixo of ['sx', 'sy'] as const)
        c.trilha(aberta, eixo, [
          [0, 1],
          [76, 0.7],
          [86, 1.08],
          [94, 1],
          [150, 1],
        ])
      for (const [i, b] of brilhos.entries()) {
        const ini = 84 + i * 6
        c.trilha(b, 'opacity', [
          [0, 0],
          [ini, 0],
          [ini + 8, 100],
          [ini + 22, 100],
          [ini + 30, 0],
          [150, 0],
        ])
        for (const eixo of ['sx', 'sy'] as const)
          c.trilha(b, eixo, [
            [0, 0.2],
            [ini, 0.2],
            [ini + 10, 1.1],
            [ini + 20, 0.8],
            [ini + 30, 0.2],
            [150, 0.2],
          ])
        c.trilha(b, 'rotation', [
          [0, 0],
          [ini, 0, 'linear'],
          [ini + 30, i % 2 ? -90 : 90],
          [ini + 31, 0, 'segura'],
          [150, 0],
        ])
      }
      return c
    },
  },
]
