/** Autoria de documentos. Não é runtime, currículo, nem parte importada pelo jogo. */

import type { GameCausalityStep } from '../../../packages/core/src/learning/game-causality'
import type { ExecutionStep } from '../../../packages/core/src/learning/project-execution'
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
 * O projeto autoral depois do Farol (C03b, 30/10/2026). A régua do posto Lenda pede um projeto
 * com critérios explícitos e escopo pequeno, aproveitando o que já foi aprendido, sem linguagem
 * nova. Os critérios são causais (um encontro com efeito, uma informação que muda nele, uma
 * decisão que usa essa informação e um recomeço, todos em código que pode rodar) e um de
 * execução (o guia anda): nenhum pede um nome de variável, uma imagem ou uma regra pronta. O
 * gabarito é só um exemplo de como cumprir.
 *
 * À altura do posto Lenda (lacunas, 01/11/2026): a Jornada pede um projeto que combine mecânicas
 * já aprendidas. O critério `combina` confere, em código que roda, as mecânicas dos três postos de
 * blocos: a decisão com lembrança do Faísca, o grupo criado por relógio com encontro do
 * Construtor e a gravidade com pulo do Inventor. O extra virou a versão 2: depois de aprovado,
 * testar com outra pessoa, mudar o jogo e enviar de novo (o serviço do jogo confere a mudança).
 * Feito, o projeto vai para a revisão humana na Sala do Professor.
 */
const bool = (value: boolean): JSExpr => ({ type: 'bool', value })
const num = (value: number): JSExpr => ({ type: 'num', value })
const v = (name: string): JSExpr => ({ type: 'var', name })
const iff = (cond: JSExpr, then: JSStatement[]): JSStatement => ({
  type: 'if',
  cond,
  then,
  else: [],
})
const assign = (name: string, value: boolean): JSStatement => ({
  type: 'assign',
  name,
  value: bool(value),
})
const image = (varName: string, asset: string, x: number, y: number): JSStatement => ({
  type: 'g2d:createImageSprite',
  varName,
  image: asset,
  x,
  y,
  w: 48,
  h: 48,
})
const draw = (spriteVar: string): JSStatement => ({
  type: 'g2d:drawSprite',
  ctxVar: 'ctx',
  spriteVar,
})
const label = (text: string, x: number, y: number): JSStatement => ({
  type: 'g2d:drawLabel',
  ctxVar: 'ctx',
  text,
  x,
  y,
  size: 18,
  color: '#2c2a4a',
  align: 'left',
})

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">${body}</svg>`
const arts = {
  guia: svg(
    '<circle cx="24" cy="25" r="18" fill="#f2b84b"/><circle cx="18" cy="21" r="3" fill="#3b2a1a"/><circle cx="30" cy="21" r="3" fill="#3b2a1a"/><path d="M17 31q7 6 14 0" fill="none" stroke="#3b2a1a" stroke-width="2"/>',
  ),
  estrela: svg(
    '<path d="m24 4 6 13 14 2-10 10 3 14-13-7-13 7 3-14L4 19l14-2Z" fill="#ffd94a" stroke="#c99a12" stroke-width="2"/>',
  ),
  farol: svg(
    '<path d="M18 44 20 14h8l2 30Z" fill="#f4f1ea" stroke="#5b5878" stroke-width="2"/><path d="M19 24h10M19 34h10" stroke="#d9534f" stroke-width="4"/><rect x="17" y="6" width="14" height="8" rx="2" fill="#ffe680" stroke="#5b5878" stroke-width="2"/>',
  ),
  concha: svg(
    '<path d="M24 6C10 8 4 24 8 38h32c4-14-2-30-16-32Z" fill="#f7c9b8" stroke="#c9826d" stroke-width="2"/><path d="M24 8v30M16 12l-4 26m20-26 4 26" stroke="#c9826d" stroke-width="2"/>',
  ),
  lumi: svg(
    '<circle cx="24" cy="26" r="14" fill="#9fe0ff"/><circle cx="24" cy="26" r="20" fill="#9fe0ff" opacity=".3"/><circle cx="19" cy="24" r="2.5" fill="#1f3a52"/><circle cx="29" cy="24" r="2.5" fill="#1f3a52"/>',
  ),
}
const assets: ProjectAsset[] = Object.entries(arts).map(([name, body]) => ({
  id: `farol-${name}`,
  name,
  kind: 'image',
  source: 'library',
  dataUrl: `data:image/svg+xml;base64,${Buffer.from(body).toString('base64')}`,
}))

export const MEU_JOGO = {
  slug: 'meu-jogo-do-arquipelago',
  titulo: 'Meu jogo do Arquipélago',
  texto:
    'Agora o jogo é seu. O guia está no palco e há desenhos para usar: estrela, farol, concha e Lumi. Antes de montar, escolha o objetivo do jogo e três coisas que ele vai ter. Combine o que você aprendeu nos três postos de blocos: um encontro que o jogo lembra e usa numa decisão, coisas que um relógio cria num grupo e que o guia encontra, e gravidade com pulo. Os critérios estão na lista de objetivos. O resto é escolha sua.',
  dicas: [
    'Comece pelo guia andando. Depois escolha um encontro e o que o jogo vai lembrar dele.',
    'O relógio do Construtor cria coisas num grupo; o encontro com o grupo precisa fazer alguma coisa.',
    'Do Inventor vêm a gravidade e o pulo. Os dois juntos fazem o guia cair e pular.',
    'Se travar, lembre do Pega-conchas, da Nave e do Corre Dino: um jogo de cada posto.',
  ],
  extra:
    'Versão 2: depois de aprovado, peça para outra pessoa jogar, mude o jogo pelo que o teste mostrou e envie de novo.',
} as const

export function projetoDoMeuJogo(pronto: boolean): Project {
  const start: JSStatement[] = [
    { type: 'g2d:setupStage', width: 640, height: 480, bg: '#e9e4ff' },
    { type: 'g2d:enableClassicControls', mode: 'always' },
    image('guia', 'guia', 48, 240),
  ]
  const events: JSStatement[] = []
  const movement: JSStatement[] = []
  const drawing: JSStatement[] = [label(MEU_JOGO.titulo, 20, 35)]
  const timers: JSStatement[] = []
  if (pronto) {
    // Um exemplo de cumprir os critérios: levar a estrela até o farol para acender, pulando as
    // pedras que o relógio solta. O guia corre e pula como o Dino (Inventor); as pedras são um
    // grupo criado por relógio (Construtor); a estrela é lembrada e decide o farol (Faísca).
    start.splice(2, 1, {
      type: 'g2d:createDino',
      varName: 'guia',
      x: num(48),
      y: num(300),
      size: num(56),
      color: '#f2b84b',
    })
    start.push(
      { type: 'var', name: 'temEstrela', value: bool(false) },
      { type: 'var', name: 'aceso', value: bool(false) },
      image('estrela', 'estrela', 260, 352),
      image('farol', 'farol', 560, 352),
      { type: 'g2d:createGroup', varName: 'pedras' },
    )
    movement.push(
      { type: 'g2d:arrowsX', spriteVar: 'guia', speed: num(5) },
      { type: 'g2d:applyGravity', spriteVar: 'guia' },
      { type: 'g2d:controlDino', spriteVar: 'guia', ctxVar: 'ctx', jump: num(14) },
      { type: 'g2d:clampToScreen', spriteVar: 'guia', ctxVar: 'ctx' },
      { type: 'g2d:updateGroup', groupVar: 'pedras' },
      {
        type: 'g2d:onSpriteGroupOverlap',
        spriteVar: 'guia',
        groupVar: 'pedras',
        itemName: 'pedra',
        body: [{ type: 'g2d:explode', spriteVar: 'pedra', color: '#9a8f86' }],
      },
    )
    // O relógio é uma raiz da área dos laços, ao lado do "a cada quadro".
    timers.push({
      type: 'g2d:everySeconds',
      seconds: num(2.5),
      body: [
        {
          type: 'g2d:spawnObstacle',
          groupVar: 'pedras',
          ctxVar: 'ctx',
          shape: 'rock',
          x: { type: 'g2d:randomBetween', min: num(660), max: num(760) },
          size: num(28),
          vx: num(-3),
        },
      ],
    })
    events.push(
      {
        type: 'g2d:onOverlap',
        aVar: 'guia',
        bVar: 'estrela',
        body: [assign('temEstrela', true), { type: 'g2d:destroySprite', spriteVar: 'estrela' }],
      },
      {
        type: 'g2d:onOverlap',
        aVar: 'guia',
        bVar: 'farol',
        body: [iff(v('temEstrela'), [assign('aceso', true)])],
      },
      { type: 'g2d:onKey', key: 'Enter', body: [{ type: 'g2d:restart' }] },
    )
    drawing.push(
      { type: 'g2d:drawGroup', groupVar: 'pedras', ctxVar: 'ctx' },
      draw('estrela'),
      draw('farol'),
      iff(v('aceso'), [label('O farol acendeu.', 20, 70)]),
    )
  }
  drawing.push(draw('guia'))
  const source: SZIRV2 = {
    version: 2,
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-2d' }],
    behavior: {
      start,
      events,
      loops: [
        { type: 'g2d:updateEachFrame', body: [...movement, { type: 'g2d:clear' }, ...drawing] },
        ...timers,
      ],
    },
  }
  const ir = assignStableIdsToIR(source, 'farol-meu-jogo')
  return {
    ...createEmptyProject(`farol-${MEU_JOGO.slug}`, MEU_JOGO.titulo),
    programmingLanguage: 'javascript',
    mode: 'blocks',
    createdAt: 0,
    updatedAt: 0,
    ir,
    blocksState: buildWorkspaceStateFromIR(ir),
    files: generateProjectFiles({ ir, projectName: MEU_JOGO.titulo }),
    assets,
    installedExtensions: [{ id: 'game-2d', version: '1.2.0', installedAt: 0 }],
  }
}

/**
 * Encontro, lembrança, decisão e recomeço pela regra causal (`gameCausality`, revisão de
 * 30/10/2026): os nomes e os desenhos continuam livres, mas só conta o que pode rodar. Contar
 * blocos aprovava o projeto com cada evento dentro de um `Se falso`.
 */
const causal = (
  id: string,
  label: string,
  step: GameCausalityStep,
  optional = false,
): SectionJavaScriptProjectCheck => ({
  id,
  label,
  programmingLanguage: 'javascript',
  ...(optional ? { optional: true } : {}),
  rule: { type: 'gameCausality', actor: 'guia', step },
})
const right = (ms: number): ExecutionStep => ({ action: 'press', key: 'ArrowRight', holdMs: ms })

export function objetivosDoMeuJogo(): SectionJavaScriptProjectCheck[] {
  return [
    {
      id: 'anda',
      label: 'A seta para a direita leva o guia pelo palco.',
      programmingLanguage: 'javascript',
      rule: {
        type: 'behavior',
        steps: [right(650)],
        expect: { target: { kind: 'value', path: 'guia.x' }, compare: 'greaterThan', value: 100 },
      },
    },
    causal('encontro', 'Algo acontece quando o guia encontra outro desenho.', 'encounter'),
    causal('lembra', 'No encontro, o jogo guarda uma informação.', 'memory'),
    causal('decide', 'Um Se usa essa informação para decidir o que acontece.', 'decision'),
    causal('recomeca', 'Uma tecla recomeça o jogo.', 'restart'),
    causal(
      'combina',
      'O jogo combina os três postos de blocos: a decisão do Faísca, o grupo com relógio do Construtor e a gravidade com pulo do Inventor.',
      'combination',
    ),
  ]
}
