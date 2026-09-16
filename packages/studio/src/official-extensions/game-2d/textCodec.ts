import type * as Babel from '@babel/types'
import type * as Blockly from 'blockly/core'
import type { SerializedBlocklyBlock } from '../../codecs/types'
import type { JSExpr, JSStatement } from '../../ir/schema'
import {
  isTextSpriteExpression,
  isTextSpriteStatement,
  type TextLabelStatement,
  type TextSpriteExpression,
  type TextSpriteStatement,
  textSpriteBlockDataSchema,
} from './textIR'

interface BlockTools {
  field(block: Blockly.Block, name: string): string
  expression(block: Blockly.Block, name: string, fallback: JSExpr): JSExpr
  statements(block: Blockly.Block, name: string, seen: Set<string>): JSStatement[]
}
function textSpriteBlockData(block: Blockly.Block) {
  if (!block.data) return {}
  let value: unknown
  try {
    value = JSON.parse(block.data)
  } catch {
    return {}
  } // Workspaces antigos ou dados externos sem metadados válidos.
  const parsed = textSpriteBlockDataSchema.safeParse(value)
  return parsed.success ? parsed.data : {}
}
/** Literais antigos conservam sua forma na IR; encaixes novos aceitam expressões. */
function textLabelBlockValue(
  block: Blockly.Block,
  expression: BlockTools['expression'],
): string | JSExpr {
  const value = expression(block, 'TEXT', { type: 'str', value: '' })
  return value.type === 'str' ? value.value : value
}
export function textSpriteBlockExpression(
  block: Blockly.Block,
  field: BlockTools['field'],
  expression: BlockTools['expression'],
): TextSpriteExpression | undefined {
  if (block.type === 'sz_g2d_sprite_text')
    return { type: 'g2d:spriteText', spriteVar: field(block, 'SPRITE') }
  if (block.type === 'sz_g2d_sprite_data')
    return {
      type: 'g2d:spriteData',
      spriteVar: field(block, 'SPRITE'),
      key: field(block, 'KEY'),
      fallback: expression(block, 'FALLBACK', { type: 'num', value: 0 }),
    }
}
export function textSpriteBlockToIR(
  block: Blockly.Block,
  seen: Set<string>,
  tools: BlockTools,
): TextSpriteStatement | TextLabelStatement | undefined {
  const f = (name: string) => tools.field(block, name)
  const data = textSpriteBlockData(block)
  const declaration = data.declarationKind ? { declarationKind: data.declarationKind } : {}
  const event = data.eventId !== undefined ? { eventId: data.eventId } : {}
  const value = (name: string, fallback: string | number = 0) =>
    tools.expression(
      block,
      name,
      typeof fallback === 'number'
        ? { type: 'num', value: fallback }
        : { type: 'str', value: fallback },
    )
  let statement: TextSpriteStatement | TextLabelStatement
  switch (block.type) {
    case 'sz_g2d_draw_label': {
      const align = f('ALIGN')
      statement = {
        type: 'g2d:drawLabel',
        ctxVar: 'ctx',
        text: textLabelBlockValue(block, tools.expression),
        x: value('X', 10),
        y: value('Y', 30),
        color: f('COLOR'),
        size: value('SIZE', 20),
        align: align === 'center' || align === 'right' ? align : 'left',
      }
      break
    }
    case 'sz_g2d_create_text_sprite':
      statement = {
        type: 'g2d:createTextSprite',
        ...declaration,
        varName: f('NAME'),
        text: value('TEXT', 'Olá!'),
        x: value('X', 100),
        y: value('Y', 100),
      }
      break
    case 'sz_g2d_spawn_text_in_group':
      statement = {
        type: 'g2d:spawnTextInGroup',
        ...declaration,
        ...(f('NAME') ? { varName: f('NAME') } : {}),
        groupVar: f('GROUP'),
        text: value('TEXT', 1),
        x: value('X', 100),
        y: value('Y', 100),
      }
      break
    case 'sz_g2d_set_sprite_text':
      statement = { type: 'g2d:setSpriteText', spriteVar: f('SPRITE'), text: value('TEXT', 'Olá!') }
      break
    case 'sz_g2d_set_text_style':
      statement = {
        type: 'g2d:setTextStyle',
        spriteVar: f('SPRITE'),
        size: value('SIZE', 32),
        color: f('COLOR'),
      }
      break
    case 'sz_g2d_scale_text_size':
      statement = {
        type: 'g2d:scaleTextSize',
        spriteVar: f('SPRITE'),
        factor: value('FACTOR', 1.5),
      }
      break
    case 'sz_g2d_set_text_box': {
      const align = f('ALIGN')
      statement = {
        type: 'g2d:setTextBox',
        spriteVar: f('SPRITE'),
        width: value('WIDTH', 240),
        align: align === 'center' || align === 'right' ? align : 'left',
        padding: value('PADDING', 12),
        background: value('BACKGROUND', 'transparent'),
      }
      break
    }
    case 'sz_g2d_set_text_image': {
      const valign = f('VALIGN')
      statement = {
        type: 'g2d:setTextImage',
        spriteVar: f('SPRITE'),
        image: f('IMAGE'),
        // O dropdown coage valor desconhecido para a 1ª opção; normalizar aqui
        // mantém o bloco e o parser dizendo a mesma coisa.
        valign: valign === 'top' || valign === 'bottom' ? valign : 'middle',
      }
      break
    }
    case 'sz_g2d_set_sprite_data':
      statement = {
        type: 'g2d:setSpriteData',
        spriteVar: f('SPRITE'),
        key: f('KEY'),
        value: value('VALUE'),
      }
      break
    case 'sz_g2d_on_sprite_click':
      statement = {
        type: 'g2d:onSpriteClick',
        ...event,
        spriteVar: f('SPRITE'),
        body: tools.statements(block, 'BODY', seen),
      }
      break
    case 'sz_g2d_on_group_click':
      statement = {
        type: 'g2d:onGroupClick',
        ...event,
        groupVar: f('GROUP'),
        itemName: f('ITEM'),
        body: tools.statements(block, 'BODY', seen),
      }
      break
    default:
      return
  }
  seen.add('game-2d')
  return statement
}

interface CodeTools {
  pad: string
  id(name: string): string
  expression(value: JSExpr): string
  body(statements: JSStatement[]): string
  eventId(): string
}
export function textSpriteStatementToCode(s: JSStatement, t: CodeTools): string | undefined {
  if (!isTextSpriteStatement(s)) return
  const expr = t.expression
  const id = t.id
  switch (s.type) {
    case 'g2d:createTextSprite':
      return `${t.pad}${s.declarationKind ?? 'const'} ${id(s.varName)} = SZGame2D.createTextSprite(${expr(s.text)}, ${expr(s.x)}, ${expr(s.y)});`
    case 'g2d:spawnTextInGroup':
      return `${t.pad}${s.varName ? `${s.declarationKind ?? 'const'} ${id(s.varName)} = ` : ''}SZGame2D.spawnTextInGroup(${id(s.groupVar)}, ${expr(s.text)}, ${expr(s.x)}, ${expr(s.y)});`
    case 'g2d:setSpriteText':
      return `${t.pad}SZGame2D.setSpriteText(${id(s.spriteVar)}, ${expr(s.text)});`
    case 'g2d:setTextStyle':
      return `${t.pad}SZGame2D.setTextStyle(${id(s.spriteVar)}, ${expr(s.size)}, ${JSON.stringify(s.color)});`
    case 'g2d:scaleTextSize':
      return `${t.pad}SZGame2D.scaleTextSize(${id(s.spriteVar)}, ${expr(s.factor)});`
    case 'g2d:setTextBox':
      return `${t.pad}SZGame2D.setTextBox(${id(s.spriteVar)}, ${expr(s.width)}, ${JSON.stringify(s.align)}, ${expr(s.padding)}, ${expr(s.background)});`
    case 'g2d:setTextImage':
      return `${t.pad}SZGame2D.setTextImage(${id(s.spriteVar)}, ${JSON.stringify(s.image)}, ${JSON.stringify(s.valign)});`
    case 'g2d:setSpriteData':
      return `${t.pad}SZGame2D.setSpriteData(${id(s.spriteVar)}, ${JSON.stringify(s.key)}, ${expr(s.value)});`
    case 'g2d:onSpriteClick':
      return `${t.pad}SZGame2D.onSpriteClick(${id(s.spriteVar)}, function () {\n${t.body(s.body)}\n${t.pad}}, ${JSON.stringify(s.eventId ?? s.__id ?? t.eventId())});`
    case 'g2d:onGroupClick':
      return `${t.pad}SZGame2D.onGroupClick(${id(s.groupVar)}, function (${id(s.itemName)}) {\n${t.body(s.body)}\n${t.pad}}, ${JSON.stringify(s.eventId ?? s.__id ?? t.eventId())});`
  }
}
export function textSpriteExpressionToCode(
  s: TextSpriteExpression,
  expression: CodeTools['expression'],
  id: CodeTools['id'],
): string {
  return s.type === 'g2d:spriteText'
    ? `SZGame2D.spriteText(${id(s.spriteVar)})`
    : `SZGame2D.spriteData(${id(s.spriteVar)}, ${JSON.stringify(s.key)}, ${expression(s.fallback)})`
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
  statements(values: JSStatement[]): SerializedBlocklyBlock[]
  raw(statement: JSStatement): SerializedBlocklyBlock
}
export function textSpriteStatementToBlock(
  s: JSStatement,
  t: WorkspaceTools,
): SerializedBlocklyBlock | undefined {
  if (!isTextSpriteStatement(s)) return
  const make = (
    type: string,
    fields: Record<string, string>,
    inputs: Record<string, JSExpr>,
    body?: JSStatement[],
  ) => {
    const values: Record<string, SerializedBlocklyBlock> = {}
    for (const [name, expr] of Object.entries(inputs)) {
      const converted = t.expression(expr)
      if (!converted) return t.raw(s)
      values[name] = converted
    }
    const built = t.block(type, fields, body ? { BODY: t.statements(body) } : {}, s.__id, values)
    const data = {
      ...('declarationKind' in s ? { declarationKind: s.declarationKind } : {}),
      ...('eventId' in s ? { eventId: s.eventId } : {}),
    }
    if (Object.keys(data).length) built.data = JSON.stringify(data)
    return built
  }
  switch (s.type) {
    case 'g2d:createTextSprite':
      return make(
        'sz_g2d_create_text_sprite',
        { NAME: s.varName },
        { TEXT: s.text, X: s.x, Y: s.y },
      )
    case 'g2d:spawnTextInGroup':
      return make(
        'sz_g2d_spawn_text_in_group',
        { NAME: s.varName ?? '', GROUP: s.groupVar },
        { TEXT: s.text, X: s.x, Y: s.y },
      )
    case 'g2d:setSpriteText':
      return make('sz_g2d_set_sprite_text', { SPRITE: s.spriteVar }, { TEXT: s.text })
    case 'g2d:setTextStyle':
      return make(
        'sz_g2d_set_text_style',
        { SPRITE: s.spriteVar, COLOR: s.color },
        { SIZE: s.size },
      )
    case 'g2d:scaleTextSize':
      return make('sz_g2d_scale_text_size', { SPRITE: s.spriteVar }, { FACTOR: s.factor })
    case 'g2d:setTextBox':
      return make(
        'sz_g2d_set_text_box',
        { SPRITE: s.spriteVar, ALIGN: s.align },
        { WIDTH: s.width, PADDING: s.padding, BACKGROUND: s.background },
      )
    case 'g2d:setTextImage':
      return make(
        'sz_g2d_set_text_image',
        { SPRITE: s.spriteVar, IMAGE: s.image, VALIGN: s.valign },
        {},
      )
    case 'g2d:setSpriteData':
      return make('sz_g2d_set_sprite_data', { SPRITE: s.spriteVar, KEY: s.key }, { VALUE: s.value })
    case 'g2d:onSpriteClick':
      return make('sz_g2d_on_sprite_click', { SPRITE: s.spriteVar }, {}, s.body)
    case 'g2d:onGroupClick':
      return make('sz_g2d_on_group_click', { GROUP: s.groupVar, ITEM: s.itemName }, {}, s.body)
  }
}
export function textSpriteExpressionToBlock(
  s: JSExpr,
  block: WorkspaceTools['block'],
  expression: WorkspaceTools['expression'],
): SerializedBlocklyBlock | undefined {
  if (!isTextSpriteExpression(s)) return
  if (s.type === 'g2d:spriteText')
    return block('sz_g2d_sprite_text', { SPRITE: s.spriteVar }, {}, s.__id)
  const fallback = expression(s.fallback)
  if (fallback)
    return block('sz_g2d_sprite_data', { SPRITE: s.spriteVar, KEY: s.key }, {}, s.__id, {
      FALLBACK: fallback,
    })
}

interface ParserTools {
  identifier(node: Babel.Node | null | undefined): string | null
  expression(node: Babel.Node | null | undefined): JSExpr | null
  simple(expression: JSExpr | null): expression is JSExpr
  inlineFunction(
    node: Babel.Node | null | undefined,
  ): node is Babel.FunctionExpression | Babel.ArrowFunctionExpression
  functionBody(node: Babel.FunctionExpression | Babel.ArrowFunctionExpression): JSStatement[]
}
const literal = (node: Babel.Node | undefined) =>
  node?.type === 'StringLiteral' ? node.value : null

export function textSpriteDeclarationToIR(
  name: string | undefined,
  method: string,
  args: Babel.Node[],
  t: Pick<ParserTools, 'identifier' | 'expression' | 'simple'>,
  kind: Babel.VariableDeclaration['kind'] = 'const',
): TextSpriteStatement | undefined {
  if (method !== 'createTextSprite' && method !== 'spawnTextInGroup') return
  if (kind !== 'const' && kind !== 'let' && kind !== 'var') return
  const declaration = kind === 'const' ? {} : { declarationKind: kind }
  const offset = method === 'spawnTextInGroup' ? 1 : 0
  const text = t.expression(args[offset]),
    x = t.expression(args[offset + 1]),
    y = t.expression(args[offset + 2])
  if (args.length !== offset + 3 || !t.simple(text) || !t.simple(x) || !t.simple(y)) return
  if (method === 'createTextSprite')
    return name
      ? { type: 'g2d:createTextSprite', varName: name, ...declaration, text, x, y }
      : undefined
  const groupVar = t.identifier(args[0])
  return groupVar
    ? {
        type: 'g2d:spawnTextInGroup',
        ...(name ? { varName: name, ...declaration } : {}),
        groupVar,
        text,
        x,
        y,
      }
    : undefined
}
export function textSpriteCallToIR(
  method: string,
  args: Babel.Node[],
  t: ParserTools,
): JSStatement | undefined {
  if (method === 'spawnTextInGroup') return textSpriteDeclarationToIR(undefined, method, args, t)
  const target = t.identifier(args[0])
  if (!target) return
  const value = t.expression(args[1])
  switch (method) {
    case 'drawScore': {
      // generator: SZGame2D.drawScore(ctx, "label", value, x, y, "color", size)
      const ctxVar = t.identifier(args[0])
      const value = t.expression(args[2])
      const x = t.expression(args[3])
      const y = t.expression(args[4])
      const size = t.expression(args[6])
      if (
        !ctxVar ||
        args[1]?.type !== 'StringLiteral' ||
        !t.simple(value) ||
        !t.simple(x) ||
        !t.simple(y) ||
        args[5]?.type !== 'StringLiteral' ||
        !t.simple(size)
      ) {
        return undefined
      }
      return {
        type: 'g2d:drawScore',
        ctxVar,
        label: args[1].value,
        value,
        x,
        y,
        color: args[5].value,
        size,
      }
    }
    case 'drawLabel': {
      // generator: SZGame2D.drawLabel(ctx, "text", x, y, "color", size, "align")
      const ctxVar = t.identifier(args[0])
      const text = t.expression(args[1])
      const x = t.expression(args[2])
      const y = t.expression(args[3])
      const size = t.expression(args[5])
      if (
        !ctxVar ||
        !t.simple(text) ||
        !t.simple(x) ||
        !t.simple(y) ||
        args[4]?.type !== 'StringLiteral' ||
        !t.simple(size) ||
        args[6]?.type !== 'StringLiteral'
      ) {
        return undefined
      }
      const align = args[6].value
      return {
        type: 'g2d:drawLabel',
        ctxVar,
        text: text.type === 'str' ? text.value : text,
        x,
        y,
        color: args[4].value,
        size,
        align: align === 'center' || align === 'right' ? align : 'left',
      }
    }
    case 'setSpriteText':
      return args.length === 2 && t.simple(value)
        ? { type: 'g2d:setSpriteText', spriteVar: target, text: value }
        : undefined
    case 'setTextStyle': {
      const color = literal(args[2])
      return args.length === 3 && t.simple(value) && color !== null
        ? { type: 'g2d:setTextStyle', spriteVar: target, size: value, color }
        : undefined
    }
    case 'scaleTextSize':
      return args.length === 2 && t.simple(value)
        ? { type: 'g2d:scaleTextSize', spriteVar: target, factor: value }
        : undefined
    case 'setTextBox': {
      const align = literal(args[2]),
        padding = t.expression(args[3]),
        background = t.expression(args[4])
      return args.length === 5 &&
        t.simple(value) &&
        t.simple(padding) &&
        t.simple(background) &&
        (align === 'left' || align === 'center' || align === 'right')
        ? { type: 'g2d:setTextBox', spriteVar: target, width: value, align, padding, background }
        : undefined
    }
    case 'setTextImage': {
      const image = literal(args[1]),
        valign = literal(args[2])
      return args.length === 3 &&
        image !== null &&
        (valign === 'top' || valign === 'middle' || valign === 'bottom')
        ? { type: 'g2d:setTextImage', spriteVar: target, image, valign }
        : undefined
    }
    case 'setSpriteData': {
      const key = literal(args[1]),
        data = t.expression(args[2])
      return args.length === 3 && key !== null && t.simple(data)
        ? { type: 'g2d:setSpriteData', spriteVar: target, key, value: data }
        : undefined
    }
    case 'onSpriteClick':
    case 'onGroupClick': {
      const fn = args[1]
      if (args.length < 2 || args.length > 3 || !t.inlineFunction(fn)) return
      if (args[2] && literal(args[2]) === null) return
      const event = args[2] ? { eventId: literal(args[2]) ?? '' } : {}
      if (method === 'onSpriteClick')
        return fn.params.length === 0
          ? { type: 'g2d:onSpriteClick', spriteVar: target, ...event, body: t.functionBody(fn) }
          : undefined
      const itemName = fn.params[0]?.type === 'Identifier' ? fn.params[0].name : null
      return itemName && fn.params.length === 1
        ? {
            type: 'g2d:onGroupClick',
            groupVar: target,
            itemName,
            ...event,
            body: t.functionBody(fn),
          }
        : undefined
    }
  }
}
export function textSpriteCallExpressionToIR(
  method: string,
  args: Babel.Node[],
  t: Pick<ParserTools, 'identifier' | 'expression' | 'simple'>,
): TextSpriteExpression | undefined {
  const spriteVar = t.identifier(args[0])
  if (!spriteVar) return
  if (method === 'spriteText' && args.length === 1) return { type: 'g2d:spriteText', spriteVar }
  if (method === 'spriteData' && args.length === 3) {
    const key = literal(args[1]),
      fallback = t.expression(args[2])
    if (key !== null && t.simple(fallback))
      return { type: 'g2d:spriteData', spriteVar, key, fallback }
  }
}

/** Coleta só os campos semânticos desta família; a fachada mantém a recursão comum. */
export function collectTextSpriteIdentifiers(
  s: JSStatement,
  names: Set<string>,
  expression: (value: JSExpr, names: Set<string>) => void,
  statement: (value: JSStatement, names: Set<string>) => void,
): boolean {
  if (!isTextSpriteStatement(s)) return false
  if ('spriteVar' in s) names.add(s.spriteVar)
  if ('groupVar' in s) names.add(s.groupVar)
  if ('varName' in s && s.varName) names.add(s.varName)
  if ('text' in s) expression(s.text, names)
  if ('x' in s) {
    expression(s.x, names)
    expression(s.y, names)
  }
  if ('size' in s) expression(s.size, names)
  if ('width' in s) {
    expression(s.width, names)
    expression(s.padding, names)
    expression(s.background, names)
  }
  if ('value' in s) expression(s.value, names)
  if ('itemName' in s) names.add(s.itemName)
  // IDs explícitos não devem colidir com os IDs que o gerador ainda vai reservar.
  if ('eventId' in s && s.eventId) names.add(s.eventId)
  if ('body' in s) for (const child of s.body) statement(child, names)
  return true
}
