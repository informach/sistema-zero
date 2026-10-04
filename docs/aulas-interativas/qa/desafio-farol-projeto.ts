import {
  FAROL_ASSETS,
  FAROL_HITBOXES,
  FAROL_LAYOUT,
  type FarolAssetName,
  farolSvg,
} from '../../../packages/studio/src/arte/farol-assets'
import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import {
  createEmptyProject,
  type Project,
  type ProjectAsset,
} from '../../../packages/studio/src/core/project'
import { generateProjectFiles } from '../../../packages/studio/src/generators/project'
import type { JSStatement, SZIRV2 } from '../../../packages/studio/src/ir/schema'

export type DiaDoFarol = 'dia-1' | 'dia-2' | 'dia-3'

const NOME = 'A Chave do Farol'
const TAMANHO = FAROL_LAYOUT.palco

function image(name: FarolAssetName): ProjectAsset {
  const { width, height } = FAROL_ASSETS[name]
  return {
    id: `desafio-farol-${name}`,
    name,
    kind: 'image',
    source: 'library',
    dataUrl: `data:image/svg+xml;base64,${Buffer.from(farolSvg(name)).toString('base64')}`,
    width,
    height,
    ...(FAROL_HITBOXES[name]
      ? {
          sprite: {
            frameW: width,
            frameH: height,
            animations: [{ name: 'parado', from: 0, to: 0, fps: 1, loop: false }],
            hitbox: FAROL_HITBOXES[name],
          },
        }
      : {}),
  }
}

export const ASSETS_FAROL: ProjectAsset[] = [
  image('cenario'),
  image('personagem'),
  image('chave'),
  image('farol-apagado'),
  image('farol-aceso'),
  image('barco'),
]

const saida: JSStatement[] = [
  { type: 'g2d:setupStage', width: TAMANHO.w, height: TAMANHO.h, bg: '#94d5f5' },
  {
    type: 'g2d:createImageSprite',
    varName: 'personagem',
    ...FAROL_LAYOUT.personagem,
    image: 'personagem',
  },
  { type: 'g2d:createImageSprite', varName: 'chave', ...FAROL_LAYOUT.chave, image: 'chave' },
  {
    type: 'g2d:createImageSprite',
    varName: 'farol',
    ...FAROL_LAYOUT.farol,
    image: 'farol-apagado',
  },
  { type: 'g2d:createImageSprite', varName: 'barco', ...FAROL_LAYOUT.barco, image: 'barco' },
  {
    type: 'g2d:setVelocity',
    spriteVar: 'barco',
    vx: { type: 'num', value: -1.5 },
    vy: { type: 'num', value: 0 },
  },
  { type: 'g2d:createSprite', varName: 'fundoAviso', x: 8, y: 8, w: 464, h: 28, color: '#143d35' },
  { type: 'var', name: 'aviso', value: { type: 'str', value: 'Encontre a chave e vá ao farol.' } },
  { type: 'var', name: 'ganhou', value: { type: 'bool', value: false } },
]

const mover: JSStatement[] = [{ type: 'g2d:enableClassicControls', mode: 'directions' }]

const movimentoPorQuadro: JSStatement[] = [
  { type: 'g2d:topDown', spriteVar: 'personagem', speed: 3 },
  { type: 'g2d:clampToScreen', spriteVar: 'personagem', ctxVar: 'ctx' },
]

const pegaChave: JSStatement = {
  type: 'g2d:onOverlap',
  aVar: 'personagem',
  bVar: 'chave',
  body: [
    { type: 'g2d:destroySprite', spriteVar: 'chave' },
    { type: 'assign', name: 'temChave', value: { type: 'bool', value: true } },
    {
      type: 'assign',
      name: 'aviso',
      value: { type: 'str', value: 'Você pegou a chave! Agora vá ao farol.' },
    },
  ],
}

const porta: JSStatement = {
  type: 'g2d:onOverlap',
  aVar: 'personagem',
  bVar: 'farol',
  body: [
    {
      type: 'if',
      cond: { type: 'var', name: 'temChave' },
      then: [
        { type: 'assign', name: 'ganhou', value: { type: 'bool', value: true } },
        { type: 'g2d:setImage', spriteVar: 'farol', image: 'farol-aceso' },
        {
          type: 'assign',
          name: 'aviso',
          value: { type: 'str', value: 'Você acendeu o farol! Olhe o barco chegando.' },
        },
      ],
      else: [
        {
          type: 'assign',
          name: 'aviso',
          value: { type: 'str', value: 'A porta não abriu. Falta a chave.' },
        },
      ],
    },
  ],
}

/** O efeito do barco também usa blocos do Jogo 2D; a criança constrói a regra que o dispara. */
const barcoChega: JSStatement = {
  type: 'if',
  cond: { type: 'var', name: 'ganhou' },
  then: [
    {
      type: 'if',
      cond: {
        type: 'binop',
        op: '>',
        left: { type: 'g2d:spriteX', spriteVar: 'barco' },
        right: { type: 'num', value: FAROL_LAYOUT.chegadaBarcoX },
      },
      then: [{ type: 'g2d:applyVelocity', spriteVar: 'barco' }],
      else: [],
    },
  ],
  else: [],
}

function irFarol(etapa: DiaDoFarol | 'concluido'): SZIRV2 {
  const comMovimento = etapa !== 'dia-1'
  const comChave = etapa === 'dia-3' || etapa === 'concluido'
  const comPorta = etapa === 'concluido'
  return {
    version: 2,
    // O facilitador Jogo 2D cria a tela ao executar setupStage, como no Cadê Todo Mundo.
    // O projeto e a paleta ficam inteiramente em Programação e Jogo 2D.
    html: [],
    css: [],
    behavior: {
      start: [
        ...saida,
        ...(comMovimento ? mover : []),
        ...(comChave
          ? [
              {
                type: 'var' as const,
                name: 'temChave',
                value: { type: 'bool' as const, value: false },
              },
            ]
          : []),
      ],
      events: [...(comChave ? [pegaChave] : []), ...(comPorta ? [porta] : [])],
      loops: [
        {
          type: 'g2d:updateEachFrame',
          body: [
            { type: 'g2d:clear' },
            { type: 'g2d:drawBackdrop', ctxVar: 'ctx', image: 'cenario' },
            ...(comMovimento ? movimentoPorQuadro : []),
            barcoChega,
            { type: 'g2d:drawSprite', spriteVar: 'chave', ctxVar: 'ctx' },
            { type: 'g2d:drawSprite', spriteVar: 'farol', ctxVar: 'ctx' },
            { type: 'g2d:drawSprite', spriteVar: 'barco', ctxVar: 'ctx' },
            { type: 'g2d:drawSprite', spriteVar: 'personagem', ctxVar: 'ctx' },
            { type: 'g2d:drawSprite', spriteVar: 'fundoAviso', ctxVar: 'ctx' },
            {
              type: 'g2d:drawLabel',
              ctxVar: 'ctx',
              text: { type: 'var', name: 'aviso' },
              x: 20,
              y: 28,
              color: '#ffffff',
              size: 16,
              align: 'left',
            },
          ],
        },
      ],
    },
    extensions: [{ extensionId: 'game-2d' }],
  }
}

export function montarProjetoFarol(etapa: DiaDoFarol | 'concluido'): Project {
  const ir = irFarol(etapa)
  return {
    ...createEmptyProject('manifest-desafio-farol', NOME),
    createdAt: 0,
    updatedAt: 0,
    ir,
    blocksState: buildWorkspaceStateFromIR(ir),
    files: generateProjectFiles({ ir, projectName: NOME }),
    assets: ASSETS_FAROL,
    installedExtensions: [{ id: 'game-2d', version: '1.2.0', installedAt: 0 }],
  }
}
