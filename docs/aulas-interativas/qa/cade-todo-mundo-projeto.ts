import {
  JARDIM_ASSETS,
  JARDIM_BASE_ESCONDERIJOS,
  JARDIM_BASE_PERSONAGENS,
  JARDIM_PARES,
  type JardimAssetName,
  jardimSpriteRect,
  jardimSvg,
} from '../../../packages/studio/src/arte/jardim-assets'
import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import {
  createEmptyProject,
  type Project,
  type ProjectAsset,
} from '../../../packages/studio/src/core/project'
import { generateProjectFiles } from '../../../packages/studio/src/generators/project'
import type { JSStatement, SZIRV2 } from '../../../packages/studio/src/ir/schema'

const NOME = 'Cadê Todo Mundo?'
const TAMANHO = { w: 640, h: 360 }

function image(name: JardimAssetName): ProjectAsset {
  const { width, height } = JARDIM_ASSETS[name]
  return {
    id: `cade-todo-mundo-${name}`,
    name,
    kind: 'image',
    source: 'library',
    dataUrl: `data:image/svg+xml;base64,${Buffer.from(jardimSvg(name)).toString('base64')}`,
    width,
    height,
  }
}

export const ASSETS_CADE_TODO_MUNDO: ProjectAsset[] = [
  image('jardim'),
  image('coelho'),
  image('raposa'),
  image('coruja'),
  image('arbusto'),
  image('pedras'),
  image('flores'),
]

const criarSprites: JSStatement[] = JARDIM_PARES.flatMap(({ personagem, esconderijo, centroX }) => [
  {
    type: 'g2d:createImageSprite',
    varName: personagem,
    ...jardimSpriteRect(personagem, centroX, JARDIM_BASE_PERSONAGENS),
    image: personagem,
  },
  {
    type: 'g2d:createImageSprite',
    varName: esconderijo,
    ...jardimSpriteRect(esconderijo, centroX, JARDIM_BASE_ESCONDERIJOS),
    image: esconderijo,
  },
  { type: 'g2d:addToGroup', spriteVar: esconderijo, groupVar: 'esconderijos' },
])

export const IR_CADE_TODO_MUNDO: SZIRV2 = {
  version: 2,
  // O facilitador Jogo 2D cria e ajusta a tela ao executar `setupStage`.
  // Assim a criança trabalha só com blocos de programação, sem HTML/CSS/Canvas.
  html: [],
  css: [],
  behavior: {
    start: [
      { type: 'g2d:setupStage', width: TAMANHO.w, height: TAMANHO.h, bg: '#c7effb' },
      { type: 'var', name: 'achados', value: { type: 'num', value: 0 } },
      { type: 'g2d:createGroup', varName: 'esconderijos' },
      ...criarSprites,
    ],
    events: [
      {
        type: 'g2d:onGroupClick',
        groupVar: 'esconderijos',
        itemName: 'escolhido',
        body: [],
      },
    ],
    loops: [
      {
        type: 'g2d:updateEachFrame',
        body: [
          { type: 'g2d:clear' },
          { type: 'g2d:drawBackdrop', ctxVar: 'ctx', image: 'jardim' },
          ...JARDIM_PARES.map(({ personagem }) => ({
            type: 'g2d:drawSprite' as const,
            spriteVar: personagem,
            ctxVar: 'ctx',
          })),
          { type: 'g2d:drawGroup', groupVar: 'esconderijos', ctxVar: 'ctx' },
          {
            type: 'g2d:drawScore',
            ctxVar: 'ctx',
            label: 'Achados:',
            value: { type: 'var', name: 'achados' },
            x: 18,
            y: 34,
            color: '#173844',
            size: 24,
          },
          {
            type: 'if',
            cond: {
              type: 'binop',
              op: '>=',
              left: { type: 'var', name: 'achados' },
              right: { type: 'num', value: 3 },
            },
            then: [
              {
                type: 'g2d:drawLabel',
                ctxVar: 'ctx',
                text: { type: 'str', value: 'Você achou todo mundo!' },
                x: 174,
                y: 72,
                color: '#173844',
                size: 27,
                align: 'left',
              },
            ],
            else: [],
          },
        ],
      },
    ],
  },
  extensions: [{ extensionId: 'game-2d' }],
}

export function montarProjetoCadeTodoMundo(primeiroAchadoPronto = false): Project {
  const ir = structuredClone(IR_CADE_TODO_MUNDO)
  if (primeiroAchadoPronto) {
    const evento = ir.behavior.events[0]
    if (evento?.type === 'g2d:onGroupClick') {
      evento.body.push({ type: 'g2d:setOpacity', spriteVar: 'escolhido', percent: 0 })
    }
  }
  return {
    ...createEmptyProject('manifest-cade-todo-mundo', NOME),
    createdAt: 0,
    updatedAt: 0,
    ir,
    blocksState: buildWorkspaceStateFromIR(ir),
    files: generateProjectFiles({ ir, projectName: NOME }),
    assets: ASSETS_CADE_TODO_MUNDO,
    installedExtensions: [{ id: 'game-2d', version: '1.2.0', installedAt: 0 }],
  }
}
