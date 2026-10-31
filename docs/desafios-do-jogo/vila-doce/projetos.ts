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
 * A corrida do entregador (A15, revisão de 31/10/2026): o jogo do Corre, Dino! do Inventor com o
 * tema da Vila. O entregador do Bento é o dinossauro do Jogo 2D, as pedras são os obstáculos do
 * mesmo kit e o fundo é a rua da Vila. Cada quadro deixa uma parte do jogo para completar, na
 * ordem das aulas do curso: pulo com gravidade, pedras que entram, começar e recomeçar, a batida
 * com a área justa, o sorteio com limites e a dificuldade com teto. Os desafios do dia partem do
 * jogo inteiro.
 */
export const VARIACOES = [
  'pulo',
  'pedras',
  'partida',
  'batida',
  'sorteio',
  'corrida',
  'pulo-alto',
  'pombos',
  'descricao',
] as const
export type Variacao = (typeof VARIACOES)[number]

/** Palco do Corre, Dino!, chão do kit (a 16% da base) e os números da corrida. */
export const PISTA = {
  largura: 480,
  altura: 270,
  /** O pé do entregador parado no chão: 270 − 43 − 56. */
  chao: 171,
  x: 70,
  y: 150,
  tamanho: 56,
  pulo: 13,
  puloFraco: 9,
  pedra: 36,
  pedraGrande: 60,
  velocidade: -5,
  limite: -9,
  area: 80,
} as const

/** O que cada variação deixa para completar; o gabarito liga a parte, o inicial não. */
type Parte =
  | 'gravidade'
  | 'pedras'
  | 'entrada'
  | 'batida'
  | 'sorteio'
  | 'ritmo'
  | 'puloForte'
  | 'pombos'
  | 'descricao'
/** O extra opcional de cada variação, que o inicial também não tem. */
type Extra = 'somDoPulo' | 'efeitos' | 'telaComMetros' | 'boloDourado'

export const PARTE: Record<Variacao, Parte> = {
  pulo: 'gravidade',
  pedras: 'pedras',
  partida: 'entrada',
  batida: 'batida',
  sorteio: 'sorteio',
  corrida: 'ritmo',
  'pulo-alto': 'puloForte',
  pombos: 'pombos',
  descricao: 'descricao',
}
export const EXTRA: Record<Variacao, Extra> = {
  pulo: 'somDoPulo',
  pedras: 'efeitos',
  partida: 'telaComMetros',
  batida: 'efeitos',
  sorteio: 'somDoPulo',
  // A proposta: "★ Desafio extra: um bolo dourado que vale o dobro" (lacunas, 01/11/2026).
  corrida: 'boloDourado',
  'pulo-alto': 'somDoPulo',
  pombos: 'efeitos',
  descricao: 'telaComMetros',
}

const n = (value: number): JSExpr => ({ type: 'num', value })
const s = (value: string): JSExpr => ({ type: 'str', value })
const v = (name: string): JSExpr => ({ type: 'var', name })
const cena = (name: string): JSExpr => ({ type: 'g2d:sceneIs', name })
const irPara = (name: string): JSStatement => ({ type: 'g2d:setScene', name })
const sorteio = (min: number, max: number): JSExpr => ({
  type: 'g2d:randomBetween',
  min: n(min),
  max: n(max),
})
const somar = (name: string, delta: number): JSStatement => ({
  type: 'assign',
  name,
  // O bloco "somar" do Blockly escreve `x - 1` para um passo negativo.
  value: { type: 'binop', op: delta < 0 ? '-' : '+', left: v(name), right: n(Math.abs(delta)) },
})
const se = (
  cond: JSExpr,
  then: JSStatement[],
  elseif?: { cond: JSExpr; then: JSStatement[] }[],
): JSStatement => ({ type: 'if', cond, then, ...(elseif ? { elseif } : {}) }) as JSStatement
/** Um "senão se" do Se (o campo `then` é o da IR). */
const senaoSe = (cond: JSExpr, then: JSStatement[]) => ({ cond, then })
const tela = (title: JSExpr, subtitle: JSExpr, hint: string): JSStatement => ({
  type: 'g2d:showScreen',
  ctxVar: 'ctx',
  title,
  subtitle,
  hint: s(hint),
  bg: '#5b3a2e',
})

const svg = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`
const loja = (x: number, cor: string, nome: string) =>
  `<g transform="translate(${x} 96)"><rect x="8" y="22" width="112" height="110" rx="10" fill="#fff4d8" stroke="#805953" stroke-width="3"/><path d="M2 30 20 6h88l18 24z" fill="${cor}"/><path d="M5 40h118v16H5z" fill="${cor}"/><path d="M20 40v16m28-16v16m28-16v16m28-16v16" stroke="#fff2de" stroke-width="11"/><rect x="20" y="66" width="30" height="30" rx="6" fill="#9bd6df" stroke="#805953" stroke-width="2"/><rect x="74" y="66" width="32" height="66" rx="8" fill="#c99072"/><text x="64" y="26" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="12" fill="#493c56">${nome}</text></g>`
/** A rua da Vila Doce: o chão do kit fica em y 227, onde começa a calçada. */
const VILA = svg(
  480,
  270,
  `<rect width="480" height="270" fill="#bfe6f2"/><g fill="#fff" opacity=".8"><ellipse cx="80" cy="40" rx="34" ry="11"/><ellipse cx="330" cy="30" rx="42" ry="12"/></g>${loja(14, '#f2b56a', 'BENTO')}${loja(176, '#ca9acb', 'DOCES')}${loja(338, '#8fc7a4', 'SUCOS')}<rect y="227" width="480" height="43" fill="#d8c3a5"/><path d="M0 227h480" stroke="#9c7b5f" stroke-width="3"/><g fill="#c7ad8c"><rect x="20" y="240" width="38" height="10" rx="3"/><rect x="110" y="252" width="38" height="10" rx="3"/><rect x="200" y="240" width="38" height="10" rx="3"/><rect x="290" y="252" width="38" height="10" rx="3"/><rect x="380" y="240" width="38" height="10" rx="3"/></g>`,
)
/** O bolo dourado do extra da corrida (a arte dos telhados e das chaminés vem do L11). */
const BOLO = svg(
  32,
  32,
  '<ellipse cx="16" cy="25" rx="14" ry="5" fill="#c99a2e"/><rect x="4" y="12" width="24" height="13" rx="4" fill="#f5c542" stroke="#a87a1c" stroke-width="2"/><path d="M4 16q6 4 12 0t12 0" fill="none" stroke="#fff2c2" stroke-width="3"/><circle cx="16" cy="8" r="4" fill="#e85d5d"/>',
)
const assets: ProjectAsset[] = [
  {
    id: 'vila-rua',
    name: 'vila',
    kind: 'image',
    source: 'library',
    dataUrl: `data:image/svg+xml;base64,${Buffer.from(VILA).toString('base64')}`,
  },
  {
    id: 'vila-bolo-dourado',
    name: 'bolo',
    kind: 'image',
    source: 'library',
    dataUrl: `data:image/svg+xml;base64,${Buffer.from(BOLO).toString('base64')}`,
  },
]

/** O bolo dourado anda pela rua na altura do entregador e volta ao começo (blocos do Faísca). */
const BOLO_DOURADO = { x: 560, y: 175, tamanho: 28, passo: -4 } as const
const velocidadeDo = (vx: number, vy: number): JSStatement => ({
  type: 'g2d:setVelocity',
  spriteVar: 'bolo',
  vx: n(vx),
  vy: n(vy),
})
/** Leva o bolo ao começo da rua, com velocidade e borda, e deixa ele andando de novo. */
function boloAoComeco(): JSStatement[] {
  return [
    velocidadeDo(-640, -480),
    { type: 'g2d:applyVelocity', spriteVar: 'bolo' },
    { type: 'g2d:clampToScreen', spriteVar: 'bolo', ctxVar: 'ctx' },
    velocidadeDo(BOLO_DOURADO.x, BOLO_DOURADO.y),
    { type: 'g2d:applyVelocity', spriteVar: 'bolo' },
    velocidadeDo(BOLO_DOURADO.passo, 0),
  ]
}

const DESCRICAO_COMPLETA =
  'Leve os doces do Bento pela rua: pule as pedras com Espaço, com a seta para cima ou com um toque na tela.'
const DESCRICAO_CURTA = 'A corrida do entregador da Vila Doce.'

/** O jogo inteiro, com as partes que faltam desligadas. */
function jogo(variacao: Variacao, liga: (p: Parte | Extra) => boolean): SZIRV2 {
  const largadaDoPulo = liga('puloForte') ? PISTA.pulo : PISTA.puloFraco
  const pedra: JSStatement = {
    type: 'g2d:spawnObstacle',
    groupVar: 'pedras',
    ctxVar: 'ctx',
    // Os pombos só voam no desafio deles; nos outros, só pedras.
    shape: variacao === 'pombos' && liga('pombos') ? 'random' : 'rock',
    x: liga('sorteio') ? sorteio(500, 560) : n(520),
    // O sorteio com limites (aula 12): o lugar de entrada e o tamanho de cada pedra.
    size:
      variacao === 'pulo-alto'
        ? n(PISTA.pedraGrande)
        : liga('sorteio')
          ? sorteio(28, 44)
          : n(PISTA.pedra),
    vx: v('velocidade'),
  }
  const start: JSStatement[] = [
    { type: 'g2d:setupStage', width: n(PISTA.largura), height: n(PISTA.altura), bg: '#bfe6f2' },
    {
      type: 'g2d:setStageDescription',
      description: liga('descricao') ? DESCRICAO_COMPLETA : DESCRICAO_CURTA,
    },
    {
      type: 'g2d:createDino',
      varName: 'entregador',
      x: n(PISTA.x),
      y: n(PISTA.y),
      size: n(PISTA.tamanho),
      color: '#f2a65a',
    },
    { type: 'g2d:createGroup', varName: 'pedras' },
    irPara('inicio'),
    ...(liga('batida')
      ? [
          {
            type: 'g2d:setHitboxScale',
            spriteVar: 'entregador',
            percent: n(PISTA.area),
          } as JSStatement,
        ]
      : []),
    { type: 'var', name: 'metros', value: n(0) },
    { type: 'var', name: 'velocidade', value: n(PISTA.velocidade) },
    // O bolo dourado só aparece na corrida do entregador (o quadro 6), pronto no cenário.
    ...(variacao === 'corrida'
      ? [
          {
            type: 'g2d:createImageSprite',
            varName: 'bolo',
            image: 'bolo',
            x: BOLO_DOURADO.x,
            y: BOLO_DOURADO.y,
            w: BOLO_DOURADO.tamanho,
            h: BOLO_DOURADO.tamanho,
          } as JSStatement,
          velocidadeDo(BOLO_DOURADO.passo, 0),
        ]
      : []),
  ]
  const events: JSStatement[] = [
    ...(liga('somDoPulo')
      ? [
          {
            type: 'g2d:onJump',
            spriteVar: 'entregador',
            body: [{ type: 'g2d:playFx', fx: 'jump' }],
          } as JSStatement,
        ]
      : []),
    {
      type: 'g2d:onAnyInput',
      body: liga('entrada')
        ? [
            se(
              cena('inicio'),
              [irPara('jogando')],
              [senaoSe(cena('fim'), [{ type: 'g2d:restart' }])],
            ),
          ]
        : [],
    },
  ]
  // O extra da corrida: pegar o bolo dourado vale 2 metros de uma vez, o dobro de um segundo.
  if (variacao === 'corrida')
    events.push({
      type: 'g2d:onOverlap',
      aVar: 'entregador',
      bVar: 'bolo',
      body: liga('boloDourado') ? [somar('metros', 2), ...boloAoComeco()] : [],
    })
  const batida: JSStatement[] = liga('batida')
    ? [
        ...(liga('efeitos')
          ? [
              { type: 'g2d:explode', spriteVar: 'pedra', color: '#f2b56a' } as JSStatement,
              { type: 'g2d:shake', ctxVar: 'ctx', intensity: n(6) } as JSStatement,
            ]
          : []),
        { type: 'g2d:playFx', fx: 'gameover' },
        irPara('fim'),
      ]
    : []
  const loops: JSStatement[] = [
    {
      type: 'g2d:updateEachFrame',
      body: [
        { type: 'g2d:clear' },
        { type: 'g2d:drawBackdrop', ctxVar: 'ctx', image: 'vila' },
        se(
          cena('jogando'),
          [
            ...(liga('gravidade')
              ? [
                  { type: 'g2d:applyGravity', spriteVar: 'entregador' } as JSStatement,
                  {
                    type: 'g2d:controlDino',
                    spriteVar: 'entregador',
                    ctxVar: 'ctx',
                    jump: n(largadaDoPulo),
                  } as JSStatement,
                ]
              : []),
            { type: 'g2d:drawSprite', spriteVar: 'entregador', ctxVar: 'ctx' },
            ...(variacao === 'corrida'
              ? [
                  { type: 'g2d:applyVelocity', spriteVar: 'bolo' } as JSStatement,
                  se(
                    {
                      type: 'binop',
                      op: '<',
                      left: { type: 'g2d:spriteX', spriteVar: 'bolo' },
                      right: n(-40),
                    },
                    boloAoComeco(),
                  ),
                  { type: 'g2d:drawSprite', spriteVar: 'bolo', ctxVar: 'ctx' } as JSStatement,
                ]
              : []),
            { type: 'g2d:updateGroup', groupVar: 'pedras' },
            { type: 'g2d:drawGroup', groupVar: 'pedras', ctxVar: 'ctx' },
            {
              type: 'g2d:onSpriteGroupOverlap',
              spriteVar: 'entregador',
              groupVar: 'pedras',
              itemName: 'pedra',
              body: batida,
            },
            {
              type: 'g2d:pruneOffscreen',
              groupVar: 'pedras',
              ctxVar: 'ctx',
              itemName: 'pedra',
              body: [],
            },
            {
              type: 'g2d:drawScore',
              ctxVar: 'ctx',
              label: 'Metros: ',
              value: v('metros'),
              x: n(12),
              y: n(30),
              color: '#493c56',
              size: n(22),
            },
          ],
          [
            senaoSe(cena('inicio'), [
              tela(
                s('A corrida do entregador'),
                s('Leve os doces do Bento pela rua.'),
                'Aperte uma tecla ou toque na tela para começar',
              ),
            ]),
            senaoSe(cena('fim'), [
              tela(
                s('Fim da corrida'),
                s('Uma pedra derrubou o entregador.'),
                'Aperte uma tecla ou toque para correr de novo',
              ),
              ...(liga('telaComMetros')
                ? [
                    {
                      type: 'g2d:drawScore',
                      ctxVar: 'ctx',
                      label: 'Metros: ',
                      value: v('metros'),
                      x: n(190),
                      y: n(240),
                      color: '#fff4d8',
                      size: n(22),
                    } as JSStatement,
                  ]
                : []),
            ]),
          ],
        ),
      ],
    },
    {
      type: 'g2d:everySeconds',
      seconds: n(1.4),
      body: [
        se(cena('jogando'), [
          ...(liga('pedras') ? [pedra] : []),
          // A dificuldade com teto (aula 13 do Corre, Dino!): cada pedra nova deixa a próxima
          // mais rápida, até o limite.
          ...(liga('ritmo')
            ? [
                se({ type: 'binop', op: '>', left: v('velocidade'), right: n(PISTA.limite) }, [
                  somar('velocidade', -1),
                ]),
              ]
            : []),
        ]),
      ],
    },
    {
      type: 'g2d:everySeconds',
      seconds: n(1),
      body: [se(cena('jogando'), [somar('metros', 1)])],
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

export function montarProjeto(variacao: Variacao, pronto: boolean): Project {
  const falta = PARTE[variacao]
  const extra = EXTRA[variacao]
  const ir = assignStableIdsToIR(
    jogo(variacao, (p) => pronto || (p !== falta && p !== extra)),
    `vila_${variacao.replace('-', '_')}`,
  )
  const name = 'A corrida do entregador'
  return {
    ...createEmptyProject(`vila-doce-${variacao}`, name),
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
