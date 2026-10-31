import type {
  DesafioDoManifesto,
  PublicoDoDesafio,
} from '../../../packages/arquipelago-contracts/src/desafios'
import {
  DesafioDoManifestoSchema,
  MOEDAS_PADRAO_POR_TIPO,
} from '../../../packages/arquipelago-contracts/src/desafios'
import type {
  ExecutionExpectation,
  ExecutionStep,
  SectionExecutionRule,
} from '../../../packages/core/src/learning/project-execution'
import type { SectionJavaScriptProjectCheck } from '../../../packages/core/src/learning/section-progression'
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
 * A chuva de pinhas (A42, revisão de 31/10/2026): os quadros 1 a 5 do Bosque trabalham o centro do
 * Construtor com o repertório da Nave Contra Asteroides. O vento derruba pinhas bem em cima de onde
 * o coelho está; ele joga bolotas para quebrá-las, tem três vidas, perde quando elas acabam e
 * começa outra partida do zero. Cada quadro deixa uma parte para completar: o grupo das pinhas, as
 * bolotas, o encontro dos dois grupos, as vidas e a derrota com o recomeço. O quadro 6 continua
 * sendo a corrida dos bichos (o minijogo da proposta), em `projetos.ts`.
 *
 * As pinhas nascem na coluna do coelho (o centro dele na hora): é o que deixa o executor conferir
 * o jogo sem depender de sorte, e é o que obriga a criança a sair do lugar.
 */
export type QuadroInicialDoBosque = 1 | 2 | 3 | 4 | 5
type Parte = 'pinhas' | 'bolotas' | 'quebrar' | 'vidas' | 'derrota'
type Extra = 'som' | 'efeitos' | 'tremer' | 'vitoria'
const PARTE: Record<QuadroInicialDoBosque, Parte> = {
  1: 'pinhas',
  2: 'bolotas',
  3: 'quebrar',
  4: 'vidas',
  5: 'derrota',
}
const EXTRA: Record<QuadroInicialDoBosque, Extra> = {
  1: 'som',
  2: 'efeitos',
  3: 'tremer',
  4: 'som',
  5: 'vitoria',
}

export const QUADROS_INICIAIS_DO_BOSQUE = [
  {
    slug: 'chuva-de-pinhas',
    titulo: 'Pinhas caindo',
    texto:
      'O vento derruba pinhas do pinheiro grande, mas no jogo do coelho elas ainda não caem. A Capi quer que, de tempos em tempos, uma pinha caia do alto bem em cima de onde o coelho está, para ele precisar sair do lugar.',
    dicas: [
      'O relógio da partida já marca a hora de uma pinha nova.',
      'A pinha nasce acima da tela, no meio do coelho, e cai devagar.',
      'As pinhas moram num grupo: o grupo já anda, se desenha e tira o que saiu da tela.',
    ],
  },
  {
    slug: 'bolotas-para-o-alto',
    titulo: 'Bolotas para o alto',
    texto:
      'O coelho guarda bolotas na toca. A Capi quer que a barra de espaço faça o coelho jogar uma bolota para cima, saindo de onde ele está, só durante a partida.',
    dicas: [
      'As bolotas também moram num grupo, separado do das pinhas.',
      'A bolota sai do meio do coelho e sobe: a velocidade para cima é negativa.',
      'Na tela de abertura e na de fim, o espaço não joga nada.',
    ],
  },
  {
    slug: 'quebrar-as-pinhas',
    titulo: 'Quebrar as pinhas',
    texto:
      'As bolotas atravessam as pinhas sem acontecer nada. A Capi quer que, quando uma bolota encontra uma pinha, as duas sumam e o placar ganhe um ponto.',
    dicas: [
      'Há um encontro entre o grupo das bolotas e o das pinhas esperando a sua regra.',
      'Tire a bolota do grupo dela e a pinha do grupo dela.',
      'O ponto conta uma vez a cada encontro.',
    ],
  },
  {
    slug: 'tres-vidas',
    titulo: 'Três vidas',
    texto:
      'Quando uma pinha cai no coelho, nada muda. A Capi quer que o coelho comece cada partida com três vidas, mostradas em corações, e perca uma a cada pinha que cair nele.',
    dicas: [
      'As vidas do coelho começam junto com a partida.',
      'A pinha que acerta o coelho já some; falta tirar uma vida dele.',
      'Os corações mostram quantas vidas sobraram.',
    ],
  },
  {
    slug: 'fim-e-outra-partida',
    titulo: 'Fim e outra partida',
    texto:
      'Mesmo sem vidas, o coelho continua no jogo. A Capi quer que a partida acabe quando as vidas acabarem e que Enter, na tela de fim, comece tudo de novo, com as vidas e os pontos do começo.',
    dicas: [
      'Confira a cada quadro se as vidas do coelho acabaram.',
      'O fim é uma tela do jogo, como a abertura.',
      'Recomeçar o jogo zera tudo o que a partida mudou.',
    ],
  },
] as const

const n = (value: number): JSExpr => ({ type: 'num', value })
const s = (value: string): JSExpr => ({ type: 'str', value })
const v = (name: string): JSExpr => ({ type: 'var', name })
const cena = (name: string): JSExpr => ({ type: 'g2d:sceneIs', name })
const irPara = (name: string): JSStatement => ({ type: 'g2d:setScene', name })
const se = (
  cond: JSExpr,
  then: JSStatement[],
  elseif?: { cond: JSExpr; then: JSStatement[] }[],
): JSStatement => ({ type: 'if', cond, then, ...(elseif ? { elseif } : {}) }) as JSStatement
/** Um "senão se" do Se (o campo `then` é o da IR). */
const senaoSe = (cond: JSExpr, then: JSStatement[]) => ({ cond, then })
const tela = (title: string, hint: string): JSStatement => ({
  type: 'g2d:showScreen',
  ctxVar: 'ctx',
  title: s(title),
  subtitle: s(''),
  hint: s(hint),
  bg: '#1f4a3a',
})
const tirar = (spriteVar: string, groupVar: string): JSStatement => ({
  type: 'g2d:removeFromGroup',
  spriteVar,
  groupVar,
})
const svg = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`
const pinheiro = (x: number, y: number, e: number) =>
  `<g transform="translate(${x} ${y}) scale(${e})"><rect x="-8" y="70" width="16" height="40" fill="#7b4f2c"/><path d="M0-40 50 40H-50zM0-10 60 75H-60z" fill="#2f7a4f"/></g>`
const assets: ProjectAsset[] = Object.entries({
  coelho: svg(
    48,
    48,
    '<ellipse cx="15" cy="12" rx="6" ry="11" fill="#faf4db"/><ellipse cx="33" cy="12" rx="6" ry="11" fill="#faf4db"/><circle cx="24" cy="29" r="18" fill="#faf4db"/><circle cx="18" cy="26" r="2"/><circle cx="30" cy="26" r="2"/><path d="m21 32 3 3 3-3" fill="#c97780"/>',
  ),
  bosque: svg(
    640,
    480,
    `<rect width="640" height="480" fill="#d9eec4"/>${pinheiro(90, 120, 1.4)}${pinheiro(320, 80, 1.8)}${pinheiro(550, 130, 1.3)}<rect y="440" width="640" height="40" fill="#8bbf6a"/><g fill="#6aa553"><circle cx="40" cy="444" r="16"/><circle cx="200" cy="446" r="14"/><circle cx="430" cy="444" r="16"/><circle cx="600" cy="446" r="14"/></g>`,
  ),
}).map(([name, source]) => ({
  id: `bosque-${name}`,
  name,
  kind: 'image',
  source: 'library',
  dataUrl: `data:image/svg+xml;base64,${Buffer.from(source).toString('base64')}`,
}))

/** O jogo inteiro, com as partes que faltam desligadas. */
function jogo(liga: (p: Parte | Extra) => boolean): SZIRV2 {
  const start: JSStatement[] = [
    { type: 'g2d:setupStage', width: n(640), height: n(480), bg: '#d9eec4' },
    // O pad da extensão no celular: setas andam, A joga a bolota (espaço) e + é o Enter.
    { type: 'g2d:enableClassicControls', mode: 'always' },
    {
      type: 'g2d:createImageSprite',
      varName: 'coelho',
      image: 'coelho',
      x: 296,
      y: 392,
      w: 48,
      h: 48,
    },
    { type: 'g2d:createGroup', varName: 'pinhas' },
    { type: 'g2d:createGroup', varName: 'bolotas' },
    { type: 'var', name: 'pontos', value: n(0) },
    ...(liga('vidas')
      ? [{ type: 'g2d:setHealth', spriteVar: 'coelho', amount: n(3) } as JSStatement]
      : []),
    irPara('inicio'),
  ]
  const recomecos = [
    ...(liga('derrota') ? [senaoSe(cena('fim'), [{ type: 'g2d:restart' }])] : []),
    ...(liga('vitoria') ? [senaoSe(cena('vitoria'), [{ type: 'g2d:restart' }])] : []),
  ]
  const events: JSStatement[] = [
    {
      type: 'g2d:onKey',
      key: 'Enter',
      body: [se(cena('inicio'), [irPara('jogando')], recomecos.length ? recomecos : undefined)],
    },
    {
      type: 'g2d:onKey',
      key: 'Space',
      body: liga('bolotas')
        ? [
            se(cena('jogando'), [
              {
                type: 'g2d:spawnBullet',
                groupVar: 'bolotas',
                x: { type: 'g2d:centerX', spriteVar: 'coelho' },
                y: { type: 'g2d:spriteY', spriteVar: 'coelho' },
                radius: n(6),
                color: '#a8743a',
                vx: n(0),
                vy: n(-9),
              },
              ...(liga('som') ? [{ type: 'g2d:playFx', fx: 'shoot' } as JSStatement] : []),
            ]),
          ]
        : [],
    },
  ]
  const jogando: JSStatement[] = [
    { type: 'g2d:arrowsX', spriteVar: 'coelho', speed: n(6) },
    { type: 'g2d:clampToScreen', spriteVar: 'coelho', ctxVar: 'ctx' },
    { type: 'g2d:drawSprite', spriteVar: 'coelho', ctxVar: 'ctx' },
    { type: 'g2d:updateGroup', groupVar: 'bolotas' },
    {
      type: 'g2d:pruneOffscreen',
      groupVar: 'bolotas',
      ctxVar: 'ctx',
      itemName: 'sprite',
      body: [],
    },
    { type: 'g2d:drawGroup', groupVar: 'bolotas', ctxVar: 'ctx' },
    { type: 'g2d:updateGroup', groupVar: 'pinhas' },
    { type: 'g2d:pruneOffscreen', groupVar: 'pinhas', ctxVar: 'ctx', itemName: 'sprite', body: [] },
    { type: 'g2d:drawGroup', groupVar: 'pinhas', ctxVar: 'ctx' },
    {
      type: 'g2d:onGroupOverlap',
      aGroup: 'bolotas',
      aName: 'bolota',
      bGroup: 'pinhas',
      bName: 'pinha',
      body: liga('quebrar')
        ? [
            tirar('bolota', 'bolotas'),
            tirar('pinha', 'pinhas'),
            ...(liga('efeitos')
              ? [{ type: 'g2d:explode', spriteVar: 'pinha', color: '#c58b4a' } as JSStatement]
              : []),
            {
              type: 'assign',
              name: 'pontos',
              value: { type: 'binop', op: '+', left: v('pontos'), right: n(1) },
            },
          ]
        : [],
    },
    {
      type: 'g2d:drawScore',
      ctxVar: 'ctx',
      label: 'Pontos:',
      value: v('pontos'),
      x: n(12),
      y: n(30),
      color: '#1f4a3a',
      size: n(24),
    },
    {
      type: 'g2d:onSpriteGroupOverlap',
      spriteVar: 'coelho',
      groupVar: 'pinhas',
      itemName: 'pinha',
      body: [
        tirar('pinha', 'pinhas'),
        ...(liga('vidas')
          ? [
              {
                type: 'g2d:damageSprite',
                spriteVar: 'coelho',
                amount: n(1),
                invincibilityFrames: n(45),
              } as JSStatement,
            ]
          : []),
        ...(liga('tremer')
          ? [{ type: 'g2d:shake', ctxVar: 'ctx', intensity: n(6) } as JSStatement]
          : []),
      ],
    },
    ...(liga('vidas')
      ? [
          {
            type: 'g2d:drawSpriteHealth',
            ctxVar: 'ctx',
            spriteVar: 'coelho',
            style: 'hearts',
            x: n(12),
            y: n(48),
            size: n(22),
            color: '#e0565b',
          } as JSStatement,
        ]
      : []),
    ...(liga('vitoria')
      ? [se({ type: 'binop', op: '>=', left: v('pontos'), right: n(10) }, [irPara('vitoria')])]
      : []),
    ...(liga('derrota')
      ? [se({ type: 'g2d:healthDepleted', spriteVar: 'coelho' }, [irPara('fim')])]
      : []),
  ]
  const loops: JSStatement[] = [
    {
      type: 'g2d:updateEachFrame',
      body: [
        { type: 'g2d:clear' },
        { type: 'g2d:drawBackdrop', ctxVar: 'ctx', image: 'bosque' },
        se(cena('jogando'), jogando, [
          senaoSe(cena('inicio'), [
            tela('A chuva de pinhas', 'Aperte Enter para começar. Setas andam, espaço joga bolota'),
          ]),
          senaoSe(cena('fim'), [tela('As vidas acabaram', 'Aperte Enter para jogar de novo')]),
          ...(liga('vitoria')
            ? [
                senaoSe(cena('vitoria'), [
                  tela('Você quebrou dez pinhas', 'Aperte Enter para jogar de novo'),
                ]),
              ]
            : []),
        ]),
      ],
    },
    {
      type: 'g2d:everyFrames',
      n: n(60),
      body: [
        se(
          cena('jogando'),
          liga('pinhas')
            ? [
                {
                  type: 'g2d:spawnAsteroid',
                  groupVar: 'pinhas',
                  x: { type: 'g2d:centerX', spriteVar: 'coelho' },
                  y: n(-30),
                  size: n(34),
                  color: '#8a5a32',
                  vx: n(0),
                  vy: n(3),
                },
              ]
            : [],
        ),
      ],
    },
  ]
  return {
    version: 2,
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-2d' }],
    behavior: { start, events, loops },
  }
}

export function projetoDoQuadroBosque(quadro: QuadroInicialDoBosque, pronto: boolean): Project {
  const meta = QUADROS_INICIAIS_DO_BOSQUE[quadro - 1]!
  const falta = PARTE[quadro]
  const extra = EXTRA[quadro]
  const ir = assignStableIdsToIR(
    jogo((p) => pronto || (p !== falta && p !== extra)),
    `bosque_${meta.slug.replaceAll('-', '_')}`,
  )
  const name = 'A chuva de pinhas'
  return {
    ...createEmptyProject(`bosque-${meta.slug}`, name),
    programmingLanguage: 'javascript',
    mode: 'blocks',
    createdAt: 0,
    updatedAt: 0,
    ir,
    blocksState: buildWorkspaceStateFromIR(ir),
    files: generateProjectFiles({ ir, projectName: name }),
    assets,
    installedExtensions: [{ id: 'game-2d', version: '1.2.0', installedAt: 0 }],
  }
}

const tecla = (key: string): ExecutionStep => ({ action: 'press', key, holdMs: 30 })
const largada = tecla('Enter')
const espaco = tecla('Space')
const wait = (ms: number): ExecutionStep => ({ action: 'wait', ms })
const val = (
  path: string,
  compare: ExecutionExpectation['compare'],
  value: number,
): ExecutionExpectation => ({ target: { kind: 'value', path }, compare, value })
type Points = Extract<SectionExecutionRule, { type: 'behavior' }>['checkpoints']
/** `afterStep` conta os passos a partir de 1; o 0 é antes do primeiro. */
const point = (
  afterStep: number,
  path: string,
  compare: ExecutionExpectation['compare'],
  value: number,
) => ({ afterStep, expect: val(path, compare, value) })
const behavior = (
  id: string,
  label: string,
  steps: ExecutionStep[],
  expect: ExecutionExpectation,
  checkpoints?: Points,
): SectionJavaScriptProjectCheck => ({
  id,
  label,
  programmingLanguage: 'javascript',
  rule: { type: 'behavior', steps, expect, ...(checkpoints ? { checkpoints } : {}) },
})
const estrutura = (
  id: string,
  label: string,
  rule: Omit<Extract<SectionJavaScriptProjectCheck['rule'], { type: 'usesBlock' }>, 'type'>,
  optional = false,
): SectionJavaScriptProjectCheck => ({
  id,
  label,
  programmingLanguage: 'javascript',
  ...(optional ? { optional: true as const } : {}),
  rule: { type: 'usesBlock', ...rule },
})
const jogandoCond = { blockType: 'sz_g2d_scene_is', fields: { SCENE: 'jogando' } }

const EXTRAS: Record<Extra, SectionJavaScriptProjectCheck> = {
  som: estrutura(
    'som-da-bolota',
    'Extra: um som toca a cada bolota jogada.',
    {
      blockType: 'sz_g2d_play_fx',
      area: 'events',
      withinBlock: 'sz_g2d_on_key',
      fields: { FX: 'shoot' },
    },
    true,
  ),
  efeitos: estrutura(
    'pinha-explode',
    'Extra: a pinha quebrada explode.',
    {
      blockType: 'sz_g2d_explode',
      area: 'loops',
      withinBlock: 'sz_g2d_on_group_overlap',
      fields: { SPRITE: 'pinha' },
    },
    true,
  ),
  tremer: estrutura(
    'tela-treme',
    'Extra: a tela treme quando uma pinha cai no coelho.',
    { blockType: 'sz_g2d_shake', area: 'loops', withinBlock: 'sz_g2d_on_sprite_group_overlap' },
    true,
  ),
  vitoria: estrutura(
    'vitoria',
    'Extra: quebrar dez pinhas leva à tela de vitória.',
    {
      blockType: 'sz_js_if_else',
      area: 'loops',
      withinBlock: 'sz_g2d_update_each_frame',
      inputBlocks: {
        COND: { blockType: 'sz_val_compare', fields: { OP: '>=' } },
        THEN: { blockType: 'sz_g2d_set_scene', fields: { SCENE: 'vitoria' } },
      },
    },
    true,
  ),
}

const principais: Record<QuadroInicialDoBosque, SectionJavaScriptProjectCheck[]> = {
  1: [
    behavior(
      'pinhas-caem',
      'Depois da largada, pinhas caem no grupo das pinhas.',
      [largada, wait(1800)],
      val('pinhas.items.length', 'atLeast', 1),
    ),
    estrutura('pinha-no-relogio', 'As pinhas nascem no relógio da partida, no grupo pinhas.', {
      blockType: 'sz_g2d_every_frames',
      area: 'loops',
      inputBlocks: {
        BODY: {
          blockType: 'sz_js_if_else',
          inputBlocks: {
            COND: jogandoCond,
            THEN: { blockType: 'sz_g2d_spawn_asteroid', fields: { GROUP: 'pinhas' } },
          },
        },
      },
    }),
  ],
  2: [
    behavior(
      'joga-bolota',
      'Na partida, espaço joga uma bolota no grupo das bolotas.',
      [largada, wait(300), espaco, wait(150)],
      val('bolotas.items.length', 'atLeast', 1),
    ),
    estrutura('bolota-so-na-partida', 'A bolota só sai durante a partida.', {
      blockType: 'sz_g2d_on_key',
      area: 'events',
      fields: { KEY: 'Space' },
      inputBlocks: {
        BODY: {
          blockType: 'sz_js_if_else',
          inputBlocks: {
            COND: jogandoCond,
            THEN: { blockType: 'sz_g2d_spawn_bullet', fields: { GROUP: 'bolotas' } },
          },
        },
      },
    }),
  ],
  3: [
    behavior(
      'quebra',
      'Uma bolota que encontra uma pinha soma um ponto.',
      [largada, wait(1500), espaco, wait(500), espaco, wait(500), espaco, wait(500)],
      val('pontos', 'atLeast', 1),
    ),
    estrutura('somem-as-duas', 'No encontro, a bolota e a pinha saem dos grupos delas.', {
      blockType: 'sz_g2d_on_group_overlap',
      area: 'loops',
      inputBlocksAll: {
        BODY: [
          { blockType: 'sz_g2d_remove_from_group', fields: { SPRITE: 'bolota', GROUP: 'bolotas' } },
          { blockType: 'sz_g2d_remove_from_group', fields: { SPRITE: 'pinha', GROUP: 'pinhas' } },
          { blockType: 'sz_js_var_increment', fields: { NAME: 'pontos' } },
        ],
      },
    }),
  ],
  4: [
    behavior(
      'perde-vida',
      'O coelho começa com três vidas e perde uma quando uma pinha cai nele.',
      [largada, wait(4200)],
      val('coelho.hp', 'atMost', 2),
      [point(1, 'coelho.hp', 'equals', 3)],
    ),
    estrutura('tres-vidas', 'As vidas do coelho começam em 3.', {
      blockType: 'sz_g2d_set_health',
      area: 'start',
      fields: { SPRITE: 'coelho' },
      inputs: { AMOUNT: 3 },
    }),
  ],
  5: [
    behavior(
      'fim-e-recomeco',
      'Sem vidas, a partida acaba; Enter na tela de fim começa outra com três vidas.',
      [largada, wait(7500), largada, wait(300)],
      val('coelho.hp', 'equals', 3),
      [point(2, 'coelho.hp', 'atMost', 0)],
    ),
    estrutura('derrota', 'Quando as vidas acabam, o jogo vai para a tela de fim.', {
      blockType: 'sz_js_if_else',
      area: 'loops',
      withinBlock: 'sz_g2d_update_each_frame',
      inputBlocks: {
        COND: { blockType: 'sz_g2d_health_depleted', fields: { SPRITE: 'coelho' } },
        THEN: { blockType: 'sz_g2d_set_scene', fields: { SCENE: 'fim' } },
      },
    }),
  ],
}

export function objetivosDoQuadroBosque(
  quadro: QuadroInicialDoBosque,
): SectionJavaScriptProjectCheck[] {
  return [...principais[quadro], EXTRAS[EXTRA[quadro]]]
}

const TEXTO_DO_EXTRA: Record<Extra, string> = {
  som: 'Faça um som tocar a cada bolota que o coelho joga.',
  efeitos: 'Faça a pinha quebrada explodir.',
  tremer: 'Faça a tela tremer quando uma pinha cair no coelho.',
  vitoria: 'Crie uma tela de vitória para quem quebrar dez pinhas, e Enter recomeça dela também.',
}

export function desafiosIniciaisDoBosque(publico: PublicoDoDesafio): DesafioDoManifesto[] {
  return QUADROS_INICIAIS_DO_BOSQUE.map((meta, i) => {
    const quadro = (i + 1) as QuadroInicialDoBosque
    const moedas = MOEDAS_PADRAO_POR_TIPO['quadro-das-cores']
    return DesafioDoManifestoSchema.parse({
      slug: `bosque-${meta.slug}${publico === 'adulto' ? '-adulto' : ''}`,
      publico,
      ilha: 'bosque',
      tipo: 'quadro-das-cores',
      quadro,
      ordem: quadro * 10,
      // §6.28 A1: o Bosque publica (todos os blocos têm fonte nos cursos até o Construtor).
      publicar: true,
      conteudo: {
        versao: 1,
        titulo: meta.titulo,
        enunciado: meta.texto,
        dicas: [...meta.dicas],
        projetoInicial: projetoDoQuadroBosque(quadro, false),
        gabarito: projetoDoQuadroBosque(quadro, true),
        objetivos: objetivosDoQuadroBosque(quadro),
        desafioExtra: { titulo: 'Mais um desafio', texto: TEXTO_DO_EXTRA[EXTRA[quadro]] },
        recompensa: {
          cor: true,
          atracao: 'chuva-de-pinhas',
          moedas: moedas.principal,
          moedasExtra: moedas.extra,
        },
        blocosManuais: { acrescentar: [], retirar: [] },
      },
    })
  })
}
