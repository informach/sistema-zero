/** Autoria de documentos. Não é runtime, currículo, nem parte importada pelo jogo. */
import type {
  ExecutionExpectation,
  ExecutionStep,
} from '../../packages/core/src/learning/project-execution'
import type { SectionJavaScriptProjectCheck } from '../../packages/core/src/learning/section-progression'
import { buildWorkspaceStateFromIR } from '../../packages/studio/src/blockly/workspaceState'
import {
  createEmptyProject,
  type Project,
  type ProjectAsset,
} from '../../packages/studio/src/core/project'
import { generateProjectFiles } from '../../packages/studio/src/generators/project'
import { assignStableIdsToIR } from '../../packages/studio/src/ir/ids'
import type { JSExpr, JSStatement, SZIRV2 } from '../../packages/studio/src/ir/schema'

export const n = (value: number): JSExpr => ({ type: 'num', value })
export const v = (name: string): JSExpr => ({ type: 'var', name })
export const bin = (op: '===' | '<' | '>' | '+' | '-', left: JSExpr, right: JSExpr): JSExpr => ({
  type: 'binop',
  op,
  left,
  right,
})
export const eq = (name: string, value: number) => bin('===', v(name), n(value))
export const set = (name: string, value: number): JSStatement => ({
  type: 'assign',
  name,
  value: n(value),
})
export const inc = (name: string, value = 1): JSStatement => ({
  type: 'assign',
  name,
  value: bin(value < 0 ? '-' : '+', v(name), n(Math.abs(value))),
})
export const iff = (
  cond: JSExpr,
  then: JSStatement[],
  otherwise: JSStatement[] = [],
): JSStatement => ({ type: 'if', cond, then, else: otherwise })
export const key = (key: string, body: JSStatement[]): JSStatement => ({
  type: 'g2d:onKey',
  key,
  body,
})
export const each = (groupVar: string, itemName: string, body: JSStatement[]): JSStatement => ({
  type: 'g2d:forEachInGroup',
  groupVar,
  itemName,
  body,
})
export const opacity = (spriteVar: string, percent: number): JSStatement => ({
  type: 'g2d:setOpacity',
  spriteVar,
  percent,
})

export function baseDoQuadro(input: {
  id: string
  titulo: string
  linhas: readonly [string, string]
  assets: ProjectAsset[]
  fundo: string
  cor: string
}) {
  const start: JSStatement[] = [
    { type: 'g2d:setupStage', width: 640, height: 480, bg: '#eef4ed' },
    { type: 'g2d:enableClassicControls', mode: 'always' },
  ]
  const events: JSStatement[] = []
  const update: JSStatement[] = []
  const label = (text: string | JSExpr, x: number, y: number): JSStatement => ({
    type: 'g2d:drawLabel',
    ctxVar: 'ctx',
    text,
    x,
    y,
    size: 18,
    color: input.cor,
    align: 'left',
  })
  const draw: JSStatement[] = [
    { type: 'g2d:drawBackdrop', ctxVar: 'ctx', image: input.fundo },
    label(input.titulo, 24, 34),
    label(input.linhas[0], 24, 70),
    label(input.linhas[1], 24, 101),
  ]
  return {
    start,
    events,
    update,
    vars(values: Record<string, number>) {
      for (const [name, value] of Object.entries(values))
        start.push({ type: 'var', name, value: n(value) })
    },
    image(varName: string, image: string, x: number, y = 210, w = 96, h = 96) {
      start.push({ type: 'g2d:createImageSprite', varName, image, x, y, w, h })
      draw.push({ type: 'g2d:drawSprite', ctxVar: 'ctx', spriteVar: varName })
    },
    placar(text: string, name: string, y = 390) {
      draw.push(label(text, 24, y), label(v(name), 350, y))
    },
    finish(pronto: boolean): Project {
      const ir = assignStableIdsToIR(
        {
          version: 2,
          html: [],
          css: [],
          extensions: [{ extensionId: 'game-2d' }],
          behavior: {
            start,
            events: [...events, key('Enter', pronto ? [{ type: 'g2d:restart' }] : [])],
            loops: [
              {
                type: 'g2d:updateEachFrame',
                body: [
                  ...update,
                  { type: 'g2d:clear' },
                  ...draw,
                  label('Enter: nova rodada depois de completar o extra.', 24, 456),
                ],
              },
            ],
          },
        } satisfies SZIRV2,
        input.id,
      )
      return {
        ...createEmptyProject(input.id, input.titulo),
        programmingLanguage: 'javascript',
        mode: 'blocks',
        createdAt: 0,
        updatedAt: 0,
        ir,
        blocksState: buildWorkspaceStateFromIR(ir),
        files: generateProjectFiles({ ir, projectName: input.titulo }),
        assets: input.assets,
        installedExtensions: [{ id: 'game-2d', version: '1.2.0', installedAt: 0 }],
      }
    },
  }
}

export const press = (key: string): ExecutionStep => ({ action: 'press', key, holdMs: 30 })
export const space = () => press('Space')
export const left = () => press('ArrowLeft')
export const right = () => press('ArrowRight')
export const up = () => press('ArrowUp')
export const wait = (ms: number): ExecutionStep => ({ action: 'wait', ms })
const val = (path: string, value: number): ExecutionExpectation => ({
  target: { kind: 'value', path },
  compare: 'equals',
  value,
})
export const at = (afterStep: number, path: string, expected: number) => ({
  afterStep,
  expect: val(path, expected),
})
export function check(
  id: string,
  label: string,
  steps: ExecutionStep[],
  path: string,
  expected: number,
  checkpoints: ReturnType<typeof at>[] = [],
): SectionJavaScriptProjectCheck {
  return {
    id,
    label,
    programmingLanguage: 'javascript',
    rule: { type: 'behavior', steps, expect: val(path, expected), checkpoints },
  }
}
export function restart(
  steps: ExecutionStep[],
  path: string,
  final: number,
  initial = 0,
): SectionJavaScriptProjectCheck {
  return {
    ...check(
      'recomecar',
      'Extra: Enter começa outra rodada.',
      [...steps, press('Enter')],
      path,
      initial,
      [at(steps.length, path, final)],
    ),
    optional: true,
  }
}
