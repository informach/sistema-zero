import { z } from 'zod'
import type { JSExpr, JSStatement } from '../../ir/schema'
import { SCENE_METHODS, type SceneApiMethod, type SceneTarget, sceneMethod } from './catalog'

type SceneCall = { __id?: string; method: SceneApiMethod; args: JSExpr[] }
export type SceneStatement = SceneCall &
  (
    | { type: 'g2d:sceneCommand' | 'gk:sceneCommand' }
    | {
        type: 'g2d:sceneEvent' | 'gk:sceneEvent' | 'gk:sceneEach'
        body: JSStatement[]
        parameter?: string
      }
  )
export type SceneExpression = SceneCall & { type: 'g2d:sceneValue' | 'gk:sceneValue' }
export const isSceneStatement = (node: JSStatement): node is SceneStatement =>
  node.type === 'g2d:sceneCommand' ||
  node.type === 'gk:sceneCommand' ||
  node.type === 'g2d:sceneEvent' ||
  node.type === 'gk:sceneEvent' ||
  node.type === 'gk:sceneEach'
export const isSceneExpression = (node: JSExpr): node is SceneExpression =>
  node.type === 'g2d:sceneValue' || node.type === 'gk:sceneValue'

export function validSceneArgs(
  method: string,
  args: JSExpr[],
  value: boolean,
  target?: SceneTarget,
): boolean {
  const entry = sceneMethod(method, target)
  return (
    !!entry &&
    !!entry.value === value &&
    args.length === entry.args.length &&
    entry.args.every((arg, index) => {
      const expr = args[index]
      if (!expr) return false
      if (arg.field === 'image' || arg.field === 'animation' || arg.field === 'mold')
        return expr.type === 'str'
      if (arg.field === 'sprite') return expr.type === 'var'
      if (arg.field === 'select')
        return (
          expr.type === (typeof arg.value === 'number' ? 'num' : 'str') &&
          'value' in expr &&
          !!arg.options?.some((option) => option[1] === String(expr.value))
        )
      return true
    })
  )
}

function shape(expr: z.ZodType<JSExpr>) {
  return {
    method: z.enum(
      SCENE_METHODS.map((entry) => entry.method) as [SceneApiMethod, ...SceneApiMethod[]],
    ),
    args: z.array(expr).max(7),
    __id: z.string().optional(),
  }
}
export function sceneExpressionSchemas(expr: z.ZodType<JSExpr>) {
  const valid = (node: SceneCall & { type: string }) =>
    validSceneArgs(node.method, node.args, true, node.type.startsWith('g2d:') ? 'g2d' : 'gk')
  return [
    z
      .object({ type: z.literal('g2d:sceneValue'), ...shape(expr) })
      .refine(valid, 'Argumentos de perspectiva inválidos'),
    z
      .object({ type: z.literal('gk:sceneValue'), ...shape(expr) })
      .refine(valid, 'Argumentos de perspectiva inválidos'),
  ] as const
}
export function sceneStatementSchemas(expr: z.ZodType<JSExpr>, statement: z.ZodType<JSStatement>) {
  const validArgs = (node: SceneCall & { type: string }) =>
    validSceneArgs(node.method, node.args, false, node.type.startsWith('g2d:') ? 'g2d' : 'gk')
  const valid = (node: SceneCall & { type: string }) =>
    validArgs(node) && !sceneMethod(node.method)?.event && !sceneMethod(node.method)?.each
  const callbackValid = (node: SceneCall & { type: string; parameter?: string }) => {
    const entry = sceneMethod(node.method)
    return (
      validArgs(node) &&
      !!entry &&
      (node.type === 'gk:sceneEach' ? !!entry.each : !!entry.event) &&
      (entry.parameter ? !!node.parameter?.trim() : node.parameter === undefined)
    )
  }
  return [
    z
      .object({ type: z.literal('g2d:sceneCommand'), ...shape(expr) })
      .refine(valid, 'Argumentos de perspectiva inválidos'),
    z
      .object({ type: z.literal('gk:sceneCommand'), ...shape(expr) })
      .refine(valid, 'Argumentos de perspectiva inválidos'),
    z
      .object({
        type: z.literal('g2d:sceneEvent'),
        ...shape(expr),
        body: z.array(statement),
        parameter: z.string().optional(),
      })
      .refine(callbackValid, 'Evento de pista inválido'),
    z
      .object({
        type: z.literal('gk:sceneEvent'),
        ...shape(expr),
        body: z.array(statement),
        parameter: z.string().optional(),
      })
      .refine(callbackValid, 'Evento de pista inválido'),
    z
      .object({
        type: z.literal('gk:sceneEach'),
        ...shape(expr),
        body: z.array(statement),
        parameter: z.string(),
      })
      .refine(callbackValid, 'Grupo de pista inválido'),
  ] as const
}
