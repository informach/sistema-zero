import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import {
  createEmptyProject,
  type Project,
  type ProjectAsset,
} from '../../../packages/studio/src/core/project'
import { generateProjectFiles } from '../../../packages/studio/src/generators/project'
import { assignStableIdsToIR } from '../../../packages/studio/src/ir/ids'
import type { JSExpr, JSStatement, SZIRV2 } from '../../../packages/studio/src/ir/schema'

/**
 * O Guardião dos ninhos do Vale dos Dinos (lacunas, 01/11/2026): a defesa de torre do Arquiteto
 * (a proposta e a Jornada: ondas, caminho e alcance), em blocos e só com o que a trilha ensina
 * (grupo, relógio, encontro com grupo, contas e comparações). A cinza do vulcão desce pelo caminho
 * em ondas; a torre limpa a cinza que entra no alcance dela; a que passa atinge o ninho. Os
 * quadros 1 a 5 montam o jogo um passo de cada vez (`projetoDoGuardiaoEmPassos`) e os desafios do
 * dia mudam uma regra do jogo pronto (`montarProjeto`). Substitui o "Proteja os ninhos", que pedia
 * blocos que nenhum posto ensina (lista, clique em grupo, dados no sprite, opacidade, e/ou).
 */
export const VARIACOES = ['mais-cinzas', 'dois-pontos', 'ondas-contadas', 'onda-limpa'] as const
export type Variacao = (typeof VARIACOES)[number]
export const VALE = {
  largura: 640,
  altura: 480,
  /** O caminho da cinza (x) e de onde ela sai, acima do palco. */
  caminho: 310,
  saida: -20,
  /** A cinza desce 2 por atualização (cerca de 120 por segundo). */
  queda: 2,
  ninho: { x: 288, y: 400, w: 64, h: 64 },
  torre: { x: 420, y: 196, w: 48, h: 72 },
  alcance: { x: 250, y: 170, w: 140, h: 140 },
  /** A primeira onda tem 3 cinzas; com as ondas que crescem, cada onda tem a dela mais 2. */
  cinzasDaPrimeiraOnda: 3,
} as const

const n = (value: number): JSExpr => ({ type: 'num', value })
const v = (name: string): JSExpr => ({ type: 'var', name })
const b = (value: boolean): JSExpr => ({ type: 'bool', value })
const set = (name: string, value: JSExpr): JSStatement => ({ type: 'assign', name, value })
const bin = (op: '===' | '+' | '<', left: JSExpr, right: JSExpr): JSExpr => ({
  type: 'binop',
  op,
  left,
  right,
})
const mais = (name: string, d: number) => set(name, bin('+', v(name), n(d)))
const iff = (cond: JSExpr, then: JSStatement[], otherwise: JSStatement[] = []): JSStatement => ({
  type: 'if',
  cond,
  then,
  else: otherwise,
})
const image = (varName: string, img: string, r: { x: number; y: number; w: number; h: number }) =>
  ({ type: 'g2d:createImageSprite', varName, image: img, ...r }) as JSStatement
const draw = (spriteVar: string): JSStatement => ({
  type: 'g2d:drawSprite',
  ctxVar: 'ctx',
  spriteVar,
})
const label = (text: string | JSExpr, x: number, y: number, size = 17): JSStatement => ({
  type: 'g2d:drawLabel',
  ctxVar: 'ctx',
  text,
  x,
  y,
  size,
  color: '#233e40',
  align: 'left',
})
const placar = (rotulo: string, name: string, x: number, y: number): JSStatement => ({
  type: 'g2d:drawScore',
  ctxVar: 'ctx',
  label: rotulo,
  value: v(name),
  x,
  y,
  size: 17,
  color: '#233e40',
})
const svg = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`
const ovos =
  '<ellipse cx="48" cy="62" rx="43" ry="22" fill="#aa754b" stroke="#6e513a" stroke-width="3"/><path d="M10 65q38 25 76 0M14 74q33 14 68 0" fill="none" stroke="#ddb57d" stroke-width="3"/><ellipse cx="35" cy="52" rx="13" ry="19" fill="#fff0c4" stroke="#c7a778" stroke-width="2"/><ellipse cx="60" cy="51" rx="13" ry="20" fill="#e1e9ba" stroke="#a7b67e" stroke-width="2"/><g fill="#b89478"><circle cx="32" cy="49" r="3"/><circle cx="40" cy="57" r="3"/><circle cx="58" cy="44" r="3"/></g>'
const arte: Record<string, string> = {
  vale: svg(
    640,
    480,
    '<defs><linearGradient id="ceu" x2="0" y2="1"><stop stop-color="#d5eee8"/><stop offset="1" stop-color="#f8edc9"/></linearGradient></defs><rect width="640" height="480" rx="18" fill="url(#ceu)"/><path d="M180 242 282 80 355 80 456 242" fill="#9d968d"/><path d="m282 80 17 23 20-12 18 13 18-24" fill="#c4b9a7"/><path d="M284 68q-30-35 5-42 15-31 42-9 38-2 32 25 29 27-4 35" fill="#b1b7b6" opacity=".8"/><path d="M0 224Q90 185 185 228T400 217T640 230V480H0Z" fill="#98ba81"/><path d="M0 300Q180 260 350 300T640 295V480H0Z" fill="#c3d59c"/><path d="M300 90Q290 250 320 400" fill="none" stroke="#d8c39a" stroke-width="34" stroke-linecap="round" opacity=".7"/><g fill="#669777"><path d="M0 250Q10 170 28 155q30 25 18 102M587 257q-13-55 16-76 23 19 37 84"/></g>',
  ),
  ninho: svg(96, 96, ovos),
  torre: svg(
    48,
    72,
    '<path d="M10 70 14 22h20l4 48Z" fill="#c9a77b" stroke="#6e513a" stroke-width="3"/><path d="M8 24h32l-4-12H12Z" fill="#8c6a48" stroke="#6e513a" stroke-width="3"/><circle cx="24" cy="10" r="7" fill="#7fd0c2" stroke="#356e56" stroke-width="3"/><path d="M18 40h12M18 54h12" stroke="#6e513a" stroke-width="3"/>',
  ),
  alcance: svg(
    140,
    140,
    '<circle cx="70" cy="70" r="66" fill="#7fd0c2" fill-opacity=".18" stroke="#3f9e8c" stroke-width="3" stroke-dasharray="10 8"/>',
  ),
}
export const assetsDoVale: ProjectAsset[] = Object.entries(arte).map(([name, source]) => ({
  id: `vale-${name}`,
  name,
  kind: 'image',
  source: 'library',
  dataUrl: `data:image/svg+xml;base64,${Buffer.from(source).toString('base64')}`,
}))

/** Os passos do jogo (1 a 5) e a variação do desafio do dia, se houver. */
interface Montagem {
  tem: (passo: number) => boolean
  variacao: Variacao | null
  /** A variação já com a regra nova (o gabarito do desafio do dia). */
  mudou: boolean
  titulo: string
  semente: string
  /** O extra (Enter recomeça) já completo. */
  extra: boolean
  /** O relógio da onda aparece do segundo quadro em diante (no segundo, vazio para completar). */
  comRelogio: boolean
}

function fonte(m: Montagem): SZIRV2 {
  const { tem } = m
  const mudou = (x: Variacao) => m.variacao === x && m.mudou
  const comecar = [
    set('emOnda', b(true)),
    mais('onda', 1),
    set('cinzasNaOnda', n(0)),
    ...(tem(5) ? [set('tamanhoDaOnda', bin('+', v('onda'), n(mudou('mais-cinzas') ? 3 : 2)))] : []),
  ]
  const espaco = tem(1)
    ? [
        iff(
          bin('===', v('emOnda'), b(false)),
          // Só três ondas: a quarta não começa.
          mudou('ondas-contadas') ? [iff(bin('<', v('onda'), n(3)), comecar)] : comecar,
        ),
      ]
    : []
  const relogio = tem(2)
    ? [
        iff(v('emOnda'), [
          {
            type: 'g2d:spawnAsteroid',
            groupVar: 'cinzas',
            x: n(VALE.caminho),
            y: n(VALE.saida),
            size: 26,
            color: '#97a2a6',
            vx: n(0),
            vy: n(VALE.queda),
          },
          mais('cinzasNaOnda', 1),
          iff(bin('===', v('cinzasNaOnda'), v('tamanhoDaOnda')), [
            set('emOnda', b(false)),
            ...(mudou('onda-limpa')
              ? [iff(bin('===', v('atingidos'), n(0)), [mais('pontos', 5)])]
              : []),
          ]),
        ]),
      ]
    : []
  const loopDoQuadro: JSStatement[] = [
    { type: 'g2d:updateGroup', groupVar: 'cinzas' },
    // A torre limpa a cinza que entra no alcance dela.
    ...(tem(4)
      ? [
          {
            type: 'g2d:onSpriteGroupOverlap',
            spriteVar: 'alcance',
            groupVar: 'cinzas',
            itemName: 'cinza',
            body: [
              { type: 'g2d:removeFromGroup', spriteVar: 'cinza', groupVar: 'cinzas' },
              mais('pontos', mudou('dois-pontos') ? 2 : 1),
            ],
          } as JSStatement,
        ]
      : []),
    // A cinza que chega ao ninho atinge o ninho.
    ...(tem(3)
      ? [
          {
            type: 'g2d:onSpriteGroupOverlap',
            spriteVar: 'ninho',
            groupVar: 'cinzas',
            itemName: 'cinza',
            body: [
              { type: 'g2d:removeFromGroup', spriteVar: 'cinza', groupVar: 'cinzas' },
              mais('atingidos', 1),
            ],
          } as JSStatement,
        ]
      : []),
    { type: 'g2d:clear' },
    { type: 'g2d:drawBackdrop', ctxVar: 'ctx', image: 'vale' },
    label(m.titulo, 18, 32, 24),
    label('Espaço ou A começa a próxima onda de cinza.', 18, 60, 16),
    draw('alcance'),
    draw('torre'),
    draw('ninho'),
    { type: 'g2d:drawGroup', groupVar: 'cinzas', ctxVar: 'ctx' },
    placar('Onda: ', 'onda', 470, 32),
    placar('Limpas: ', 'pontos', 470, 56),
    placar('No ninho: ', 'atingidos', 470, 80),
  ]
  const inicio: [string, JSExpr][] = [
    ['onda', n(0)],
    ['emOnda', b(false)],
    ['cinzasNaOnda', n(0)],
    ['tamanhoDaOnda', n(VALE.cinzasDaPrimeiraOnda)],
    ['pontos', n(0)],
    ['atingidos', n(0)],
  ]
  return {
    version: 2,
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-2d' }],
    behavior: {
      start: [
        { type: 'g2d:setupStage', width: VALE.largura, height: VALE.altura, bg: '#d5eee8' },
        { type: 'g2d:enableClassicControls', mode: 'auto' },
        ...inicio.map(([name, value]): JSStatement => ({ type: 'var', name, value })),
        { type: 'g2d:createGroup', varName: 'cinzas' },
        image('ninho', 'ninho', VALE.ninho),
        image('torre', 'torre', VALE.torre),
        image('alcance', 'alcance', VALE.alcance),
      ],
      events: [
        { type: 'g2d:onKey', key: 'Space', body: espaco },
        { type: 'g2d:onKey', key: 'Enter', body: m.extra ? [{ type: 'g2d:restart' }] : [] },
      ],
      loops: [
        { type: 'g2d:updateEachFrame', body: loopDoQuadro },
        // O relógio da onda: no segundo quadro vem vazio para completar.
        ...(m.comRelogio
          ? [{ type: 'g2d:everySeconds', seconds: n(1), body: relogio } as JSStatement]
          : []),
      ],
    },
  }
}

function projeto(source: SZIRV2, id: string, titulo: string, semente: string): Project {
  const ir = assignStableIdsToIR(source, semente)
  return {
    ...createEmptyProject(id, titulo),
    programmingLanguage: 'javascript',
    mode: 'blocks',
    createdAt: 0,
    updatedAt: 0,
    ir,
    blocksState: buildWorkspaceStateFromIR(ir),
    files: generateProjectFiles({ ir, projectName: titulo }),
    assets: assetsDoVale,
    installedExtensions: [{ id: 'game-2d', version: '1.2.0', installedAt: 0 }],
  }
}

/** O Guardião montado até o passo do quadro; o passo dele só vem no gabarito. */
export function projetoDoGuardiaoEmPassos(
  quadro: 1 | 2 | 3 | 4 | 5,
  pronto: boolean,
  titulo: string,
): Project {
  const semente = `vale_quadro_${quadro}`
  return projeto(
    fonte({
      tem: (passo) => passo < quadro || (pronto && passo === quadro),
      variacao: null,
      mudou: false,
      titulo,
      semente,
      extra: pronto,
      comRelogio: quadro >= 2,
    }),
    `vale-quadro-${quadro}`,
    titulo,
    semente,
  )
}

export const TITULO_DAS_VARIACOES: Record<Variacao, string> = {
  'mais-cinzas': 'Guardião dos ninhos: ondas maiores',
  'dois-pontos': 'Guardião dos ninhos: dois pontos',
  'ondas-contadas': 'Guardião dos ninhos: três ondas',
  'onda-limpa': 'Guardião dos ninhos: onda limpa',
}

/** O desafio do dia: o Guardião pronto, com uma regra a mudar. */
export function montarProjeto(variacao: Variacao, pronto: boolean): Project {
  const titulo = TITULO_DAS_VARIACOES[variacao]
  const semente = `vale_${variacao}`
  return projeto(
    fonte({
      tem: () => true,
      variacao,
      mudou: pronto,
      titulo,
      semente,
      extra: pronto,
      comRelogio: true,
    }),
    `vale-${variacao}`,
    titulo,
    semente,
  )
}
