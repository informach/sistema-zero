import type * as Babel from '@babel/types'
import type * as Blockly from 'blockly/core'
import type { JSExpr, JSStatement } from '#ir'

/**
 * Codec local do lote de plataforma clássica do Jogo 3D (lote "Reino Cogumelo").
 *
 * Mesmo formato do `game-2d/classicCodec.ts`: a leitura do código de volta para
 * blocos mora AQUI, na extensão, e o `parsers/js.ts` só delega. É o que mantém a
 * fachada central sob o teto de linhas do `generators/__tests__/architecture.test.ts`
 * ("fachadas históricas concentradas não podem crescer") enquanto a extensão cresce.
 *
 * ⚠️ O valor de cada dropdown (lado da batida, estampa) NÃO é conferido aqui: o
 * `asSZGame3DCall` já barra opção desconhecida contra o `GAME3D_DROPDOWN_OPTIONS`
 * antes de chegar neste arquivo. Duas listas divergiriam em silêncio.
 */

type Node = Babel.Node & Record<string, never>

/** As ferramentas do parser central de que o codec precisa emprestadas. */
export interface PlatformCodecTools {
  /** Nome de um identificador simples, ou vazio/nulo quando o nó não é um. */
  identifierName: (node: unknown) => string | null
  /** Converte um nó em expressão da IR (null quando não dá). */
  toExpr: (node: unknown) => JSExpr | null
  /** A expressão é simples o bastante para caber num soquete de bloco? */
  isSimpleValue: (expr: JSExpr | null) => expr is JSExpr
  /** É uma função inline (arrow ou function expression)? */
  isInlineFunction: (node: unknown) => boolean
  /** Corpo de uma função inline, já convertido em statements da IR. */
  bodyOfFn: (node: unknown) => JSStatement[]
}

/** Só o nome do parâmetro quando a função inline tem exatamente um. */
function soloParamName(cb: unknown): string | null {
  const params = (cb as { params?: { type?: string; name?: string }[] }).params ?? []
  if (params.length !== 1 || params[0]?.type !== 'Identifier') return null
  return params[0].name ?? null
}

function stringArg(args: unknown[], index: number): string | null {
  const arg = args[index] as { type?: string; value?: unknown } | undefined
  return arg?.type === 'StringLiteral' ? String(arg.value) : null
}

/**
 * `SZGame3D.<metodo>(...)` em posição de COMANDO, para os métodos do lote de
 * plataforma. Devolve `undefined` quando o método não é deste lote (o parser
 * central segue tentando os outros).
 */
export function platformGameThreeDCallToIR(
  method: string,
  args: unknown[],
  tools: PlatformCodecTools,
): JSStatement | null | undefined {
  const { identifierName, toExpr, isSimpleValue, isInlineFunction, bodyOfFn } = tools

  switch (method) {
    case 'skyPhoto': {
      // generator: SZGame3D.skyPhoto(world, "nomeDoCeu") — o céu .hdr do Molda.
      const worldVar = identifierName(args[0])
      const asset = stringArg(args, 1)
      if (!worldVar || asset === null) return null
      return { type: 'g3d:skyPhoto', worldVar, asset }
    }
    case 'classicPlatformer': {
      const objVar = identifierName(args[0])
      const worldVar = identifierName(args[1])
      const speed = toExpr(args[2])
      const jump = toExpr(args[3])
      if (!objVar || !worldVar || !isSimpleValue(speed) || !isSimpleValue(jump)) return null
      return { type: 'g3d:classicPlatformer', objVar, worldVar, speed, jump }
    }
    case 'forEachHit': {
      // generator: SZGame3D.forEachHit(obj, "lado", (batida) => {…})
      const objVar = identifierName(args[0])
      const side = stringArg(args, 1)
      const cb = args[2]
      if (!objVar || side === null || !isInlineFunction(cb)) return null
      const itemName = soloParamName(cb)
      if (!itemName) return null
      return { type: 'g3d:forEachHit', objVar, side, itemName, body: bodyOfFn(cb) }
    }
    case 'carryRiders':
    case 'passUnder':
    case 'noShadow': {
      const objVar = identifierName(args[0])
      if (!objVar) return null
      const flag =
        method === 'carryRiders'
          ? 'carregar'
          : method === 'passUnder'
            ? 'atravessavel'
            : 'sem-sombra'
      return { type: 'g3d:objectFlag', objVar, flag }
    }
    case 'setObjectValue': {
      const objVar = identifierName(args[0])
      const key = stringArg(args, 1)
      const value = toExpr(args[2])
      if (!objVar || key === null || !isSimpleValue(value)) return null
      return { type: 'g3d:setObjectValue', objVar, key, value }
    }
    case 'paintPattern': {
      const objVar = identifierName(args[0])
      const pattern = stringArg(args, 1)
      const colorA = stringArg(args, 2)
      const colorB = stringArg(args, 3)
      if (!objVar || pattern === null || colorA === null || colorB === null) return null
      return { type: 'g3d:objectFlag', objVar, flag: 'estampa', pattern, colorA, colorB }
    }
    // ---- Kit Plataforma: um nó só, discriminado por `op` (ver platformIR.ts) ----
    case 'setStageTheme': {
      const worldVar = identifierName(args[0])
      const theme = stringArg(args, 1)
      if (!worldVar || theme === null) return null
      return { type: 'g3d:stage', op: 'tema', worldVar, text: theme }
    }
    case 'loadStage': {
      const worldVar = identifierName(args[0])
      const map = toExpr(args[1])
      if (!worldVar || !isSimpleValue(map)) return null
      return { type: 'g3d:stage', op: 'montar', worldVar, a: map }
    }
    case 'clearStage': {
      const worldVar = identifierName(args[0])
      return worldVar ? { type: 'g3d:stage', op: 'limpar', worldVar } : null
    }
    case 'stageReset': {
      const worldVar = identifierName(args[0])
      return worldVar ? { type: 'g3d:stage', op: 'recomecar', worldVar } : null
    }
    case 'shootFire':
    case 'stageStep':
    case 'sideCamera': {
      const worldVar = identifierName(args[0])
      const objVar = identifierName(args[1])
      if (!worldVar || !objVar) return null
      return {
        type: 'g3d:stageFrame',
        op: method === 'stageStep' ? 'passo' : method === 'sideCamera' ? 'camera' : 'fogo',
        worldVar,
        objVar,
      }
    }
    case 'setStageNumber': {
      const worldVar = identifierName(args[0])
      const a = toExpr(args[1])
      const b = toExpr(args[2])
      if (!worldVar || !isSimpleValue(a) || !isSimpleValue(b)) return null
      return { type: 'g3d:stage', op: 'numero', worldVar, a, b }
    }
    case 'onStageEvent': {
      // generator: SZGame3D.onStageEvent(world, "acontecimento", () => {…})
      const worldVar = identifierName(args[0])
      const event = stringArg(args, 1)
      const cb = args[2]
      if (!worldVar || event === null || !isInlineFunction(cb)) return null
      if (((cb as { params?: unknown[] }).params ?? []).length !== 0) return null
      return { type: 'g3d:onStage', worldVar, event, body: bodyOfFn(cb) }
    }
    default:
      return undefined
  }
}

/** `const nome = SZGame3D.createPlatformScene(...)` / `createHero(...)`. */
export function platformGameThreeDDeclarationToIR(
  varName: string,
  method: string,
  args: unknown[],
  tools: Pick<PlatformCodecTools, 'identifierName' | 'toExpr' | 'isSimpleValue'>,
): JSStatement | null | undefined {
  if (method === 'createPlatformScene') {
    const canvas = stringArg(args, 0)
    return canvas === null ? null : { type: 'g3d:createPlatformScene', canvasId: canvas, varName }
  }
  if (method === 'createHero') {
    const worldVar = tools.identifierName(args[0])
    const color = stringArg(args, 1)
    if (!worldVar || color === null) return null
    return { type: 'g3d:createHero', varName, worldVar, color }
  }
  // `const nave = SZGame3D.createModelFile(cena, "nave", 2)` — o modelo .glb do Molda.
  if (method === 'createModelFile') {
    const worldVar = tools.identifierName(args[0])
    const asset = stringArg(args, 1)
    const size = tools.toExpr(args[2])
    if (!worldVar || asset === null || !tools.isSimpleValue(size)) return null
    return { type: 'g3d:createModelFile', varName, worldVar, asset, size }
  }
  return undefined
}

/**
 * Monta as ferramentas do codec a partir das primitivas do parser central, UMA vez
 * (as funções ficam num fecho; cada chamada recebe o `source`/`ctx` daquela análise).
 * Existe para o `parsers/js.ts` chamar os dois pontos de entrada com uma linha cada:
 * a fachada está no teto de linhas.
 */
export function createPlatformTools(raw: {
  identifierName: (node: unknown) => string | null
  toExpr: (node: unknown, ctx: unknown) => JSExpr | null
  isSimpleValue: (expr: JSExpr | null) => expr is JSExpr
  isInlineFunction: (node: unknown) => boolean
  bodyOfFn: (node: unknown, source: string, ctx: unknown) => JSStatement[]
}): (source: string, ctx: unknown) => PlatformCodecTools {
  return (source, ctx) => ({
    identifierName: (node) => raw.identifierName(node) ?? '',
    toExpr: (node) => raw.toExpr(node, ctx),
    isSimpleValue: raw.isSimpleValue,
    isInlineFunction: raw.isInlineFunction,
    bodyOfFn: (node) => raw.bodyOfFn(node, source, ctx),
  })
}

/** `SZGame3D.<metodo>(...)` em posição de VALOR, para os reporters do lote. */
export function platformGameThreeDExpressionToIR(
  method: string,
  args: unknown[],
  tools: Pick<PlatformCodecTools, 'identifierName'>,
): JSExpr | null | undefined {
  const { identifierName } = tools

  if (method === 'keyPressed') {
    const key = stringArg(args, 0)
    return key === null ? null : { type: 'g3d:keyPressed', key }
  }
  if (method === 'hitIs') {
    const hitVar = identifierName(args[0])
    const objVar = identifierName(args[1])
    return hitVar && objVar ? { type: 'g3d:hitIs', hitVar, objVar } : null
  }
  if (method === 'objectValue') {
    const objVar = identifierName(args[0])
    const key = stringArg(args, 1)
    return objVar && key !== null ? { type: 'g3d:objectValue', objVar, key } : null
  }
  if (method === 'stageValue' || method === 'stageIs' || method === 'heroIs') {
    // heroIs pergunta ao HERÓI; as outras duas, à cena. Um nó só carrega os dois
    // nomes e o `op` diz qual deles vale.
    const first = identifierName(args[0])
    const what = stringArg(args, 1)
    if (!first || what === null) return null
    const heroi = method === 'heroIs'
    return {
      type: 'g3d:stageAsk',
      op: heroi ? 'heroi' : method === 'stageValue' ? 'fase' : 'estado',
      worldVar: heroi ? '' : first,
      objVar: heroi ? first : '',
      what,
    }
  }
  return undefined
}

/** Os tipos de valor deste lote que cabem num soquete de bloco. */
export const PLATFORM_SIMPLE_VALUE_TYPES: ReadonlySet<string> = new Set([
  'g3d:keyPressed',
  'g3d:hitIs',
  'g3d:objectValue',
  'g3d:stageAsk',
])

export function platformGameThreeDBlockExpression(
  block: Blockly.Block,
  field: (block: Blockly.Block, name: string) => string,
): JSExpr | undefined {
  switch (block.type) {
    case 'sz_g3d_key_pressed':
      return { type: 'g3d:keyPressed', key: field(block, 'KEY') || 'Space' }
    case 'sz_g3d_hit_is':
      return { type: 'g3d:hitIs', hitVar: field(block, 'HIT'), objVar: field(block, 'OBJ') }
    case 'sz_g3d_object_value':
      return { type: 'g3d:objectValue', objVar: field(block, 'OBJ'), key: field(block, 'KEY') }
    case 'sz_g3d_stage_value':
      return {
        type: 'g3d:stageAsk',
        op: 'fase',
        worldVar: field(block, 'WORLD'),
        objVar: '',
        what: field(block, 'FIELD'),
      }
    case 'sz_g3d_stage_is':
      return {
        type: 'g3d:stageAsk',
        op: 'estado',
        worldVar: field(block, 'WORLD'),
        objVar: '',
        what: field(block, 'STATUS'),
      }
    case 'sz_g3d_hero_is':
      return {
        type: 'g3d:stageAsk',
        op: 'heroi',
        worldVar: '',
        objVar: field(block, 'OBJ'),
        what: field(block, 'WHAT'),
      }
    default:
      return undefined
  }
}

interface PlatformBlockTools {
  field: (block: Blockly.Block, name: string) => string
  expression: (block: Blockly.Block, name: string, fallback: JSExpr) => JSExpr
  statements: (block: Blockly.Block, name: string) => JSStatement[]
}

export function platformGameThreeDBlockToIR(
  block: Blockly.Block,
  tools: PlatformBlockTools,
): JSStatement | undefined {
  const f = (name: string) => tools.field(block, name)
  const number = (name: string, value: number) =>
    tools.expression(block, name, { type: 'num', value })
  switch (block.type) {
    // Os dois blocos do Molda (modelo .glb e céu .hdr) entram por aqui, e não pelo
    // switch central do buildIR: a fachada está no teto de linhas.
    case 'sz_g3d_create_model_file':
      return {
        type: 'g3d:createModelFile',
        varName: f('NAME'),
        worldVar: f('WORLD'),
        asset: f('MODEL'),
        size: number('SIZE', 1),
      }
    case 'sz_g3d_sky_photo':
      return { type: 'g3d:skyPhoto', worldVar: f('WORLD'), asset: f('PHOTO') }
    case 'sz_g3d_classic_platformer':
      return {
        type: 'g3d:classicPlatformer',
        objVar: f('OBJ'),
        worldVar: f('WORLD'),
        speed: number('SPEED', 0.08),
        jump: number('JUMP', 0.2),
      }
    case 'sz_g3d_for_each_hit':
      return {
        type: 'g3d:forEachHit',
        objVar: f('OBJ'),
        side: f('SIDE'),
        itemName: f('ITEM'),
        body: tools.statements(block, 'BODY'),
      }
    case 'sz_g3d_carry_riders':
      return { type: 'g3d:objectFlag', objVar: f('OBJ'), flag: 'carregar' }
    case 'sz_g3d_pass_under':
      return { type: 'g3d:objectFlag', objVar: f('OBJ'), flag: 'atravessavel' }
    case 'sz_g3d_no_shadow':
      return { type: 'g3d:objectFlag', objVar: f('OBJ'), flag: 'sem-sombra' }
    case 'sz_g3d_set_object_value':
      return {
        type: 'g3d:setObjectValue',
        objVar: f('OBJ'),
        key: f('KEY'),
        value: number('VALUE', 1),
      }
    // ---- Kit Plataforma: tudo num nó só, discriminado por `op` ----
    case 'sz_g3d_create_platform_scene':
      return { type: 'g3d:createPlatformScene', canvasId: f('CANVAS'), varName: f('VAR') }
    case 'sz_g3d_create_hero':
      return {
        type: 'g3d:createHero',
        varName: f('VAR'),
        worldVar: f('WORLD'),
        color: f('COLOR'),
      }
    case 'sz_g3d_stage_theme':
      return { type: 'g3d:stage', op: 'tema', worldVar: f('WORLD'), text: f('THEME') }
    case 'sz_g3d_load_stage':
      return {
        type: 'g3d:stage',
        op: 'montar',
        worldVar: f('WORLD'),
        a: tools.expression(block, 'MAP', { type: 'str', value: '' }),
      }
    case 'sz_g3d_clear_stage':
      return { type: 'g3d:stage', op: 'limpar', worldVar: f('WORLD') }
    case 'sz_g3d_stage_reset':
      return { type: 'g3d:stage', op: 'recomecar', worldVar: f('WORLD') }
    case 'sz_g3d_stage_step':
      return { type: 'g3d:stageFrame', op: 'passo', worldVar: f('WORLD'), objVar: f('OBJ') }
    case 'sz_g3d_side_camera':
      return { type: 'g3d:stageFrame', op: 'camera', worldVar: f('WORLD'), objVar: f('OBJ') }
    case 'sz_g3d_shoot_fire':
      return { type: 'g3d:stageFrame', op: 'fogo', worldVar: f('WORLD'), objVar: f('OBJ') }
    case 'sz_g3d_stage_number':
      return {
        type: 'g3d:stage',
        op: 'numero',
        worldVar: f('WORLD'),
        a: number('WORLDN', 1),
        b: number('STAGEN', 1),
      }
    case 'sz_g3d_on_stage_event':
      return {
        type: 'g3d:onStage',
        worldVar: f('WORLD'),
        event: f('EVENT'),
        body: tools.statements(block, 'BODY'),
      }
    case 'sz_g3d_paint_pattern':
      return {
        type: 'g3d:objectFlag',
        objVar: f('OBJ'),
        flag: 'estampa',
        pattern: f('PATTERN'),
        colorA: f('COLOR_A'),
        colorB: f('COLOR_B'),
      }
    default:
      return undefined
  }
}

export type { Node as PlatformCodecNode }
