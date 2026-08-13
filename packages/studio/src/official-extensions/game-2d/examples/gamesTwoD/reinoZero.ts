import type { ExtensionExample } from '#extensions'
import type { JSExpr, JSStatement } from '#ir'
import { beginnerGameExample } from '../shared'
import {
  REINO_ZERO_LEVEL_WIDTHS as LEVEL_WIDTHS,
  type ReinoZeroLevelKind as LevelKind,
  reinoZeroLevelKind as levelKind,
} from './reinoZeroLevelModel'
import {
  reinoZeroCollectCoin as collectCoin,
  reinoZeroMovePowerup as movePowerup,
} from './reinoZeroMechanics'

const TILE = 16
const DEFAULT_COLS = 72
const ROWS = 15
const LAST_LEVEL = 32

/**
 * ⭐ O tema é do TIPO da fase, não do mundo.
 *
 * Antes havia um tema por MUNDO, então 1-1, 1-2, 1-3 e 1-4 dividiam o mesmo céu azul
 * — e o jogo inteiro parecia a mesma fase trinta e duas vezes. No jogo de referência
 * quem manda na paleta é o tipo: superfície, subterrâneo, água e castelo. São 8
 * temas (4 tipos × primeira/segunda metade da campanha), o MESMO número de antes,
 * então nem o tamanho da IR nem a contagem de figuras mudam.
 */
const LEVEL_KINDS: readonly LevelKind[] = ['superficie', 'subterraneo', 'agua', 'castelo']

/**
 * O mapa de tipos do jogo de referência: a 1 é a superfície, a 2 é subterrânea
 * (menos nos mundos 2 e 7, que são de água), a 3 volta para fora com plataformas
 * altas e a 4 é sempre o castelo.
 */
/** Índice do tema: tipo × metade da campanha. */
function themeIndex(world: number, stage: number): number {
  return LEVEL_KINDS.indexOf(levelKind(world, stage)) * 2 + (world >= 5 ? 1 : 0)
}

interface Theme {
  sky: string
  ground: string
  edge: string
  brick: string
  question: string
  pipe: string
  platform: string
  hazard: string
  coin: string
}

/** Na ordem de `themeIndex`: superfície, subterrâneo, água e castelo, em duas metades. */
const THEMES: readonly Theme[] = [
  // Superfície — a cara do jogo: céu aberto, chão de terra, cano verde.
  {
    sky: '#5c94fc',
    ground: '#c87932',
    edge: '#f8d878',
    brick: '#a84b26',
    question: '#f8b800',
    pipe: '#2fb34a',
    platform: '#f5df9b',
    hazard: '#1d67c1',
    coin: '#fbd000',
  },
  // Superfície, segunda metade: o mesmo lugar no fim da tarde.
  {
    sky: '#ffb35c',
    ground: '#9c4935',
    edge: '#ffd98a',
    brick: '#7b2f2f',
    question: '#ffcf33',
    pipe: '#477c3a',
    platform: '#eabf7b',
    hazard: '#dd382f',
    coin: '#ffe066',
  },
  // Subterrâneo — fundo PRETO e teto fechado, que é o que faz a caverna se ler.
  {
    sky: '#000000',
    ground: '#3f7cd8',
    edge: '#9ad1ff',
    brick: '#2a5aa8',
    question: '#f8b800',
    pipe: '#2fb34a',
    platform: '#6f9fe0',
    hazard: '#123064',
    coin: '#fbd000',
  },
  {
    sky: '#080510',
    ground: '#6b4bb0',
    edge: '#c0a3ef',
    brick: '#4a3080',
    question: '#e2a92c',
    pipe: '#316c51',
    platform: '#9c85cf',
    hazard: '#2a1552',
    coin: '#ffe066',
  },
  // Água — tudo azul, e o "perigo" aqui é a superfície funda.
  {
    sky: '#3f7cd8',
    ground: '#2a8a6d',
    edge: '#7fe3c4',
    brick: '#1f6f7a',
    question: '#f8d038',
    pipe: '#1f8f5a',
    platform: '#8fd8e8',
    hazard: '#0b3e78',
    coin: '#fdf0a0',
  },
  {
    sky: '#1b4f9c',
    ground: '#1e6b58',
    edge: '#5ec2a6',
    brick: '#155863',
    question: '#e8c02c',
    pipe: '#177a4c',
    platform: '#6ab8cc',
    hazard: '#06265a',
    coin: '#f7e28c',
  },
  // Castelo — pedra escura e LAVA. O chão de perigo é o que define a fase.
  {
    sky: '#0b0710',
    ground: '#7a5a52',
    edge: '#c9a898',
    brick: '#5e3d38',
    question: '#e8ad25',
    pipe: '#3b7650',
    platform: '#a08878',
    hazard: '#f04b3e',
    coin: '#ffcf5c',
  },
  {
    sky: '#050308',
    ground: '#4d3f4a',
    edge: '#9b8496',
    brick: '#3d2b38',
    question: '#d49b22',
    pipe: '#285445',
    platform: '#7c6a78',
    hazard: '#ff6a2a',
    coin: '#ffdf8a',
  },
] as const

const n = (value: number): JSExpr => ({ type: 'num', value })
const variable = (name: string): JSExpr => ({ type: 'var', name })
const binary = (
  op: Extract<JSExpr, { type: 'binop' }>['op'],
  left: JSExpr,
  right: JSExpr,
): JSExpr => ({
  type: 'binop',
  op,
  left,
  right,
})
const equals = (left: JSExpr, right: number): JSExpr => binary('==', left, n(right))
const and = (left: JSExpr, right: JSExpr): JSExpr => ({ type: 'logical', op: '&&', left, right })
const or = (left: JSExpr, right: JSExpr): JSExpr => ({ type: 'logical', op: '||', left, right })

function paintRect(x: number, y: number, w: number, h: number, color: string): JSStatement {
  return { type: 'g2d:paintRect', ctxVar: 'ctx', x: n(x), y: n(y), w: n(w), h: n(h), color }
}

function paintCircle(x: number, y: number, r: number, color: string): JSStatement {
  return { type: 'g2d:paintCircle', ctxVar: 'ctx', x: n(x), y: n(y), r: n(r), color }
}

function shape(shapeName: string, body: JSStatement[]): JSStatement {
  const fixedNumber = (value: number | JSExpr): number | undefined => {
    if (typeof value === 'number') return value
    return value.type === 'num' ? value.value : undefined
  }
  const recipe = body.map((statement) => {
    if (statement.type === 'g2d:paintRect') {
      const values = [statement.x, statement.y, statement.w, statement.h].map(fixedNumber)
      if (!values.includes(undefined)) {
        return ['r', ...(values as number[]), statement.color]
      }
    }
    if (statement.type === 'g2d:paintCircle') {
      const values = [statement.x, statement.y, statement.r].map(fixedNumber)
      if (!values.includes(undefined)) {
        return ['c', ...(values as number[]), statement.color]
      }
    }
    throw new Error(`A figura ${shapeName} tem um traço que não cabe na receita vetorial`)
  })
  return {
    type: 'g2d:defineShape',
    shapeName,
    body: [{ type: 'g2d:paintShapeRecipe', ctxVar: 'ctx', recipe: JSON.stringify(recipe) }],
  }
}

function tileShape(name: string, fill: string, edge: string, detail = fill): JSStatement {
  return shape(name, [
    paintRect(0, 0, 16, 16, fill),
    paintRect(0, 0, 16, 2, edge),
    paintRect(0, 14, 16, 2, detail),
    paintRect(0, 0, 2, 16, edge),
  ])
}

function themeShapes(index: number, theme: Theme): JSStatement[] {
  const prefix = `r${index + 1}`
  return [
    shape(`${prefix}Ceu`, [paintRect(0, 0, 16, 16, theme.sky)]),
    tileShape(`${prefix}Chao`, theme.ground, theme.edge, theme.edge),
    shape(`${prefix}Tijolo`, [
      paintRect(0, 0, 16, 16, theme.brick),
      paintRect(0, 0, 16, 2, theme.edge),
      paintRect(0, 7, 16, 2, '#402018'),
      paintRect(7, 0, 2, 8, '#402018'),
      paintRect(3, 8, 2, 8, '#402018'),
    ]),
    shape(`${prefix}Premio`, [
      paintRect(0, 0, 16, 16, theme.question),
      paintRect(0, 0, 16, 2, '#fff1a8'),
      paintRect(0, 14, 16, 2, '#8e4f13'),
      paintRect(6, 4, 5, 2, '#fff4ba'),
      paintRect(9, 6, 2, 4, '#fff4ba'),
      paintRect(7, 11, 2, 2, '#fff4ba'),
    ]),
    // A boca do cano mora SÓ nesta peça. Quando ela era o cano inteiro, um cano de
    // dois tiles ganhava duas bocas — a de baixo caindo bem na linha do chão, que é
    // o que dava a leitura de "cano enterrado".
    shape(`${prefix}Cano`, [
      paintRect(2, 0, 12, 16, theme.pipe),
      paintRect(0, 0, 16, 5, theme.edge),
      paintRect(4, 1, 3, 15, '#8fe06d'),
      paintRect(12, 1, 2, 15, '#174a2c'),
    ]),
    // Corpo: sem boca, e os brilhos vão de ponta a ponta para emendar entre tiles.
    shape(`${prefix}CanoCorpo`, [
      paintRect(2, 0, 12, 16, theme.pipe),
      paintRect(4, 0, 3, 16, '#8fe06d'),
      paintRect(12, 0, 2, 16, '#174a2c'),
    ]),
    tileShape(`${prefix}Plataforma`, theme.platform, '#fff5cf', theme.ground),
    // Perigo é o BLOCO inteiro (lava do castelo, fundo de poço, água funda), com a
    // crista mais clara em cima. Antes ele desenhava céu com uma faixinha no pé, o
    // que só servia para o fundo do buraco — e ele nem gerava contato, porque era
    // decoração. Agora é uma peça "atravessa e avisa" de verdade.
    shape(`${prefix}Perigo`, [
      paintRect(0, 0, 16, 16, theme.hazard),
      paintRect(0, 0, 16, 3, theme.edge),
      paintRect(3, 3, 3, 3, theme.edge),
      paintRect(10, 3, 4, 2, theme.edge),
    ]),
    // Moeda: a peça do cenário que se ATRAVESSA e vale ponto.
    shape(`${prefix}Moeda`, [
      paintCircle(8, 8, 5, theme.coin),
      paintRect(7, 4, 2, 8, '#ffffff'),
      paintCircle(8, 8, 2, theme.coin),
    ]),
  ]
}

function campaignShapes(): JSStatement[] {
  return [
    shape('lumi', [
      paintRect(3, 1, 8, 4, '#f4c542'),
      paintRect(1, 5, 13, 4, '#f4c542'),
      paintRect(4, 9, 8, 8, '#e84a3c'),
      paintRect(2, 17, 12, 5, '#2e55a3'),
      paintRect(2, 22, 5, 2, '#63341f'),
      paintRect(10, 22, 5, 2, '#63341f'),
      paintRect(10, 6, 2, 2, '#17223b'),
    ]),
    shape('lumiPasso', [
      paintRect(3, 1, 8, 4, '#f4c542'),
      paintRect(1, 5, 13, 4, '#f4c542'),
      paintRect(4, 9, 8, 8, '#e84a3c'),
      paintRect(2, 17, 12, 5, '#2e55a3'),
      paintRect(0, 21, 7, 3, '#63341f'),
      paintRect(10, 19, 6, 3, '#63341f'),
      paintRect(10, 6, 2, 2, '#17223b'),
    ]),
    // O herói GRANDE: oito pixels mais alto, mas com os pés na mesma referência.
    shape('lumiForte', [
      paintRect(3, 0, 8, 2, '#fff3b0'),
      paintRect(3, 1, 8, 4, '#f4c542'),
      paintRect(1, 5, 13, 4, '#f4c542'),
      paintRect(3, 9, 10, 12, '#31a24c'),
      paintRect(5, 12, 6, 4, '#eaf7d0'),
      paintRect(2, 21, 12, 7, '#2e55a3'),
      paintRect(1, 28, 6, 4, '#63341f'),
      paintRect(10, 28, 6, 4, '#63341f'),
      paintRect(10, 6, 2, 2, '#17223b'),
    ]),
    shape('lumiFortePasso', [
      paintRect(3, 0, 8, 2, '#fff3b0'),
      paintRect(3, 1, 8, 4, '#f4c542'),
      paintRect(1, 5, 13, 4, '#f4c542'),
      paintRect(3, 9, 10, 12, '#31a24c'),
      paintRect(5, 12, 6, 4, '#eaf7d0'),
      paintRect(2, 21, 12, 7, '#2e55a3'),
      paintRect(0, 28, 7, 4, '#63341f'),
      paintRect(10, 25, 6, 4, '#63341f'),
      paintRect(10, 6, 2, 2, '#17223b'),
    ]),
    // A flor acrescenta o terceiro estado, visível pela roupa clara e capaz de atirar.
    shape('lumiFogo', [
      paintRect(3, 0, 8, 2, '#fff7de'),
      paintRect(3, 1, 8, 4, '#f4c542'),
      paintRect(1, 5, 13, 4, '#f4c542'),
      paintRect(3, 9, 10, 12, '#fff7de'),
      paintRect(5, 12, 6, 4, '#e84a3c'),
      paintRect(2, 21, 12, 7, '#e84a3c'),
      paintRect(1, 28, 6, 4, '#63341f'),
      paintRect(10, 28, 6, 4, '#63341f'),
      paintRect(10, 6, 2, 2, '#17223b'),
    ]),
    shape('lumiFogoPasso', [
      paintRect(3, 0, 8, 2, '#fff7de'),
      paintRect(3, 1, 8, 4, '#f4c542'),
      paintRect(1, 5, 13, 4, '#f4c542'),
      paintRect(3, 9, 10, 12, '#fff7de'),
      paintRect(5, 12, 6, 4, '#e84a3c'),
      paintRect(2, 21, 12, 7, '#e84a3c'),
      paintRect(0, 28, 7, 4, '#63341f'),
      paintRect(10, 25, 6, 4, '#63341f'),
      paintRect(10, 6, 2, 2, '#17223b'),
    ]),
    shape('brasa', [
      paintRect(1, 6, 14, 9, '#8f5236'),
      paintRect(3, 3, 10, 4, '#b96b3f'),
      paintRect(2, 14, 5, 2, '#35241f'),
      paintRect(10, 14, 5, 2, '#35241f'),
      paintRect(4, 8, 2, 2, '#fff2bf'),
      paintRect(10, 8, 2, 2, '#fff2bf'),
    ]),
    shape('casco', [
      paintCircle(8, 8, 7, '#3bad51'),
      paintRect(2, 8, 12, 7, '#f2d781'),
      paintRect(5, 2, 6, 9, '#64d25f'),
      paintRect(10, 4, 2, 2, '#142d24'),
    ]),
    shape('espinho', [
      paintRect(2, 6, 12, 9, '#7f5ba7'),
      paintRect(3, 2, 3, 6, '#e6d6ff'),
      paintRect(7, 1, 3, 7, '#e6d6ff'),
      paintRect(11, 2, 3, 6, '#e6d6ff'),
      paintRect(4, 9, 2, 2, '#ffffff'),
      paintRect(10, 9, 2, 2, '#ffffff'),
    ]),
    shape('asa', [
      paintRect(4, 5, 8, 8, '#ed6b54'),
      paintRect(0, 2, 5, 7, '#f8f2df'),
      paintRect(11, 2, 5, 7, '#f8f2df'),
      paintRect(9, 7, 2, 2, '#1d2742'),
    ]),
    shape('saltador', [
      paintRect(2, 5, 12, 9, '#e9a23b'),
      paintRect(4, 1, 8, 5, '#ffe27a'),
      paintRect(3, 14, 4, 2, '#5b3b22'),
      paintRect(10, 14, 4, 2, '#5b3b22'),
      paintRect(5, 7, 2, 2, '#17223b'),
      paintRect(10, 7, 2, 2, '#17223b'),
    ]),
    shape('investida', [
      paintRect(1, 6, 14, 9, '#298f8c'),
      paintRect(3, 2, 10, 5, '#62d6bf'),
      paintRect(0, 12, 5, 4, '#1f5d64'),
      paintRect(11, 12, 5, 4, '#1f5d64'),
      paintRect(9, 7, 3, 2, '#fff2bf'),
    ]),
    shape('guardiao', [
      paintRect(1, 5, 22, 17, '#56316f'),
      paintRect(3, 1, 18, 7, '#d8493f'),
      paintRect(2, 0, 4, 6, '#f1d36b'),
      paintRect(18, 0, 4, 6, '#f1d36b'),
      paintRect(6, 10, 3, 3, '#fff2b8'),
      paintRect(15, 10, 3, 3, '#fff2b8'),
    ]),
    shape('gema', [
      paintRect(5, 1, 6, 2, '#fff7a6'),
      paintRect(3, 3, 10, 9, '#f4ca32'),
      paintRect(5, 12, 6, 3, '#d98b1c'),
      paintRect(6, 4, 2, 6, '#fff7a6'),
    ]),
    shape('broto', [
      paintRect(3, 5, 10, 9, '#f2eee0'),
      paintCircle(8, 5, 6, '#e94a42'),
      paintCircle(5, 4, 2, '#fff4d8'),
      paintCircle(11, 6, 2, '#fff4d8'),
      paintRect(5, 10, 2, 2, '#25304a'),
      paintRect(9, 10, 2, 2, '#25304a'),
    ]),
    shape('flor', [
      paintCircle(8, 6, 6, '#fff7de'),
      paintCircle(8, 6, 3, '#e84a3c'),
      paintRect(7, 11, 3, 5, '#31a24c'),
      paintRect(3, 11, 5, 3, '#58bd62'),
      paintRect(9, 12, 5, 3, '#58bd62'),
    ]),
    shape('barraFogo', [
      paintCircle(4, 4, 4, '#fff3b0'),
      paintCircle(16, 4, 4, '#ffb02e'),
      paintCircle(28, 4, 4, '#ff7138'),
      paintCircle(40, 4, 4, '#e83b30'),
      paintCircle(52, 4, 4, '#ff7138'),
      paintCircle(60, 4, 4, '#fff3b0'),
    ]),
    // ⭐ O MASTRO do fim de fase. Era um "portal" de 20x32 encostado no chao: o fim da
    // fase nao se lia, e quanto mais alto voce encosta nao valia nada. Agora e um
    // mastro alto (9 tiles) com a bandeira em cima, e a altura do toque PAGA.
    shape('mastro', [
      paintRect(6, 6, 3, 138, '#dfe7c8'),
      paintCircle(7, 5, 4, '#f0cb3d'),
      paintRect(9, 10, 7, 12, '#31a24c'),
      paintRect(9, 22, 5, 8, '#2b8f43'),
      paintRect(2, 140, 12, 4, '#8e8c6f'),
    ]),
    // A estrela que deixa invencivel por alguns segundos.
    shape('estrela', [
      paintRect(6, 0, 4, 5, '#fff3b0'),
      paintRect(2, 5, 12, 5, '#ffd93d'),
      paintRect(4, 10, 8, 4, '#ffc300'),
      paintRect(3, 13, 3, 3, '#ffd93d'),
      paintRect(10, 13, 3, 3, '#ffd93d'),
      paintRect(6, 6, 2, 2, '#5b3b12'),
      paintRect(9, 6, 2, 2, '#5b3b12'),
    ]),
    // A planta que sai do cano. Nao aceita pisada (o modo espinho cuida disso).
    shape('planta', [
      paintRect(6, 8, 4, 8, '#2f7d3a'),
      paintRect(2, 0, 12, 8, '#e0453b'),
      paintRect(4, 2, 3, 3, '#ffffff'),
      paintRect(9, 2, 3, 3, '#ffffff'),
      paintRect(5, 6, 6, 2, '#7d1f1a'),
    ]),
    shape('invisivel', []),
  ]
}

/** Colunas de entrada e saída que nunca recebem poço. */
const SAFE_MARGIN = 8
/** Primeira linha de chão. A superfície pisável é o topo dela -> y = 208. */
const GROUND_TOP_ROW = 13

const T_CHAO = 0
const T_TIJOLO = 1
const T_PREMIO = 2
const T_CANO_TOPO = 3
const T_PLATAFORMA = 4
const T_CEU = 5
const T_PERIGO = 6
const T_CANO_CORPO = 7
const T_MOEDA = 8

/**
 * ⭐ A PLANTA de cada fase, escrita à mão.
 *
 * ⚠️ Antes as 32 grades saíam de um SORTEIO: os poços vinham de uma função
 * pseudoaleatória e os blocos de colunas fixas deslocadas por resto de divisão. O
 * resultado é o que a dona do produto viu jogando — trinta e duas fases que parecem a
 * mesma, sem nada reconhecível, e sem que ninguém pudesse dizer "aqui é a descida do
 * cano" ou "aqui é a escada do fim".
 *
 * Agora cada fase é DADO: alguém escolheu cada poço, cada cano e cada bloco. O
 * traçado é autoral, mas os MARCOS são os do jogo de referência — a etapa 1 abre com
 * bloco de prêmio e canos, a 2 desce para o subterrâneo (ou mergulha, nos mundos 2 e
 * 7), a 3 sobe para as plataformas altas e a 4 é sempre o castelo sobre a lava.
 */
interface LevelPlan {
  /** [coluna inicial, largura em tiles] de cada vão sem chão. */
  pocos: ReadonlyArray<readonly [number, number]>
  /** [coluna, altura em tiles] de cada cano. O cano sempre ocupa 2 colunas. */
  canos: ReadonlyArray<readonly [number, number]>
  /** [coluna, linha, peça] dos blocos soltos (tijolo ou prêmio). */
  blocos: ReadonlyArray<readonly [number, number, number]>
  /** [coluna, linha, largura] das plataformas suspensas. */
  plataformas: ReadonlyArray<readonly [number, number, number]>
  /** [coluna, linha, quantidade] das fileiras de moeda. */
  moedas: ReadonlyArray<readonly [number, number, number]>
  /** [coluna, altura] das escadas, que sobem para a direita. */
  escadas: ReadonlyArray<readonly [number, number]>
}

interface LevelDescriptor {
  level: number
  world: number
  stage: number
  kind: LevelKind
  cols: number
  plan: LevelPlan
  rows: number[][]
  firstPipe: { x: number; y: number } | null
  shortcut: { x: number; y: number } | null
}

const PLANO_VAZIO: LevelPlan = {
  pocos: [],
  canos: [],
  blocos: [],
  plataformas: [],
  moedas: [],
  escadas: [],
}

function plano(partes: Partial<LevelPlan>): LevelPlan {
  return { ...PLANO_VAZIO, ...partes }
}

/** Um grupo de peças na altura de cabecear, como o do começo do jogo. */
function fileira(
  col: number,
  row: number,
  pecas: readonly number[],
): Array<readonly [number, number, number]> {
  return pecas.map((peca, offset) => [col + offset, row, peca] as const)
}

/**
 * As 32 plantas, na ordem 1-1 … 8-4.
 *
 * A linha 9 é a altura de cabecear com um pulo curto e a 10 é a de cabecear andando;
 * da 4 à 7 é o andar de cima, alcançável só de plataforma em plataforma.
 */
const LEVEL_PLANS: readonly LevelPlan[] = [
  // ---- Mundo 1 ----
  // 1-1: a fase que ensina. Um prêmio solitário, o grupo de quatro, dois canos que
  // crescem e um poço só, com a escada do fim.
  plano({
    pocos: [[38, 2]],
    canos: [
      [22, 2],
      [30, 3],
    ],
    blocos: [[12, 9, T_PREMIO], ...fileira(16, 9, [T_TIJOLO, T_PREMIO, T_TIJOLO, T_PREMIO])],
    moedas: [[24, 6, 4]],
    escadas: [[56, 4]],
  }),
  // 1-2: subterrânea. Teto fechado, fileiras de moeda e o cano de saída no fim.
  plano({
    pocos: [
      [30, 2],
      [46, 2],
    ],
    canos: [[58, 3]],
    blocos: [...fileira(14, 10, [T_TIJOLO, T_TIJOLO, T_PREMIO]), [40, 9, T_PREMIO]],
    moedas: [
      [18, 8, 6],
      [34, 7, 4],
    ],
    plataformas: [[24, 9, 3]],
  }),
  // 1-3: as plataformas altas. Quase não há chão no meio.
  plano({
    pocos: [
      [20, 2],
      [30, 2],
      [42, 2],
      [52, 2],
    ],
    plataformas: [
      [18, 8, 4],
      [28, 7, 3],
      [38, 8, 4],
      [50, 6, 3],
    ],
    blocos: [[34, 5, T_PREMIO]],
    moedas: [
      [19, 6, 3],
      [39, 6, 3],
    ],
    escadas: [[60, 3]],
  }),
  // 1-4: o castelo. Lava no lugar do chão e plataformas por cima dela.
  plano({
    pocos: [
      [18, 3],
      [30, 3],
      [44, 3],
    ],
    plataformas: [
      [17, 10, 5],
      [29, 9, 5],
      [43, 10, 5],
    ],
    blocos: [
      [24, 7, T_TIJOLO],
      [36, 7, T_TIJOLO],
    ],
    moedas: [[25, 6, 3]],
  }),

  // ---- Mundo 2 ----
  plano({
    pocos: [
      [26, 2],
      [44, 2],
    ],
    canos: [
      [16, 2],
      [34, 4],
      [54, 2],
    ],
    blocos: [[12, 9, T_PREMIO], ...fileira(20, 9, [T_TIJOLO, T_PREMIO, T_TIJOLO])],
    moedas: [[36, 6, 5]],
    escadas: [[60, 4]],
  }),
  // 2-2: AQUÁTICA. Sem poço — afundar não é morrer aqui —, tudo em plataforma.
  plano({
    plataformas: [
      [16, 8, 4],
      [28, 6, 4],
      [42, 8, 5],
      [56, 6, 3],
    ],
    blocos: [
      [22, 4, T_PREMIO],
      [48, 4, T_PREMIO],
    ],
    moedas: [
      [18, 5, 4],
      [30, 4, 5],
      [44, 5, 4],
    ],
  }),
  plano({
    pocos: [
      [18, 2],
      [28, 2],
      [38, 3],
      [50, 2],
    ],
    plataformas: [
      [16, 8, 4],
      [26, 7, 3],
      [36, 8, 5],
      [48, 6, 4],
    ],
    blocos: [[32, 5, T_PREMIO]],
    moedas: [
      [27, 5, 3],
      [49, 4, 3],
    ],
    escadas: [[60, 4]],
  }),
  plano({
    pocos: [
      [16, 3],
      [28, 3],
      [40, 3],
      [52, 3],
    ],
    plataformas: [
      [15, 10, 5],
      [27, 9, 5],
      [39, 10, 5],
      [51, 9, 5],
    ],
    blocos: [
      [22, 7, T_TIJOLO],
      [34, 6, T_TIJOLO],
      [46, 7, T_TIJOLO],
    ],
    moedas: [[28, 6, 3]],
  }),

  // ---- Mundo 3 ----
  plano({
    pocos: [
      [24, 2],
      [36, 2],
      [50, 2],
    ],
    canos: [
      [14, 3],
      [42, 2],
    ],
    blocos: [...fileira(18, 9, [T_PREMIO, T_TIJOLO, T_PREMIO]), [30, 10, T_TIJOLO]],
    moedas: [
      [26, 6, 4],
      [52, 6, 3],
    ],
    escadas: [[58, 5]],
  }),
  plano({
    pocos: [
      [22, 2],
      [38, 2],
      [54, 2],
    ],
    canos: [[60, 3]],
    blocos: [...fileira(12, 10, [T_TIJOLO, T_PREMIO]), [44, 9, T_PREMIO]],
    moedas: [
      [16, 8, 6],
      [30, 7, 5],
    ],
    plataformas: [
      [26, 9, 4],
      [46, 8, 3],
    ],
  }),
  plano({
    pocos: [
      [16, 2],
      [26, 2],
      [36, 2],
      [46, 2],
      [56, 2],
    ],
    plataformas: [
      [14, 8, 3],
      [24, 7, 3],
      [34, 8, 3],
      [44, 6, 3],
      [54, 8, 3],
    ],
    blocos: [
      [30, 5, T_PREMIO],
      [50, 5, T_PREMIO],
    ],
    moedas: [
      [25, 5, 3],
      [45, 4, 3],
    ],
  }),
  plano({
    pocos: [
      [16, 3],
      [26, 3],
      [38, 4],
      [50, 3],
    ],
    plataformas: [
      [15, 10, 4],
      [25, 9, 4],
      [37, 10, 6],
      [49, 9, 4],
    ],
    blocos: [
      [21, 7, T_TIJOLO],
      [33, 6, T_TIJOLO],
      [45, 7, T_TIJOLO],
    ],
    moedas: [[39, 6, 4]],
  }),

  // ---- Mundo 4 ----
  plano({
    pocos: [
      [20, 2],
      [32, 3],
      [48, 2],
    ],
    canos: [
      [26, 4],
      [40, 2],
      [56, 3],
    ],
    blocos: [[14, 9, T_PREMIO], ...fileira(36, 9, [T_TIJOLO, T_PREMIO])],
    moedas: [[28, 5, 4]],
    escadas: [[62, 4]],
  }),
  plano({
    pocos: [
      [24, 2],
      [40, 3],
      [56, 2],
    ],
    canos: [[62, 3]],
    blocos: [...fileira(14, 10, [T_PREMIO, T_TIJOLO, T_TIJOLO]), [46, 9, T_PREMIO]],
    moedas: [
      [18, 8, 5],
      [32, 7, 6],
    ],
    plataformas: [
      [28, 9, 4],
      [48, 8, 4],
    ],
  }),
  plano({
    pocos: [
      [18, 2],
      [28, 3],
      [40, 2],
      [52, 3],
    ],
    plataformas: [
      [16, 7, 3],
      [26, 8, 4],
      [38, 6, 3],
      [50, 8, 4],
    ],
    blocos: [[34, 5, T_PREMIO]],
    moedas: [
      [27, 6, 4],
      [51, 6, 3],
    ],
    escadas: [[62, 3]],
  }),
  plano({
    pocos: [
      [14, 4],
      [26, 4],
      [38, 4],
      [50, 4],
    ],
    plataformas: [
      [13, 10, 6],
      [25, 9, 6],
      [37, 10, 6],
      [49, 9, 6],
    ],
    blocos: [
      [20, 7, T_TIJOLO],
      [32, 6, T_TIJOLO],
      [44, 7, T_TIJOLO],
    ],
    moedas: [[26, 6, 4]],
  }),

  // ---- Mundo 5 ----
  plano({
    pocos: [
      [18, 2],
      [30, 3],
      [44, 2],
      [56, 2],
    ],
    canos: [
      [24, 3],
      [38, 4],
    ],
    blocos: [[12, 9, T_PREMIO], ...fileira(48, 9, [T_TIJOLO, T_PREMIO, T_TIJOLO])],
    moedas: [[32, 6, 4]],
    escadas: [[62, 5]],
  }),
  plano({
    pocos: [
      [20, 2],
      [34, 3],
      [50, 2],
    ],
    canos: [[60, 4]],
    blocos: [...fileira(12, 10, [T_TIJOLO, T_PREMIO]), [42, 9, T_PREMIO]],
    moedas: [
      [16, 8, 6],
      [26, 7, 5],
      [44, 6, 4],
    ],
    plataformas: [
      [30, 9, 3],
      [46, 8, 4],
    ],
  }),
  plano({
    pocos: [
      [16, 3],
      [26, 2],
      [36, 3],
      [48, 2],
      [58, 2],
    ],
    plataformas: [
      [14, 8, 3],
      [24, 6, 3],
      [34, 8, 4],
      [46, 6, 3],
      [56, 8, 3],
    ],
    blocos: [
      [30, 5, T_PREMIO],
      [52, 4, T_PREMIO],
    ],
    moedas: [
      [25, 4, 3],
      [47, 4, 3],
    ],
  }),
  plano({
    pocos: [
      [14, 4],
      [26, 5],
      [40, 4],
      [52, 4],
    ],
    plataformas: [
      [13, 10, 6],
      [25, 9, 7],
      [39, 10, 6],
      [51, 9, 6],
    ],
    blocos: [
      [21, 7, T_TIJOLO],
      [34, 6, T_TIJOLO],
      [47, 7, T_TIJOLO],
    ],
    moedas: [[27, 6, 5]],
  }),

  // ---- Mundo 6 ----
  plano({
    pocos: [
      [20, 3],
      [34, 2],
      [46, 3],
      [58, 2],
    ],
    canos: [
      [14, 4],
      [28, 2],
      [40, 3],
    ],
    blocos: [...fileira(16, 9, [T_PREMIO, T_TIJOLO]), [52, 9, T_PREMIO]],
    moedas: [[30, 6, 4]],
    escadas: [[62, 4]],
  }),
  // 6-2: a fase que a simulação reprovou. O bloco de prêmio que ficava FLUTUANDO
  // sobre o poço, bem no arco do pulo, agora está em terra firme.
  plano({
    pocos: [
      [22, 2],
      [36, 2],
      [52, 3],
    ],
    canos: [[62, 4]],
    blocos: [...fileira(12, 10, [T_TIJOLO, T_PREMIO, T_TIJOLO]), [44, 9, T_PREMIO]],
    moedas: [
      [16, 8, 5],
      [28, 7, 6],
      [46, 6, 4],
    ],
    plataformas: [
      [32, 9, 3],
      [48, 8, 3],
    ],
  }),
  plano({
    pocos: [
      [16, 3],
      [28, 3],
      [40, 3],
      [52, 3],
    ],
    plataformas: [
      [14, 7, 3],
      [26, 8, 3],
      [38, 6, 3],
      [50, 8, 3],
    ],
    blocos: [
      [34, 5, T_PREMIO],
      [56, 5, T_PREMIO],
    ],
    moedas: [
      [27, 6, 3],
      [51, 6, 3],
    ],
  }),
  plano({
    pocos: [
      [14, 4],
      [26, 5],
      [40, 5],
      [54, 4],
    ],
    plataformas: [
      [13, 10, 6],
      [25, 9, 7],
      [39, 10, 7],
      [53, 9, 6],
    ],
    blocos: [
      [21, 6, T_TIJOLO],
      [34, 6, T_TIJOLO],
      [48, 6, T_TIJOLO],
    ],
    moedas: [[28, 6, 5]],
  }),

  // ---- Mundo 7 ----
  plano({
    pocos: [
      [18, 3],
      [32, 3],
      [46, 3],
      [58, 2],
    ],
    canos: [
      [24, 4],
      [40, 3],
    ],
    blocos: [[12, 9, T_PREMIO], ...fileira(50, 9, [T_TIJOLO, T_PREMIO])],
    moedas: [[34, 6, 5]],
    escadas: [[62, 5]],
  }),
  // 7-2: a segunda fase AQUÁTICA da campanha.
  plano({
    plataformas: [
      [14, 8, 4],
      [26, 5, 4],
      [38, 8, 5],
      [52, 5, 4],
    ],
    blocos: [
      [20, 4, T_PREMIO],
      [44, 3, T_PREMIO],
    ],
    moedas: [
      [16, 5, 5],
      [28, 3, 5],
      [40, 5, 5],
      [54, 3, 4],
    ],
  }),
  plano({
    pocos: [
      [16, 3],
      [26, 3],
      [36, 3],
      [46, 3],
      [56, 3],
    ],
    plataformas: [
      [14, 8, 3],
      [24, 6, 3],
      [34, 8, 3],
      [44, 6, 3],
      [54, 8, 3],
    ],
    blocos: [
      [30, 4, T_PREMIO],
      [50, 4, T_PREMIO],
    ],
    moedas: [
      [25, 4, 3],
      [45, 4, 3],
    ],
  }),
  plano({
    pocos: [
      [13, 5],
      [25, 5],
      [38, 5],
      [51, 5],
    ],
    plataformas: [
      [12, 10, 7],
      [24, 9, 7],
      [37, 10, 7],
      [50, 9, 7],
    ],
    blocos: [
      [20, 6, T_TIJOLO],
      [33, 6, T_TIJOLO],
      [46, 6, T_TIJOLO],
    ],
    moedas: [[26, 6, 5]],
  }),

  // ---- Mundo 8 ----
  plano({
    pocos: [
      [16, 3],
      [28, 3],
      [40, 3],
      [52, 3],
    ],
    canos: [
      [22, 4],
      [34, 3],
      [46, 4],
    ],
    blocos: [
      [12, 9, T_PREMIO],
      [58, 9, T_PREMIO],
    ],
    moedas: [[36, 6, 4]],
    escadas: [[62, 5]],
  }),
  plano({
    pocos: [
      [20, 3],
      [34, 3],
      [50, 3],
    ],
    canos: [[62, 4]],
    blocos: [...fileira(12, 10, [T_PREMIO, T_TIJOLO]), [44, 9, T_PREMIO]],
    moedas: [
      [16, 8, 6],
      [28, 6, 6],
      [46, 6, 4],
    ],
    plataformas: [
      [30, 9, 3],
      [46, 8, 3],
    ],
  }),
  plano({
    pocos: [
      [15, 3],
      [25, 3],
      [35, 3],
      [45, 3],
      [55, 3],
    ],
    plataformas: [
      [13, 7, 3],
      [23, 5, 3],
      [33, 7, 3],
      [43, 5, 3],
      [53, 7, 3],
    ],
    blocos: [
      [29, 4, T_PREMIO],
      [49, 4, T_PREMIO],
    ],
    moedas: [
      [24, 3, 3],
      [44, 3, 3],
    ],
  }),
  // 8-4: o último castelo. Os vãos mais largos da campanha.
  plano({
    pocos: [
      [13, 5],
      [25, 6],
      [39, 6],
      [53, 5],
    ],
    plataformas: [
      [12, 10, 7],
      [24, 9, 8],
      [38, 10, 8],
      [52, 9, 7],
    ],
    blocos: [
      [20, 6, T_TIJOLO],
      [34, 5, T_TIJOLO],
      [48, 6, T_TIJOLO],
    ],
    moedas: [[26, 6, 6]],
  }),
]

/**
 * Desenha a planta na grade.
 *
 * A ORDEM importa, e é a defesa contra a classe de defeito que a simulação achou: o
 * chão nasce primeiro, e nada que venha depois pode ocupar coluna de poço nem célula
 * já escrita. Era exatamente isso que faltava — a 6-2 tinha um bloco de prêmio
 * FLUTUANDO sobre o vão, no meio do arco do pulo, e a plataforma da etapa 3 apagava
 * prêmios já colocados (medido: 6 dos 9 nas etapas 3 dos mundos 1, 4 e 7 sumiam,
 * deixando UM prêmio na fase inteira).
 */
function buildLevelRows(kind: LevelKind, plan: LevelPlan, cols: number): number[][] {
  const rows = Array.from({ length: ROWS }, () => Array.from({ length: cols }, () => T_CEU))
  const vazias = new Set<number>()
  const ocupadas = new Set<string>()
  const marcar = (col: number, row: number, peca: number): void => {
    if (col < 0 || col >= cols || row < 0 || row >= ROWS) return
    if (ocupadas.has(`${row}:${col}`)) return
    rows[row]![col] = peca
    ocupadas.add(`${row}:${col}`)
  }

  for (const [inicio, largura] of plan.pocos) {
    for (let offset = 0; offset < largura; offset += 1) {
      const col = inicio + offset
      if (col < SAFE_MARGIN || col >= cols - SAFE_MARGIN) continue
      vazias.add(col)
    }
  }

  // Chão, e o que mora no fundo do vão. No castelo o vão é LAVA até a linha de cima;
  // fora dele é o buraco de sempre. Nos dois casos a peça agora AVISA ao encostar,
  // em vez de ser decoração muda.
  for (let col = 0; col < cols; col += 1) {
    if (vazias.has(col)) {
      marcar(col, 14, T_PERIGO)
      if (kind === 'castelo') marcar(col, GROUND_TOP_ROW, T_PERIGO)
      continue
    }
    marcar(col, GROUND_TOP_ROW, T_CHAO)
    marcar(col, 14, T_CHAO)
  }

  // Teto do subterrâneo: é ele que faz a caverna se ler como caverna.
  if (kind === 'subterraneo') {
    for (let col = 0; col < cols; col += 1) {
      marcar(col, 0, T_CHAO)
      marcar(col, 1, T_TIJOLO)
    }
  }

  // Canos: 2 colunas, assentados SOBRE o chão, com a boca só no tile de cima.
  const colunasDeCano = new Set<number>()
  for (const [col, altura] of plan.canos) {
    if (vazias.has(col) || vazias.has(col + 1)) continue
    if (col < 1 || col + 1 >= cols - 1) continue
    for (const canoCol of [col, col + 1]) {
      colunasDeCano.add(canoCol)
      for (let offset = 0; offset < altura; offset += 1) {
        const row = GROUND_TOP_ROW - 1 - offset
        marcar(canoCol, row, offset === altura - 1 ? T_CANO_TOPO : T_CANO_CORPO)
      }
    }
  }

  // Escada do fim: degraus que sobem para a direita.
  for (const [col, altura] of plan.escadas) {
    for (let degrau = 0; degrau < altura; degrau += 1) {
      const coluna = col + degrau
      if (vazias.has(coluna) || colunasDeCano.has(coluna)) continue
      for (let bloco = 0; bloco <= degrau; bloco += 1) {
        marcar(coluna, GROUND_TOP_ROW - 1 - bloco, T_CHAO)
      }
    }
  }

  for (const [col, row, largura] of plan.plataformas) {
    for (let offset = 0; offset < largura; offset += 1) {
      const coluna = col + offset
      if (coluna < 1 || coluna >= cols - 1) continue
      if (row >= GROUND_TOP_ROW || colunasDeCano.has(coluna)) continue
      marcar(coluna, row, T_PLATAFORMA)
    }
  }

  // ⚠️ Bloco NUNCA sobre poço: a 6-2 tinha um prêmio pairando sobre o vão, bem onde o
  // arco do pulo passa, e o herói batia a cabeça nele e caía dentro. Nenhuma auditoria
  // enxergava, porque nenhuma olhava ONDE prêmio e perigo ficam.
  for (const [col, row, peca] of plan.blocos) {
    if (vazias.has(col) || colunasDeCano.has(col)) continue
    if (row >= GROUND_TOP_ROW) continue
    marcar(col, row, peca)
  }

  for (const [col, row, quantidade] of plan.moedas) {
    for (let offset = 0; offset < quantidade; offset += 1) {
      const coluna = col + offset
      if (coluna < 1 || coluna >= cols - 1) continue
      if (vazias.has(coluna) || colunasDeCano.has(coluna)) continue
      if (row >= GROUND_TOP_ROW) continue
      marcar(coluna, row, T_MOEDA)
    }
  }

  return rows
}

function levelRows(world: number, stage: number): number[][] {
  return levelDescriptor(world, stage).rows
}

function levelGrid(world: number, stage: number): string {
  return levelRows(world, stage)
    .map((row) => row.join(' '))
    .join(';')
}

const SOLID_TILES = new Set([T_CHAO, T_TIJOLO, T_PREMIO, T_CANO_TOPO, T_CANO_CORPO])

/** A coluna tem chão firme nas duas linhas de piso? */
function isFirmColumn(rows: number[][], col: number): boolean {
  const cols = rows[0]?.length ?? 0
  if (col < 0 || col >= cols) return false
  return SOLID_TILES.has(rows[GROUND_TOP_ROW]![col]!) && SOLID_TILES.has(rows[14]![col]!)
}

/** O espaço acima do chão está livre para um corpo de `height` px nesta coluna? */
function hasHeadroom(rows: number[][], col: number, height: number): boolean {
  const tiles = Math.ceil(height / TILE)
  for (let offset = 1; offset <= tiles; offset += 1) {
    const row = GROUND_TOP_ROW - offset
    if (row < 0) return false
    if (SOLID_TILES.has(rows[row]![col]!)) return false
  }
  return true
}

/**
 * Devolve o x (em px) da faixa de chão firme mais próxima do lugar pretendido, larga o
 * bastante para o corpo e com pé-direito livre.
 *
 * Antes os inimigos, a gema e o portal nasciam em x fixos que ignoravam a grade — 16 de
 * 164 inimigos terrestres nasciam sobre poço e caíam para fora do mundo, e a gema
 * aparecia dentro de um tijolo em 9 das 32 fases (incluindo a 1-1).
 */
function firmSpotNear(rows: number[][], desiredX: number, width: number, height: number): number {
  const cols = rows[0]?.length ?? 0
  const span = Math.max(1, Math.ceil(width / TILE))
  const desiredCol = Math.round(desiredX / TILE)
  const fits = (start: number): boolean => {
    for (let offset = 0; offset < span; offset += 1) {
      if (!isFirmColumn(rows, start + offset)) return false
      if (!hasHeadroom(rows, start + offset, height)) return false
    }
    return true
  }
  // Se o lugar pretendido já serve, ele fica onde está — alinhar ao tile por hábito
  // moveria quase toda posição de quase toda fase, e cada uma dessas mudanças vira um
  // statement a mais na IR sem melhorar nada no jogo.
  const desiredStart = Math.floor(desiredX / TILE)
  const desiredEnd = Math.floor((desiredX + width - 1) / TILE)
  let firmWhereItIs = true
  for (let col = desiredStart; col <= desiredEnd; col += 1) {
    if (!isFirmColumn(rows, col) || !hasHeadroom(rows, col, height)) firmWhereItIs = false
  }
  if (firmWhereItIs) return desiredX
  for (let delta = 0; delta <= cols; delta += 1) {
    for (const col of delta === 0 ? [desiredCol] : [desiredCol - delta, desiredCol + delta]) {
      if (col < 1 || col + span > cols - 1) continue
      if (fits(col)) return col * TILE
    }
  }
  return desiredX
}

function levelName(level: number): string {
  const world = Math.floor((level - 1) / 4) + 1
  const stage = ((level - 1) % 4) + 1
  return `${world}-${stage}`
}

function mapDeclarations(): JSStatement[] {
  const statements: JSStatement[] = []
  // A ordem É o índice usado por `levelGrid`. 'CanoCorpo' (7) e 'Moeda' (8) entram no
  // FIM para não deslocar os índices que as grades já usam.
  const names = [
    'Chao',
    'Tijolo',
    'Premio',
    'Cano',
    'Plataforma',
    'Ceu',
    'Perigo',
    'CanoCorpo',
    'Moeda',
  ]
  // ⭐ Perigo deixou de ser DECORAÇÃO: agora ele atravessa e AVISA, que é o que
  // permite morrer na lava do castelo e no fundo do poço por contato, em vez de só
  // por "caiu abaixo da linha" — regra que serve ao buraco e não escala para o resto.
  const roles = [
    'solid',
    'solid',
    'solid',
    'solid',
    'platform',
    'decor',
    'contact',
    'solid',
    'contact',
  ] as const

  // Um conjunto de peças por TEMA (tipo da fase × metade da campanha), e não por
  // mundo: são os mesmos 8 de antes, então a IR não cresce.
  for (let tema = 0; tema < THEMES.length; tema += 1) {
    statements.push({ type: 'g2d:createVectorTileset', varName: `pecas${tema + 1}`, size: n(TILE) })
    for (let tile = 0; tile < names.length; tile += 1) {
      statements.push({
        type: 'g2d:defineVectorTile',
        tilesetVar: `pecas${tema + 1}`,
        index: n(tile),
        shape: `r${tema + 1}${names[tile]!}`,
        role: roles[tile]!,
      })
    }
  }

  return statements
}

function clearActiveLevelGroups(): JSStatement[] {
  return [
    { type: 'g2d:clearGroup', groupVar: 'bolasFogo' },
    ...CAMPAIGN_ENEMY_TYPE_VARS.map(
      (groupVar): JSStatement => ({ type: 'g2d:clearGroup', groupVar }),
    ),
  ]
}

function prepareActiveLevel(): JSStatement[] {
  return [
    { type: 'assign', name: 'premioAtivo', value: n(2) },
    // O herói NÃO é reposicionado aqui: quem faz isso é o "Reiniciar a Fase" do
    // `activateLevel`, que além da posição devolve a câmera e os blocos `?`.
    {
      type: 'g2d:setPosition',
      spriteVar: 'gema',
      x: variable('xGema'),
      y: n(GEMA_Y),
    },
    { type: 'g2d:setPosition', spriteVar: 'broto', x: n(-100), y: n(-100) },
    { type: 'g2d:setVelocity', spriteVar: 'broto', vx: n(0), vy: n(0) },
    { type: 'assign', name: 'direcaoBroto', value: n(1) },
    { type: 'g2d:setPosition', spriteVar: 'flor', x: n(-100), y: n(-100) },
    {
      type: 'g2d:setPosition',
      spriteVar: 'barraFogo',
      x: variable('xBarraFogo'),
      y: variable('yBarraFogo'),
    },
    {
      type: 'g2d:setPosition',
      spriteVar: 'portal',
      x: variable('xPortal'),
      y: n(standingY(MASTRO_H)),
    },
    // A estrela dorme fora da tela até um bloco de prêmio soltá-la.
    { type: 'g2d:setPosition', spriteVar: 'estrela', x: n(-100), y: n(-100) },
    { type: 'g2d:setVelocity', spriteVar: 'estrela', vx: n(0), vy: n(0) },
    { type: 'assign', name: 'direcaoEstrela', value: n(1) },
    { type: 'assign', name: 'estrelaAte', value: n(0) },
    { type: 'assign', name: 'mastroAte', value: n(0) },
    {
      type: 'g2d:setPosition',
      spriteVar: 'atalho',
      x: variable('xAtalho'),
      y: variable('yAtalho'),
    },
  ]
}

/** Altura da superfície pisável: topo da primeira linha de chão. */
const SURFACE_Y = GROUND_TOP_ROW * TILE

/** Onde a base de um corpo de altura `h` encosta no chão. */
const standingY = (height: number): number => SURFACE_Y - height

/**
 * Acha o atalho do cano: a peça de topo do cano do meio, com a caixa logo ACIMA dela.
 *
 * A caixa antiga ficava em y 192-224 e o cano tinha 1 tile: quem estava EM CIMA do cano
 * (pés em 192) não sobrepunha nada, e quem estava em pé no chão (corpo 184-208)
 * sobrepunha. O gatilho estava invertido — agachar no chão liso teleportava 4 fases e
 * agachar no cano não fazia nada.
 */
/**
 * A boca do PRIMEIRO cano da fase. A planta nasce ali.
 *
 * ⚠️ De propósito NÃO é o cano do meio: aquele é o do atalho, e uma planta em cima
 * dele transformaria a passagem secreta numa armadilha.
 */
function firstPipeMouth(rows: number[][]): { x: number; y: number } | null {
  const cols = rows[0]?.length ?? 0
  for (let col = 0; col < cols; col += 1) {
    for (let row = 0; row < ROWS; row += 1) {
      if (rows[row]![col] === T_CANO_TOPO) return { x: col * TILE, y: row * TILE - 16 }
    }
  }
  return null
}

function pipeShortcut(rows: number[][]): { x: number; y: number } | null {
  const tops: number[] = []
  const cols = rows[0]?.length ?? 0
  for (let col = 0; col < cols; col += 1) {
    for (let row = 0; row < ROWS; row += 1) {
      if (rows[row]![col] === T_CANO_TOPO) {
        if (!tops.some((taken) => Math.abs(taken - col) <= 1)) tops.push(col)
        break
      }
    }
  }
  if (tops.length === 0) return null
  const col = tops[Math.min(1, tops.length - 1)]!
  let topRow = ROWS
  for (let row = 0; row < ROWS; row += 1) {
    if (rows[row]![col] === T_CANO_TOPO) {
      topRow = row
      break
    }
  }
  return { x: col * TILE, y: topRow * TILE - ATALHO_H }
}

const ATALHO_H = 16

/**
 * Fonte canônica de identidade, planta, grade e capacidades de uma fase.
 * Construção do mapa, física e pontos especiais consomem este mesmo descritor.
 */
function levelDescriptor(world: number, stage: number): LevelDescriptor {
  const level = (world - 1) * 4 + stage
  const kind = levelKind(world, stage)
  const cols = LEVEL_WIDTHS[level - 1] ?? DEFAULT_COLS
  const plan = LEVEL_PLANS[level - 1] ?? PLANO_VAZIO
  const rows = buildLevelRows(kind, plan, cols)
  return {
    level,
    world,
    stage,
    kind,
    cols,
    plan,
    rows,
    firstPipe: firstPipeMouth(rows),
    shortcut: pipeShortcut(rows),
  }
}

/** Altura do mastro do fim de fase: 9 tiles, assentado no chão. */
const MASTRO_H = 144

/**
 * Altura da gema: linha 11, dois tiles acima da superfície. `firmSpotNear` exige 48px
 * de pé-direito livre naquela coluna, então ela nunca nasce dentro de tijolo.
 * O y=150 antigo era constante mágica: caía entre as linhas 9 e 10, que são exatamente
 * as linhas de tijolo e bloco `?`.
 */
const GEMA_Y = SURFACE_Y - 32

/** Coordenadas que mudam de fase para fase, derivadas da grade daquela fase. */
function levelSpawnPoints(descriptor: LevelDescriptor): Record<string, number> {
  const { rows, shortcut, firstPipe: mouth, world, stage, cols } = descriptor
  return {
    xGema: firmSpotNear(rows, 382 + ((((world - 1) * 4 + stage) * 23) % 180), 16, 48),
    xPortal: firmSpotNear(rows, (cols - 4) * TILE, 16, 48),
    xPlanta: mouth ? mouth.x : 22 * TILE,
    yPlanta: mouth ? mouth.y : SURFACE_Y - 48,
    xAtalho: shortcut ? shortcut.x : -100,
    yAtalho: shortcut ? shortcut.y : -100,
    xChefe: firmSpotNear(rows, 930, 24, 32),
    xChefeExtra: firmSpotNear(rows, 810, 24, 32),
    xBarraFogo: descriptor.kind === 'castelo' ? (17 + ((world * 9) % 28)) * TILE : -100,
    yBarraFogo: descriptor.kind === 'castelo' ? 116 + (world % 3) * 18 : -100,
    xBrasa1: firmSpotNear(rows, 190, 16, 32),
    xBrasa2: firmSpotNear(rows, 340, 16, 32),
    xBrasa3: firmSpotNear(rows, 490, 16, 32),
    xBrasa4: firmSpotNear(rows, 640, 16, 32),
    xBrasa5: firmSpotNear(rows, 790, 16, 32),
    xCasco: firmSpotNear(rows, 350, 16, 32),
    xEspinho: firmSpotNear(rows, 610, 16, 32),
    xEspinhoExtra: firmSpotNear(rows, 760, 16, 32),
  }
}

const CAMPAIGN_ENEMY_TYPE_VARS = [
  'brasas',
  'cascos',
  'espinhos',
  'asas',
  'plantas',
  'guardioes',
  'saltadores',
  'investidas',
] as const

type CampaignEnemyName = (typeof CAMPAIGN_ENEMY_TYPE_VARS)[number]
type CampaignEnemySpawn = [typeIndex: number, x: number, y: number]

/** Elenco autoral das 32 fases; a composição não nasce mais de um limiar por mundo. */
const LEVEL_ENEMY_CASTS: readonly (readonly CampaignEnemyName[])[] = [
  ['brasas', 'brasas'],
  ['brasas', 'brasas', 'saltadores'],
  ['brasas', 'asas', 'saltadores'],
  ['brasas', 'investidas', 'guardioes'],
  ['brasas', 'cascos', 'saltadores'],
  ['asas', 'asas', 'saltadores'],
  ['brasas', 'asas', 'investidas'],
  ['cascos', 'espinhos', 'guardioes'],
  ['brasas', 'cascos', 'plantas'],
  ['brasas', 'investidas', 'plantas'],
  ['asas', 'saltadores', 'plantas'],
  ['espinhos', 'investidas', 'guardioes'],
  ['brasas', 'cascos', 'espinhos', 'saltadores', 'plantas'],
  ['asas', 'investidas', 'plantas'],
  ['brasas', 'asas', 'espinhos', 'saltadores'],
  ['cascos', 'espinhos', 'guardioes'],
  ['brasas', 'investidas', 'investidas', 'plantas'],
  ['asas', 'cascos', 'saltadores'],
  ['espinhos', 'asas', 'investidas', 'plantas'],
  ['cascos', 'espinhos', 'guardioes', 'guardioes'],
  ['brasas', 'saltadores', 'investidas', 'plantas'],
  ['asas', 'asas', 'cascos', 'investidas'],
  ['espinhos', 'saltadores', 'plantas', 'investidas'],
  ['cascos', 'espinhos', 'guardioes', 'guardioes'],
  ['brasas', 'cascos', 'saltadores', 'investidas'],
  ['asas', 'asas', 'espinhos', 'plantas'],
  ['cascos', 'saltadores', 'investidas', 'plantas'],
  ['espinhos', 'investidas', 'guardioes', 'guardioes'],
  ['brasas', 'cascos', 'espinhos', 'saltadores', 'plantas'],
  ['asas', 'asas', 'investidas', 'saltadores'],
  ['cascos', 'espinhos', 'plantas', 'investidas', 'saltadores'],
  ['espinhos', 'investidas', 'guardioes', 'guardioes'],
]

function enemyLineup(
  descriptor: LevelDescriptor,
  points: Record<string, number>,
): { enemies: CampaignEnemySpawn[]; journey2Enemies: CampaignEnemySpawn[] } {
  const cast = LEVEL_ENEMY_CASTS[descriptor.level - 1] ?? ['brasas']
  const groundX = [
    points.xBrasa1!,
    points.xBrasa2!,
    points.xBrasa3!,
    points.xBrasa4!,
    points.xBrasa5!,
  ]
  let groundIndex = 0
  let airIndex = 0
  let bossIndex = 0
  const spawn = (name: CampaignEnemyName): CampaignEnemySpawn => {
    const typeIndex = CAMPAIGN_ENEMY_TYPE_VARS.indexOf(name)
    if (name === 'guardioes') {
      const x = bossIndex++ === 0 ? points.xChefe! : points.xChefeExtra!
      return [typeIndex, x, standingY(24)]
    }
    if (name === 'plantas') return [typeIndex, points.xPlanta!, points.yPlanta!]
    const x = groundX[groundIndex++ % groundX.length]!
    if (name === 'asas') return [typeIndex, x, airIndex++ % 2 === 0 ? 84 : 112]
    return [typeIndex, x, standingY(16)]
  }
  const journey2Cast: CampaignEnemyName[] = [
    'cascos',
    'espinhos',
    descriptor.stage % 2 === 0 ? 'investidas' : 'asas',
  ]
  return {
    enemies: cast.map(spawn),
    // A segunda jornada muda o elenco, não só a velocidade. O primeiro nível já
    // ganha casco e espinho, contrato aferido pelo playthrough.
    journey2Enemies: journey2Cast.map(spawn),
  }
}

/**
 * Posições pretendidas, antes de a grade opinar. Servem de PADRÃO compartilhado: cada
 * fase só reescreve as coordenadas que a própria grade obrigou a mover, em vez de
 * repetir as treze em trinta e duas fases. São ~400 statements a menos na IR — e menos
 * blocos no canvas da criança.
 */
const SPAWN_POINT_DEFAULTS: Record<string, number> = {
  xGema: 390,
  xPortal: (DEFAULT_COLS - 4) * TILE,
  xPlanta: 22 * TILE,
  yPlanta: SURFACE_Y - 48,
  xAtalho: -100,
  yAtalho: -100,
  atalhoDestino: 1,
  xChefe: 930,
  xChefeExtra: 810,
  xBarraFogo: -100,
  yBarraFogo: -100,
}

const SPAWN_POINT_NAMES = Object.keys(SPAWN_POINT_DEFAULTS)

export const reinoZeroCampaignManifest = JSON.stringify({
  edges: 'none',
  horizontal: 'right',
  vertical: 'off',
  deadZoneX: 48,
  deadZoneY: 0,
  levels: Array.from({ length: LAST_LEVEL }, (_, index) => {
    const world = Math.floor(index / 4) + 1
    const stage = (index % 4) + 1
    const descriptor = levelDescriptor(world, stage)
    const points = levelSpawnPoints(descriptor)
    return {
      grid: levelGrid(world, stage),
      theme: themeIndex(world, stage),
      mundo: world,
      etapa: stage,
      faseAquatica: descriptor.kind === 'agua' ? 1 : 0,
      temAtalho: descriptor.shortcut ? 1 : 0,
      larguraFase: descriptor.cols * TILE,
      xGema: points.xGema,
      xPortal: points.xPortal,
      xPlanta: points.xPlanta,
      yPlanta: points.yPlanta,
      xAtalho: points.xAtalho,
      yAtalho: points.yAtalho,
      atalhoDestino: descriptor.shortcut ? Math.min(LAST_LEVEL, index + 5) : index + 1,
      xBarraFogo: points.xBarraFogo,
      yBarraFogo: points.yBarraFogo,
      ...enemyLineup(descriptor, points),
    }
  }),
})

export const reinoZeroLevelGrids: readonly string[] = (
  JSON.parse(reinoZeroCampaignManifest) as { levels: Array<{ grid: string }> }
).levels.map((level) => level.grid)

function activateLevel(): JSStatement[] {
  return [
    {
      type: 'g2d:loadVectorCampaignLevel',
      index: variable('fase'),
      tilesetVars: THEMES.map((_, index) => `pecas${index + 1}`),
      manifest: reinoZeroCampaignManifest,
      size: n(TILE),
      spawnX: n(32),
      spawnY: n(SURFACE_Y - 24),
      mapVar: 'mapaAtual',
      worldVar: 'areaAtual',
      levelVar: 'faseAtual',
      enemyTypeVars: [...CAMPAIGN_ENEMY_TYPE_VARS],
      journey: variable('jornada'),
    },
    ...['mundo', 'etapa', 'faseAquatica', 'temAtalho', 'larguraFase', 'atalhoDestino'].map(
      (name): JSStatement => ({
        type: 'assign',
        name,
        value: { type: 'g2d:campaignValue', key: name, fallback: variable(name) },
      }),
    ),
    {
      type: 'assign',
      name: 'tempo',
      value: binary('-', n(300), binary('*', variable('mundo'), n(8))),
    },
    {
      type: 'if',
      cond: equals(variable('jornada'), 2),
      then: [
        {
          type: 'assign',
          name: 'tempo',
          value: binary('-', n(230), binary('*', variable('mundo'), n(6))),
        },
      ],
    },
    ...SPAWN_POINT_NAMES.map(
      (name): JSStatement => ({
        type: 'assign',
        name,
        value: {
          type: 'g2d:campaignValue',
          key: name,
          fallback: n(SPAWN_POINT_DEFAULTS[name]!),
        },
      }),
    ),
    // Reiniciar a Fase é o que devolve o herói ao spawn, RESETA A CÂMERA e restaura os
    // blocos `?` quebrados. Sem isto a câmera de `horizontal:'right'` ficava travada no
    // lugar da morte e o jogador renascia fora da viewport, invisível.
    { type: 'g2d:restartLevel', levelVar: 'faseAtual', spriteVar: 'lumi' },
  ]
}

function selectActiveLevel(): JSStatement[] {
  return [
    // Os padrões primeiro: a fase anterior pode ter reescrito alguma coordenada, e sem
    // isto a sobrescrita dela vazaria para a fase seguinte.
    ...SPAWN_POINT_NAMES.map(
      (name): JSStatement => ({
        type: 'assign',
        name,
        value: n(SPAWN_POINT_DEFAULTS[name]!),
      }),
    ),
    ...clearActiveLevelGroups(),
    ...activateLevel(),
    ...prepareActiveLevel(),
  ]
}

function loadActiveLevel(): JSStatement {
  return { type: 'callFunction', name: 'carregarFase', args: [] }
}

function nextLevel(): JSStatement[] {
  return [
    { type: 'assign', name: 'pontos', value: binary('+', variable('pontos'), n(1000)) },
    { type: 'g2d:playFx', fx: 'win' },
    { type: 'assign', name: 'fase', value: binary('+', variable('fase'), n(1)) },
    {
      type: 'if',
      cond: binary('>', variable('fase'), n(LAST_LEVEL)),
      then: [
        {
          type: 'if',
          cond: equals(variable('jornada'), 1),
          then: [
            { type: 'assign', name: 'jornada', value: n(2) },
            { type: 'assign', name: 'fase', value: n(1) },
            { type: 'assign', name: 'velocidade', value: n(3) },
            loadActiveLevel(),
          ],
          else: [{ type: 'g2d:setScene', name: 'final' }],
        },
      ],
      else: [loadActiveLevel()],
    },
  ]
}

function enemyType(
  varName: string,
  behavior: string,
  shapeName: string,
  hp: number,
  speed: number,
  w: number,
  h: number,
): JSStatement {
  return {
    type: 'g2d:defineEnemyType',
    varName,
    behavior,
    color: '#ffffff',
    image: '',
    shape: shapeName,
    hp: n(hp),
    speed: n(speed),
    dmg: n(1),
    w: n(w),
    h: n(h),
  }
}

/** Um campo do placar: rótulo em cima, número embaixo, na fonte de pixel. */
function hudField(label: string, value: JSExpr, x: number): JSStatement {
  return {
    type: 'g2d:drawPixelScore',
    ctxVar: 'ctx',
    label,
    value,
    x: n(x),
    y: n(8),
    size: n(1),
    color: '#ffffff',
  }
}

function drawHud(): JSStatement[] {
  // ⭐ UMA tipografia só. O placar usava `drawScore`, que desenha com a fonte
  // proporcional do HUD, enquanto as telas de título e de fim usavam a fonte de
  // PIXEL: duas letras diferentes no mesmo jogo, e no palco de 256px o resultado
  // ainda por cima cortava. Agora tudo passa pela mesma fonte, no layout do jogo de
  // referência: quatro campos numa faixa, cada um com o nome em cima e o número
  // embaixo.
  //
  // Não há mais escurecimento: o `drawFade` cobria a TELA INTEIRA a cada quadro,
  // depois de todo o desenho, e deixava o jogo 22% mais escuro para sempre.
  return [
    hudField('JOG.', variable('jogador'), 4),
    hudField('PONTOS', variable('pontos'), 38),
    hudField('MOEDAS', variable('moedas'), 82),
    // ⚠️ MUNDO e ETAPA eram DOIS campos. No original é um só, e é assim que a criança
    // fala ("estou na um-um"). O texto sai do próprio jogo: mundo, traço e etapa.
    hudField(
      'MUNDO',
      binary('+', binary('+', variable('mundo'), { type: 'str', value: '-' }), variable('etapa')),
      126,
    ),
    hudField('TEMPO', variable('tempo'), 166),
    // ⚠️ Vidas e o jogador da vez NUNCA apareciam na tela. O jogo tem 3 vidas por
    // jogador e alterna entre dois, e não havia como saber quantas restavam nem de
    // quem era a vez — o estado existia só nas variáveis.
    hudField('VIDAS', ternarioDeVidas(), 210),
  ]
}

/** As vidas de QUEM está jogando agora. */
function ternarioDeVidas(): JSExpr {
  return {
    type: 'ternary',
    condition: equals(variable('jogador'), 1),
    whenTrue: variable('vidas1'),
    whenFalse: variable('vidas2'),
  }
}

const swimmingLevel = equals(variable('faseAquatica'), 1)

function animatedHeroShape(idle: string, walking: string): JSStatement {
  return {
    type: 'if',
    cond: and(
      { type: 'g2d:isMovingH', spriteVar: 'lumi' },
      binary('<', variable('passoLumi'), n(6)),
    ),
    then: [{ type: 'g2d:setShape', spriteVar: 'lumi', shapeName: walking }],
    else: [{ type: 'g2d:setShape', spriteVar: 'lumi', shapeName: idle }],
  }
}

function alternateToLivingPlayer(): JSStatement {
  return {
    type: 'if',
    cond: equals(variable('jogadores'), 2),
    then: [
      {
        type: 'if',
        cond: equals(variable('jogador'), 1),
        then: [
          {
            type: 'if',
            cond: binary('>', variable('vidas2'), n(0)),
            then: [{ type: 'assign', name: 'jogador', value: n(2) }],
          },
        ],
        else: [
          {
            type: 'if',
            cond: binary('>', variable('vidas1'), n(0)),
            then: [{ type: 'assign', name: 'jogador', value: n(1) }],
          },
        ],
      },
    ],
  }
}

const ACTIVE_PLAYER_STATE = [
  ['pontos', 'pontosJ'],
  ['moedas', 'moedasJ'],
  ['fase', 'faseJ'],
  ['jornada', 'jornadaJ'],
] as const

function savePlayerState(slot: 1 | 2): JSStatement[] {
  return [
    ...ACTIVE_PLAYER_STATE.map(
      ([active, stored]): JSStatement => ({
        type: 'assign',
        name: `${stored}${slot}`,
        value: variable(active),
      }),
    ),
    {
      type: 'assign',
      name: `poderJ${slot}`,
      value: { type: 'g2d:getHealth', spriteVar: 'lumi' },
    },
  ]
}

function loadPlayerState(slot: 1 | 2): JSStatement[] {
  return [
    ...ACTIVE_PLAYER_STATE.map(
      ([active, stored]): JSStatement => ({
        type: 'assign',
        name: active,
        value: variable(`${stored}${slot}`),
      }),
    ),
    { type: 'g2d:changeHealth', spriteVar: 'lumi', delta: n(-99) },
    { type: 'g2d:changeHealth', spriteVar: 'lumi', delta: variable(`poderJ${slot}`) },
    {
      type: 'assign',
      name: 'velocidade',
      value: {
        type: 'ternary',
        condition: equals(variable('jornada'), 2),
        whenTrue: n(3),
        whenFalse: n(2.35),
      },
    },
  ]
}

function saveActivePlayer(): JSStatement {
  return {
    type: 'if',
    cond: equals(variable('jogador'), 1),
    then: savePlayerState(1),
    else: savePlayerState(2),
  }
}

function loadActivePlayer(): JSStatement {
  return {
    type: 'if',
    cond: equals(variable('jogador'), 1),
    then: loadPlayerState(1),
    else: loadPlayerState(2),
  }
}

/** Primeira fase do mundo (1, 5, 9...) em que o jogador parou. */
function worldStartPhase(phase: JSExpr): JSExpr {
  return binary('-', phase, binary('%', binary('-', phase, n(1)), n(4)))
}

const playingBody: JSStatement[] = [
  {
    type: 'assign',
    name: 'passoLumi',
    value: binary('%', binary('+', variable('passoLumi'), n(1)), n(12)),
  },
  {
    type: 'if',
    cond: { type: 'g2d:actionDown', action: 'left' },
    then: [{ type: 'assign', name: 'direcaoLumi', value: n(-1) }],
  },
  {
    type: 'if',
    cond: { type: 'g2d:actionDown', action: 'right' },
    then: [{ type: 'assign', name: 'direcaoLumi', value: n(1) }],
  },
  {
    type: 'if',
    cond: swimmingLevel,
    then: [{ type: 'g2d:swim', spriteVar: 'lumi', speed: variable('velocidade') }],
    else: [
      {
        type: 'g2d:classicPlatformer',
        spriteVar: 'lumi',
        speed: variable('velocidade'),
        jump: n(7.2),
      },
    ],
  },
  { type: 'g2d:collideWorld', spriteVar: 'lumi', worldVar: 'areaAtual' },
  { type: 'g2d:followCameraInWorld', spriteVar: 'lumi', worldVar: 'areaAtual' },
  { type: 'g2d:applyGravityToGroup', groupVar: 'brasas' },
  // ⚠️ Os cascos ficaram de fora desta lista, e é aqui que a gravidade nasce para
  // todo inimigo: o casco (e o próprio bicho antes de virar casco) nunca caía de uma
  // beirada. O atualizador dos cascos INTEGRA o vy; quem o acelera é este bloco.
  { type: 'g2d:applyGravityToGroup', groupVar: 'cascos' },
  { type: 'g2d:applyGravityToGroup', groupVar: 'espinhos' },
  { type: 'g2d:applyGravityToGroup', groupVar: 'guardioes' },
  { type: 'g2d:applyGravityToGroup', groupVar: 'saltadores' },
  { type: 'g2d:applyGravityToGroup', groupVar: 'investidas' },
  // ⚠️ A pisada vem ANTES do "Atualizar": é o "Atualizar" que colhe quem morreu e
  // solta as partículas. Na ordem invertida, a pisada do quadro N só era colhida no
  // quadro N+1 — um quadro de atraso somado ao resto.
  { type: 'g2d:stompEnemy', spriteVar: 'lumi', typeVar: 'brasas', bounce: n(5.5) },
  { type: 'g2d:stompEnemy', spriteVar: 'lumi', typeVar: 'cascos', bounce: n(5.5) },
  { type: 'g2d:stompEnemy', spriteVar: 'lumi', typeVar: 'espinhos', bounce: n(5.5) },
  { type: 'g2d:stompEnemy', spriteVar: 'lumi', typeVar: 'asas', bounce: n(5.5) },
  { type: 'g2d:stompEnemy', spriteVar: 'lumi', typeVar: 'plantas', bounce: n(5.5) },
  { type: 'g2d:stompEnemy', spriteVar: 'lumi', typeVar: 'guardioes', bounce: n(6) },
  { type: 'g2d:stompEnemy', spriteVar: 'lumi', typeVar: 'saltadores', bounce: n(5.5) },
  { type: 'g2d:stompEnemy', spriteVar: 'lumi', typeVar: 'investidas', bounce: n(5.5) },
  { type: 'g2d:updateEnemyType', typeVar: 'brasas', ctxVar: 'ctx', targetVar: 'lumi' },
  { type: 'g2d:updateEnemyType', typeVar: 'cascos', ctxVar: 'ctx', targetVar: 'lumi' },
  { type: 'g2d:updateEnemyType', typeVar: 'espinhos', ctxVar: 'ctx', targetVar: 'lumi' },
  { type: 'g2d:updateEnemyType', typeVar: 'asas', ctxVar: 'ctx', targetVar: 'lumi' },
  { type: 'g2d:updateEnemyType', typeVar: 'plantas', ctxVar: 'ctx', targetVar: 'lumi' },
  { type: 'g2d:updateEnemyType', typeVar: 'guardioes', ctxVar: 'ctx', targetVar: 'lumi' },
  { type: 'g2d:updateEnemyType', typeVar: 'saltadores', ctxVar: 'ctx', targetVar: 'lumi' },
  { type: 'g2d:updateEnemyType', typeVar: 'investidas', ctxVar: 'ctx', targetVar: 'lumi' },
  { type: 'g2d:updateEnemyShells', typeVar: 'cascos', worldVar: 'areaAtual' },
  movePowerup('broto', 'direcaoBroto', 1.25, 0),
  movePowerup('estrela', 'direcaoEstrela', 1.45, 4.8),
  {
    type: 'g2d:forEachInGroup',
    groupVar: 'bolasFogo',
    itemName: 'bolaFogo',
    body: [
      { type: 'g2d:applyGravity', spriteVar: 'bolaFogo' },
      { type: 'g2d:applyVelocity', spriteVar: 'bolaFogo' },
      { type: 'g2d:collideWorld', spriteVar: 'bolaFogo', worldVar: 'areaAtual' },
      {
        type: 'if',
        cond: equals({ type: 'g2d:spriteVy', spriteVar: 'bolaFogo' }, 0),
        then: [
          {
            type: 'g2d:setVelocity',
            spriteVar: 'bolaFogo',
            vx: { type: 'g2d:spriteVx', spriteVar: 'bolaFogo' },
            vy: n(-3.6),
          },
        ],
      },
      {
        type: 'if',
        cond: or(
          binary('<', { type: 'g2d:spriteX', spriteVar: 'bolaFogo' }, n(-32)),
          binary(
            '>',
            { type: 'g2d:spriteX', spriteVar: 'bolaFogo' },
            binary('+', variable('larguraFase'), n(32)),
          ),
        ),
        then: [{ type: 'g2d:removeFromGroup', spriteVar: 'bolaFogo', groupVar: 'bolasFogo' }],
      },
    ],
  },
  {
    type: 'g2d:onGroupOverlap',
    aGroup: 'bolasFogo',
    aName: 'bolaFogo',
    bGroup: 'todosInimigos',
    bName: 'alvoFogo',
    body: [
      { type: 'g2d:changeHealth', spriteVar: 'alvoFogo', delta: n(-1) },
      { type: 'g2d:removeFromGroup', spriteVar: 'bolaFogo', groupVar: 'bolasFogo' },
      { type: 'g2d:playFx', fx: 'hit' },
    ],
  },
  {
    type: 'if',
    cond: binary('>', { type: 'g2d:spriteX', spriteVar: 'barraFogo' }, n(-50)),
    then: [
      {
        type: 'g2d:rotateSprite',
        spriteVar: 'barraFogo',
        deg: binary('+', n(2.2), binary('*', variable('mundo'), n(0.35))),
      },
      {
        type: 'if',
        // A estrela cobre TUDO menos poço, lava e o tempo — inclusive a barra que
        // gira, que é o perigo mais característico do castelo.
        cond: and(
          { type: 'g2d:touches', aVar: 'lumi', bVar: 'barraFogo' },
          binary('<=', variable('estrelaAte'), n(0)),
        ),
        then: [
          {
            type: 'g2d:damageSprite',
            spriteVar: 'lumi',
            amount: n(1),
            invincibilityFrames: n(45),
          },
        ],
      },
    ],
  },
  {
    type: 'g2d:forEachTileContact',
    spriteVar: 'lumi',
    mapVar: 'mapaAtual',
    side: 'head',
    contactName: 'bloco',
    body: [
      {
        type: 'if',
        cond: { type: 'g2d:tileContactIs', contactVar: 'bloco', index: n(2) },
        then: [
          { type: 'g2d:setTileAtContact', contactVar: 'bloco', index: n(1) },
          {
            type: 'if',
            // ⚠️ if/SENÃO, não dois ifs seguidos: o primeiro ramo baixa o contador e o
            // segundo passaria a valer no MESMO toque, soltando estrela e cogumelo
            // juntos (medido: 2200 pontos numa cabeçada só).
            //
            // ⚠️ E a MOEDA é o último ramo, não uma linha acima de todos: o bloco de
            // prêmio dá uma coisa OU a outra, como no jogo de referência. Pagando
            // moeda por fora, as duas primeiras cabeçadas de cada fase davam moeda
            // MAIS power-up, e a conta de "100 moedas = 1 vida" inflava sozinha.
            cond: equals(variable('premioAtivo'), 2),
            then: [
              { type: 'assign', name: 'premioAtivo', value: n(1) },
              {
                type: 'g2d:setPosition',
                spriteVar: 'estrela',
                x: { type: 'g2d:spriteX', spriteVar: 'lumi' },
                y: n(GEMA_Y),
              },
            ],
            else: [
              {
                type: 'if',
                cond: equals(variable('premioAtivo'), 1),
                then: [
                  { type: 'assign', name: 'premioAtivo', value: n(0) },
                  {
                    type: 'if',
                    cond: binary('>=', { type: 'g2d:getHealth', spriteVar: 'lumi' }, n(2)),
                    then: [
                      {
                        type: 'g2d:setPosition',
                        spriteVar: 'flor',
                        x: { type: 'g2d:spriteX', spriteVar: 'lumi' },
                        y: n(GEMA_Y),
                      },
                    ],
                    else: [
                      {
                        type: 'g2d:setPosition',
                        spriteVar: 'broto',
                        x: { type: 'g2d:spriteX', spriteVar: 'lumi' },
                        // Nasce acima dos blocos, nunca dentro da fileira cabeceável.
                        y: n(GEMA_Y),
                      },
                    ],
                  },
                ],
                // Os prêmios da fase acabaram: daí em diante o bloco dá moeda.
                else: collectCoin(200),
              },
            ],
          },
        ],
      },
      {
        type: 'if',
        cond: and(
          { type: 'g2d:tileContactIs', contactVar: 'bloco', index: n(T_TIJOLO) },
          binary('>=', { type: 'g2d:getHealth', spriteVar: 'lumi' }, n(2)),
        ),
        then: [
          { type: 'g2d:setTileAtContact', contactVar: 'bloco', index: n(-1) },
          { type: 'assign', name: 'pontos', value: binary('+', variable('pontos'), n(100)) },
          { type: 'g2d:playFx', fx: 'hit' },
        ],
      },
    ],
  },
  // ⭐ As peças que o herói ATRAVESSA. Antes isto era impossível: o contato de tile só
  // nascia da resolução de colisão, então só existia para sólido e plataforma — e
  // moeda, lava e água são justamente as que se atravessa.
  {
    type: 'g2d:forEachTileContact',
    spriteVar: 'lumi',
    mapVar: 'mapaAtual',
    side: 'inside',
    contactName: 'dentro',
    body: [
      {
        type: 'if',
        cond: { type: 'g2d:tileContactIs', contactVar: 'dentro', index: n(T_MOEDA) },
        then: [
          { type: 'g2d:setTileAtContact', contactVar: 'dentro', index: n(-1) },
          ...collectCoin(200),
        ],
      },
      {
        type: 'if',
        // A lava do castelo e o fundo do poço. Matar POR CONTATO é mais preciso do que
        // esperar o herói passar da linha de baixo da tela, e é o que faz o castelo
        // ter fosso de verdade.
        cond: { type: 'g2d:tileContactIs', contactVar: 'dentro', index: n(T_PERIGO) },
        // Morte imediata: "Pôr a vida em" só vale no Ao iniciar, então quem serve
        // aqui é o "Mudar a vida", com um número maior que qualquer vida possível.
        then: [{ type: 'g2d:changeHealth', spriteVar: 'lumi', delta: n(-99) }],
      },
    ],
  },
  {
    type: 'if',
    cond: { type: 'g2d:touches', aVar: 'lumi', bVar: 'gema' },
    then: [
      ...collectCoin(100),
      { type: 'g2d:setPosition', spriteVar: 'gema', x: n(-100), y: n(-100) },
    ],
  },
  {
    type: 'if',
    cond: { type: 'g2d:touches', aVar: 'lumi', bVar: 'broto' },
    then: [
      {
        type: 'if',
        cond: binary('<', { type: 'g2d:getHealth', spriteVar: 'lumi' }, n(2)),
        then: [
          { type: 'g2d:changeHealth', spriteVar: 'lumi', delta: n(1) },
          {
            type: 'g2d:setPosition',
            spriteVar: 'lumi',
            x: { type: 'g2d:spriteX', spriteVar: 'lumi' },
            y: binary('-', { type: 'g2d:spriteY', spriteVar: 'lumi' }, n(8)),
          },
        ],
      },
      { type: 'assign', name: 'pontos', value: binary('+', variable('pontos'), n(1000)) },
      { type: 'g2d:playFx', fx: 'powerup' },
      { type: 'g2d:setPosition', spriteVar: 'broto', x: n(-100), y: n(-100) },
      { type: 'g2d:setVelocity', spriteVar: 'broto', vx: n(0), vy: n(0) },
    ],
  },
  {
    type: 'if',
    cond: { type: 'g2d:touches', aVar: 'lumi', bVar: 'flor' },
    then: [
      {
        type: 'if',
        cond: binary('<', { type: 'g2d:getHealth', spriteVar: 'lumi' }, n(3)),
        then: [{ type: 'g2d:changeHealth', spriteVar: 'lumi', delta: n(1) }],
      },
      { type: 'assign', name: 'pontos', value: binary('+', variable('pontos'), n(1000)) },
      { type: 'g2d:playFx', fx: 'powerup' },
      { type: 'g2d:setPosition', spriteVar: 'flor', x: n(-100), y: n(-100) },
    ],
  },
  {
    type: 'if',
    cond: and(
      equals(variable('temAtalho'), 1),
      and(
        { type: 'g2d:touches', aVar: 'lumi', bVar: 'atalho' },
        { type: 'g2d:actionPressed', action: 'down' },
      ),
    ),
    then: [
      {
        type: 'if',
        cond: binary('<=', variable('fase'), n(28)),
        then: [
          { type: 'assign', name: 'fase', value: variable('atalhoDestino') },
          { type: 'assign', name: 'pontos', value: binary('+', variable('pontos'), n(500)) },
          { type: 'g2d:playFx', fx: 'whoosh' },
          loadActiveLevel(),
        ],
      },
    ],
  },
  {
    type: 'if',
    cond: and(
      { type: 'g2d:touches', aVar: 'lumi', bVar: 'portal' },
      equals(variable('mastroAte'), 0),
    ),
    then: [
      {
        type: 'if',
        cond: or(
          binary('!=', variable('etapa'), n(4)),
          binary('<=', { type: 'g2d:countGroup', groupVar: 'guardioes' }, n(0)),
        ),
        // ⭐ A ALTURA do toque paga. É o gesto que fecha toda fase do jogo de
        // referência: quem chega correndo e pula no alto do mastro leva mais.
        then: [
          {
            type: 'assign',
            name: 'pontos',
            value: binary(
              '+',
              variable('pontos'),
              binary(
                '*',
                binary('-', n(SURFACE_Y), { type: 'g2d:spriteY', spriteVar: 'lumi' }),
                n(20),
              ),
            ),
          },
          { type: 'assign', name: 'mastroAte', value: n(60) },
        ],
      },
    ],
  },
  {
    type: 'if',
    cond: binary('>', variable('mastroAte'), n(0)),
    then: [
      { type: 'g2d:setVelocity', spriteVar: 'lumi', vx: n(0), vy: n(0) },
      {
        type: 'g2d:setPosition',
        spriteVar: 'lumi',
        x: variable('xPortal'),
        y: {
          type: 'ternary',
          condition: binary('<', { type: 'g2d:spriteY', spriteVar: 'lumi' }, n(standingY(24))),
          whenTrue: binary('+', { type: 'g2d:spriteY', spriteVar: 'lumi' }, n(2)),
          whenFalse: n(standingY(24)),
        },
      },
      { type: 'assign', name: 'mastroAte', value: binary('-', variable('mastroAte'), n(1)) },
      {
        type: 'if',
        cond: equals(variable('mastroAte'), 0),
        then: nextLevel(),
      },
    ],
  },
  // ⭐ A ESTRELA. Pegar deixa invencível por alguns segundos, e quem encostar em você
  // é quem se dá mal — é o único momento do jogo em que o encontrão vira arma.
  {
    type: 'if',
    cond: { type: 'g2d:touches', aVar: 'lumi', bVar: 'estrela' },
    then: [
      { type: 'assign', name: 'estrelaAte', value: n(600) },
      { type: 'assign', name: 'pontos', value: binary('+', variable('pontos'), n(1000)) },
      { type: 'g2d:playFx', fx: 'powerup' },
      { type: 'g2d:setPosition', spriteVar: 'estrela', x: n(-100), y: n(-100) },
    ],
  },
  {
    type: 'if',
    cond: binary('>', variable('estrelaAte'), n(0)),
    then: [
      { type: 'assign', name: 'estrelaAte', value: binary('-', variable('estrelaAte'), n(1)) },
    ],
  },
  {
    type: 'g2d:onSpriteGroupOverlap',
    spriteVar: 'lumi',
    groupVar: 'todosInimigos',
    itemName: 'inimigoTocado',
    body: [
      {
        type: 'if',
        cond: binary('>', variable('estrelaAte'), n(0)),
        // ⚠️ TIRAR DO GRUPO, não "Mudar a vida em -99". O espinho é imortal de
        // propósito (a vida dele volta ao teto antes da poda), então o -99 era
        // desfeito no update seguinte: o espinho sobrevivia à estrela e, como o bloco
        // de contato dispara TODO quadro, parar em cima dele rendia 200 pontos por
        // quadro para sempre. Tirar do grupo vale para os dois: quem morre e quem não
        // morre. A explosão põe de volta o estouro que a derrota normal já solta.
        then: [
          { type: 'g2d:explode', spriteVar: 'inimigoTocado', color: '#ffe66d' },
          {
            type: 'g2d:removeFromGroup',
            spriteVar: 'inimigoTocado',
            groupVar: 'todosInimigos',
          },
          { type: 'assign', name: 'pontos', value: binary('+', variable('pontos'), n(200)) },
        ],
        else: [{ type: 'g2d:hurtByEnemy', spriteVar: 'lumi', enemyVar: 'inimigoTocado' }],
      },
    ],
  },
  {
    type: 'g2d:onEnemyShotHit',
    spriteVar: 'lumi',
    typeVar: 'guardioes',
    itemName: 'disparoGuardiao',
    // O tiro do chefe some de qualquer jeito (quem o remove é o motor); com a
    // estrela ligada ele simplesmente não cobra vida.
    body: [
      {
        type: 'if',
        cond: binary('<=', variable('estrelaAte'), n(0)),
        then: [{ type: 'g2d:hurtByEnemy', spriteVar: 'lumi', enemyVar: 'disparoGuardiao' }],
      },
    ],
  },
  { type: 'g2d:drawWorld', ctxVar: 'ctx', worldVar: 'areaAtual' },
  { type: 'g2d:drawSprite', ctxVar: 'ctx', spriteVar: 'gema' },
  { type: 'g2d:drawSprite', ctxVar: 'ctx', spriteVar: 'broto' },
  { type: 'g2d:drawSprite', ctxVar: 'ctx', spriteVar: 'flor' },
  { type: 'g2d:drawSprite', ctxVar: 'ctx', spriteVar: 'estrela' },
  { type: 'g2d:drawSprite', ctxVar: 'ctx', spriteVar: 'barraFogo' },
  { type: 'g2d:drawSprite', ctxVar: 'ctx', spriteVar: 'portal' },
  { type: 'g2d:drawGroup', ctxVar: 'ctx', groupVar: 'bolasFogo' },
  { type: 'g2d:drawEnemyType', ctxVar: 'ctx', typeVar: 'brasas' },
  { type: 'g2d:drawEnemyType', ctxVar: 'ctx', typeVar: 'cascos' },
  { type: 'g2d:drawEnemyType', ctxVar: 'ctx', typeVar: 'espinhos' },
  { type: 'g2d:drawEnemyType', ctxVar: 'ctx', typeVar: 'asas' },
  { type: 'g2d:drawEnemyType', ctxVar: 'ctx', typeVar: 'plantas' },
  { type: 'g2d:drawEnemyType', ctxVar: 'ctx', typeVar: 'guardioes' },
  { type: 'g2d:drawEnemyType', ctxVar: 'ctx', typeVar: 'saltadores' },
  { type: 'g2d:drawEnemyType', ctxVar: 'ctx', typeVar: 'investidas' },
  // ⚠️ Toda derrota do motor já SOLTA um estouro de partículas — e ninguém as
  // desenhava, então elas nasciam e morriam invisíveis. Uma linha põe de volta o
  // retorno visual de cada pisada, tiro e estrela.
  { type: 'g2d:drawParticles', ctxVar: 'ctx' },
  // Figura e caixa acompanham a VIDA: 1 pequeno, 2 grande, 3 fogo.
  {
    type: 'if',
    cond: binary('>=', { type: 'g2d:getHealth', spriteVar: 'lumi' }, n(3)),
    then: [
      animatedHeroShape('lumiFogo', 'lumiFogoPasso'),
      { type: 'g2d:setSize', spriteVar: 'lumi', w: n(16), h: n(32) },
    ],
    else: [
      {
        type: 'if',
        cond: binary('>=', { type: 'g2d:getHealth', spriteVar: 'lumi' }, n(2)),
        then: [
          animatedHeroShape('lumiForte', 'lumiFortePasso'),
          { type: 'g2d:setSize', spriteVar: 'lumi', w: n(16), h: n(32) },
        ],
        else: [
          animatedHeroShape('lumi', 'lumiPasso'),
          { type: 'g2d:setSize', spriteVar: 'lumi', w: n(16), h: n(24) },
        ],
      },
    ],
  },
  { type: 'g2d:drawSprite', ctxVar: 'ctx', spriteVar: 'lumi' },
  ...drawHud(),
  {
    type: 'if',
    cond: or(
      or(
        binary('>', { type: 'g2d:spriteY', spriteVar: 'lumi' }, n(260)),
        binary('<=', variable('tempo'), n(0)),
      ),
      { type: 'g2d:healthDepleted', spriteVar: 'lumi' },
    ),
    then: [
      {
        type: 'if',
        cond: equals(variable('jogador'), 1),
        then: [{ type: 'assign', name: 'vidas1', value: binary('-', variable('vidas1'), n(1)) }],
        else: [{ type: 'assign', name: 'vidas2', value: binary('-', variable('vidas2'), n(1)) }],
      },
      // Renasce PEQUENO: perder o poder faz parte de morrer.
      // ⚠️ Zera ANTES de repor. A versão anterior somava 2 e tirava 1 contando partir
      // do zero, mas só uma das três causas de morte passa por lá: o tempo acabando e
      // a queda para fora do mundo chegam aqui com a vida ainda cheia, e o
      // `changeHealth` SATURA no teto (3). Morrer de tempo devolvia o herói grande —
      // e morrer pequeno chegava a deixá-lo maior do que ele estava.
      { type: 'g2d:changeHealth', spriteVar: 'lumi', delta: n(-99) },
      { type: 'g2d:changeHealth', spriteVar: 'lumi', delta: n(1) },
      { type: 'callFunction', name: 'salvarJogador', args: [] },
      alternateToLivingPlayer(),
      { type: 'callFunction', name: 'carregarJogador', args: [] },
      { type: 'g2d:playFx', fx: 'hurt' },
      { type: 'g2d:setVelocity', spriteVar: 'lumi', vx: n(0), vy: n(0) },
      loadActiveLevel(),
      {
        type: 'if',
        cond: and(binary('<=', variable('vidas1'), n(0)), binary('<=', variable('vidas2'), n(0))),
        then: [
          { type: 'g2d:setScene', name: 'continua' },
          { type: 'g2d:playFx', fx: 'gameover' },
        ],
      },
    ],
  },
]

export const reinoZeroExample: ExtensionExample = beginnerGameExample({
  name: 'Reino Zero',
  experience: 'game',
  description:
    'Aventura de plataforma autoral com 8 mundos e 32 fases, 1 ou 2 jogadores alternados, segredos, inimigos, chefes e segunda jornada difícil. Setas/WASD movem, Z/Espaço pula, X corre, Backspace seleciona 1 ou 2 jogadores, Enter inicia e Esc pausa.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 256, height: 240 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#070b16',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'min-height': '100vh',
          margin: '0',
        },
      },
      {
        selector: 'canvas',
        declarations: {
          background: '#5c94fc',
          border: '4px solid #f7e7b2',
          'image-rendering': 'pixelated',
          'max-width': '100%',
          height: 'auto',
        },
      },
    ],
    version: 2,
    behavior: {
      molds: [
        ...campaignShapes(),
        ...THEMES.flatMap((theme, index) => themeShapes(index, theme)),
        enemyType('brasas', 'patrulha', 'brasa', 1, 0.65, 16, 16),
        // 16×16 e não 16×20: a figura do casco é desenhada num quadrado de 16, e
        // `drawCustomShape` só translada (não escala). Com a caixa 4px mais alta que o
        // desenho, o casco aparecia flutuando 4px acima do chão em que colidia.
        enemyType('cascos', 'patrulha', 'casco', 1, 0.75, 16, 16),
        enemyType('espinhos', 'espinho', 'espinho', 1, 0.55, 16, 16),
        enemyType('asas', 'voador-vertical', 'asa', 1, 0.8, 16, 16),
        // ⭐ A PLANTA do cano: sobe e desce na boca dele, e NÃO aceita pisada (o modo
        // espinho cuida disso) — pisar numa planta é o erro clássico de quem aprende.
        enemyType('plantas', 'voador-vertical', 'planta', 1, 0.45, 16, 16),
        enemyType('guardioes', 'chefao', 'guardiao', 1, 0.75, 24, 24),
        enemyType('saltadores', 'saltador', 'saltador', 1, 0.7, 16, 16),
        enemyType('investidas', 'arrancada', 'investida', 1, 0.8, 16, 16),
        { type: 'g2d:allEnemiesGroup', varName: 'todosInimigos' },
      ],
      start: [
        { type: 'g2d:enableClassicControls', mode: 'auto' },
        { type: 'g2d:setGravity', value: n(0.42) },
        ...mapDeclarations(),
        {
          type: 'g2d:createShapeSprite',
          varName: 'lumi',
          shapeName: 'lumi',
          x: n(32),
          y: n(SURFACE_Y - 24),
          w: n(16),
          h: n(24),
        },
        { type: 'g2d:setHitboxScale', spriteVar: 'lumi', percent: n(85) },
        // ⭐ O herói começa PEQUENO, com teto de 3. Antes era `setHealth(2)` seco, e
        // como o `changeHealth` limita ao teto, o "power-up" do broto era um NO-OP:
        // pagava 1000 pontos, tocava o som e não fazia absolutamente nada. Agora
        // pequeno = 1, grande = 2 e fogo = 3; cada golpe desce um estado.
        { type: 'g2d:setHealth', spriteVar: 'lumi', amount: n(3) },
        { type: 'g2d:changeHealth', spriteVar: 'lumi', delta: n(-2) },
        {
          type: 'g2d:createShapeSprite',
          varName: 'gema',
          shapeName: 'gema',
          x: n(390),
          y: n(GEMA_Y),
          w: n(16),
          h: n(16),
        },
        {
          type: 'g2d:createShapeSprite',
          varName: 'broto',
          shapeName: 'broto',
          x: n(-100),
          y: n(-100),
          w: n(16),
          h: n(16),
        },
        {
          type: 'g2d:createShapeSprite',
          varName: 'portal',
          shapeName: 'mastro',
          x: n((DEFAULT_COLS - 4) * TILE),
          y: n(SURFACE_Y - MASTRO_H),
          w: n(16),
          h: n(MASTRO_H),
        },
        {
          type: 'g2d:createShapeSprite',
          varName: 'estrela',
          shapeName: 'estrela',
          x: n(-100),
          y: n(-100),
          w: n(16),
          h: n(16),
        },
        {
          type: 'g2d:createShapeSprite',
          varName: 'atalho',
          shapeName: 'invisivel',
          x: n(-100),
          y: n(-100),
          w: n(2 * TILE),
          h: n(ATALHO_H),
        },
        {
          type: 'g2d:createShapeSprite',
          varName: 'flor',
          shapeName: 'flor',
          x: n(-100),
          y: n(-100),
          w: n(16),
          h: n(16),
        },
        {
          type: 'g2d:createShapeSprite',
          varName: 'barraFogo',
          shapeName: 'barraFogo',
          x: n(-100),
          y: n(-100),
          w: n(64),
          h: n(8),
        },
        { type: 'g2d:createGroup', varName: 'bolasFogo' },
        // Coordenadas que cada fase preenche a partir da própria grade, para que gema,
        // portal, atalho e inimigos nunca caiam sobre poço nem dentro de tijolo.
        ...SPAWN_POINT_NAMES.map(
          (name): JSStatement => ({
            type: 'var',
            name,
            value: n(SPAWN_POINT_DEFAULTS[name]!),
          }),
        ),
        { type: 'var', name: 'fase', value: n(1) },
        { type: 'var', name: 'mundo', value: n(1) },
        { type: 'var', name: 'etapa', value: n(1) },
        { type: 'var', name: 'faseAquatica', value: n(0) },
        { type: 'var', name: 'temAtalho', value: n(0) },
        { type: 'var', name: 'larguraFase', value: n(DEFAULT_COLS * TILE) },
        { type: 'var', name: 'jornada', value: n(1) },
        { type: 'var', name: 'jogadores', value: n(1) },
        { type: 'var', name: 'jogador', value: n(1) },
        { type: 'var', name: 'vidas1', value: n(3) },
        { type: 'var', name: 'vidas2', value: n(0) },
        { type: 'var', name: 'pontos', value: n(0) },
        { type: 'var', name: 'moedas', value: n(0) },
        { type: 'var', name: 'pontosJ1', value: n(0) },
        { type: 'var', name: 'pontosJ2', value: n(0) },
        { type: 'var', name: 'moedasJ1', value: n(0) },
        { type: 'var', name: 'moedasJ2', value: n(0) },
        { type: 'var', name: 'faseJ1', value: n(1) },
        { type: 'var', name: 'faseJ2', value: n(1) },
        { type: 'var', name: 'jornadaJ1', value: n(1) },
        { type: 'var', name: 'jornadaJ2', value: n(1) },
        { type: 'var', name: 'poderJ1', value: n(1) },
        { type: 'var', name: 'poderJ2', value: n(1) },
        { type: 'var', name: 'tempo', value: n(300) },
        { type: 'var', name: 'velocidade', value: n(2.35) },
        { type: 'var', name: 'premioAtivo', value: n(1) },
        { type: 'var', name: 'direcaoBroto', value: n(1) },
        { type: 'var', name: 'direcaoEstrela', value: n(1) },
        { type: 'var', name: 'direcaoLumi', value: n(1) },
        { type: 'var', name: 'passoLumi', value: n(0) },
        // Quantos quadros ainda restam de invencibilidade da estrela.
        { type: 'var', name: 'estrelaAte', value: n(0) },
        { type: 'var', name: 'mastroAte', value: n(0) },
        { type: 'var', name: 'mapaAtual', value: { type: 'null' } },
        { type: 'var', name: 'areaAtual', value: { type: 'null' } },
        { type: 'var', name: 'faseAtual', value: { type: 'null' } },
        { type: 'funcDecl', name: 'carregarFase', params: [], body: selectActiveLevel() },
        { type: 'funcDecl', name: 'salvarJogador', params: [], body: [saveActivePlayer()] },
        { type: 'funcDecl', name: 'carregarJogador', params: [], body: [loadActivePlayer()] },
        { type: 'g2d:setEnemyStompMode', typeVar: 'brasas', mode: 'squash' },
        { type: 'g2d:setEnemyStompMode', typeVar: 'cascos', mode: 'shell' },
        { type: 'g2d:setEnemyStompMode', typeVar: 'espinhos', mode: 'spiky' },
        // ⚠️ O voador ficava de FORA da lista e sem bloco de pisada: ele entrava em
        // "todos os inimigos", machucava ao encostar e não havia como derrotá-lo.
        // Toda etapa 3 tinha um perigo imortal no meio do caminho.
        { type: 'g2d:setEnemyStompMode', typeVar: 'asas', mode: 'defeat' },
        { type: 'g2d:setEnemyStompMode', typeVar: 'plantas', mode: 'spiky' },
        { type: 'g2d:setEnemyStompMode', typeVar: 'guardioes', mode: 'damage' },
        { type: 'g2d:setEnemyStompMode', typeVar: 'saltadores', mode: 'defeat' },
        { type: 'g2d:setEnemyStompMode', typeVar: 'investidas', mode: 'defeat' },
        loadActiveLevel(),
        { type: 'g2d:setScene', name: 'titulo' },
        { type: 'g2d:playMusic', tune: 'happy' },
      ],
      events: [
        {
          type: 'g2d:onActionPressed',
          action: 'action',
          body: [
            {
              type: 'if',
              cond: and(
                and(
                  { type: 'g2d:sceneIs', name: 'jogando' },
                  binary('>=', { type: 'g2d:getHealth', spriteVar: 'lumi' }, n(3)),
                ),
                binary('<', { type: 'g2d:countGroup', groupVar: 'bolasFogo' }, n(2)),
              ),
              then: [
                {
                  type: 'g2d:spawnBullet',
                  groupVar: 'bolasFogo',
                  x: { type: 'g2d:centerX', spriteVar: 'lumi' },
                  y: { type: 'g2d:centerY', spriteVar: 'lumi' },
                  radius: n(4),
                  color: '#ff7138',
                  vx: {
                    type: 'ternary',
                    condition: binary('<', variable('direcaoLumi'), n(0)),
                    whenTrue: n(-5.2),
                    whenFalse: n(5.2),
                  },
                  vy: n(-2.2),
                },
                { type: 'g2d:playFx', fx: 'laser' },
              ],
            },
          ],
        },
        {
          type: 'g2d:onActionPressed',
          action: 'pause',
          body: [
            {
              type: 'if',
              cond: { type: 'g2d:isPaused' },
              then: [{ type: 'g2d:resumeGame' }],
              else: [{ type: 'g2d:pauseGame' }],
            },
          ],
        },
        ...CAMPAIGN_ENEMY_TYPE_VARS.map(
          (typeVar): JSStatement => ({
            type: 'g2d:onEnemyDefeated',
            typeVar,
            itemName: 'inimigoDerrotado',
            body: [
              {
                type: 'assign',
                name: 'pontos',
                value: binary('+', variable('pontos'), n(200)),
              },
            ],
          }),
        ),
      ],
      loops: [
        {
          type: 'g2d:updateEachFrame',
          body: [
            { type: 'g2d:clear' },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'titulo' },
              then: [
                { type: 'g2d:drawWorld', ctxVar: 'ctx', worldVar: 'areaAtual' },
                { type: 'g2d:setVelocity', spriteVar: 'lumi', vx: n(0.35), vy: n(0) },
                { type: 'g2d:applyVelocity', spriteVar: 'lumi' },
                {
                  type: 'if',
                  cond: binary('>', { type: 'g2d:spriteX', spriteVar: 'lumi' }, n(220)),
                  then: [{ type: 'g2d:setPosition', spriteVar: 'lumi', x: n(18), y: n(192) }],
                },
                { type: 'g2d:drawSprite', ctxVar: 'ctx', spriteVar: 'lumi' },
                { type: 'g2d:drawFade', ctxVar: 'ctx', percent: n(55), color: '#071020' },
                {
                  type: 'g2d:drawPixelText',
                  ctxVar: 'ctx',
                  text: 'REINO ZERO',
                  x: n(128),
                  y: n(55),
                  size: n(3),
                  color: '#ffe058',
                  align: 'center',
                },
                {
                  type: 'g2d:drawPixelText',
                  ctxVar: 'ctx',
                  text: 'UMA AVENTURA VETORIAL',
                  x: n(128),
                  y: n(91),
                  size: n(1),
                  color: '#ffffff',
                  align: 'center',
                },
                {
                  type: 'g2d:drawPixelText',
                  ctxVar: 'ctx',
                  text: 'BACKSPACE: 1/2  ENTER: JOGAR',
                  x: n(128),
                  y: n(154),
                  size: n(1),
                  color: '#ffffff',
                  align: 'center',
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'JOGADORES',
                  value: variable('jogadores'),
                  x: n(92),
                  y: n(177),
                  color: '#f7cf45',
                  size: n(11),
                },
                {
                  type: 'if',
                  cond: { type: 'g2d:actionPressed', action: 'select' },
                  then: [
                    {
                      type: 'if',
                      cond: equals(variable('jogadores'), 1),
                      then: [
                        { type: 'assign', name: 'jogadores', value: n(2) },
                        { type: 'assign', name: 'vidas2', value: n(3) },
                      ],
                      else: [
                        { type: 'assign', name: 'jogadores', value: n(1) },
                        { type: 'assign', name: 'vidas2', value: n(0) },
                      ],
                    },
                    { type: 'g2d:playFx', fx: 'coin' },
                  ],
                },
                {
                  type: 'if',
                  cond: { type: 'g2d:actionPressed', action: 'start' },
                  then: [
                    { type: 'g2d:setPosition', spriteVar: 'lumi', x: n(32), y: n(192) },
                    { type: 'g2d:setScene', name: 'jogando' },
                  ],
                },
              ],
            },
            { type: 'if', cond: { type: 'g2d:sceneIs', name: 'jogando' }, then: playingBody },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'continua' },
              then: [
                { type: 'g2d:drawFade', ctxVar: 'ctx', percent: n(100), color: '#090b18' },
                {
                  type: 'g2d:drawPixelText',
                  ctxVar: 'ctx',
                  text: 'CONTINUAR?',
                  x: n(128),
                  y: n(78),
                  size: n(3),
                  color: '#ffffff',
                  align: 'center',
                },
                {
                  type: 'g2d:drawPixelText',
                  ctxVar: 'ctx',
                  text: 'START RECOMEÇA O MUNDO',
                  x: n(128),
                  y: n(132),
                  size: n(1),
                  color: '#f7cf45',
                  align: 'center',
                },
                {
                  type: 'if',
                  cond: { type: 'g2d:actionPressed', action: 'start' },
                  then: [
                    { type: 'assign', name: 'vidas1', value: n(3) },
                    {
                      type: 'assign',
                      name: 'vidas2',
                      value: {
                        type: 'ternary',
                        condition: equals(variable('jogadores'), 2),
                        whenTrue: n(3),
                        whenFalse: n(0),
                      },
                    },
                    {
                      type: 'assign',
                      name: 'faseJ1',
                      value: worldStartPhase(variable('faseJ1')),
                    },
                    {
                      type: 'assign',
                      name: 'faseJ2',
                      value: worldStartPhase(variable('faseJ2')),
                    },
                    { type: 'assign', name: 'poderJ1', value: n(1) },
                    { type: 'assign', name: 'poderJ2', value: n(1) },
                    { type: 'assign', name: 'jogador', value: n(1) },
                    { type: 'callFunction', name: 'carregarJogador', args: [] },
                    loadActiveLevel(),
                    { type: 'g2d:setScene', name: 'jogando' },
                  ],
                },
              ],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'final' },
              then: [
                { type: 'g2d:drawFade', ctxVar: 'ctx', percent: n(100), color: '#090b18' },
                {
                  type: 'g2d:drawPixelText',
                  ctxVar: 'ctx',
                  text: 'REINO SALVO!',
                  x: n(128),
                  y: n(66),
                  size: n(3),
                  color: '#ffe058',
                  align: 'center',
                },
                {
                  type: 'g2d:drawPixelText',
                  ctxVar: 'ctx',
                  text: '32 FASES / 2 JORNADAS',
                  x: n(128),
                  y: n(116),
                  size: n(1),
                  color: '#ffffff',
                  align: 'center',
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'PONTOS',
                  value: variable('pontos'),
                  x: n(88),
                  y: n(145),
                  color: '#ffffff',
                  size: n(12),
                },
                {
                  type: 'g2d:drawPixelText',
                  ctxVar: 'ctx',
                  text: 'START PARA VOLTAR',
                  x: n(128),
                  y: n(188),
                  size: n(1),
                  color: '#f7cf45',
                  align: 'center',
                },
                {
                  type: 'if',
                  cond: { type: 'g2d:actionPressed', action: 'start' },
                  then: [{ type: 'g2d:restart' }],
                },
              ],
            },
          ],
        },
        {
          type: 'g2d:everyFrames',
          n: n(60),
          body: [
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'jogando' },
              then: [
                { type: 'assign', name: 'tempo', value: binary('-', variable('tempo'), n(1)) },
              ],
            },
          ],
        },
      ],
    },
    extensions: [{ extensionId: 'game-2d' }],
  },
})

export const reinoZeroLevelNames = Array.from({ length: LAST_LEVEL }, (_, index) =>
  levelName(index + 1),
)
