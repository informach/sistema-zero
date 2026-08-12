import { z } from 'zod'
import type { JSExpr, JSStatement } from '../../ir/schema'

type IdField = { __id: z.ZodOptional<z.ZodString> }
const ACTIONS = [
  'left',
  'right',
  'up',
  'down',
  'jump',
  'action',
  'select',
  'start',
  'pause',
] as const

/** Schemas do lote clássico ficam na extensão, não na fachada central da IR. */
export function classicGameTwoDExpressionSchemas(
  expr: z.ZodType<JSExpr>,
  irText: () => z.ZodString,
  id: IdField,
) {
  return [
    z.object({ type: z.literal('g2d:actionDown'), action: z.enum(ACTIONS), ...id }),
    z.object({ type: z.literal('g2d:actionPressed'), action: z.enum(ACTIONS), ...id }),
    z.object({ type: z.literal('g2d:tileContactIs'), contactVar: irText(), index: expr, ...id }),
  ] as const
}

export function classicGameTwoDStatementSchemas(
  expr: z.ZodType<JSExpr>,
  statement: z.ZodType<JSStatement>,
  irText: () => z.ZodString,
  id: IdField,
) {
  const numeric = z.union([expr, z.number()])
  return [
    z.object({
      type: z.literal('g2d:onActionPressed'),
      action: z.enum(ACTIONS),
      body: z.array(statement),
      ...id,
    }),
    z.object({
      type: z.literal('g2d:setEnemyStompMode'),
      typeVar: irText(),
      mode: z.enum(['defeat', 'damage', 'squash', 'shell', 'spiky']),
      ...id,
    }),
    z.object({
      type: z.literal('g2d:updateEnemyShells'),
      typeVar: irText(),
      worldVar: irText(),
      ...id,
    }),
    z.object({
      type: z.literal('g2d:enableClassicControls'),
      mode: z.enum(['auto', 'always', 'off']),
      ...id,
    }),
    z.object({
      type: z.literal('g2d:classicPlatformer'),
      spriteVar: irText(),
      speed: numeric,
      jump: numeric,
      ...id,
    }),
    z.object({
      type: z.literal('g2d:createVectorTileset'),
      varName: irText(),
      size: numeric,
      ...id,
    }),
    z.object({
      type: z.literal('g2d:defineVectorTile'),
      tilesetVar: irText(),
      index: numeric,
      shape: irText(),
      role: z.enum(['decor', 'solid', 'platform']),
      ...id,
    }),
    z.object({
      type: z.literal('g2d:createVectorTileMap'),
      varName: irText(),
      tilesetVar: irText(),
      grid: irText(),
      ...id,
    }),
    z.object({
      type: z.literal('g2d:forEachTileContact'),
      spriteVar: irText(),
      mapVar: irText(),
      side: z.enum(['any', 'head', 'feet', 'left', 'right']),
      contactName: irText(),
      body: z.array(statement),
      ...id,
    }),
    z.object({
      type: z.literal('g2d:setTileAtContact'),
      contactVar: irText(),
      index: numeric,
      ...id,
    }),
    z.object({
      type: z.literal('g2d:drawPixelText'),
      ctxVar: irText(),
      text: irText(),
      x: numeric,
      y: numeric,
      size: numeric,
      color: irText(),
      align: z.enum(['left', 'center', 'right']),
      ...id,
    }),
    z.object({
      type: z.literal('g2d:drawFade'),
      ctxVar: irText(),
      percent: numeric,
      color: irText(),
      ...id,
    }),
  ] as const
}
