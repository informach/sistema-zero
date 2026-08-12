import { z } from 'zod'
import type { JSExpr } from '../../ir/schema'

type IdField = { __id: z.ZodOptional<z.ZodString> }

export function nativeRuntimeExpressionSchemas(
  expr: z.ZodType<JSExpr>,
  irText: () => z.ZodString,
  id: IdField,
) {
  return [
    z.object({ type: z.literal('jsonLiteral'), json: irText(), ...id }),
    z.object({ type: z.literal('jsonParse'), value: expr, ...id }),
    z.object({ type: z.literal('jsonStringify'), value: expr, ...id }),
    z.object({ type: z.literal('gamepadConnected'), index: expr, ...id }),
    z.object({ type: z.literal('gamepadAxis'), index: expr, axis: expr, ...id }),
    z.object({ type: z.literal('gamepadButton'), index: expr, button: expr, ...id }),
  ] as const
}

export function nativeRuntimeStatementSchemas(expr: z.ZodType<JSExpr>, id: IdField) {
  return [
    z.object({
      type: z.literal('storageRemove'),
      store: z.enum(['local', 'session']),
      key: expr,
      ...id,
    }),
    z.object({
      type: z.literal('somTone'),
      wave: z.enum(['sine', 'square', 'sawtooth', 'triangle']),
      frequency: expr,
      duration: expr,
      level: expr,
      ...id,
    }),
    z.object({ type: z.literal('somNoise'), duration: expr, level: expr, ...id }),
  ] as const
}
