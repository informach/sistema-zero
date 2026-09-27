import {
  FAROL_ASSETS,
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
const TAMANHO = { w: 640, h: 360 }

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
  { type: 'g2d:setupStage', width: TAMANHO.w, height: TAMANHO.h, bg: '#b9dfd0' },
  {
    type: 'g2d:createImageSprite',
    varName: 'personagem',
    x: 170,
    y: 130,
    w: 40,
    h: 48,
    image: 'personagem',
  },
  { type: 'g2d:createImageSprite', varName: 'chave', x: 328, y: 171, w: 40, h: 40, image: 'chave' },
  {
    type: 'g2d:createImageSprite',
    varName: 'farol',
    x: 485,
    y: 72,
    w: 100,
    h: 154,
    image: 'farol-apagado',
  },
  { type: 'g2d:createImageSprite', varName: 'barco', x: 655, y: 267, w: 72, h: 50, image: 'barco' },
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

/** O efeito do barco é preparado; a criança constrói a regra que o dispara. */
const barcoChega: JSStatement = {
  type: 'if',
  cond: { type: 'var', name: 'ganhou' },
  then: [
    {
      type: 'if',
      cond: {
        type: 'binop',
        op: '>',
        left: { type: 'memberGet', object: { type: 'var', name: 'barco' }, name: 'x' },
        right: { type: 'num', value: 530 },
      },
      then: [
        {
          type: 'memberSet',
          object: { type: 'var', name: 'barco' },
          name: 'x',
          value: {
            type: 'binop',
            op: '-',
            left: { type: 'memberGet', object: { type: 'var', name: 'barco' }, name: 'x' },
            right: { type: 'num', value: 1.5 },
          },
        },
      ],
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
    html: [{ type: 'canvas', id: 'tela', width: TAMANHO.w, height: TAMANHO.h }],
    css: [
      {
        selector: 'body',
        declarations: {
          margin: '0',
          background: '#b9dfd0',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'min-height': '100vh',
          'padding-bottom': '108px',
          'box-sizing': 'border-box',
        },
      },
    ],
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
            {
              type: 'g2d:drawLabel',
              ctxVar: 'ctx',
              text: { type: 'var', name: 'aviso' },
              x: 20,
              y: 32,
              color: '#263a45',
              size: 19,
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
