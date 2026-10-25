import type * as Blockly from 'blockly/core'
import type { SerializedBlocklyBlock } from '../../codecs/types'
import type { JSExpr, JSStatement } from '../../ir/schema'
import type { PlatformCodecTools } from '../game-3d/platformCodec'
import { type GameKit3DModelStatement, isGameKit3DModelStatement } from './modelIR'

/**
 * Codec da ANIMAÇÃO DO MODELO do Jogo 3D Avançado (review 3D, lote 11): bloco → IR, IR → código,
 * código → IR e IR → bloco de `g3k:setStateAnim` (com "uma vez"), `g3k:animSpeed` e
 * `g3k:onAnimEnd`. As fachadas (`buildIR`, `generators/js.ts`, `parsers/js.ts`,
 * `workspaceState.ts`) só delegam com ganchos de poucas linhas (molde de `world-3d/worldCodec.ts`).
 */

/** Os valores do dropdown "repetindo / uma vez" do bloco de estado (os mesmos do `play_anim`). */
export const G3K_ANIM_LOOP_OPTIONS = [
  ['repetindo', 'LOOP'],
  ['uma vez', 'ONCE'],
] as const satisfies readonly (readonly [string, string])[]

type Node = GameKit3DModelStatement

// ---------------------------------------------------------------- bloco → IR

interface BlockTools {
  field(block: Blockly.Block, name: string): string
  expression(block: Blockly.Block, name: string, fallback: JSExpr): JSExpr
  statements(block: Blockly.Block, name: string): JSStatement[]
}

export function gameKit3DModelBlockToIR(
  block: Blockly.Block,
  tools: BlockTools,
): JSStatement | undefined {
  const f = (name: string) => tools.field(block, name)
  let node: Node
  switch (block.type) {
    case 'sz_g3k_state_anim':
      node = {
        type: 'g3k:setStateAnim',
        mold: f('MOLD'),
        state: f('STATE'),
        clip: f('CLIP'),
        // "repetindo" é o padrão e fica FORA do nó (o projeto de antes do lote não muda).
        ...(f('LOOP') === 'ONCE' ? { loop: false } : {}),
      }
      break
    case 'sz_g3k_anim_speed':
      node = {
        type: 'g3k:animSpeed',
        charVar: f('CHAR'),
        speed: tools.expression(block, 'SPEED', { type: 'num', value: 1 }),
      }
      break
    case 'sz_g3k_on_anim_end':
      node = {
        type: 'g3k:onAnimEnd',
        mold: f('MOLD'),
        clip: f('CLIP'),
        itemName: f('ITEM') || 'ela',
        body: tools.statements(block, 'BODY'),
      }
      break
    default:
      return undefined
  }
  return node as JSStatement
}

// ---------------------------------------------------------------- IR → código

interface CodeTools {
  pad: string
  id(name: string): string
  expression(value: JSExpr): string
  body(statements: JSStatement[]): string
}

export function gameKit3DModelStatementToCode(s: JSStatement, t: CodeTools): string | undefined {
  if (!isGameKit3DModelStatement(s)) return undefined
  const q = JSON.stringify
  switch (s.type) {
    case 'g3k:setStateAnim': {
      const args = [q(s.mold), q(s.state), q(s.clip), ...(s.loop === false ? ['false'] : [])]
      return `${t.pad}SZGameKit3D.setStateAnim(${args.join(', ')});`
    }
    case 'g3k:animSpeed':
      return `${t.pad}SZGameKit3D.animSpeed(${t.id(s.charVar)}, ${t.expression(s.speed)});`
    case 'g3k:onAnimEnd':
      return `${t.pad}SZGameKit3D.onAnimEnd(${q(s.mold)}, ${q(s.clip)}, (${t.id(s.itemName)}) => {\n${t.body(s.body)}\n${t.pad}});`
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

function booleanArg(args: unknown[], index: number): boolean | null {
  const arg = args[index] as { type?: string; value?: unknown } | undefined
  return arg?.type === 'BooleanLiteral' ? arg.value === true : null
}

/** `SZGameKit3D.<metodo>(…)` da animação; `undefined` quando o método não é deste codec. */
export function gameKit3DModelCallToIR(
  method: string,
  args: unknown[],
  tools: ParserTools,
): JSStatement | null | undefined {
  let node: Node | null = null
  switch (method) {
    case 'setStateAnim': {
      const mold = stringArg(args, 0)
      const state = stringArg(args, 1)
      const clip = stringArg(args, 2)
      const loop = args.length === 4 ? booleanArg(args, 3) : true
      if (
        (args.length === 3 || args.length === 4) &&
        mold &&
        state &&
        clip !== null &&
        loop !== null
      )
        node = { type: 'g3k:setStateAnim', mold, state, clip, ...(loop ? {} : { loop: false }) }
      break
    }
    case 'animSpeed': {
      const charVar = tools.identifierName(args[0])
      const speed = tools.toExpr(args[1])
      if (args.length === 2 && charVar && tools.isSimpleValue(speed))
        node = { type: 'g3k:animSpeed', charVar, speed }
      break
    }
    case 'onAnimEnd': {
      const mold = stringArg(args, 0)
      const clip = stringArg(args, 1)
      const fn = args[2]
      const params = (fn as { params?: { type?: string; name?: string }[] } | undefined)?.params
      const param = params?.[0]
      if (
        args.length === 3 &&
        mold &&
        clip !== null &&
        tools.isInlineFunction(fn) &&
        params?.length === 1 &&
        param?.type === 'Identifier' &&
        param.name
      )
        node = {
          type: 'g3k:onAnimEnd',
          mold,
          clip,
          itemName: param.name,
          body: tools.bodyOfFn(fn),
        }
      break
    }
    default:
      return undefined
  }
  return node as JSStatement | null
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

export function gameKit3DModelStatementToBlock(
  s: JSStatement,
  t: WorkspaceTools,
): SerializedBlocklyBlock | undefined {
  if (!isGameKit3DModelStatement(s)) return undefined
  switch (s.type) {
    case 'g3k:setStateAnim':
      return t.block(
        'sz_g3k_state_anim',
        { MOLD: s.mold, STATE: s.state, CLIP: s.clip, LOOP: s.loop === false ? 'ONCE' : 'LOOP' },
        {},
        s.__id,
      )
    case 'g3k:animSpeed': {
      const speed = t.expression(s.speed)
      return speed
        ? t.block('sz_g3k_anim_speed', { CHAR: s.charVar }, {}, s.__id, { SPEED: speed })
        : t.raw(s)
    }
    case 'g3k:onAnimEnd':
      return t.block(
        'sz_g3k_on_anim_end',
        { ITEM: s.itemName, MOLD: s.mold, CLIP: s.clip },
        { BODY: t.statements(s.body) },
        s.__id,
      )
  }
}

// ---------------------------------------------------------------- nomes usados

export function collectGameKit3DModelIdentifiers(
  s: JSStatement,
  names: Set<string>,
  expression: (value: JSExpr, names: Set<string>) => void,
  statement: (value: JSStatement, names: Set<string>) => void,
): boolean {
  if (!isGameKit3DModelStatement(s)) return false
  if (s.type === 'g3k:animSpeed') {
    names.add(s.charVar)
    expression(s.speed, names)
  } else if (s.type === 'g3k:onAnimEnd') {
    names.add(s.itemName)
    for (const child of s.body) statement(child, names)
  }
  return true
}
