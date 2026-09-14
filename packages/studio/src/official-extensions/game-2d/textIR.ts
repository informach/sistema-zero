import { z } from 'zod'
import type { JSExpr, JSStatement } from '../../ir/schema'

type Id = { __id?: string }
// Dados do Código que não precisam de controles adicionais nos blocos didáticos.
export const textSpriteBlockDataSchema = z.object({
  declarationKind: z.enum(['let', 'var']).optional(),
  eventId: z.string().optional(),
})
export type TextLabelStatement = Id & {
  type: 'g2d:drawLabel'
  ctxVar: string
  text: string | JSExpr
  x: number | JSExpr
  y: number | JSExpr
  color: string
  size: number | JSExpr
  align: 'left' | 'center' | 'right'
}

export type TextSpriteStatement = Id &
  (
    | {
        type: 'g2d:createTextSprite'
        varName: string
        declarationKind?: 'let' | 'var'
        text: JSExpr
        x: JSExpr
        y: JSExpr
      }
    | {
        type: 'g2d:spawnTextInGroup'
        varName?: string
        declarationKind?: 'let' | 'var'
        groupVar: string
        text: JSExpr
        x: JSExpr
        y: JSExpr
      }
    | { type: 'g2d:setSpriteText'; spriteVar: string; text: JSExpr }
    | { type: 'g2d:setTextStyle'; spriteVar: string; size: JSExpr; color: string }
    | {
        type: 'g2d:setTextBox'
        spriteVar: string
        width: JSExpr
        align: 'left' | 'center' | 'right'
        padding: JSExpr
        background: JSExpr
      }
    | {
        type: 'g2d:setTextImage'
        spriteVar: string
        image: string
        valign: 'top' | 'middle' | 'bottom'
      }
    | { type: 'g2d:setSpriteData'; spriteVar: string; key: string; value: JSExpr }
    | { type: 'g2d:onSpriteClick'; spriteVar: string; eventId?: string; body: JSStatement[] }
    | {
        type: 'g2d:onGroupClick'
        groupVar: string
        itemName: string
        eventId?: string
        body: JSStatement[]
      }
  )
export type TextSpriteExpression = Id &
  (
    | { type: 'g2d:spriteText'; spriteVar: string }
    | { type: 'g2d:spriteData'; spriteVar: string; key: string; fallback: JSExpr }
  )

export const TEXT_SPRITE_STATEMENT_TYPES = [
  'g2d:createTextSprite',
  'g2d:spawnTextInGroup',
  'g2d:setSpriteText',
  'g2d:setTextStyle',
  'g2d:setTextBox',
  'g2d:setTextImage',
  'g2d:setSpriteData',
  'g2d:onSpriteClick',
  'g2d:onGroupClick',
] as const
export const TEXT_SPRITE_DECLARATION_FIELDS = {
  'g2d:createTextSprite': 'varName',
  'g2d:spawnTextInGroup': 'varName',
} as const
export const TEXT_SPRITE_EVENT_TYPES = ['g2d:onSpriteClick', 'g2d:onGroupClick'] as const

export function isTextSpriteStatement(value: JSStatement): value is TextSpriteStatement {
  return TEXT_SPRITE_STATEMENT_TYPES.some((type) => type === value.type)
}
export function isTextSpriteExpression(value: JSExpr): value is TextSpriteExpression {
  return value.type === 'g2d:spriteText' || value.type === 'g2d:spriteData'
}
type IdField = { __id: z.ZodOptional<z.ZodString> }
export function textSpriteExpressionSchemas(
  expr: z.ZodType<JSExpr>,
  irText: () => z.ZodString,
  id: IdField,
) {
  return [
    z.object({ type: z.literal('g2d:spriteText'), spriteVar: irText(), ...id }),
    z.object({
      type: z.literal('g2d:spriteData'),
      spriteVar: irText(),
      key: irText(),
      fallback: expr,
      ...id,
    }),
  ] as const
}
export function textSpriteStatementSchemas(
  expr: z.ZodType<JSExpr>,
  statement: z.ZodType<JSStatement>,
  irText: () => z.ZodString,
  id: IdField,
) {
  return [
    z.object({
      type: z.literal('g2d:drawLabel'),
      ctxVar: irText(),
      text: z.union([irText(), expr]),
      x: z.union([expr, z.number()]),
      y: z.union([expr, z.number()]),
      color: irText(),
      size: z.union([expr, z.number()]),
      align: z.enum(['left', 'center', 'right']),
      ...id,
    }),
    z.object({
      type: z.literal('g2d:createTextSprite'),
      varName: irText(),
      declarationKind: textSpriteBlockDataSchema.shape.declarationKind,
      text: expr,
      x: expr,
      y: expr,
      ...id,
    }),
    z.object({
      type: z.literal('g2d:spawnTextInGroup'),
      varName: irText().optional(),
      declarationKind: textSpriteBlockDataSchema.shape.declarationKind,
      groupVar: irText(),
      text: expr,
      x: expr,
      y: expr,
      ...id,
    }),
    z.object({ type: z.literal('g2d:setSpriteText'), spriteVar: irText(), text: expr, ...id }),
    z.object({
      type: z.literal('g2d:setTextStyle'),
      spriteVar: irText(),
      size: expr,
      color: irText(),
      ...id,
    }),
    z.object({
      type: z.literal('g2d:setTextBox'),
      spriteVar: irText(),
      width: expr,
      align: z.enum(['left', 'center', 'right']),
      padding: expr,
      background: expr,
      ...id,
    }),
    z.object({
      type: z.literal('g2d:setTextImage'),
      spriteVar: irText(),
      image: irText(),
      valign: z.enum(['top', 'middle', 'bottom']),
      ...id,
    }),
    z.object({
      type: z.literal('g2d:setSpriteData'),
      spriteVar: irText(),
      key: irText(),
      value: expr,
      ...id,
    }),
    z.object({
      type: z.literal('g2d:onSpriteClick'),
      spriteVar: irText(),
      eventId: irText().optional(),
      body: z.array(statement),
      ...id,
    }),
    z.object({
      type: z.literal('g2d:onGroupClick'),
      groupVar: irText(),
      itemName: irText(),
      eventId: irText().optional(),
      body: z.array(statement),
      ...id,
    }),
  ] as const
}
