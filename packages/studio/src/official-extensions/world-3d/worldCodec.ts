import type * as Blockly from 'blockly/core'
import type { SerializedBlocklyBlock } from '../../codecs/types'
import type { JSExpr, JSStatement } from '../../ir/schema'
import { isThreeKeyCode } from '../threeKeys'
import {
  isWorld3DNewStatement,
  W3D_COLLECTIBLE_KINDS,
  W3D_MODEL_ANIM_STATES,
  W3D_MODEL_ANIM_WHO,
  type W3DCollectibleKind,
  type W3DModelAnimState,
  type W3DModelAnimWho,
  type W3DModelTarget,
  type World3DNewStatement,
} from './worldIR'

/**
 * Codec do Mundo 3D (molde de `game-3d/platformCodec.ts`): a lógica nova da extensão mora aqui e
 * as fachadas (`parsers/js.ts`, `buildIR.ts`…) só delegam com ganchos curtos, porque elas têm
 * teto de linhas (`generators/__tests__/architecture.test.ts`).
 *
 * Guarda os DROPDOWNS que a Ponte confere (código com um valor fora da lista não vira bloco: a
 * criança veria um campo vazio ou um valor que o bloco não oferece) e o ida-e-volta dos blocos
 * do lote 10 (`worldIR.ts`): coletáveis, tirar do mundo, esvaziar a mochila e o Molda.
 */

type Option = readonly [string, string]

const has = (options: readonly Option[], value: unknown): value is string =>
  typeof value === 'string' && options.some(([, option]) => option === value)

const W3D_DROPDOWN_CHECKS: Readonly<Record<string, (value: string) => boolean>> = {
  // `SZWorld3D.keyDown('KeyE')`: as teclas COMUNS das extensões 3D (`threeKeys.ts`).
  keyDown: isThreeKeyCode,
  keyPressed: isThreeKeyCode,
}

/** O valor do dropdown de `SZWorld3D.<método>` cabe no bloco? Método sem dropdown: sempre. */
export function world3DDropdownIsValid(method: string, value: unknown): value is string {
  const check = W3D_DROPDOWN_CHECKS[method]
  if (typeof value !== 'string') return false
  return check ? check(value) : true
}

// ---------------------------------------------------------------- bloco → IR

interface BlockTools {
  field(block: Blockly.Block, name: string): string
  expression(block: Blockly.Block, name: string, fallback: JSExpr): JSExpr
  statements(block: Blockly.Block, name: string): JSStatement[]
}

const MODEL_BLOCK_TARGETS: Readonly<Record<string, W3DModelTarget>> = {
  sz_w3d_person_model: 'personagem',
  sz_w3d_npc_model: 'amigo',
  sz_w3d_car_model: 'carro',
}

/** Bloco do lote 10 → nó; `undefined` quando o bloco não é um deles (a fachada segue). */
export function world3DNewBlockToIR(
  block: Blockly.Block,
  tools: BlockTools,
): JSStatement | undefined {
  const f = (name: string) => tools.field(block, name)
  const num = (name: string, value: number) => tools.expression(block, name, { type: 'num', value })
  let node: World3DNewStatement
  switch (block.type) {
    case 'sz_w3d_collectible':
      node = {
        type: 'w3d:collectible',
        n: num('N', 5),
        kind: (has(W3D_COLLECTIBLE_KINDS, f('KIND')) ? f('KIND') : 'estrela') as W3DCollectibleKind,
        // O nome vazio é um nome (o runtime o aceita): trocar por "estrela" mudava o código na Ponte.
        name: f('NAME'),
        x: num('X', 0),
        z: num('Z', 0),
        r: num('R', 20),
      }
      break
    case 'sz_w3d_on_collect_item':
      node = {
        type: 'w3d:onCollectItem',
        name: f('NAME') || 'estrela',
        body: tools.statements(block, 'BODY'),
      }
      break
    case 'sz_w3d_remove_named':
      node = { type: 'w3d:removeNamed', name: f('NAME') }
      break
    case 'sz_w3d_inventory_clear':
      node = { type: 'w3d:inventoryClear' }
      break
    case 'sz_w3d_person_model':
    case 'sz_w3d_npc_model':
    case 'sz_w3d_car_model': {
      const target = MODEL_BLOCK_TARGETS[block.type] as W3DModelTarget
      node = {
        type: 'w3d:useModel',
        target,
        model: f('MODEL'),
        ...(target === 'amigo' ? { name: f('NAME') } : {}),
        size: num('SIZE', target === 'carro' ? 4 : 1.7),
      }
      break
    }
    case 'sz_w3d_model_anim': {
      const who = (has(W3D_MODEL_ANIM_WHO, f('WHO')) ? f('WHO') : 'personagem') as W3DModelAnimWho
      node = {
        type: 'w3d:modelAnim',
        who,
        ...(who === 'amigo' ? { name: f('NAME') } : {}),
        state: (has(W3D_MODEL_ANIM_STATES, f('STATE'))
          ? f('STATE')
          : 'parado') as W3DModelAnimState,
        clip: f('CLIP'),
      }
      break
    }
    default:
      return undefined
  }
  return node as JSStatement
}

// ---------------------------------------------------------------- IR → código

interface CodeTools {
  pad: string
  expression(value: JSExpr): string
  body(statements: JSStatement[]): string
}

const MODEL_METHODS: Readonly<Record<W3DModelTarget, string>> = {
  personagem: 'personModel',
  amigo: 'npcModel',
  carro: 'carModel',
}

export function world3DNewStatementToCode(s: JSStatement, t: CodeTools): string | undefined {
  if (!isWorld3DNewStatement(s)) return undefined
  const e = t.expression
  const q = (value: string) => JSON.stringify(value)
  const call = (method: string, args: string[]) =>
    `${t.pad}SZWorld3D.${method}(${args.join(', ')});`
  switch (s.type) {
    case 'w3d:collectible':
      return call('collectible', [e(s.n), q(s.kind), q(s.name), e(s.x), e(s.z), e(s.r)])
    case 'w3d:onCollectItem':
      return `${t.pad}SZWorld3D.onCollectItem(${q(s.name)}, () => {\n${t.body(s.body)}\n${t.pad}});`
    case 'w3d:removeNamed':
      return call('removeNamed', [q(s.name)])
    case 'w3d:inventoryClear':
      return call('inventoryClear', [])
    case 'w3d:useModel':
      return s.target === 'amigo'
        ? call('npcModel', [q(s.model), q(s.name ?? ''), e(s.size)])
        : call(MODEL_METHODS[s.target], [q(s.model), e(s.size)])
    case 'w3d:modelAnim':
      return call('modelAnim', [
        q(s.who),
        q(s.who === 'amigo' ? (s.name ?? '') : ''),
        q(s.state),
        q(s.clip),
      ])
  }
}

// ---------------------------------------------------------------- código → IR

/** As primitivas do parser central (a mesma forma do `PlatformCodecTools`). */
export interface World3DParserTools {
  toExpr: (node: unknown) => JSExpr | null
  isSimpleValue: (expr: JSExpr | null) => expr is JSExpr
  isInlineFunction: (node: unknown) => boolean
  bodyOfFn: (node: unknown) => JSStatement[]
}

function stringArg(args: unknown[], index: number): string | null {
  const arg = args[index] as { type?: string; value?: unknown } | undefined
  return arg?.type === 'StringLiteral' && typeof arg.value === 'string' ? arg.value : null
}

const NEW_METHODS = new Set([
  'collectible',
  'onCollectItem',
  'removeNamed',
  'inventoryClear',
  'personModel',
  'npcModel',
  'carModel',
  'modelAnim',
])

/** `SZWorld3D.<método>(…)` do lote 10 → nó; `undefined` quando não é um deles. */
export function world3DNewCallToIR(
  method: string,
  args: unknown[],
  tools: World3DParserTools,
): JSStatement | null | undefined {
  if (!NEW_METHODS.has(method)) return undefined
  const value = (index: number): JSExpr | null => {
    const converted = tools.toExpr(args[index])
    return tools.isSimpleValue(converted) ? converted : null
  }
  const str = (index: number) => stringArg(args, index)
  const size = (count: number) => args.length === count
  let node: World3DNewStatement | null = null
  switch (method) {
    case 'collectible': {
      const [n, x, z, r] = [value(0), value(3), value(4), value(5)]
      const kind = str(1)
      const name = str(2)
      if (size(6) && n && x && z && r && has(W3D_COLLECTIBLE_KINDS, kind) && name !== null)
        node = { type: 'w3d:collectible', n, kind: kind as W3DCollectibleKind, name, x, z, r }
      break
    }
    case 'onCollectItem': {
      const name = str(0)
      const fn = args[1]
      if (size(2) && name !== null && tools.isInlineFunction(fn)) {
        const params = (fn as { params?: unknown[] }).params ?? []
        if (params.length === 0)
          node = { type: 'w3d:onCollectItem', name, body: tools.bodyOfFn(fn) }
      }
      break
    }
    case 'removeNamed': {
      const name = str(0)
      if (size(1) && name !== null) node = { type: 'w3d:removeNamed', name }
      break
    }
    case 'inventoryClear':
      if (size(0)) node = { type: 'w3d:inventoryClear' }
      break
    case 'personModel':
    case 'carModel': {
      const model = str(0)
      const sz = value(1)
      if (size(2) && model !== null && sz)
        node = {
          type: 'w3d:useModel',
          target: method === 'personModel' ? 'personagem' : 'carro',
          model,
          size: sz,
        }
      break
    }
    case 'npcModel': {
      const model = str(0)
      const name = str(1)
      const sz = value(2)
      if (size(3) && model !== null && name !== null && sz)
        node = { type: 'w3d:useModel', target: 'amigo', model, name, size: sz }
      break
    }
    case 'modelAnim': {
      const [who, name, state, clip] = [str(0), str(1), str(2), str(3)]
      if (
        size(4) &&
        has(W3D_MODEL_ANIM_WHO, who) &&
        has(W3D_MODEL_ANIM_STATES, state) &&
        name !== null &&
        clip !== null &&
        (who === 'amigo' || name === '')
      )
        node = {
          type: 'w3d:modelAnim',
          who: who as W3DModelAnimWho,
          ...(who === 'amigo' ? { name } : {}),
          state: state as W3DModelAnimState,
          clip,
        }
      break
    }
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

export function world3DNewStatementToBlock(
  s: JSStatement,
  t: WorkspaceTools,
): SerializedBlocklyBlock | undefined {
  if (!isWorld3DNewStatement(s)) return undefined
  const make = (
    type: string,
    fields: Record<string, string>,
    values: Record<string, JSExpr>,
    body?: JSStatement[],
  ): SerializedBlocklyBlock => {
    const converted: Record<string, SerializedBlocklyBlock> = {}
    for (const [input, value] of Object.entries(values)) {
      const valueBlock = t.expression(value)
      if (!valueBlock) return t.raw(s)
      converted[input] = valueBlock
    }
    return t.block(type, fields, body ? { BODY: t.statements(body) } : {}, s.__id, converted)
  }
  switch (s.type) {
    case 'w3d:collectible':
      return make(
        'sz_w3d_collectible',
        { KIND: s.kind, NAME: s.name },
        { N: s.n, X: s.x, Z: s.z, R: s.r },
      )
    case 'w3d:onCollectItem':
      return make('sz_w3d_on_collect_item', { NAME: s.name }, {}, s.body)
    case 'w3d:removeNamed':
      return make('sz_w3d_remove_named', { NAME: s.name }, {})
    case 'w3d:inventoryClear':
      return make('sz_w3d_inventory_clear', {}, {})
    case 'w3d:useModel':
      if (s.target === 'amigo')
        return make('sz_w3d_npc_model', { MODEL: s.model, NAME: s.name ?? '' }, { SIZE: s.size })
      return make(
        s.target === 'carro' ? 'sz_w3d_car_model' : 'sz_w3d_person_model',
        { MODEL: s.model },
        { SIZE: s.size },
      )
    case 'w3d:modelAnim':
      return make(
        'sz_w3d_model_anim',
        // Sem amigo, o campo do nome volta com o padrão do próprio bloco.
        { WHO: s.who, NAME: s.name ?? 'Lia', STATE: s.state, CLIP: s.clip },
        {},
      )
  }
}

// ---------------------------------------------------------------- nomes usados

export function collectWorld3DNewIdentifiers(
  s: JSStatement,
  names: Set<string>,
  expression: (value: JSExpr, names: Set<string>) => void,
  statement: (value: JSStatement, names: Set<string>) => void,
): boolean {
  if (!isWorld3DNewStatement(s)) return false
  if (s.type === 'w3d:collectible') for (const v of [s.n, s.x, s.z, s.r]) expression(v, names)
  if (s.type === 'w3d:useModel') expression(s.size, names)
  if (s.type === 'w3d:onCollectItem') for (const child of s.body) statement(child, names)
  return true
}
