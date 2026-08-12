import type * as Babel from '@babel/types'
import type { JSExpr, JSStatement } from '#ir'

export interface NativeRuntimeParserTools {
  toExpr: (node: Babel.Node | null | undefined) => JSExpr | null
  isSimpleValue: (expr: JSExpr | null) => expr is JSExpr
}

function fixedMemberCall(
  node: Babel.Node,
  objectName: string,
): { method: string; args: Babel.Node[] } | null {
  if (node.type !== 'CallExpression' || node.callee.type !== 'MemberExpression') return null
  const callee = node.callee
  if (
    callee.computed ||
    callee.object.type !== 'Identifier' ||
    callee.object.name !== objectName ||
    callee.property.type !== 'Identifier'
  ) {
    return null
  }
  return { method: callee.property.name, args: node.arguments as Babel.Node[] }
}

/** Comandos do bridge de som nativo (`__szAudio.*`). */
export function coreAudioCallToIR(
  node: Babel.Node,
  tools: NativeRuntimeParserTools,
): JSStatement | null {
  const call = fixedMemberCall(node, '__szAudio')
  if (!call) return null
  const { method, args } = call
  const text = (index: number): string | null =>
    args[index]?.type === 'StringLiteral' ? String(args[index].value) : null
  switch (method) {
    case 'carregar': {
      const name = text(0)
      const asset = text(1)
      return name !== null && asset !== null ? { type: 'somLoad', name, asset } : null
    }
    case 'tocar': {
      const name = text(0)
      return name === null ? null : { type: 'somPlay', name }
    }
    case 'parar': {
      const name = text(0)
      return name === null ? null : { type: 'somStop', name }
    }
    case 'tocarSemParar': {
      const name = text(0)
      return name === null ? null : { type: 'somPlayMusic', name }
    }
    case 'pararMusica':
      return args.length === 0 ? { type: 'somStopMusic' } : null
    case 'volume': {
      const level = tools.toExpr(args[0])
      return tools.isSimpleValue(level) ? { type: 'somVolume', level } : null
    }
    case 'tom': {
      const wave = text(0)
      const frequency = tools.toExpr(args[1])
      const duration = tools.toExpr(args[2])
      const level = tools.toExpr(args[3])
      return wave !== null &&
        (wave === 'sine' || wave === 'square' || wave === 'sawtooth' || wave === 'triangle') &&
        tools.isSimpleValue(frequency) &&
        tools.isSimpleValue(duration) &&
        tools.isSimpleValue(level)
        ? { type: 'somTone', wave, frequency, duration, level }
        : null
    }
    case 'ruido': {
      const duration = tools.toExpr(args[0])
      const level = tools.toExpr(args[1])
      return tools.isSimpleValue(duration) && tools.isSimpleValue(level)
        ? { type: 'somNoise', duration, level }
        : null
    }
    default:
      return null
  }
}

/** `localStorage.removeItem` e `sessionStorage.removeItem`. */
export function storageRemoveCallToIR(
  node: Babel.Node,
  tools: NativeRuntimeParserTools,
): JSStatement | null {
  if (node.type !== 'CallExpression' || node.callee.type !== 'MemberExpression') return null
  const callee = node.callee
  if (
    callee.computed ||
    callee.object.type !== 'Identifier' ||
    (callee.object.name !== 'localStorage' && callee.object.name !== 'sessionStorage') ||
    callee.property.type !== 'Identifier' ||
    callee.property.name !== 'removeItem' ||
    node.arguments.length !== 1
  ) {
    return null
  }
  const key = tools.toExpr(node.arguments[0] as Babel.Node)
  return tools.isSimpleValue(key)
    ? {
        type: 'storageRemove',
        store: callee.object.name === 'sessionStorage' ? 'session' : 'local',
        key,
      }
    : null
}

/**
 * Expressões dos bridges nativos. `undefined` significa “não pertence a este
 * codec”; `null`, uma chamada reconhecida mas inválida.
 */
export function nativeRuntimeExpressionToIR(
  node: Babel.Node,
  tools: NativeRuntimeParserTools,
): JSExpr | null | undefined {
  const json = fixedMemberCall(node, 'JSON')
  if (json && (json.method === 'parse' || json.method === 'stringify')) {
    if (json.args.length !== 1) return null
    if (json.method === 'stringify') {
      const value = tools.toExpr(json.args[0])
      return tools.isSimpleValue(value) ? { type: 'jsonStringify', value } : null
    }
    const argument = json.args[0]
    if (argument?.type === 'StringLiteral') {
      try {
        return { type: 'jsonLiteral', json: JSON.stringify(JSON.parse(String(argument.value))) }
      } catch {
        return null
      }
    }
    if (
      argument?.type === 'CallExpression' &&
      argument.callee.type === 'Identifier' &&
      argument.callee.name === 'String' &&
      argument.arguments.length === 1
    ) {
      const value = tools.toExpr(argument.arguments[0] as Babel.Node)
      return tools.isSimpleValue(value) ? { type: 'jsonParse', value } : null
    }
    return null
  }

  const input = fixedMemberCall(node, '__szInput')
  if (!input) return undefined
  if (input.method === 'key') {
    return input.args.length === 1 && input.args[0]?.type === 'StringLiteral'
      ? { type: 'inputKeyPressed', key: String(input.args[0].value) }
      : null
  }
  const first = tools.toExpr(input.args[0])
  if (input.method === 'gamepadConnected') {
    return input.args.length === 1 && tools.isSimpleValue(first)
      ? { type: 'gamepadConnected', index: first }
      : null
  }
  if (input.method !== 'gamepadAxis' && input.method !== 'gamepadButton') return undefined
  const second = tools.toExpr(input.args[1])
  if (input.args.length !== 2 || !tools.isSimpleValue(first) || !tools.isSimpleValue(second)) {
    return null
  }
  return input.method === 'gamepadAxis'
    ? { type: 'gamepadAxis', index: first, axis: second }
    : { type: 'gamepadButton', index: first, button: second }
}

export function nativeRuntimeSimpleValue(
  expr: JSExpr,
  recurse: (expr: JSExpr | null) => expr is JSExpr,
): boolean | undefined {
  switch (expr.type) {
    case 'jsonLiteral':
      return true
    case 'jsonParse':
    case 'jsonStringify':
      return recurse(expr.value)
    case 'gamepadConnected':
      return recurse(expr.index)
    case 'gamepadAxis':
      return recurse(expr.index) && recurse(expr.axis)
    case 'gamepadButton':
      return recurse(expr.index) && recurse(expr.button)
    default:
      return undefined
  }
}
