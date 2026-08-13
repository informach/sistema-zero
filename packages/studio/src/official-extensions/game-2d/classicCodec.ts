import type * as Babel from '@babel/types'
import type * as Blockly from 'blockly/core'
import type { JSExpr, JSStatement } from '#ir'
import { valueToExpr } from '#ir'
import type { SerializedBlocklyBlock } from '../../codecs/types'
import { GAME_UI_FONT_IDS } from '../gameUiFonts/catalog'
import { GAME_TWO_D_TILE_CONTACT_FILTERS, GAME_TWO_D_VECTOR_TILE_ROLES } from './classicContracts'

const ACTIONS = new Set([
  'left',
  'right',
  'up',
  'down',
  'jump',
  'action',
  'select',
  'start',
  'pause',
])
const CONTROL_MODES = new Set(['auto', 'always', 'off'])
// ⚠️ Derivados do contrato, não copiados: o lado "dentro" entrou no contrato e
// ficou de fora da régua do runtime, que era a QUINTA cópia literal desta lista.
const VECTOR_ROLES: ReadonlySet<string> = new Set(GAME_TWO_D_VECTOR_TILE_ROLES)
const CONTACT_SIDES: ReadonlySet<string> = new Set(GAME_TWO_D_TILE_CONTACT_FILTERS)
const STOMP_MODES = new Set(['defeat', 'damage', 'squash', 'shell', 'spiky'])
const TEXT_ALIGNS = new Set(['left', 'center', 'right'])

export function classicGameTwoDBlockExpression(
  block: Blockly.Block,
  field: (block: Blockly.Block, name: string) => string,
  expression: (block: Blockly.Block, name: string, fallback: JSExpr) => JSExpr,
): JSExpr | undefined {
  if (block.type === 'sz_g2d_campaign_value') {
    return {
      type: 'g2d:campaignValue',
      key: field(block, 'KEY'),
      fallback: expression(block, 'FALLBACK', { type: 'num', value: 0 }),
    } as JSExpr
  }
  if (block.type === 'sz_g2d_tile_contact_is') {
    return {
      type: 'g2d:tileContactIs',
      contactVar: field(block, 'CONTACT'),
      index: expression(block, 'INDEX', { type: 'num', value: 0 }),
    } as JSExpr
  }
  if (block.type !== 'sz_g2d_action_down' && block.type !== 'sz_g2d_action_pressed') return
  const action = field(block, 'ACTION')
  if (!ACTIONS.has(action)) return
  return {
    type: block.type === 'sz_g2d_action_down' ? 'g2d:actionDown' : 'g2d:actionPressed',
    action,
  } as JSExpr
}

interface BlockToIRTools {
  field(block: Blockly.Block, name: string): string
  expression(block: Blockly.Block, name: string, fallback: JSExpr): JSExpr
  statements(block: Blockly.Block, name: string, seen: Set<string>): JSStatement[]
}

export function classicGameTwoDBlockToIR(
  block: Blockly.Block,
  seen: Set<string>,
  tools: BlockToIRTools,
): JSStatement | undefined {
  const f = (name: string) => tools.field(block, name)
  const expr = (name: string, value: number) =>
    tools.expression(block, name, { type: 'num', value })
  let statement: JSStatement | undefined
  switch (block.type) {
    case 'sz_g2d_paint_shape_recipe':
      statement = {
        type: 'g2d:paintShapeRecipe',
        ctxVar: 'ctx',
        recipe: f('RECIPE'),
      } as JSStatement
      break
    case 'sz_g2d_load_vector_campaign_level': {
      const enemyTypeVars = f('ENEMIES')
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
      statement = {
        type: 'g2d:loadVectorCampaignLevel',
        index: expr('INDEX', 1),
        tilesetVars: f('TILESETS')
          .split(',')
          .map((name) => name.trim())
          .filter(Boolean),
        manifest: f('MANIFEST'),
        size: expr('SIZE', 16),
        spawnX: expr('X', 32),
        spawnY: expr('Y', 32),
        mapVar: f('MAP'),
        worldVar: f('WORLD'),
        levelVar: f('LEVEL'),
        ...(enemyTypeVars.length > 0 ? { enemyTypeVars, journey: expr('JOURNEY', 1) } : {}),
      } as JSStatement
      break
    }
    case 'sz_g2d_enable_classic_controls': {
      const mode = f('MODE') || 'auto'
      if (!CONTROL_MODES.has(mode)) return
      statement = { type: 'g2d:enableClassicControls', mode } as JSStatement
      break
    }
    case 'sz_g2d_on_action_pressed': {
      const action = f('ACTION')
      if (!ACTIONS.has(action)) return
      statement = {
        type: 'g2d:onActionPressed',
        action,
        body: tools.statements(block, 'BODY', seen),
      } as JSStatement
      break
    }
    case 'sz_g2d_classic_platformer':
      statement = {
        type: 'g2d:classicPlatformer',
        spriteVar: f('SPRITE'),
        speed: expr('SPEED', 2.5),
        jump: expr('JUMP', 7),
      } as JSStatement
      break
    case 'sz_g2d_create_vector_tileset':
      statement = {
        type: 'g2d:createVectorTileset',
        varName: f('NAME'),
        size: expr('SIZE', 16),
      } as JSStatement
      break
    case 'sz_g2d_define_vector_tile': {
      const role = f('ROLE') || 'decor'
      if (!VECTOR_ROLES.has(role)) return
      statement = {
        type: 'g2d:defineVectorTile',
        tilesetVar: f('TILESET'),
        index: expr('INDEX', 0),
        shape: f('SHAPE'),
        role,
      } as JSStatement
      break
    }
    case 'sz_g2d_create_vector_tilemap':
      statement = {
        type: 'g2d:createVectorTileMap',
        varName: f('NAME'),
        tilesetVar: f('TILESET'),
        grid: f('GRID'),
      } as JSStatement
      break
    case 'sz_g2d_for_each_tile_contact': {
      const side = f('SIDE') || 'any'
      if (!CONTACT_SIDES.has(side)) return
      statement = {
        type: 'g2d:forEachTileContact',
        spriteVar: f('SPRITE'),
        mapVar: f('MAP'),
        side,
        contactName: f('CONTACT') || 'contato',
        body: tools.statements(block, 'BODY', seen),
      } as JSStatement
      break
    }
    case 'sz_g2d_set_tile_at_contact':
      statement = {
        type: 'g2d:setTileAtContact',
        contactVar: f('CONTACT'),
        index: expr('INDEX', -1),
      } as JSStatement
      break
    case 'sz_g2d_set_enemy_stomp_mode': {
      const mode = f('MODE') || 'defeat'
      if (!STOMP_MODES.has(mode)) return
      statement = {
        type: 'g2d:setEnemyStompMode',
        typeVar: f('TYPE'),
        mode,
      } as JSStatement
      break
    }
    case 'sz_g2d_update_enemy_shells':
      statement = {
        type: 'g2d:updateEnemyShells',
        typeVar: f('TYPE'),
        worldVar: f('WORLD'),
      } as JSStatement
      break
    case 'sz_g2d_draw_pixel_text': {
      const align = f('ALIGN') || 'left'
      if (!TEXT_ALIGNS.has(align)) return
      statement = {
        type: 'g2d:drawPixelText',
        ctxVar: 'ctx',
        text: f('TEXT'),
        x: expr('X', 8),
        y: expr('Y', 8),
        size: expr('SIZE', 2),
        color: f('COLOR'),
        align,
      } as JSStatement
      break
    }
    case 'sz_g2d_draw_pixel_score':
      statement = {
        type: 'g2d:drawPixelScore',
        ctxVar: 'ctx',
        label: f('LABEL'),
        value: expr('VALUE', 0),
        x: expr('X', 8),
        y: expr('Y', 8),
        size: expr('SIZE', 2),
        color: f('COLOR'),
      } as JSStatement
      break
    case 'sz_g2d_show_image_screen':
      statement = {
        type: 'g2d:showImageScreen',
        ctxVar: 'ctx',
        image: f('IMAGE'),
      } as JSStatement
      break
    case 'sz_g2d_use_font':
      statement = { type: 'g2d:useFont', font: f('FONT') } as JSStatement
      break
    case 'sz_g2d_draw_fade':
      statement = {
        type: 'g2d:drawFade',
        ctxVar: 'ctx',
        percent: expr('PERCENT', 0),
        color: f('COLOR'),
      } as JSStatement
      break
    default:
      return
  }
  seen.add('game-2d')
  return statement
}

interface StatementCodeTools {
  pad: string
  id(name: string): string
  expression(value: JSExpr | number): string
  body(statements: JSStatement[]): string
}

export function classicGameTwoDStatementToCode(
  statement: JSStatement,
  tools: StatementCodeTools,
): string | undefined {
  const s = statement as JSStatement & Record<string, unknown>
  const id = (name: string) => tools.id(String(s[name] ?? ''))
  const expr = (name: string) => tools.expression(s[name] as JSExpr | number)
  switch (statement.type) {
    case 'g2d:paintShapeRecipe':
      return `${tools.pad}SZGame2D.paintShapeRecipe(${id('ctxVar')}, ${JSON.stringify(s.recipe)});`
    case 'g2d:loadVectorCampaignLevel': {
      const tilesets = (s.tilesetVars as string[]).map((name) => tools.id(name)).join(', ')
      const enemyTypeVars = (s.enemyTypeVars as string[] | undefined) ?? []
      const enemies = enemyTypeVars.map((name) => tools.id(name)).join(', ')
      const campaignEnemies =
        enemyTypeVars.length > 0
          ? `, [${enemies}], ${tools.expression((s.journey as number | JSExpr | undefined) ?? 1)}`
          : ''
      return `${tools.pad}SZGame2D.loadVectorCampaignLevel(${expr('index')}, ${JSON.stringify(s.manifest)}, ${expr('size')}, ${expr('spawnX')}, ${expr('spawnY')}, function (mapaCarregado, mundoCarregado, faseCarregada) { ${id('mapVar')} = mapaCarregado; ${id('worldVar')} = mundoCarregado; ${id('levelVar')} = faseCarregada; }, [${tilesets}]${campaignEnemies});`
    }
    case 'g2d:enableClassicControls':
      return `${tools.pad}SZGame2D.enableClassicControls(${JSON.stringify(s.mode)});`
    case 'g2d:classicPlatformer':
      return `${tools.pad}SZGame2D.classicPlatformer(${id('spriteVar')}, ${expr('speed')}, ${expr('jump')});`
    case 'g2d:createVectorTileset':
      return `${tools.pad}const ${id('varName')} = SZGame2D.createVectorTileset(${expr('size')});`
    case 'g2d:defineVectorTile':
      return `${tools.pad}SZGame2D.defineVectorTile(${id('tilesetVar')}, ${expr('index')}, ${JSON.stringify(s.shape)}, ${JSON.stringify(s.role)});`
    case 'g2d:createVectorTileMap':
      return `${tools.pad}const ${id('varName')} = SZGame2D.createVectorTileMap(${id('tilesetVar')}, ${JSON.stringify(s.grid)});`
    case 'g2d:forEachTileContact': {
      const contact = id('contactName')
      return `${tools.pad}SZGame2D.forEachTileContact(${id('spriteVar')}, ${id('mapVar')}, ${JSON.stringify(s.side)}, function (${contact}) {\n${tools.body(s.body as JSStatement[])}\n${tools.pad}});`
    }
    case 'g2d:setTileAtContact':
      return `${tools.pad}SZGame2D.setTileAtContact(${id('contactVar')}, ${expr('index')});`
    case 'g2d:setEnemyStompMode':
      return `${tools.pad}SZGame2D.setEnemyStompMode(${id('typeVar')}, ${JSON.stringify(s.mode)});`
    case 'g2d:updateEnemyShells':
      return `${tools.pad}SZGame2D.updateEnemyShells(${id('typeVar')}, ${id('worldVar')});`
    case 'g2d:drawPixelText':
      return `${tools.pad}SZGame2D.drawPixelText(${id('ctxVar')}, ${JSON.stringify(s.text)}, ${expr('x')}, ${expr('y')}, ${expr('size')}, ${JSON.stringify(s.color)}, ${JSON.stringify(s.align)});`
    case 'g2d:showImageScreen':
      return `${tools.pad}SZGame2D.showImageScreen(${id('ctxVar')}, ${JSON.stringify(s.image)});`
    case 'g2d:useFont':
      return `${tools.pad}SZGame2D.useFont(${JSON.stringify(s.font)});`
    case 'g2d:drawPixelScore':
      return `${tools.pad}SZGame2D.drawPixelScore(${id('ctxVar')}, ${JSON.stringify(s.label)}, ${expr('value')}, ${expr('x')}, ${expr('y')}, ${expr('size')}, ${JSON.stringify(s.color)});`
    case 'g2d:drawFade':
      return `${tools.pad}SZGame2D.drawFade(${id('ctxVar')}, ${expr('percent')}, ${JSON.stringify(s.color)});`
    default:
      return
  }
}

type ClassicGameTwoDExpression = Extract<
  JSExpr,
  { type: 'g2d:actionDown' | 'g2d:actionPressed' | 'g2d:tileContactIs' | 'g2d:campaignValue' }
>

export function classicGameTwoDExpressionToCode(
  expression: ClassicGameTwoDExpression,
  compileExpression: (value: JSExpr) => string,
  resolveIdentifier: (name: string) => string,
): string {
  if (expression.type === 'g2d:campaignValue') {
    return `SZGame2D.campaignValue(${JSON.stringify(expression.key)}, ${compileExpression(expression.fallback)})`
  }
  if (expression.type === 'g2d:tileContactIs') {
    return `SZGame2D.tileContactIs(${resolveIdentifier(expression.contactVar)}, ${compileExpression(expression.index)})`
  }
  const method = expression.type === 'g2d:actionDown' ? 'actionDown' : 'actionPressed'
  return `SZGame2D.${method}(${JSON.stringify(expression.action)})`
}

export function isClassicGameTwoDExpression(
  expression: JSExpr,
): expression is Extract<
  JSExpr,
  { type: 'g2d:actionDown' | 'g2d:actionPressed' | 'g2d:tileContactIs' | 'g2d:campaignValue' }
> {
  return (
    expression.type === 'g2d:actionDown' ||
    expression.type === 'g2d:actionPressed' ||
    expression.type === 'g2d:tileContactIs' ||
    expression.type === 'g2d:campaignValue'
  )
}

interface IRToBlockTools {
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

export function classicGameTwoDStatementToBlock(
  statement: JSStatement,
  tools: IRToBlockTools,
): SerializedBlocklyBlock | undefined {
  const s = statement as JSStatement & Record<string, unknown>
  const value = (name: string) => tools.expression(valueToExpr(s[name] as number | JSExpr))
  const values = (...names: string[]) => {
    const out: Record<string, SerializedBlocklyBlock> = {}
    for (const name of names) {
      const converted = value(name)
      if (!converted) return null
      out[name.toUpperCase()] = converted
    }
    return out
  }
  switch (statement.type) {
    case 'g2d:paintShapeRecipe':
      return tools.block(
        'sz_g2d_paint_shape_recipe',
        { RECIPE: String(s.recipe) },
        {},
        statement.__id,
      )
    case 'g2d:loadVectorCampaignLevel': {
      const sockets = values('index', 'size', 'spawnX', 'spawnY')
      const journey = tools.expression(valueToExpr((s.journey as number | JSExpr | undefined) ?? 1))
      return sockets
        ? tools.block(
            'sz_g2d_load_vector_campaign_level',
            {
              TILESETS: (s.tilesetVars as string[]).join(', '),
              MANIFEST: String(s.manifest),
              MAP: String(s.mapVar),
              WORLD: String(s.worldVar),
              LEVEL: String(s.levelVar),
              ENEMIES: ((s.enemyTypeVars as string[] | undefined) ?? []).join(', '),
            },
            {},
            statement.__id,
            {
              INDEX: sockets.INDEX!,
              SIZE: sockets.SIZE!,
              X: sockets.SPAWNX!,
              Y: sockets.SPAWNY!,
              ...(journey ? { JOURNEY: journey } : {}),
            },
          )
        : tools.raw(statement)
    }
    case 'g2d:enableClassicControls':
      return tools.block(
        'sz_g2d_enable_classic_controls',
        { MODE: String(s.mode) },
        {},
        statement.__id,
      )
    case 'g2d:onActionPressed':
      return tools.block(
        'sz_g2d_on_action_pressed',
        { ACTION: String(s.action) },
        { BODY: tools.statements(s.body as JSStatement[]) },
        statement.__id,
      )
    case 'g2d:classicPlatformer': {
      const sockets = values('speed', 'jump')
      return sockets
        ? tools.block(
            'sz_g2d_classic_platformer',
            { SPRITE: String(s.spriteVar) },
            {},
            statement.__id,
            sockets,
          )
        : tools.raw(statement)
    }
    case 'g2d:createVectorTileset': {
      const size = value('size')
      return size
        ? tools.block(
            'sz_g2d_create_vector_tileset',
            { NAME: String(s.varName) },
            {},
            statement.__id,
            { SIZE: size },
          )
        : tools.raw(statement)
    }
    case 'g2d:defineVectorTile': {
      const index = value('index')
      return index
        ? tools.block(
            'sz_g2d_define_vector_tile',
            {
              TILESET: String(s.tilesetVar),
              SHAPE: String(s.shape),
              ROLE: String(s.role),
            },
            {},
            statement.__id,
            { INDEX: index },
          )
        : tools.raw(statement)
    }
    case 'g2d:createVectorTileMap':
      return tools.block(
        'sz_g2d_create_vector_tilemap',
        {
          NAME: String(s.varName),
          TILESET: String(s.tilesetVar),
          GRID: String(s.grid),
        },
        {},
        statement.__id,
      )
    case 'g2d:forEachTileContact':
      return tools.block(
        'sz_g2d_for_each_tile_contact',
        {
          SPRITE: String(s.spriteVar),
          MAP: String(s.mapVar),
          SIDE: String(s.side),
          CONTACT: String(s.contactName),
        },
        { BODY: tools.statements(s.body as JSStatement[]) },
        statement.__id,
      )
    case 'g2d:setTileAtContact': {
      const index = value('index')
      return index
        ? tools.block(
            'sz_g2d_set_tile_at_contact',
            { CONTACT: String(s.contactVar) },
            {},
            statement.__id,
            { INDEX: index },
          )
        : tools.raw(statement)
    }
    case 'g2d:setEnemyStompMode':
      return tools.block(
        'sz_g2d_set_enemy_stomp_mode',
        {
          TYPE: String(s.typeVar),
          MODE: String(s.mode),
        },
        {},
        statement.__id,
      )
    case 'g2d:updateEnemyShells':
      return tools.block(
        'sz_g2d_update_enemy_shells',
        {
          TYPE: String(s.typeVar),
          WORLD: String(s.worldVar),
        },
        {},
        statement.__id,
      )
    case 'g2d:drawPixelText': {
      const sockets = values('x', 'y', 'size')
      return sockets
        ? tools.block(
            'sz_g2d_draw_pixel_text',
            {
              TEXT: String(s.text),
              COLOR: String(s.color),
              ALIGN: String(s.align),
            },
            {},
            statement.__id,
            sockets,
          )
        : tools.raw(statement)
    }
    case 'g2d:showImageScreen':
      return tools.block('sz_g2d_show_image_screen', { IMAGE: String(s.image) }, {}, statement.__id)
    case 'g2d:useFont':
      return tools.block('sz_g2d_use_font', { FONT: String(s.font) }, {}, statement.__id)
    case 'g2d:drawPixelScore': {
      const sockets = values('value', 'x', 'y', 'size')
      return sockets
        ? tools.block(
            'sz_g2d_draw_pixel_score',
            { LABEL: String(s.label), COLOR: String(s.color) },
            {},
            statement.__id,
            sockets,
          )
        : tools.raw(statement)
    }
    case 'g2d:drawFade': {
      const percent = value('percent')
      return percent
        ? tools.block('sz_g2d_draw_fade', { COLOR: String(s.color) }, {}, statement.__id, {
            PERCENT: percent,
          })
        : tools.raw(statement)
    }
    default:
      return
  }
}

export function classicGameTwoDExpressionToBlock(
  expression: JSExpr,
  block: (
    type: string,
    fields: Record<string, string | number>,
    inputs?: Record<string, SerializedBlocklyBlock[]>,
    id?: string,
    values?: Record<string, SerializedBlocklyBlock>,
  ) => SerializedBlocklyBlock,
  expressionToBlock: (value: JSExpr) => SerializedBlocklyBlock | null,
): SerializedBlocklyBlock | undefined {
  if (expression.type === 'g2d:campaignValue') {
    const fallback = expressionToBlock(expression.fallback)
    return fallback
      ? block('sz_g2d_campaign_value', { KEY: expression.key }, {}, expression.__id, {
          FALLBACK: fallback,
        })
      : undefined
  }
  if (expression.type === 'g2d:actionDown') {
    return block('sz_g2d_action_down', { ACTION: expression.action })
  }
  if (expression.type === 'g2d:actionPressed') {
    return block('sz_g2d_action_pressed', { ACTION: expression.action })
  }
  if (expression.type === 'g2d:tileContactIs') {
    const index = expressionToBlock(expression.index)
    return index
      ? block('sz_g2d_tile_contact_is', { CONTACT: expression.contactVar }, {}, expression.__id, {
          INDEX: index,
        })
      : undefined
  }
}

type Node = Babel.Node

interface ParserTools {
  identifier(node: Node | null | undefined): string | null
  expression(node: Node | null | undefined): JSExpr | null
  simple(expression: JSExpr | null): expression is JSExpr
  inlineFunction(
    node: Node | null | undefined,
  ): node is Babel.FunctionExpression | Babel.ArrowFunctionExpression
  functionBody(node: Babel.FunctionExpression | Babel.ArrowFunctionExpression): JSStatement[]
}

function stringLiteral(node: Node | null | undefined): string | null {
  return node?.type === 'StringLiteral' ? String(node.value) : null
}

export function classicGameTwoDCallToIR(
  method: string,
  args: Node[],
  tools: ParserTools,
): JSStatement | undefined {
  const identifier = (index: number) => tools.identifier(args[index])
  const expression = (index: number) => tools.expression(args[index])
  switch (method) {
    case 'paintShapeRecipe': {
      const ctxVar = identifier(0)
      const recipe = stringLiteral(args[1])
      return ctxVar && recipe !== null
        ? ({ type: 'g2d:paintShapeRecipe', ctxVar, recipe } as JSStatement)
        : undefined
    }
    case 'loadVectorCampaignLevel': {
      const index = expression(0)
      const manifest = stringLiteral(args[1])
      const size = expression(2)
      const spawnX = expression(3)
      const spawnY = expression(4)
      const callback = args[5]
      const tilesets = args[6]
      const enemyTypes = args[7]
      const journey = expression(8)
      if (
        !tools.simple(index) ||
        manifest === null ||
        !tools.simple(size) ||
        !tools.simple(spawnX) ||
        !tools.simple(spawnY) ||
        !tools.inlineFunction(callback) ||
        tilesets?.type !== 'ArrayExpression'
      )
        return
      const assignments = tools
        .functionBody(callback)
        .filter(
          (statement): statement is Extract<JSStatement, { type: 'assign' }> =>
            statement.type === 'assign',
        )
      const tilesetVars = tilesets.elements.map((arg) => tools.identifier(arg as Node))
      if (assignments.length !== 3 || tilesetVars.some((name) => !name)) return
      let enemyTypeVars: string[] | undefined
      if (enemyTypes != null || args[8] != null) {
        if (enemyTypes?.type !== 'ArrayExpression' || !tools.simple(journey)) return
        const names = enemyTypes.elements.map((arg) => tools.identifier(arg as Node))
        if (names.some((name) => !name)) return
        enemyTypeVars = names as string[]
      }
      return {
        type: 'g2d:loadVectorCampaignLevel',
        index,
        manifest,
        size,
        spawnX,
        spawnY,
        tilesetVars: tilesetVars as string[],
        mapVar: assignments[0]!.name,
        worldVar: assignments[1]!.name,
        levelVar: assignments[2]!.name,
        ...(enemyTypeVars ? { enemyTypeVars, journey: journey! } : {}),
      } as JSStatement
    }
    case 'enableClassicControls': {
      const mode = stringLiteral(args[0])
      return mode && CONTROL_MODES.has(mode)
        ? ({ type: 'g2d:enableClassicControls', mode } as JSStatement)
        : undefined
    }
    case 'onActionPressed': {
      const action = stringLiteral(args[0])
      const fn = args[1]
      return action && ACTIONS.has(action) && tools.inlineFunction(fn)
        ? ({ type: 'g2d:onActionPressed', action, body: tools.functionBody(fn) } as JSStatement)
        : undefined
    }
    case 'classicPlatformer': {
      const spriteVar = identifier(0)
      const speed = expression(1)
      const jump = expression(2)
      return spriteVar && tools.simple(speed) && tools.simple(jump)
        ? ({ type: 'g2d:classicPlatformer', spriteVar, speed, jump } as JSStatement)
        : undefined
    }
    case 'defineVectorTile': {
      const tilesetVar = identifier(0)
      const index = expression(1)
      const shape = stringLiteral(args[2])
      const role = stringLiteral(args[3])
      return tilesetVar && tools.simple(index) && shape && role && VECTOR_ROLES.has(role)
        ? ({ type: 'g2d:defineVectorTile', tilesetVar, index, shape, role } as JSStatement)
        : undefined
    }
    case 'forEachTileContact': {
      const spriteVar = identifier(0)
      const mapVar = identifier(1)
      const side = stringLiteral(args[2])
      const fn = args[3]
      if (!spriteVar || !mapVar || !side || !CONTACT_SIDES.has(side) || !tools.inlineFunction(fn))
        return
      const contactName = tools.identifier(fn.params[0] as Node) || 'contato'
      return {
        type: 'g2d:forEachTileContact',
        spriteVar,
        mapVar,
        side,
        contactName,
        body: tools.functionBody(fn),
      } as JSStatement
    }
    case 'setTileAtContact': {
      const contactVar = identifier(0)
      const index = expression(1)
      return contactVar && tools.simple(index)
        ? ({ type: 'g2d:setTileAtContact', contactVar, index } as JSStatement)
        : undefined
    }
    case 'setEnemyStompMode': {
      const typeVar = identifier(0)
      const mode = stringLiteral(args[1])
      return typeVar && mode && STOMP_MODES.has(mode)
        ? ({ type: 'g2d:setEnemyStompMode', typeVar, mode } as JSStatement)
        : undefined
    }
    case 'updateEnemyShells': {
      const typeVar = identifier(0)
      const worldVar = identifier(1)
      return typeVar && worldVar
        ? ({ type: 'g2d:updateEnemyShells', typeVar, worldVar } as JSStatement)
        : undefined
    }
    case 'drawPixelText': {
      const ctxVar = identifier(0)
      const text = stringLiteral(args[1])
      const x = expression(2)
      const y = expression(3)
      const size = expression(4)
      const color = stringLiteral(args[5])
      const align = stringLiteral(args[6])
      return ctxVar &&
        text !== null &&
        tools.simple(x) &&
        tools.simple(y) &&
        tools.simple(size) &&
        color &&
        align &&
        TEXT_ALIGNS.has(align)
        ? ({ type: 'g2d:drawPixelText', ctxVar, text, x, y, size, color, align } as JSStatement)
        : undefined
    }
    case 'showImageScreen': {
      // generator: SZGame2D.showImageScreen(ctx, "vitoria")
      const ctxVar = identifier(0)
      const image = stringLiteral(args[1])
      return ctxVar && image !== null
        ? ({ type: 'g2d:showImageScreen', ctxVar, image } as JSStatement)
        : undefined
    }
    case 'useFont': {
      // generator: SZGame2D.useFont("bungee")
      // Nome fora do catálogo NÃO vira bloco (o dropdown o trocaria pela 1ª opção).
      const font = stringLiteral(args[0])
      return font && (GAME_UI_FONT_IDS as readonly string[]).includes(font)
        ? ({ type: 'g2d:useFont', font } as JSStatement)
        : undefined
    }
    case 'drawPixelScore': {
      const ctxVar = identifier(0)
      const label = stringLiteral(args[1])
      const value = expression(2)
      const x = expression(3)
      const y = expression(4)
      const size = expression(5)
      const color = stringLiteral(args[6])
      return ctxVar &&
        label !== null &&
        tools.simple(value) &&
        tools.simple(x) &&
        tools.simple(y) &&
        tools.simple(size) &&
        color
        ? ({ type: 'g2d:drawPixelScore', ctxVar, label, value, x, y, size, color } as JSStatement)
        : undefined
    }
    case 'drawFade': {
      const ctxVar = identifier(0)
      const percent = expression(1)
      const color = stringLiteral(args[2])
      return ctxVar && tools.simple(percent) && color
        ? ({ type: 'g2d:drawFade', ctxVar, percent, color } as JSStatement)
        : undefined
    }
    default:
      return
  }
}

export function classicGameTwoDDeclarationToIR(
  name: string,
  method: string,
  args: Node[],
  tools: Pick<ParserTools, 'identifier' | 'expression' | 'simple'>,
): JSStatement | undefined {
  if (method === 'createVectorTileset') {
    const size = tools.expression(args[0])
    return tools.simple(size)
      ? ({ type: 'g2d:createVectorTileset', varName: name, size } as JSStatement)
      : undefined
  }
  if (method === 'createVectorTileMap') {
    const tilesetVar = tools.identifier(args[0])
    const grid = stringLiteral(args[1])
    return tilesetVar && grid !== null
      ? ({ type: 'g2d:createVectorTileMap', varName: name, tilesetVar, grid } as JSStatement)
      : undefined
  }
}

export function classicGameTwoDCallExpressionToIR(
  method: string,
  args: Node[],
  tools?: Pick<ParserTools, 'identifier' | 'expression' | 'simple'>,
): JSExpr | undefined {
  if (method === 'campaignValue' && tools) {
    const key = stringLiteral(args[0])
    const fallback = tools.expression(args[1])
    return key !== null && tools.simple(fallback)
      ? ({ type: 'g2d:campaignValue', key, fallback } as JSExpr)
      : undefined
  }
  if (method === 'tileContactIs' && tools) {
    const contactVar = tools.identifier(args[0])
    const index = tools.expression(args[1])
    return contactVar && tools.simple(index)
      ? ({ type: 'g2d:tileContactIs', contactVar, index } as JSExpr)
      : undefined
  }
  if (method !== 'actionDown' && method !== 'actionPressed') return
  const action = stringLiteral(args[0])
  if (!action || !ACTIONS.has(action)) return
  return {
    type: method === 'actionDown' ? 'g2d:actionDown' : 'g2d:actionPressed',
    action,
  } as JSExpr
}
