import type * as Babel from '@babel/types'
import type * as Blockly from 'blockly/core'
import type { SerializedBlocklyBlock } from '../../codecs/types'
import type { JSExpr, JSStatement } from '../../ir/schema'
import { type GameTwoDActionStatement, isGameTwoDAction } from './actionIR'

type BlockTools = {
  field(block: Blockly.Block, name: string): string
  expression(block: Blockly.Block, name: string, fallback: JSExpr): JSExpr
  statements(block: Blockly.Block, name: string, seen: Set<string>): JSStatement[]
}
export function gameTwoDActionBlockExpression(
  block: Blockly.Block,
  field: BlockTools['field'],
): JSExpr | undefined {
  if (block.type === 'sz_g2d_circle_touches')
    return { type: 'g2d:circleTouches', aVar: field(block, 'A'), bVar: field(block, 'B') }
}
export function gameTwoDActionBlockToIR(
  block: Blockly.Block,
  seen: Set<string>,
  t: BlockTools,
): GameTwoDActionStatement | undefined {
  if (block.type !== 'sz_g2d_destroy_sprite' && block.type !== 'sz_g2d_with_cooldown') return
  seen.add('game-2d')
  const spriteVar = t.field(block, 'SPRITE')
  if (block.type === 'sz_g2d_destroy_sprite') return { type: 'g2d:destroySprite', spriteVar }
  let key = block.id
  if (block.data) {
    let data: unknown
    try {
      data = JSON.parse(block.data)
    } catch {
      data = null
    }
    if (data && typeof data === 'object' && 'cooldownKey' in data) {
      if (typeof data.cooldownKey !== 'string')
        throw new Error('A chave da recarga precisa ser texto.')
      key = data.cooldownKey
    }
  }
  return {
    type: 'g2d:withCooldown',
    spriteVar,
    key,
    frames: t.expression(block, 'FRAMES', { type: 'num', value: 30 }),
    body: t.statements(block, 'BODY', seen),
  }
}
type CodeTools = {
  pad: string
  id(name: string): string
  expression(value: JSExpr): string
  body(statements: JSStatement[]): string
}
export function gameTwoDActionToCode(s: JSStatement, t: CodeTools): string | undefined {
  if (!isGameTwoDAction(s)) return
  if (s.type === 'g2d:destroySprite') return `${t.pad}SZGame2D.destroySprite(${t.id(s.spriteVar)});`
  return `${t.pad}SZGame2D.withCooldown(${t.id(s.spriteVar)}, ${t.expression(s.frames)}, function () {\n${t.body(s.body)}\n${t.pad}}, ${JSON.stringify(s.key)});`
}
type WorkspaceTools = {
  block(
    type: string,
    fields?: Record<string, string | number>,
    inputs?: Record<string, SerializedBlocklyBlock[]>,
    id?: string,
    values?: Record<string, SerializedBlocklyBlock>,
  ): SerializedBlocklyBlock
  expression(value: JSExpr): SerializedBlocklyBlock | null
  statements(values: JSStatement[]): SerializedBlocklyBlock[]
  raw(statement: JSStatement): SerializedBlocklyBlock
}
export function gameTwoDActionToBlock(
  s: JSStatement,
  t: WorkspaceTools,
): SerializedBlocklyBlock | undefined {
  if (!isGameTwoDAction(s)) return
  if (s.type === 'g2d:destroySprite')
    return t.block('sz_g2d_destroy_sprite', { SPRITE: s.spriteVar }, {}, s.__id)
  const frames = t.expression(s.frames)
  if (!frames) return t.raw(s)
  const b = t.block(
    'sz_g2d_with_cooldown',
    { SPRITE: s.spriteVar },
    { BODY: t.statements(s.body) },
    s.__id,
    { FRAMES: frames },
  )
  if (s.key !== s.__id) b.data = JSON.stringify({ cooldownKey: s.key })
  return b
}
export function gameTwoDActionExpressionToBlock(
  s: JSExpr,
  block: WorkspaceTools['block'],
): SerializedBlocklyBlock | undefined {
  if (s.type === 'g2d:circleTouches')
    return block('sz_g2d_circle_touches', { A: s.aVar, B: s.bVar }, {}, s.__id)
}
type ParserTools = {
  identifier(node: Babel.Node | null | undefined): string | null
  expression(node: Babel.Node | null | undefined): JSExpr | null
  simple(expr: JSExpr | null): expr is JSExpr
  inlineFunction(
    node: Babel.Node | null | undefined,
  ): node is Babel.FunctionExpression | Babel.ArrowFunctionExpression
  functionBody(fn: Babel.FunctionExpression | Babel.ArrowFunctionExpression): JSStatement[]
}
export function gameTwoDActionCallToIR(
  method: string,
  args: Babel.Node[],
  t: ParserTools,
): GameTwoDActionStatement | undefined {
  const spriteVar = t.identifier(args[0])
  if (!spriteVar) return
  if (method === 'destroySprite' && args.length === 1)
    return { type: 'g2d:destroySprite', spriteVar }
  if (method !== 'withCooldown' || args.length !== 4 || args[3]?.type !== 'StringLiteral') return
  const frames = t.expression(args[1]),
    fn = args[2]
  if (!t.simple(frames) || !t.inlineFunction(fn) || fn.params.length || fn.async || fn.generator)
    return
  return {
    type: 'g2d:withCooldown',
    spriteVar,
    frames,
    key: args[3].value,
    body: t.functionBody(fn),
  }
}
export function collectGameTwoDActionIdentifiers(
  s: JSStatement,
  names: Set<string>,
  expr: (value: JSExpr, names: Set<string>) => void,
  statements: (value: JSStatement, names: Set<string>) => void,
): boolean {
  if (!isGameTwoDAction(s)) return false
  names.add(s.spriteVar)
  if (s.type === 'g2d:withCooldown') {
    expr(s.frames, names)
    for (const child of s.body) statements(child, names)
  }
  return true
}
