import type * as Blockly from 'blockly/core'
import type { SerializedBlocklyBlock } from '../../codecs/types'
import type { JSExpr, JSStatement } from '../../ir/schema'
import { GAME3D_DROPDOWN_OPTIONS } from '../../three/game3dContract'
import {
  GAME_RULES_CORNERS,
  GAME_RULES_ENABLED_PREFIXES,
  GAME_RULES_EXTENSIONS,
  GAME_RULES_GLOBALS,
  GAME_RULES_IMPLICIT_HERO_PREFIXES,
  GAME_RULES_PREFIX_OFF,
  GAME_RULES_RESULTS,
  GAME_RULES_SCREENS,
  type GameRulesCorner,
  type GameRulesExpression,
  type GameRulesPrefix,
  type GameRulesResult,
  type GameRulesScreen,
  type GameRulesStatement,
  isGameRulesExpression,
  isGameRulesStatement,
  splitGameRulesType,
} from './ir'

/**
 * Codec das REGRAS DE JOGO 3D: bloco → IR, IR → código, código → IR e IR → bloco, para os três
 * prefixos. As fachadas (`buildIR`, `generators/js.ts`, `generators/expr.ts`, `parsers/js.ts`,
 * `workspaceState.ts`) só delegam, com ganchos de poucas linhas: elas têm teto de linhas
 * (`generators/__tests__/architecture.test.ts`) e a extensão cresce aqui (molde de
 * `game-3d/platformCodec.ts`).
 *
 * Só os prefixos LIGADOS (`GAME_RULES_ENABLED_PREFIXES`) são reconhecidos no código e nos blocos:
 * ler `SZWorld3D.hudText(…)` antes de o Mundo 3D ter o bloco produziria um bloco que não existe.
 */

type Option = readonly [string, string]

/** As teclas de cada extensão (o mesmo dropdown dos blocos de tecla dela). */
const KEY_OPTIONS: Partial<Record<GameRulesPrefix, readonly Option[]>> = {
  g3d: GAME3D_DROPDOWN_OPTIONS.key,
}

const has = (options: readonly Option[], value: string | null | undefined): boolean =>
  typeof value === 'string' && options.some(([, option]) => option === value)

function enabled(prefix: string): prefix is GameRulesPrefix {
  return (GAME_RULES_ENABLED_PREFIXES as readonly string[]).includes(prefix)
}

/** A vida deste prefixo é sempre do jogador (sem objeto)? */
function implicitHero(prefix: GameRulesPrefix): boolean {
  return GAME_RULES_IMPLICIT_HERO_PREFIXES.includes(prefix)
}

/** O prefixo oferece este MÉTODO do global? (o Mundo 3D não tem piscar, tecla, clique…) */
function offers(prefix: GameRulesPrefix, method: string): boolean {
  return !GAME_RULES_PREFIX_OFF[prefix]?.includes(method)
}

/** O método do global que cada nó de statement usa (para a régua do `offers`). */
function methodOfStatement(s: GameRulesStatement): string {
  const name = splitGameRulesType(s.type)?.[1] ?? ''
  const op = (s as { op?: string }).op
  if (name === 'life') return op === 'dar' ? 'setLife' : op === 'machucar' ? 'hurt' : 'heal'
  if (name === 'timer') return op === 'parar' ? 'stopTimer' : 'startTimer'
  if (name !== 'onGame') return name
  const event = (s as { event?: string }).event
  if (event === 'vida-acabou') return 'onLifeOver'
  if (event === 'tempo-acabou') return 'onTimerEnd'
  if (event === 'tecla') return 'onKey'
  if (event === 'clique') return 'onClickObject'
  if (event === 'clique-cena') return 'onCanvasClick'
  if (event === 'encostar') return 'onTouchGroup'
  return name
}

/**
 * O método de cada sufixo de bloco. Um prefixo que NÃO oferece a regra pode ter um bloco PRÓPRIO
 * com o mesmo sufixo (o `sz_g3k_hurt` do Avançado é a vida por entidade dele): sem esta régua o
 * codec das regras engoliria o bloco da extensão.
 */
const BLOCK_SUFFIX_METHOD: Readonly<Record<string, string>> = {
  hud_text: 'hudText',
  add_score: 'addScore',
  score: 'score',
  set_life: 'setLife',
  hurt: 'hurt',
  heal: 'heal',
  life_of: 'lifeOf',
  on_life_over: 'onLifeOver',
  set_screen_text: 'setScreenText',
  end_game: 'endGame',
  restart: 'restart',
  after_seconds: 'afterSeconds',
  start_timer: 'startTimer',
  time_left: 'timeLeft',
  on_timer_end: 'onTimerEnd',
  stop_timer: 'stopTimer',
  random_between: 'randomBetween',
  random_chance: 'randomChance',
  camera_shake: 'cameraShake',
  blink: 'blink',
  on_key: 'onKey',
  on_click_object: 'onClickObject',
  on_canvas_click: 'onCanvasClick',
  on_touch_group: 'onTouchGroup',
}

/** Vida sem objeto só cabe no prefixo de jogador implícito (e vice-versa). */
function lifeShapeFits(prefix: GameRulesPrefix, objVar: string | undefined): boolean {
  return (objVar === undefined) === implicitHero(prefix)
}

function prefixOfBlock(type: string): [GameRulesPrefix, string] | null {
  const match = /^sz_([a-z0-9]+)_(.+)$/.exec(type)
  if (!match?.[1] || !match[2] || !enabled(match[1])) return null
  const method = BLOCK_SUFFIX_METHOD[match[2]]
  if (!method || !offers(match[1], method)) return null
  return [match[1], match[2]]
}

const rule = <N extends string>(prefix: GameRulesPrefix, name: N) =>
  `${prefix}:${name}` as `${GameRulesPrefix}:${N}`

// ---------------------------------------------------------------- bloco → IR

interface BlockTools {
  field(block: Blockly.Block, name: string): string
  expression(block: Blockly.Block, name: string, fallback: JSExpr): JSExpr
  statements(block: Blockly.Block, name: string): JSStatement[]
}

export function gameRulesBlockToIR(
  block: Blockly.Block,
  tools: BlockTools,
): { statement: JSStatement; extensionId: string } | undefined {
  const split = prefixOfBlock(block.type)
  if (!split) return undefined
  const [p, suffix] = split
  const f = (name: string) => tools.field(block, name)
  const num = (name: string, value: number) => tools.expression(block, name, { type: 'num', value })
  const body = () => tools.statements(block, 'BODY')
  let statement: GameRulesStatement
  switch (suffix) {
    case 'hud_text':
      statement = {
        type: rule(p, 'cornerText'),
        corner: (f('CORNER') || 'top-left') as GameRulesCorner,
        // Soquete vazio = a sombra da paleta (blocks.ts).
        text: tools.expression(block, 'TEXT', { type: 'str', value: 'Pegue as estrelas!' }),
      }
      break
    case 'add_score':
      statement = { type: rule(p, 'addScore'), value: num('VALUE', 1) }
      break
    case 'set_life':
    case 'hurt':
    case 'heal':
      statement = {
        type: rule(p, 'life'),
        op: suffix === 'set_life' ? 'dar' : suffix === 'hurt' ? 'machucar' : 'curar',
        ...(implicitHero(p) ? {} : { objVar: f('OBJ') }),
        value: num('VALUE', suffix === 'set_life' ? 3 : 1),
      }
      break
    case 'set_screen_text':
      statement = {
        type: rule(p, 'screenText'),
        screen: (f('SCREEN') || 'inicio') as GameRulesScreen,
        title: f('TITLE'),
        text: f('TEXT'),
        button: f('BUTTON'),
      }
      break
    case 'end_game':
      statement = {
        type: rule(p, 'gameOver'),
        result: (f('RESULT') || 'perdeu') as GameRulesResult,
      }
      break
    case 'restart':
      statement = { type: rule(p, 'restart') }
      break
    case 'after_seconds':
      statement = { type: rule(p, 'afterSeconds'), secs: num('SECS', 3), body: body() }
      break
    case 'start_timer':
      statement = { type: rule(p, 'timer'), op: 'comecar', secs: num('SECS', 30) }
      break
    case 'stop_timer':
      statement = { type: rule(p, 'timer'), op: 'parar' }
      break
    case 'camera_shake':
      statement = {
        type: rule(p, 'shakeCamera'),
        strength: num('STRENGTH', 0.3),
        secs: num('SECS', 0.3),
      }
      break
    case 'blink':
      statement = { type: rule(p, 'blink'), objVar: f('OBJ'), secs: num('SECS', 1) }
      break
    case 'on_life_over':
      statement = {
        type: rule(p, 'onGame'),
        event: 'vida-acabou',
        ...(implicitHero(p) ? {} : { objVar: f('OBJ') }),
        body: body(),
      }
      break
    case 'on_timer_end':
      statement = { type: rule(p, 'onGame'), event: 'tempo-acabou', body: body() }
      break
    case 'on_key':
      statement = { type: rule(p, 'onGame'), event: 'tecla', key: f('KEY'), body: body() }
      break
    case 'on_click_object':
      statement = { type: rule(p, 'onGame'), event: 'clique', objVar: f('OBJ'), body: body() }
      break
    case 'on_canvas_click':
      statement = { type: rule(p, 'onGame'), event: 'clique-cena', body: body() }
      break
    case 'on_touch_group':
      statement = {
        type: rule(p, 'onGame'),
        event: 'encostar',
        objVar: f('OBJ'),
        groupVar: f('GROUP'),
        itemName: f('ITEM'),
        body: body(),
      }
      break
    default:
      return undefined
  }
  return { statement: statement as JSStatement, extensionId: GAME_RULES_EXTENSIONS[p] }
}

export function gameRulesBlockExpression(
  block: Blockly.Block,
  field: (block: Blockly.Block, name: string) => string,
  expression: (block: Blockly.Block, name: string, fallback: JSExpr) => JSExpr,
): JSExpr | undefined {
  const split = prefixOfBlock(block.type)
  if (!split) return undefined
  const [p, suffix] = split
  let value: GameRulesExpression
  switch (suffix) {
    case 'score':
      value = { type: rule(p, 'gameValue'), what: 'pontos' }
      break
    case 'time_left':
      value = { type: rule(p, 'gameValue'), what: 'tempo' }
      break
    case 'life_of':
      value = implicitHero(p)
        ? { type: rule(p, 'gameValue'), what: 'vida' }
        : { type: rule(p, 'gameValue'), what: 'vida', objVar: field(block, 'OBJ') }
      break
    case 'random_between':
      value = {
        type: rule(p, 'random'),
        op: 'entre',
        a: expression(block, 'A', { type: 'num', value: 1 }),
        b: expression(block, 'B', { type: 'num', value: 6 }),
      }
      break
    case 'random_chance':
      value = {
        type: rule(p, 'random'),
        op: 'chance',
        a: expression(block, 'A', { type: 'num', value: 30 }),
      }
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

function globalOf(type: string): string {
  const split = splitGameRulesType(type)
  return GAME_RULES_GLOBALS[split?.[0] ?? 'g3d']
}

export function gameRulesStatementToCode(s: GameRulesStatement, t: CodeTools): string {
  const g = globalOf(s.type)
  const e = t.expression
  const call = (method: string, args: string[]) => `${t.pad}${g}.${method}(${args.join(', ')});`
  const withBody = (method: string, args: string[], params: string, body: JSStatement[]) =>
    `${t.pad}${g}.${method}(${[...args, `(${params}) => {\n${t.body(body)}\n${t.pad}}`].join(', ')});`
  const name = splitGameRulesType(s.type)?.[1]
  switch (name) {
    case 'cornerText': {
      const r = s as Extract<GameRulesStatement, { corner: string }>
      return call('hudText', [JSON.stringify(r.corner), e(r.text)])
    }
    case 'addScore': {
      const r = s as Extract<GameRulesStatement, { type: `${string}:addScore` }>
      return call('addScore', [e(r.value)])
    }
    case 'life': {
      const r = s as Extract<GameRulesStatement, { op: 'dar' | 'machucar' | 'curar' }>
      const method = r.op === 'dar' ? 'setLife' : r.op === 'machucar' ? 'hurt' : 'heal'
      return call(method, r.objVar === undefined ? [e(r.value)] : [t.id(r.objVar), e(r.value)])
    }
    case 'screenText': {
      const r = s as Extract<GameRulesStatement, { screen: string }>
      return call(
        'setScreenText',
        [r.screen, r.title, r.text, r.button].map((v) => JSON.stringify(v)),
      )
    }
    case 'gameOver': {
      const r = s as Extract<GameRulesStatement, { result: string }>
      return call('endGame', [JSON.stringify(r.result)])
    }
    case 'restart':
      return call('restart', [])
    case 'afterSeconds': {
      const r = s as Extract<GameRulesStatement, { type: `${string}:afterSeconds` }>
      return withBody('afterSeconds', [e(r.secs)], '', r.body)
    }
    case 'timer': {
      const r = s as Extract<GameRulesStatement, { op: 'comecar' | 'parar' }>
      return r.op === 'parar'
        ? call('stopTimer', [])
        : call('startTimer', [e(r.secs ?? { type: 'num', value: 30 })])
    }
    case 'shakeCamera': {
      const r = s as Extract<GameRulesStatement, { strength: JSExpr }>
      return call('cameraShake', [e(r.strength), e(r.secs)])
    }
    case 'blink': {
      const r = s as Extract<GameRulesStatement, { type: `${string}:blink` }>
      return call('blink', [t.id(r.objVar), e(r.secs)])
    }
    case 'onGame': {
      const r = s as Extract<GameRulesStatement, { event: string }>
      const obj = t.id(r.objVar ?? '')
      if (r.event === 'vida-acabou')
        return withBody('onLifeOver', r.objVar === undefined ? [] : [obj], '', r.body)
      if (r.event === 'tempo-acabou') return withBody('onTimerEnd', [], '', r.body)
      if (r.event === 'tecla') return withBody('onKey', [JSON.stringify(r.key ?? '')], '', r.body)
      if (r.event === 'clique') return withBody('onClickObject', [obj], '', r.body)
      if (r.event === 'clique-cena') return withBody('onCanvasClick', [], '', r.body)
      return withBody(
        'onTouchGroup',
        [obj, t.id(r.groupVar ?? '')],
        t.id(r.itemName ?? 'item'),
        r.body,
      )
    }
  }
  throw new Error(`Regra de jogo sem gerador: ${s.type}`)
}

export function gameRulesExpressionToCode(
  s: GameRulesExpression,
  expression: (value: JSExpr) => string,
  id: (name: string) => string,
): string {
  const g = globalOf(s.type)
  if ('what' in s) {
    if (s.what === 'pontos') return `${g}.score()`
    if (s.what === 'tempo') return `${g}.timeLeft()`
    return s.objVar === undefined ? `${g}.lifeOf()` : `${g}.lifeOf(${id(s.objVar)})`
  }
  return s.op === 'entre'
    ? `${g}.randomBetween(${expression(s.a)}, ${expression(s.b ?? { type: 'num', value: 6 })})`
    : `${g}.randomChance(${expression(s.a)})`
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

export function gameRulesStatementToBlock(
  s: JSStatement,
  t: WorkspaceTools,
): SerializedBlocklyBlock | undefined {
  if (!isGameRulesStatement(s)) return undefined
  const split = splitGameRulesType(s.type)
  if (!split) return undefined
  const [p, name] = split
  // Prefixo sem blocos ainda (ou regra que ele não oferece, ou vida com a forma do outro
  // prefixo): vira código avançado em vez de um bloco que não existe.
  if (!enabled(p) || !offers(p, methodOfStatement(s))) return t.raw(s)
  const lifeObj = (s as { objVar?: string }).objVar
  const lifeEvent = name === 'life' || (s as { event?: string }).event === 'vida-acabou'
  if (lifeEvent && !lifeShapeFits(p, lifeObj)) return t.raw(s)
  const make = (
    suffix: string,
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
    return t.block(
      `sz_${p}_${suffix}`,
      fields,
      body ? { BODY: t.statements(body) } : {},
      s.__id,
      converted,
    )
  }
  switch (name) {
    case 'cornerText': {
      const r = s as Extract<GameRulesStatement, { corner: string }>
      return make('hud_text', { CORNER: r.corner }, { TEXT: r.text })
    }
    case 'addScore': {
      const r = s as Extract<GameRulesStatement, { type: `${string}:addScore` }>
      return make('add_score', {}, { VALUE: r.value })
    }
    case 'life': {
      const r = s as Extract<GameRulesStatement, { op: 'dar' | 'machucar' | 'curar' }>
      const suffix = r.op === 'dar' ? 'set_life' : r.op === 'machucar' ? 'hurt' : 'heal'
      return make(suffix, r.objVar === undefined ? {} : { OBJ: r.objVar }, { VALUE: r.value })
    }
    case 'screenText': {
      const r = s as Extract<GameRulesStatement, { screen: string }>
      return make(
        'set_screen_text',
        { SCREEN: r.screen, TITLE: r.title, TEXT: r.text, BUTTON: r.button },
        {},
      )
    }
    case 'gameOver': {
      const r = s as Extract<GameRulesStatement, { result: string }>
      return make('end_game', { RESULT: r.result }, {})
    }
    case 'restart':
      return make('restart', {}, {})
    case 'afterSeconds': {
      const r = s as Extract<GameRulesStatement, { type: `${string}:afterSeconds` }>
      return make('after_seconds', {}, { SECS: r.secs }, r.body)
    }
    case 'timer': {
      const r = s as Extract<GameRulesStatement, { op: 'comecar' | 'parar' }>
      return r.op === 'parar'
        ? make('stop_timer', {}, {})
        : make('start_timer', {}, { SECS: r.secs ?? { type: 'num', value: 30 } })
    }
    case 'shakeCamera': {
      const r = s as Extract<GameRulesStatement, { strength: JSExpr }>
      return make('camera_shake', {}, { STRENGTH: r.strength, SECS: r.secs })
    }
    case 'blink': {
      const r = s as Extract<GameRulesStatement, { type: `${string}:blink` }>
      return make('blink', { OBJ: r.objVar }, { SECS: r.secs })
    }
    case 'onGame': {
      const r = s as Extract<GameRulesStatement, { event: string }>
      if (r.event === 'vida-acabou')
        return make('on_life_over', r.objVar === undefined ? {} : { OBJ: r.objVar }, {}, r.body)
      if (r.event === 'tempo-acabou') return make('on_timer_end', {}, {}, r.body)
      if (r.event === 'tecla') return make('on_key', { KEY: r.key ?? '' }, {}, r.body)
      if (r.event === 'clique') return make('on_click_object', { OBJ: r.objVar ?? '' }, {}, r.body)
      if (r.event === 'clique-cena') return make('on_canvas_click', {}, {}, r.body)
      return make(
        'on_touch_group',
        { OBJ: r.objVar ?? '', GROUP: r.groupVar ?? '', ITEM: r.itemName ?? 'item' },
        {},
        r.body,
      )
    }
  }
  return t.raw(s)
}

export function gameRulesExpressionToBlock(
  s: JSExpr,
  block: WorkspaceTools['block'],
  expression: WorkspaceTools['expression'],
): SerializedBlocklyBlock | null | undefined {
  if (!isGameRulesExpression(s)) return undefined
  const split = splitGameRulesType(s.type)
  if (!split || !enabled(split[0])) return null
  const p = split[0]
  if ('what' in s) {
    if (s.what === 'pontos') return block(`sz_${p}_score`, {}, {}, s.__id)
    if (s.what === 'tempo') return block(`sz_${p}_time_left`, {}, {}, s.__id)
    if (!lifeShapeFits(p, s.objVar) || !offers(p, 'lifeOf')) return null
    return block(`sz_${p}_life_of`, s.objVar === undefined ? {} : { OBJ: s.objVar }, {}, s.__id)
  }
  const a = expression(s.a)
  if (!a) return null
  if (s.op === 'chance') return block(`sz_${p}_random_chance`, {}, {}, s.__id, { A: a })
  const b = expression(s.b ?? { type: 'num', value: 6 })
  return b ? block(`sz_${p}_random_between`, {}, {}, s.__id, { A: a, B: b }) : null
}

// ---------------------------------------------------------------- código → IR

/** As primitivas do parser central (a mesma forma do `PlatformCodecTools`). */
export interface GameRulesParserTools {
  identifierName: (node: unknown) => string | null
  toExpr: (node: unknown) => JSExpr | null
  isSimpleValue: (expr: JSExpr | null) => expr is JSExpr
  isInlineFunction: (node: unknown) => boolean
  bodyOfFn: (node: unknown) => JSStatement[]
}

interface CallNode {
  type?: string
  callee?: {
    type?: string
    computed?: boolean
    object?: { type?: string; name?: string }
    property?: { type?: string; name?: string }
  }
  arguments?: unknown[]
}

/** `SZGame3D.metodo(args)` (ou o global de outro prefixo ligado) → partes; null se não for. */
function asRulesCall(
  node: unknown,
): { prefix: GameRulesPrefix; method: string; args: unknown[] } | null {
  const call = node as CallNode | null
  if (call?.type !== 'CallExpression') return null
  const callee = call.callee
  if (callee?.type !== 'MemberExpression' || callee.computed) return null
  if (callee.object?.type !== 'Identifier' || callee.property?.type !== 'Identifier') return null
  const prefix = GAME_RULES_ENABLED_PREFIXES.find(
    (candidate) => GAME_RULES_GLOBALS[candidate] === callee.object?.name,
  )
  if (!prefix || !callee.property.name || !offers(prefix, callee.property.name)) return null
  return { prefix, method: callee.property.name, args: call.arguments ?? [] }
}

function stringArg(args: unknown[], index: number): string | null {
  const arg = args[index] as { type?: string; value?: unknown } | undefined
  return arg?.type === 'StringLiteral' ? String(arg.value) : null
}

function fnParams(fn: unknown): { type?: string; name?: string }[] {
  return (fn as { params?: { type?: string; name?: string }[] }).params ?? []
}

/** Chamada de REGRA em posição de comando; `undefined` quando não é regra (o parser segue). */
export function gameRulesCallToIR(
  node: unknown,
  tools: GameRulesParserTools,
): JSStatement | null | undefined {
  const call = asRulesCall(node)
  if (!call) return undefined
  const { prefix: p, method, args } = call
  const value = (index: number): JSExpr | null => {
    const converted = tools.toExpr(args[index])
    return tools.isSimpleValue(converted) ? converted : null
  }
  const id = (index: number) => tools.identifierName(args[index]) || null
  const fn = (index: number, params: number): JSStatement[] | null => {
    const candidate = args[index]
    if (!tools.isInlineFunction(candidate) || fnParams(candidate).length !== params) return null
    return tools.bodyOfFn(candidate)
  }
  const size = (count: number) => args.length === count
  let statement: GameRulesStatement | null = null
  switch (method) {
    case 'hudText': {
      const corner = stringArg(args, 0)
      const text = value(1)
      if (size(2) && has(GAME_RULES_CORNERS, corner) && text)
        statement = { type: rule(p, 'cornerText'), corner: corner as GameRulesCorner, text }
      break
    }
    case 'addScore': {
      const v = value(0)
      if (size(1) && v) statement = { type: rule(p, 'addScore'), value: v }
      break
    }
    case 'setLife':
    case 'hurt':
    case 'heal': {
      const op = method === 'setLife' ? 'dar' : method === 'hurt' ? 'machucar' : 'curar'
      if (implicitHero(p)) {
        const v = value(0)
        if (size(1) && v) statement = { type: rule(p, 'life'), op, value: v }
        break
      }
      const objVar = id(0)
      const v = value(1)
      if (size(2) && objVar && v) statement = { type: rule(p, 'life'), op, objVar, value: v }
      break
    }
    case 'setScreenText': {
      const [screen, title, text, button] = [0, 1, 2, 3].map((index) => stringArg(args, index))
      if (
        size(4) &&
        has(GAME_RULES_SCREENS, screen) &&
        title !== null &&
        text !== null &&
        button !== null
      )
        statement = {
          type: rule(p, 'screenText'),
          screen: screen as GameRulesScreen,
          title: title ?? '',
          text: text ?? '',
          button: button ?? '',
        }
      break
    }
    case 'endGame': {
      const result = stringArg(args, 0)
      if (size(1) && has(GAME_RULES_RESULTS, result))
        statement = { type: rule(p, 'gameOver'), result: result as GameRulesResult }
      break
    }
    case 'restart':
      if (size(0)) statement = { type: rule(p, 'restart') }
      break
    case 'afterSeconds': {
      const secs = value(0)
      const body = fn(1, 0)
      if (size(2) && secs && body) statement = { type: rule(p, 'afterSeconds'), secs, body }
      break
    }
    case 'startTimer': {
      const secs = value(0)
      if (size(1) && secs) statement = { type: rule(p, 'timer'), op: 'comecar', secs }
      break
    }
    case 'stopTimer':
      if (size(0)) statement = { type: rule(p, 'timer'), op: 'parar' }
      break
    case 'cameraShake': {
      const strength = value(0)
      const secs = value(1)
      if (size(2) && strength && secs) statement = { type: rule(p, 'shakeCamera'), strength, secs }
      break
    }
    case 'blink': {
      const objVar = id(0)
      const secs = value(1)
      if (size(2) && objVar && secs) statement = { type: rule(p, 'blink'), objVar, secs }
      break
    }
    case 'onLifeOver':
    case 'onClickObject': {
      if (method === 'onLifeOver' && implicitHero(p)) {
        const lifeBody = fn(0, 0)
        if (size(1) && lifeBody)
          statement = { type: rule(p, 'onGame'), event: 'vida-acabou', body: lifeBody }
        break
      }
      const objVar = id(0)
      const body = fn(1, 0)
      if (size(2) && objVar && body)
        statement = {
          type: rule(p, 'onGame'),
          event: method === 'onLifeOver' ? 'vida-acabou' : 'clique',
          objVar,
          body,
        }
      break
    }
    case 'onCanvasClick': {
      const body = fn(0, 0)
      if (size(1) && body) statement = { type: rule(p, 'onGame'), event: 'clique-cena', body }
      break
    }
    case 'onTimerEnd': {
      const body = fn(0, 0)
      if (size(1) && body) statement = { type: rule(p, 'onGame'), event: 'tempo-acabou', body }
      break
    }
    case 'onKey': {
      const key = stringArg(args, 0)
      const body = fn(1, 0)
      if (size(2) && body && has(KEY_OPTIONS[p] ?? [], key))
        statement = { type: rule(p, 'onGame'), event: 'tecla', key: key ?? '', body }
      break
    }
    case 'onTouchGroup': {
      const objVar = id(0)
      const groupVar = id(1)
      const param = fnParams(args[2])[0]
      const body = fn(2, 1)
      if (size(3) && objVar && groupVar && body && param?.type === 'Identifier' && param.name)
        statement = {
          type: rule(p, 'onGame'),
          event: 'encostar',
          objVar,
          groupVar,
          itemName: param.name,
          body,
        }
      break
    }
    default:
      return undefined
  }
  return statement as JSStatement | null
}

/** Chamada de REGRA em posição de valor; `undefined` quando não é regra. */
export function gameRulesExpressionCallToIR(
  node: unknown,
  tools: Pick<GameRulesParserTools, 'identifierName' | 'toExpr' | 'isSimpleValue'>,
): JSExpr | null | undefined {
  const call = asRulesCall(node)
  if (!call) return undefined
  const { prefix: p, method, args } = call
  const value = (index: number): JSExpr | null => {
    const converted = tools.toExpr(args[index])
    return tools.isSimpleValue(converted) ? converted : null
  }
  let expr: GameRulesExpression | null = null
  switch (method) {
    case 'score':
      if (args.length === 0) expr = { type: rule(p, 'gameValue'), what: 'pontos' }
      break
    case 'timeLeft':
      if (args.length === 0) expr = { type: rule(p, 'gameValue'), what: 'tempo' }
      break
    case 'lifeOf': {
      if (implicitHero(p)) {
        if (args.length === 0) expr = { type: rule(p, 'gameValue'), what: 'vida' }
        break
      }
      const objVar = tools.identifierName(args[0])
      if (args.length === 1 && objVar) expr = { type: rule(p, 'gameValue'), what: 'vida', objVar }
      break
    }
    case 'randomBetween': {
      const a = value(0)
      const b = value(1)
      if (args.length === 2 && a && b) expr = { type: rule(p, 'random'), op: 'entre', a, b }
      break
    }
    case 'randomChance': {
      const a = value(0)
      if (args.length === 1 && a) expr = { type: rule(p, 'random'), op: 'chance', a }
      break
    }
    default:
      return undefined
  }
  return expr as JSExpr | null
}

/** Valor de regra cabe num soquete de bloco (inclusive num "se") quando os filhos cabem. */
export function gameRulesSimpleValue(
  expr: JSExpr,
  isSimpleValue: (value: JSExpr | null) => boolean,
): boolean | undefined {
  if (!isGameRulesExpression(expr)) return undefined
  const split = splitGameRulesType(expr.type)
  if (!split || !enabled(split[0])) return false
  if ('what' in expr) return true
  return isSimpleValue(expr.a) && (expr.b === undefined || isSimpleValue(expr.b))
}

// ---------------------------------------------------------------- nomes usados

export function collectGameRulesIdentifiers(
  s: JSStatement,
  names: Set<string>,
  expression: (value: JSExpr, names: Set<string>) => void,
  statement: (value: JSStatement, names: Set<string>) => void,
): boolean {
  if (!isGameRulesStatement(s)) return false
  const record = s as unknown as Record<string, unknown>
  for (const key of ['objVar', 'groupVar', 'itemName']) {
    const value = record[key]
    if (typeof value === 'string' && value) names.add(value)
  }
  for (const key of ['text', 'value', 'secs', 'strength']) {
    const value = record[key] as JSExpr | undefined
    if (value && typeof value === 'object') expression(value, names)
  }
  if ('body' in s) for (const child of s.body) statement(child, names)
  return true
}

export function collectGameRulesExpressionIdentifiers(
  expr: JSExpr,
  names: Set<string>,
  expression: (value: JSExpr, names: Set<string>) => void,
): boolean {
  if (!isGameRulesExpression(expr)) return false
  if ('what' in expr) {
    if (expr.objVar) names.add(expr.objVar)
    return true
  }
  expression(expr.a, names)
  if (expr.b) expression(expr.b, names)
  return true
}
