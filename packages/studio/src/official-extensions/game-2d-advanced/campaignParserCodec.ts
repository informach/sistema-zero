import type * as Babel from '@babel/types'
import type { JSExpr, JSStatement } from '#ir'
import { type GameKitCampaignStage, normalizeCampaignStage } from './campaignSchema'
import { isGameKitAction, isGameKitCampaignEventField } from './runtimeContract'
import { gameKitUiFontCallToIR } from './uiFontCodec'

export const CAMPAIGN_CALL_UNHANDLED = Symbol('campaign-call-unhandled')
export const CAMPAIGN_EXPRESSION_CALL_UNHANDLED = Symbol('campaign-expression-call-unhandled')

type InlineFunction = Babel.ArrowFunctionExpression | Babel.FunctionExpression
type StaticValue = null | boolean | number | string | StaticValue[] | { [key: string]: StaticValue }

const STATIC_VALUE_INVALID = Symbol('static-value-invalid')

export interface CampaignParserContext {
  toExpr(node: Babel.Node | null | undefined): JSExpr | null
  isSimpleValue(expr: JSExpr | null): expr is JSExpr
  identifierName(node: Babel.Node | null | undefined): string | null
  bodyOfFunction(node: InlineFunction): JSStatement[]
}

function isInlineFunction(node: Babel.Node | null | undefined): node is InlineFunction {
  return node?.type === 'ArrowFunctionExpression' || node?.type === 'FunctionExpression'
}

/** Lê somente literais JSON; chamadas, getters, spreads e chaves calculadas são recusados. */
function readStaticValue(
  node: Babel.Node | null | undefined,
): StaticValue | typeof STATIC_VALUE_INVALID {
  if (!node) return STATIC_VALUE_INVALID
  if (node.type === 'NullLiteral') return null
  if (
    node.type === 'BooleanLiteral' ||
    node.type === 'NumericLiteral' ||
    node.type === 'StringLiteral'
  ) {
    return node.value
  }
  if (
    node.type === 'UnaryExpression' &&
    node.operator === '-' &&
    node.argument.type === 'NumericLiteral'
  ) {
    return -node.argument.value
  }
  if (node.type === 'ArrayExpression') {
    const output: StaticValue[] = []
    for (const element of node.elements) {
      if (!element || element.type === 'SpreadElement') return STATIC_VALUE_INVALID
      const value = readStaticValue(element)
      if (value === STATIC_VALUE_INVALID) return STATIC_VALUE_INVALID
      output.push(value)
    }
    return output
  }
  if (node.type === 'ObjectExpression') {
    const output: { [key: string]: StaticValue } = Object.create(null)
    for (const property of node.properties) {
      if (property.type !== 'ObjectProperty' || property.computed) return STATIC_VALUE_INVALID
      const key =
        property.key.type === 'Identifier'
          ? property.key.name
          : property.key.type === 'StringLiteral'
            ? property.key.value
            : null
      if (key === null) return STATIC_VALUE_INVALID
      const value = readStaticValue(property.value)
      if (value === STATIC_VALUE_INVALID) return STATIC_VALUE_INVALID
      output[key] = value
    }
    return output
  }
  return STATIC_VALUE_INVALID
}

function readCampaignStage(node: Babel.Node | null | undefined): GameKitCampaignStage | null {
  const value = readStaticValue(node)
  return value === STATIC_VALUE_INVALID ? null : normalizeCampaignStage(value)
}

function objectPropertyNodes(
  object: Babel.ObjectExpression,
  allowed: readonly string[],
): Record<string, Babel.Node> | null {
  const allowedKeys = new Set(allowed)
  const output: Record<string, Babel.Node> = Object.create(null)
  for (const property of object.properties) {
    if (property.type !== 'ObjectProperty' || property.computed) return null
    const key =
      property.key.type === 'Identifier'
        ? property.key.name
        : property.key.type === 'StringLiteral'
          ? property.key.value
          : null
    if (key === null || !allowedKeys.has(key) || output[key]) return null
    output[key] = property.value
  }
  return output
}

export function gameKitCampaignExpressionCallToIR(
  method: string,
  args: readonly Babel.Node[],
): JSExpr | null | typeof CAMPAIGN_EXPRESSION_CALL_UNHANDLED {
  if (
    (method === 'actionDown' || method === 'actionPressed' || method === 'actionReleased') &&
    args.length === 1 &&
    args[0]?.type === 'StringLiteral'
  ) {
    const action = args[0].value
    if (!isGameKitAction(action)) return null
    if (method === 'actionDown') return { type: 'gk:actionDown', action }
    if (method === 'actionPressed') return { type: 'gk:actionPressed', action }
    return { type: 'gk:actionReleased', action }
  }
  if (method === 'currentStage') return args.length === 0 ? { type: 'gk:currentStage' } : null
  if (method === 'campaignEventValue') {
    const field = args[0]?.type === 'StringLiteral' ? args[0].value : ''
    return args.length === 1 && isGameKitCampaignEventField(field)
      ? { type: 'gk:campaignEventValue', field }
      : null
  }
  return CAMPAIGN_EXPRESSION_CALL_UNHANDLED
}

export function gameKitCampaignCallToIR(
  method: string,
  args: readonly Babel.Node[],
  context: CampaignParserContext,
): JSStatement | null | typeof CAMPAIGN_CALL_UNHANDLED {
  // Mesmo motivo do irmão em `campaignBlockCodec`: é por este despachante que a
  // extensão alcança o `parsers/js.ts` sem fazer aquela fachada crescer.
  const font = gameKitUiFontCallToIR(method, args)
  if (font) return font
  switch (method) {
    case 'enableFixedSimulation': {
      if (args[0]?.type !== 'ObjectExpression') return null
      const options = objectPropertyNodes(args[0], ['hz', 'seed', 'maxCatchUpSteps'])
      if (!options) return null
      if (options.hz?.type !== 'NumericLiteral' || options.hz.value !== 60) return null
      if (
        options.maxCatchUpSteps?.type !== 'NumericLiteral' ||
        options.maxCatchUpSteps.value !== 5
      ) {
        return null
      }
      const seed = context.toExpr(options.seed)
      return context.isSimpleValue(seed) ? { type: 'gk:fixedSetup', seed } : null
    }
    case 'onFixedUpdate': {
      const callback = args[0]
      if (!isInlineFunction(callback)) return null
      return {
        type: 'gk:onFixedUpdate',
        dtName: context.identifierName(callback.params[0]) ?? 'dt',
        tickName: context.identifierName(callback.params[1]) ?? 'passo',
        body: context.bodyOfFunction(callback),
      }
    }
    case 'defineCampaign': {
      if (args[0]?.type !== 'ObjectExpression') return null
      const options = objectPropertyNodes(args[0], [
        'id',
        'version',
        'firstStage',
        'players',
        'seed',
        'requiredGems',
      ])
      if (options?.id?.type !== 'StringLiteral' || options.firstStage?.type !== 'StringLiteral') {
        return null
      }
      const version = context.toExpr(options.version)
      const players = context.toExpr(options.players)
      const seed = context.toExpr(options.seed)
      const requiredGems = options.requiredGems
        ? context.toExpr(options.requiredGems)
        : { type: 'num' as const, value: 0 }
      return context.isSimpleValue(version) &&
        context.isSimpleValue(players) &&
        context.isSimpleValue(seed) &&
        context.isSimpleValue(requiredGems)
        ? {
            type: 'gk:defineCampaign',
            id: options.id.value,
            version,
            firstStage: options.firstStage.value,
            players,
            seed,
            requiredGems,
          }
        : null
    }
    case 'onCampaignEvent': {
      const callback = args[1]
      if (args[0]?.type !== 'StringLiteral' || !isInlineFunction(callback)) return null
      return {
        type: 'gk:onCampaignEvent',
        event: args[0].value,
        body: context.bodyOfFunction(callback),
      }
    }
    case 'defineCampaignStage': {
      const stage = readCampaignStage(args[0])
      return stage ? { type: 'gk:defineCampaignStage', stage } : null
    }
    case 'startCampaign':
      return args.length === 1 && args[0]?.type === 'StringLiteral'
        ? { type: 'gk:startCampaign', stageId: args[0].value }
        : null
    case 'goToStage':
      return args.length === 1 && args[0]?.type === 'StringLiteral'
        ? { type: 'gk:goToStage', stageId: args[0].value }
        : null
    case 'saveCampaign':
    case 'loadCampaign':
    case 'deleteCampaignSave': {
      const slot = args[0]
      if (
        args.length !== 1 ||
        slot?.type !== 'NumericLiteral' ||
        !Number.isInteger(slot.value) ||
        slot.value < 1 ||
        slot.value > 3
      ) {
        return null
      }
      if (method === 'saveCampaign') return { type: 'gk:saveCampaign', slot: slot.value }
      if (method === 'loadCampaign') return { type: 'gk:loadCampaign', slot: slot.value }
      return { type: 'gk:deleteCampaignSave', slot: slot.value }
    }
    case 'startReplayRecording':
      return args.length === 0 ? { type: 'gk:startReplayRecording' } : null
    case 'stopReplayRecording':
      return args.length === 0 ? { type: 'gk:stopReplayRecording' } : null
    case 'playLastReplay':
      return args.length === 0 ? { type: 'gk:playLastReplay' } : null
    default:
      return CAMPAIGN_CALL_UNHANDLED
  }
}
