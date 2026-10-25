import type * as Blockly from 'blockly/core'
import type { SerializedBlocklyBlock } from '../../codecs/types'
import type { JSExpr, JSStatement } from '../../ir/schema'
import type { PlatformCodecTools } from '../game-3d/platformCodec'
import {
  type GameKit3DGameplayExpression,
  type GameKit3DGameplayStatement,
  isGameKit3DGameplayExpression,
  isGameKit3DGameplayStatement,
} from './gameplayIR'

/**
 * Codec dos blocos de JOGO do Jogo 3D Avançado (review 3D, lote 12): patrulhar, a mochila,
 * guardar o progresso e as fases, nos quatro sentidos (bloco → IR, IR → código, código → IR e
 * IR → bloco). As fachadas (`buildIR`, `generators/{js,expr}.ts`, `parsers/js.ts`,
 * `workspaceState.ts`) só delegam com ganchos de poucas linhas (molde de `modelCodec.ts`).
 */

type Statement = GameKit3DGameplayStatement
type Expression = GameKit3DGameplayExpression

const num = (value: number): JSExpr => ({ type: 'num', value })

// ---------------------------------------------------------------- bloco → IR

interface BlockTools {
  field(block: Blockly.Block, name: string): string
  expression(block: Blockly.Block, name: string, fallback: JSExpr): JSExpr
  statements(block: Blockly.Block, name: string): JSStatement[]
}

export function gameKit3DGameplayBlockToIR(
  block: Blockly.Block,
  tools: BlockTools,
): JSStatement | undefined {
  const f = (name: string) => tools.field(block, name)
  const e = (name: string, fallback: number) => tools.expression(block, name, num(fallback))
  let node: Statement
  switch (block.type) {
    case 'sz_g3k_patrol':
      node = {
        type: 'g3k:patrol',
        charVar: f('WHO'),
        ax: e('AX', -6),
        az: e('AZ', 0),
        bx: e('BX', 6),
        bz: e('BZ', 0),
        speed: e('SPEED', 3),
      }
      break
    case 'sz_g3k_bag_give':
    case 'sz_g3k_bag_take':
      node = {
        type: 'g3k:bag',
        op: block.type === 'sz_g3k_bag_give' ? 'dar' : 'tirar',
        item: f('ITEM'),
        amount: e('N', 1),
      }
      break
    case 'sz_g3k_bag_clear':
      node = { type: 'g3k:bag', op: 'esvaziar' }
      break
    case 'sz_g3k_save_value':
      node = { type: 'g3k:saveValue', name: f('NAME'), value: e('VALUE', 0) }
      break
    case 'sz_g3k_next_level':
      node = { type: 'g3k:nextLevel' }
      break
    case 'sz_g3k_on_level_start':
      node = { type: 'g3k:onLevelStart', body: tools.statements(block, 'BODY') }
      break
    default:
      return undefined
  }
  return node as JSStatement
}

export function gameKit3DGameplayBlockExpression(
  block: Blockly.Block,
  field: (block: Blockly.Block, name: string) => string,
  expression: (block: Blockly.Block, name: string, fallback: JSExpr) => JSExpr,
): JSExpr | undefined {
  let value: Expression
  switch (block.type) {
    case 'sz_g3k_bag_count':
      value = { type: 'g3k:bagValue', op: 'quantos', item: field(block, 'ITEM') }
      break
    case 'sz_g3k_bag_has':
      value = { type: 'g3k:bagValue', op: 'tem', item: field(block, 'ITEM') }
      break
    case 'sz_g3k_saved_value':
      value = {
        type: 'g3k:savedValue',
        name: field(block, 'NAME'),
        fallback: expression(block, 'FALLBACK', num(0)),
      }
      break
    case 'sz_g3k_level':
      value = { type: 'g3k:levelNumber' }
      break
    default:
      return undefined
  }
  return value as JSExpr
}

// ---------------------------------------------------------------- IR → código

interface CodeTools {
  pad: string
  id(name: string): string
  expression(value: JSExpr): string
  body(statements: JSStatement[]): string
}

export function gameKit3DGameplayStatementToCode(s: JSStatement, t: CodeTools): string | undefined {
  if (!isGameKit3DGameplayStatement(s)) return undefined
  const q = JSON.stringify
  const x = t.expression
  switch (s.type) {
    case 'g3k:patrol':
      return `${t.pad}SZGameKit3D.patrol(${t.id(s.charVar)}, ${[s.ax, s.az, s.bx, s.bz, s.speed].map(x).join(', ')});`
    case 'g3k:bag':
      if (s.op === 'esvaziar') return `${t.pad}SZGameKit3D.clearBag();`
      return `${t.pad}SZGameKit3D.${s.op === 'dar' ? 'putInBag' : 'takeFromBag'}(${q(s.item ?? '')}, ${x(s.amount ?? num(1))});`
    case 'g3k:saveValue':
      return `${t.pad}SZGameKit3D.saveValue(${q(s.name)}, ${x(s.value)});`
    case 'g3k:nextLevel':
      return `${t.pad}SZGameKit3D.nextLevel();`
    case 'g3k:onLevelStart':
      return `${t.pad}SZGameKit3D.onLevelStart(() => {\n${t.body(s.body)}\n${t.pad}});`
  }
}

export function gameKit3DGameplayExpressionToCode(
  expr: Expression,
  expression: (value: JSExpr) => string,
): string {
  switch (expr.type) {
    case 'g3k:bagValue':
      return `SZGameKit3D.${expr.op === 'tem' ? 'bagHas' : 'bagCount'}(${JSON.stringify(expr.item)})`
    case 'g3k:savedValue':
      return `SZGameKit3D.savedValue(${JSON.stringify(expr.name)}, ${expression(expr.fallback)})`
    case 'g3k:levelNumber':
      return 'SZGameKit3D.level()'
  }
}

// ---------------------------------------------------------------- código → IR

type ParserTools = Pick<
  PlatformCodecTools,
  'identifierName' | 'toExpr' | 'isSimpleValue' | 'isInlineFunction' | 'bodyOfFn'
>

function stringArg(args: unknown[], index: number): string | null {
  const arg = args[index] as { type?: string; value?: unknown } | undefined
  return arg?.type === 'StringLiteral' ? String(arg.value) : null
}

/** `SZGameKit3D.<metodo>(…)` como statement; `undefined` quando o método não é deste codec. */
export function gameKit3DGameplayCallToIR(
  method: string,
  args: unknown[],
  tools: ParserTools,
): JSStatement | null | undefined {
  const simple = (index: number): JSExpr | null => {
    const value = tools.toExpr(args[index])
    return tools.isSimpleValue(value) ? value : null
  }
  let node: Statement | null = null
  switch (method) {
    case 'patrol': {
      const charVar = tools.identifierName(args[0])
      const [ax, az, bx, bz, speed] = [1, 2, 3, 4, 5].map(simple)
      if (args.length === 6 && charVar && ax && az && bx && bz && speed)
        node = { type: 'g3k:patrol', charVar, ax, az, bx, bz, speed }
      break
    }
    case 'putInBag':
    case 'takeFromBag': {
      const item = stringArg(args, 0)
      const amount = simple(1)
      if (args.length === 2 && item !== null && amount)
        node = { type: 'g3k:bag', op: method === 'putInBag' ? 'dar' : 'tirar', item, amount }
      break
    }
    case 'clearBag':
      if (args.length === 0) node = { type: 'g3k:bag', op: 'esvaziar' }
      break
    case 'saveValue': {
      const name = stringArg(args, 0)
      const value = simple(1)
      if (args.length === 2 && name !== null && value) node = { type: 'g3k:saveValue', name, value }
      break
    }
    case 'nextLevel':
      if (args.length === 0) node = { type: 'g3k:nextLevel' }
      break
    case 'onLevelStart': {
      const fn = args[0]
      const params = (fn as { params?: unknown[] } | undefined)?.params
      if (args.length === 1 && tools.isInlineFunction(fn) && params?.length === 0)
        node = { type: 'g3k:onLevelStart', body: tools.bodyOfFn(fn) }
      break
    }
    default:
      return undefined
  }
  return node as JSStatement | null
}

/** `SZGameKit3D.<metodo>(…)` em posição de VALOR; `undefined` quando não é deste codec. */
export function gameKit3DGameplayExprCallToIR(
  method: string,
  args: unknown[],
  tools: Pick<PlatformCodecTools, 'toExpr' | 'isSimpleValue'>,
): JSExpr | null | undefined {
  let value: Expression | null = null
  switch (method) {
    case 'bagCount':
    case 'bagHas': {
      const item = stringArg(args, 0)
      if (args.length === 1 && item !== null)
        value = { type: 'g3k:bagValue', op: method === 'bagHas' ? 'tem' : 'quantos', item }
      break
    }
    case 'savedValue': {
      const name = stringArg(args, 0)
      const fallback = args.length === 2 ? tools.toExpr(args[1]) : null
      if (name !== null && tools.isSimpleValue(fallback))
        value = { type: 'g3k:savedValue', name, fallback }
      break
    }
    case 'level':
      if (args.length === 0) value = { type: 'g3k:levelNumber' }
      break
    default:
      return undefined
  }
  return value as JSExpr | null
}

/** O valor cabe num soquete de bloco? (`isSimpleValue` do parser). */
export function gameKit3DGameplaySimpleValue(
  expr: JSExpr,
  isSimpleValue: (value: JSExpr | null) => boolean,
): boolean | undefined {
  if (!isGameKit3DGameplayExpression(expr)) return undefined
  return expr.type === 'g3k:savedValue' ? isSimpleValue(expr.fallback) : true
}

// ---------------------------------------------------------------- IR → bloco

interface WorkspaceTools {
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

export function gameKit3DGameplayStatementToBlock(
  s: JSStatement,
  t: WorkspaceTools,
): SerializedBlocklyBlock | undefined {
  if (!isGameKit3DGameplayStatement(s)) return undefined
  const values = (
    entries: Record<string, JSExpr>,
  ): Record<string, SerializedBlocklyBlock> | null => {
    const out: Record<string, SerializedBlocklyBlock> = {}
    for (const [name, value] of Object.entries(entries)) {
      const block = t.expression(value)
      if (!block) return null
      out[name] = block
    }
    return out
  }
  switch (s.type) {
    case 'g3k:patrol': {
      const v = values({ AX: s.ax, AZ: s.az, BX: s.bx, BZ: s.bz, SPEED: s.speed })
      return v ? t.block('sz_g3k_patrol', { WHO: s.charVar }, {}, s.__id, v) : t.raw(s)
    }
    case 'g3k:bag': {
      if (s.op === 'esvaziar') return t.block('sz_g3k_bag_clear', {}, {}, s.__id)
      const v = values({ N: s.amount ?? num(1) })
      const type = s.op === 'dar' ? 'sz_g3k_bag_give' : 'sz_g3k_bag_take'
      return v ? t.block(type, { ITEM: s.item ?? '' }, {}, s.__id, v) : t.raw(s)
    }
    case 'g3k:saveValue': {
      const v = values({ VALUE: s.value })
      return v ? t.block('sz_g3k_save_value', { NAME: s.name }, {}, s.__id, v) : t.raw(s)
    }
    case 'g3k:nextLevel':
      return t.block('sz_g3k_next_level', {}, {}, s.__id)
    case 'g3k:onLevelStart':
      return t.block('sz_g3k_on_level_start', {}, { BODY: t.statements(s.body) }, s.__id)
  }
}

export function gameKit3DGameplayExpressionToBlock(
  expr: JSExpr,
  block: WorkspaceTools['block'],
  expression: WorkspaceTools['expression'],
): SerializedBlocklyBlock | null | undefined {
  if (!isGameKit3DGameplayExpression(expr)) return undefined
  switch (expr.type) {
    case 'g3k:bagValue':
      return block(
        expr.op === 'tem' ? 'sz_g3k_bag_has' : 'sz_g3k_bag_count',
        { ITEM: expr.item },
        {},
        expr.__id,
      )
    case 'g3k:savedValue': {
      const fallback = expression(expr.fallback)
      return fallback
        ? block('sz_g3k_saved_value', { NAME: expr.name }, {}, expr.__id, { FALLBACK: fallback })
        : null
    }
    case 'g3k:levelNumber':
      return block('sz_g3k_level', {}, {}, expr.__id)
  }
}

// ---------------------------------------------------------------- nomes usados

export function collectGameKit3DGameplayIdentifiers(
  s: JSStatement,
  names: Set<string>,
  expression: (value: JSExpr, names: Set<string>) => void,
  statement: (value: JSStatement, names: Set<string>) => void,
): boolean {
  if (!isGameKit3DGameplayStatement(s)) return false
  switch (s.type) {
    case 'g3k:patrol':
      names.add(s.charVar)
      for (const value of [s.ax, s.az, s.bx, s.bz, s.speed]) expression(value, names)
      break
    case 'g3k:bag':
      if (s.amount) expression(s.amount, names)
      break
    case 'g3k:saveValue':
      expression(s.value, names)
      break
    case 'g3k:onLevelStart':
      for (const child of s.body) statement(child, names)
      break
  }
  return true
}

export function collectGameKit3DGameplayExpressionIdentifiers(
  expr: JSExpr,
  names: Set<string>,
  expression: (value: JSExpr, names: Set<string>) => void,
): boolean {
  if (!isGameKit3DGameplayExpression(expr)) return false
  if (expr.type === 'g3k:savedValue') expression(expr.fallback, names)
  return true
}
