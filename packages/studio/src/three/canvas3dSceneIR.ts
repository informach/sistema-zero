import { z } from 'zod'
import type { JSExpr, JSStatement } from '../ir/schema'

interface ComId {
  __id?: string
}
interface Carregar extends ComId {
  type: 'threeSceneLoad'
  asset: string
  scene: string
  renderer: string
  param: string
  body: JSStatement[]
  errorParam?: string
  errorBody?: JSStatement[]
}
interface Atualizar extends ComId {
  type: 'threeSceneUpdate'
  scene: string
  camera: string
  focus: string
  dt: JSExpr
}
interface LigarFisica extends ComId {
  type: 'physicsLiteScene'
  world: string
  id: string
  scene: string
}
export type Canvas3DSceneStatement = Carregar | Atualizar | LigarFisica

export function canvas3DSceneSchemas(
  expr: z.ZodType<JSExpr>,
  statement: z.ZodType<JSStatement>,
  text: () => z.ZodString,
  id: { __id: z.ZodOptional<z.ZodString> },
) {
  return [
    z.object({
      type: z.literal('threeSceneLoad'),
      asset: z.string().max(64),
      scene: text(),
      renderer: text(),
      param: text(),
      body: z.array(statement),
      errorParam: text().optional(),
      errorBody: z.array(statement).optional(),
      ...id,
    }),
    z.object({
      type: z.literal('threeSceneUpdate'),
      scene: text(),
      camera: text(),
      focus: text(),
      dt: expr,
      ...id,
    }),
    z.object({
      type: z.literal('physicsLiteScene'),
      world: text(),
      id: text(),
      scene: text(),
      ...id,
    }),
  ] as const
}
