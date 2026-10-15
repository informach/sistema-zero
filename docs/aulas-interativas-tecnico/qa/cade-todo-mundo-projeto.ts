import {
  JARDIM_ASSETS,
  JARDIM_BICHOS,
  JARDIM_ESCONDERIJOS,
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

// Todos os bichos e esconderijos vão no projeto, para a criança poder trocar a imagem de cada
// sprite (Aula 2). Bichos têm uma caixa só, e esconderijos outra: a troca não muda tamanho nem lugar.
export const ASSETS_CADE_TODO_MUNDO: ProjectAsset[] = [
  image('jardim'),
  ...JARDIM_BICHOS.map((name) => image(name)),
  ...JARDIM_ESCONDERIJOS.map((name) => image(name)),
]

/** Nomes neutros: trocar a imagem do bicho1 de coelho para gato não deixa o nome mentindo. */
const BICHO = (i: number) => `bicho${i + 1}`
const ESCONDERIJO = (i: number) => `esconderijo${i + 1}`

const criarSprites: JSStatement[] = JARDIM_PARES.flatMap(
  ({ personagem, esconderijo, centroX }, i) => [
    {
      type: 'g2d:createImageSprite',
      varName: BICHO(i),
      ...jardimSpriteRect(personagem, centroX),
      image: personagem,
    },
    {
      type: 'g2d:createImageSprite',
      varName: ESCONDERIJO(i),
      ...jardimSpriteRect(esconderijo, centroX),
      image: esconderijo,
    },
    { type: 'g2d:addToGroup', spriteVar: ESCONDERIJO(i), groupVar: 'esconderijos' },
  ],
)

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
          ...JARDIM_PARES.map((_, i) => ({
            type: 'g2d:drawSprite' as const,
            spriteVar: BICHO(i),
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

/** Cópia somente para jogar na abertura; não é o projeto que a criança vai editar. */
export function montarProjetoCadeTodoMundoCompleto(): Project {
  const ir = structuredClone(IR_CADE_TODO_MUNDO)
  const evento = ir.behavior.events[0]
  if (evento?.type !== 'g2d:onGroupClick') throw new Error('Evento dos esconderijos ausente')
  evento.body.push(
    { type: 'g2d:setOpacity', spriteVar: 'escolhido', percent: 0 },
    {
      type: 'assign',
      name: 'achados',
      value: {
        type: 'binop',
        op: '+',
        left: { type: 'var', name: 'achados' },
        right: { type: 'num', value: 1 },
      },
    },
  )
  return {
    ...montarProjetoCadeTodoMundo(),
    id: 'demonstracao-cade-todo-mundo',
    name: 'Cadê Todo Mundo? (jogo pronto)',
    ir,
    blocksState: buildWorkspaceStateFromIR(ir),
    files: generateProjectFiles({ ir, projectName: NOME }),
  }
}
