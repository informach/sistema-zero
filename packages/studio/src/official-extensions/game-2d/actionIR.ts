import { z } from 'zod'
import type { JSExpr, JSStatement } from '../../ir/schema'

export type GameTwoDActionExpression = {
  type: 'g2d:circleTouches'
  aVar: string
  bVar: string
  __id?: string
}
export type GameTwoDActionStatement = { __id?: string } & (
  | { type: 'g2d:destroySprite'; spriteVar: string }
  | {
      type: 'g2d:withCooldown'
      spriteVar: string
      frames: JSExpr
      key: string
      body: JSStatement[]
    }
)
export const GAME_TWO_D_ACTION_STATEMENTS = ['g2d:destroySprite', 'g2d:withCooldown'] as const
export function isGameTwoDAction(s: JSStatement): s is GameTwoDActionStatement {
  return s.type === 'g2d:destroySprite' || s.type === 'g2d:withCooldown'
}
export function gameTwoDActionExpressionSchemas(
  irText: () => z.ZodString,
  id: { __id: z.ZodOptional<z.ZodString> },
) {
  return [
    z.object({ type: z.literal('g2d:circleTouches'), aVar: irText(), bVar: irText(), ...id }),
  ] as const
}
export function gameTwoDActionStatementSchemas(
  expr: z.ZodType<JSExpr>,
  stmt: z.ZodType<JSStatement>,
  irText: () => z.ZodString,
  id: { __id: z.ZodOptional<z.ZodString> },
) {
  return [
    z.object({ type: z.literal('g2d:destroySprite'), spriteVar: irText(), ...id }),
    z.object({
      type: z.literal('g2d:withCooldown'),
      spriteVar: irText(),
      frames: expr,
      key: irText(),
      body: z.array(stmt),
      ...id,
    }),
  ] as const
}
