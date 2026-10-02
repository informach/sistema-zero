import type * as Babel from '@babel/types'
import type * as Blockly from 'blockly/core'
import type { SerializedBlocklyBlock } from '../../codecs/types'
import type { JSExpr } from '../../ir/schema'
import {
  isSceneNameBlock,
  SCENE_METHODS,
  type SceneNameKind,
  type SceneTarget,
  sceneBlockType,
  sceneLiteralShadow,
  sceneMethod,
  sceneNameBlockType,
} from './catalog'
import { type SceneExpression, type SceneStatement, validSceneArgs } from './ir'

type ExpressionReader = (node: Babel.Node | null | undefined) => JSExpr | null
type BlockTools = {
  field(block: Blockly.Block, name: string): string
  expression(block: Blockly.Block, name: string, fallback: JSExpr): JSExpr
}
const literal = (value: string | number | boolean): JSExpr =>
  typeof value === 'number'
    ? { type: 'num', value }
    : typeof value === 'boolean'
      ? { type: 'bool', value }
      : { type: 'str', value }

const nameBlock = (target: SceneTarget, kind: SceneNameKind, name: string, id?: string) => ({
  type: sceneNameBlockType(target, kind),
  ...(id ? { id } : {}),
  fields: { NAME: name },
})

export function sceneBlockExpression(block: Blockly.Block, tools: BlockTools): JSExpr | undefined {
  if (isSceneNameBlock(block.type)) return literal(tools.field(block, 'NAME'))
  const parsed = readBlock(block, tools, true)
  if (parsed)
    return {
      method: parsed.method,
      args: parsed.args,
      type: parsed.target === 'g2d' ? 'g2d:sceneValue' : 'gk:sceneValue',
    }
}
export function sceneBlockStatement(
  block: Blockly.Block,
  tools: BlockTools,
): SceneStatement | undefined {
  const parsed = readBlock(block, tools, false)
  if (parsed)
    return {
      method: parsed.method,
      args: parsed.args,
      type: parsed.target === 'g2d' ? 'g2d:sceneCommand' : 'gk:sceneCommand',
    }
}
function readBlock(block: Blockly.Block, tools: BlockTools, value: boolean) {
  const target: SceneTarget = block.type.startsWith('sz_g2d_') ? 'g2d' : 'gk'
  const entry = SCENE_METHODS.find(
    (item) => sceneBlockType(target, item) === block.type && !!item.value === value,
  )
  if (!entry) return
  const args = entry.args.map((arg) =>
    arg.field
      ? literal(tools.field(block, arg.name))
      : // An empty name socket is an empty name, which the runtime reports. Falling
        // back to the palette name would create a layer the child never named.
        tools.expression(block, arg.name, literal(arg.declares || arg.picks ? '' : arg.value)),
  )
  if (validSceneArgs(entry.method, args, value)) return { target, method: entry.method, args }
}

function readCall(
  method: string,
  nodes: readonly Babel.Node[],
  value: boolean,
  expression: ExpressionReader,
  simple: (expr: JSExpr | null) => boolean,
) {
  const entry = sceneMethod(method)
  if (!entry || !!entry.value !== value || nodes.length !== entry.args.length) return
  const args: JSExpr[] = []
  for (const node of nodes) {
    const arg = expression(node)
    if (!arg || !simple(arg)) return
    args.push(arg)
  }
  if (validSceneArgs(method, args, value)) return { method: entry.method, args }
}
export function sceneCallExpression(
  target: SceneTarget,
  method: string,
  nodes: readonly Babel.Node[],
  expression: ExpressionReader,
  simple: (expr: JSExpr | null) => boolean,
): SceneExpression | undefined {
  const call = readCall(method, nodes, true, expression, simple)
  if (call) return { type: target === 'g2d' ? 'g2d:sceneValue' : 'gk:sceneValue', ...call }
}
export function sceneCallStatement(
  target: SceneTarget,
  method: string,
  nodes: readonly Babel.Node[],
  expression: ExpressionReader,
  simple: (expr: JSExpr | null) => boolean,
): SceneStatement | undefined {
  const call = readCall(method, nodes, false, expression, simple)
  if (call) return { type: target === 'g2d' ? 'g2d:sceneCommand' : 'gk:sceneCommand', ...call }
}
export function sceneToCode(
  node: SceneStatement | SceneExpression,
  expression: (expr: JSExpr) => string,
): string {
  const api = node.type.startsWith('g2d:') ? 'SZGame2D' : 'SZGameKit'
  return `${api}.${node.method}(${node.args.map(expression).join(', ')})`
}

export function sceneToBlock(
  node: SceneStatement | SceneExpression,
  expression: (expr: JSExpr) => SerializedBlocklyBlock | null,
): SerializedBlocklyBlock | undefined {
  const entry = sceneMethod(node.method)
  if (!entry || !validSceneArgs(node.method, node.args, !!entry.value)) return
  const target: SceneTarget = node.type.startsWith('g2d:') ? 'g2d' : 'gk'
  const fields: Record<string, string | number> = {}
  const inputs: NonNullable<SerializedBlocklyBlock['inputs']> = {}
  for (let index = 0; index < entry.args.length; index++) {
    const arg = entry.args[index],
      expr = node.args[index]
    if (!arg || !expr) return
    if (arg.field) {
      if (expr.type !== 'str') return
      fields[arg.name] = expr.value
    } else if (arg.picks && expr.type === 'str') {
      // A fixed name returns to the list the socket was born with.
      inputs[arg.name] = { shadow: nameBlock(target, arg.picks, expr.value, expr.__id) }
    } else {
      const block = expression(expr)
      if (!block) return
      // What the socket is born with stays underneath: pulled out, a computed value
      // leaves the list (or the number) behind, never an empty socket.
      const born = arg.picks
        ? nameBlock(target, arg.picks, String(arg.value))
        : sceneLiteralShadow(arg)
      // A plain literal of the socket's own kind IS that shadow again.
      inputs[arg.name] =
        !arg.picks && block.type === born.type && !block.inputs
          ? { shadow: block }
          : { block, shadow: born }
    }
  }
  return {
    type: sceneBlockType(target, entry),
    id: node.__id,
    fields,
    inputs,
  }
}
