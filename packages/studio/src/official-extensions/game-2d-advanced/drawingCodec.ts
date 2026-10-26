import type * as Babel from '@babel/types'
import type * as Blockly from 'blockly/core'
import type { SerializedBlocklyBlock } from '../../codecs/types'
import type { JSExpr, JSStatement } from '../../ir/schema'
import { type GameKitDrawingStatement, isGameKitDrawingStatement } from './drawingIR'

const SHAPES = [
  {
    type: 'gk:drawRectangle',
    block: 'sz_gk_draw_rectangle',
    method: 'drawRectangle',
    keys: ['x', 'y', 'w', 'h', 'color'],
  },
  {
    type: 'gk:drawCircle',
    block: 'sz_gk_draw_circle',
    method: 'drawCircle',
    keys: ['x', 'y', 'r', 'color'],
  },
  {
    type: 'gk:drawTriangle',
    block: 'sz_gk_draw_triangle',
    method: 'drawTriangle',
    keys: ['x1', 'y1', 'x2', 'y2', 'x3', 'y3', 'color'],
  },
  {
    type: 'gk:drawText',
    block: 'sz_gk_draw_text',
    method: 'drawText',
    keys: ['text', 'x', 'y', 'size', 'color'],
  },
] as const

function drawingValues(s: GameKitDrawingStatement): JSExpr[] {
  switch (s.type) {
    case 'gk:drawRectangle':
      return [s.x, s.y, s.w, s.h, s.color]
    case 'gk:drawCircle':
      return [s.x, s.y, s.r, s.color]
    case 'gk:drawTriangle':
      return [s.x1, s.y1, s.x2, s.y2, s.x3, s.y3, s.color]
    case 'gk:drawText':
      return [s.text, s.x, s.y, s.size, s.color]
  }
}

function drawingNode(type: string, args: readonly JSExpr[]): GameKitDrawingStatement | undefined {
  const [a, b, c, d, e, f, g] = args
  if (type === 'gk:drawRectangle' && a && b && c && d && e)
    return { type, x: a, y: b, w: c, h: d, color: e }
  if (type === 'gk:drawCircle' && a && b && c && d) return { type, x: a, y: b, r: c, color: d }
  if (type === 'gk:drawTriangle' && a && b && c && d && e && f && g)
    return { type, x1: a, y1: b, x2: c, y2: d, x3: e, y3: f, color: g }
  if (type === 'gk:drawText' && a && b && c && d && e)
    return { type, text: a, x: b, y: c, size: d, color: e }
}

export function gameKitDrawingBlockToIR(
  block: Blockly.Block,
  expression: (block: Blockly.Block, name: string, fallback: JSExpr) => JSExpr,
): JSStatement | undefined {
  const shape = SHAPES.find((s) => s.block === block.type)
  if (!shape) return undefined
  return drawingNode(
    shape.type,
    shape.keys.map((key) =>
      expression(
        block,
        key.toUpperCase(),
        key === 'text'
          ? { type: 'str', value: 'Olá!' }
          : key === 'color'
            ? { type: 'color', value: '#ffd166' }
            : { type: 'num', value: key === 'size' ? 24 : 20 },
      ),
    ),
  )
}

export function gameKitDrawingCallToIR(
  method: string,
  args: readonly (Babel.Node | null | undefined)[],
  expression: (node: Babel.Node | null | undefined) => JSExpr | null,
): JSStatement | null | undefined {
  const shape = SHAPES.find((s) => s.method === method)
  if (!shape) return undefined
  if (args.length !== shape.keys.length) return null
  const values: JSExpr[] = []
  for (const arg of args) {
    const value = expression(arg)
    if (!value) return null
    values.push(value)
  }
  return drawingNode(shape.type, values) ?? null
}

export function gameKitDrawingStatementToCode(
  s: JSStatement,
  pad: string,
  expression: (value: JSExpr) => string,
): string | undefined {
  if (!isGameKitDrawingStatement(s)) return undefined
  const shape = SHAPES.find((shape) => shape.type === s.type)
  return shape
    ? `${pad}SZGameKit.${shape.method}(${drawingValues(s).map(expression).join(', ')});`
    : undefined
}

interface WorkspaceTools {
  block(
    type: string,
    fields?: Record<string, string | number>,
    inputs?: Record<string, SerializedBlocklyBlock[]>,
    id?: string,
    values?: Record<string, SerializedBlocklyBlock>,
  ): SerializedBlocklyBlock
  expression(value: JSExpr): SerializedBlocklyBlock | null
  raw(statement: JSStatement): SerializedBlocklyBlock
}

export function gameKitDrawingStatementToBlock(
  s: JSStatement,
  t: WorkspaceTools,
): SerializedBlocklyBlock | undefined {
  if (!isGameKitDrawingStatement(s)) return undefined
  const shape = SHAPES.find((shape) => shape.type === s.type)
  if (!shape) return undefined
  const values: Record<string, SerializedBlocklyBlock> = {}
  const args = drawingValues(s)
  for (const [i, key] of shape.keys.entries()) {
    const arg = args[i]
    if (!arg) return t.raw(s)
    const block = t.expression(arg)
    if (!block) return t.raw(s)
    values[key.toUpperCase()] = block
  }
  return t.block(shape.block, {}, {}, s.__id, values)
}

export function collectGameKitDrawingIdentifiers(
  s: JSStatement,
  names: Set<string>,
  collect: (e: JSExpr, names: Set<string>) => void,
): boolean {
  if (!isGameKitDrawingStatement(s)) return false
  for (const value of drawingValues(s)) collect(value, names)
  return true
}
