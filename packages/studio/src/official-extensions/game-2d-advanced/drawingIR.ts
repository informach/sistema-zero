import { z } from 'zod'
import type { JSExpr, JSStatement } from '../../ir/schema'

interface DrawingCommon {
  __id?: string
  color: JSExpr
}

/** Figures are complete drawing operations; no mutable Canvas state leaks into the lesson. */
export type GameKitDrawingStatement = DrawingCommon &
  (
    | { type: 'gk:drawRectangle'; x: JSExpr; y: JSExpr; w: JSExpr; h: JSExpr }
    | { type: 'gk:drawCircle'; x: JSExpr; y: JSExpr; r: JSExpr }
    | {
        type: 'gk:drawTriangle'
        x1: JSExpr
        y1: JSExpr
        x2: JSExpr
        y2: JSExpr
        x3: JSExpr
        y3: JSExpr
      }
    | { type: 'gk:drawText'; text: JSExpr; x: JSExpr; y: JSExpr; size: JSExpr }
  )

export const GAME_KIT_DRAWING_STATEMENT_TYPES = [
  'gk:drawRectangle',
  'gk:drawCircle',
  'gk:drawTriangle',
  'gk:drawText',
] as const

const types: ReadonlySet<string> = new Set(GAME_KIT_DRAWING_STATEMENT_TYPES)

export function isGameKitDrawingStatement(s: JSStatement): s is GameKitDrawingStatement {
  return types.has(s.type)
}

export function gameKitDrawingSchemas(
  expr: z.ZodType<JSExpr>,
  id: { __id: z.ZodOptional<z.ZodString> },
) {
  const common = { color: expr, ...id }
  return [
    z.object({
      type: z.literal('gk:drawRectangle'),
      x: expr,
      y: expr,
      w: expr,
      h: expr,
      ...common,
    }),
    z.object({ type: z.literal('gk:drawCircle'), x: expr, y: expr, r: expr, ...common }),
    z.object({
      type: z.literal('gk:drawTriangle'),
      x1: expr,
      y1: expr,
      x2: expr,
      y2: expr,
      x3: expr,
      y3: expr,
      ...common,
    }),
    z.object({
      type: z.literal('gk:drawText'),
      text: expr,
      x: expr,
      y: expr,
      size: expr,
      ...common,
    }),
  ] as const
}
