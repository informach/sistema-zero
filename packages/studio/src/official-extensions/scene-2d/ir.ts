import { z } from 'zod'
import type { JSExpr, JSStatement } from '../../ir/schema'
import { SCENE_METHODS, sceneMethod } from './catalog'
import type { SceneTwoDApi } from './contract'

type SceneCall = { __id?: string; method: keyof SceneTwoDApi; args: JSExpr[] }
export type SceneStatement = SceneCall & { type: 'g2d:sceneCommand' | 'gk:sceneCommand' }
export type SceneExpression = SceneCall & { type: 'g2d:sceneValue' | 'gk:sceneValue' }
export const isSceneStatement = (node: JSStatement): node is SceneStatement =>
  node.type === 'g2d:sceneCommand' || node.type === 'gk:sceneCommand'
export const isSceneExpression = (node: JSExpr): node is SceneExpression =>
  node.type === 'g2d:sceneValue' || node.type === 'gk:sceneValue'

export function validSceneArgs(method: string, args: JSExpr[], value: boolean): boolean {
  const entry = sceneMethod(method)
  return (
    !!entry &&
    !!entry.value === value &&
    args.length === entry.args.length &&
    entry.args.every((arg, index) => {
      const expr = args[index]
      if (!expr) return false
      if (arg.field === 'image') return expr.type === 'str'
      if (arg.field === 'select')
        return expr.type === 'str' && !!arg.options?.some((option) => option[1] === expr.value)
      return true
    })
  )
}

function shape(expr: z.ZodType<JSExpr>) {
  return {
    method: z.enum(
      SCENE_METHODS.map((entry) => entry.method) as [keyof SceneTwoDApi, ...(keyof SceneTwoDApi)[]],
    ),
    args: z.array(expr).max(7),
    __id: z.string().optional(),
  }
}
export function sceneExpressionSchemas(expr: z.ZodType<JSExpr>) {
  const valid = (node: SceneCall) => validSceneArgs(node.method, node.args, true)
  return [
    z
      .object({ type: z.literal('g2d:sceneValue'), ...shape(expr) })
      .refine(valid, 'Argumentos de perspectiva inválidos'),
    z
      .object({ type: z.literal('gk:sceneValue'), ...shape(expr) })
      .refine(valid, 'Argumentos de perspectiva inválidos'),
  ] as const
}
export function sceneStatementSchemas(expr: z.ZodType<JSExpr>) {
  const valid = (node: SceneCall) => validSceneArgs(node.method, node.args, false)
  return [
    z
      .object({ type: z.literal('g2d:sceneCommand'), ...shape(expr) })
      .refine(valid, 'Argumentos de perspectiva inválidos'),
    z
      .object({ type: z.literal('gk:sceneCommand'), ...shape(expr) })
      .refine(valid, 'Argumentos de perspectiva inválidos'),
  ] as const
}
