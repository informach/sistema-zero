import type { StudioPythonRuntimeFeature } from '@sistemazero/core/studio/python-runtime-features'
import type { PythonNode } from '../language/types'
import type {
  PythonBlockBinding,
  PythonBlockCodec,
  PythonBlockInput,
  PythonBlockOwner,
  PythonBlockShape,
  PythonCategory,
  PythonDecodeContext,
  PythonReceiverKind,
} from './contract'
import { attribute, call, isNode, name, node, nodes } from './nodes'
import { PYTHON_MAX_ITEMS, pythonInputsByName } from './shapeControls'

/**
 * One block per API concept, generated from a signature.
 *
 * - Commands are statement blocks (no "executar" wrapper); reporters are value blocks.
 * - Every argument is a named socket. Required ones are always visible; optional ones appear
 *   through the block's "+" options and start with the documented default value.
 * - Positional and named spellings, aliases (fd/forward) and module/method forms of the same
 *   concept decode to one block. How the call was written lives in `extra`, so encoding gives
 *   back exactly the same Python syntax.
 */
export interface PythonApiParam {
  /** Python parameter name. */
  name: string
  /** Portuguese socket label. */
  label: string
  /** pos: positional only. kw: keyword only. either (default): both spellings. */
  form?: 'pos' | 'kw' | 'either'
  /** Hidden until enabled (or present in code). Required parameters are always shown. */
  optional?: boolean
  /** Value used by the palette and when an optional socket is enabled. */
  default(): PythonNode
  /** An optional parameter that the palette block already shows (goto's y). */
  initial?: boolean
}
export type PythonApiCallee =
  /** `module.f(...)` through any import alias, or `f(...)` imported with `from module import f`. */
  | { kind: 'module'; module: string; names: readonly string[] }
  /** `object.f(...)`. With `module`, the procedural `module.f(...)` form is the same block. */
  | {
      kind: 'method'
      names: readonly string[]
      receiver: {
        label: string
        default(): PythonNode
        /** Official class whose objects own this method (proven by a constructor assignment). */
        instance?: { module?: string; builtin?: string; name: string }
        /** Accept any receiver: the method name alone is distinctive enough to teach it. */
        any?: boolean
        /** Literal or constructed built-in receivers ('List' for [] etc.). */
        kinds?: readonly PythonReceiverKind[]
      }
      /** The same function called on the module's default object (turtle.forward). */
      module?: string
      /** Procedural names when they differ from the method names (Screen.clear ↔ clearscreen). */
      moduleNames?: readonly string[]
    }
  /**
   * A fixed dotted path from a global name: `print`, `screen.draw.text`, `keyboard`… With
   * `module`, the first name is that module, imported as is (`import pygame`).
   */
  | { kind: 'path'; path: readonly string[]; builtin?: string; module?: string }

export interface PythonApiSpec {
  id: string
  owner: PythonBlockOwner
  title: string
  category: PythonCategory | string
  level: 1 | 2 | 3
  role: 'statement' | 'value'
  help: string
  api: string
  callee: PythonApiCallee
  params: readonly PythonApiParam[]
  /** `*args`: extra positional values after the fixed positional parameters. */
  variadic?: { label: string; minimum?: number; defaults?(): PythonNode[] }
  starter?: boolean
  replacesStarters?: readonly string[]
  hidden?: boolean
  dependencies?: readonly string[]
  requiredRuntimeFeatures?: readonly StudioPythonRuntimeFeature[]
}

type Style = 'module' | 'imported' | 'method' | 'path'
const isName = (value: PythonNode | undefined): boolean =>
  !!value && value.kind === 'Name' && typeof value.fields.id === 'string'
const load = () => node('Load')
const pathNode = (path: readonly string[]) =>
  path.slice(1).reduce((value, member) => attribute(value, member), name(path[0]!))

/** Matches `a.b.c` (exactly that chain from a Name) and returns true. */
function matchesPath(value: PythonNode, path: readonly string[]): boolean {
  let current: PythonNode | undefined = value
  for (let index = path.length - 1; index > 0; index--) {
    if (
      current?.kind !== 'Attribute' ||
      current.fields.attr !== path[index] ||
      !isNode(current.fields.ctx) ||
      current.fields.ctx.kind !== 'Load'
    )
      return false
    current = isNode(current.fields.value) ? current.fields.value : undefined
  }
  return (
    !!current &&
    isName(current) &&
    current.fields.id === path[0] &&
    isNode(current.fields.ctx) &&
    current.fields.ctx.kind === 'Load'
  )
}

const MAX_EXTRA_TEXT = 80
const optionKey = (param: string) => `${param}:present`
const formKey = (param: string) => `form:${param}`

export function pythonApiCallCodec(spec: PythonApiSpec): PythonBlockCodec {
  const { callee, params, variadic } = spec
  const methodNames = callee.kind === 'path' ? [callee.path.at(-1)!] : [...callee.names]
  const moduleNames =
    callee.kind === 'method'
      ? [...(callee.moduleNames ?? (callee.module ? callee.names : []))]
      : methodNames
  const names = [...new Set([...methodNames, ...moduleNames])]
  const canonical =
    callee.kind === 'method' && !callee.module
      ? methodNames[0]!
      : (moduleNames[0] ?? methodNames[0]!)
  const positional = params.filter((param) => param.form !== 'kw')
  const receiverControl = callee.kind === 'method' && !!callee.module

  function defaultStyle(): Style {
    if (callee.kind === 'path') return 'path'
    if (callee.kind === 'module') return 'module'
    return callee.module ? 'module' : 'method'
  }
  function defaultRoot() {
    if (callee.kind === 'path') return callee.path[0]!
    if (callee.kind === 'module') return callee.module
    return callee.module ?? ''
  }
  function funcFor(style: Style, root: string, alias: string, receiver?: PythonNode) {
    if (callee.kind === 'path') return pathNode(callee.path)
    if (style === 'imported') return name(alias)
    if (style === 'method') return attribute(receiver!, alias)
    return attribute(name(root), alias)
  }

  /** Splits a call into style data and argument values, or undefined if not this API. */
  function readCall(
    value: PythonNode,
    context: PythonDecodeContext | undefined,
  ):
    | {
        style: Style
        root: string
        alias: string
        receiver?: PythonNode
        values: Map<string, PythonNode>
        forms: Map<string, 'k'>
        keywordOrder: string[]
        rest: PythonNode[]
      }
    | undefined {
    if (value.kind !== 'Call' || !isNode(value.fields.func)) return
    const func = value.fields.func
    const { args, keywords } = value.fields
    if (!nodes(args) || !nodes(keywords)) return
    let style: Style
    let root = ''
    let alias = canonical
    let receiver: PythonNode | undefined
    if (callee.kind === 'path') {
      if (!matchesPath(func, callee.path)) return
      style = 'path'
      root = callee.path[0]!
    } else if (isName(func) && isNode(func.fields.ctx) && func.fields.ctx.kind === 'Load') {
      // `from module import name`; the resolver proves the binding.
      if (!moduleNames.includes(func.fields.id as string)) return
      if (callee.kind === 'method' && !callee.module) return
      style = 'imported'
      alias = func.fields.id as string
      root = alias
    } else if (
      func.kind === 'Attribute' &&
      typeof func.fields.attr === 'string' &&
      names.includes(func.fields.attr) &&
      isNode(func.fields.ctx) &&
      func.fields.ctx.kind === 'Load' &&
      isNode(func.fields.value)
    ) {
      alias = func.fields.attr
      const object = func.fields.value
      if (callee.kind === 'module') {
        if (!isName(object) || !isNode(object.fields.ctx) || object.fields.ctx.kind !== 'Load')
          return
        style = 'module'
        root = object.fields.id as string
      } else if (
        callee.module &&
        isName(object) &&
        isNode(object.fields.ctx) &&
        object.fields.ctx.kind === 'Load' &&
        (context?.isModule
          ? context.isModule(object, callee.module)
          : object.fields.id === callee.module)
      ) {
        style = 'module'
        root = object.fields.id as string
      } else {
        style = 'method'
        receiver = object
      }
      if (!(style === 'method' ? methodNames : moduleNames).includes(alias)) return
    } else return
    if (root.length > MAX_EXTRA_TEXT) return
    const values = new Map<string, PythonNode>()
    const forms = new Map<string, 'k'>()
    const rest: PythonNode[] = []
    for (const [index, argument] of args.entries()) {
      if (argument.kind === 'Starred') return
      const param = positional[index]
      if (param) values.set(param.name, argument)
      else if (variadic && rest.length < PYTHON_MAX_ITEMS) rest.push(argument)
      else return
    }
    const keywordOrder: string[] = []
    for (const keyword of keywords) {
      const key = keyword.fields.arg
      if (typeof key !== 'string' || !isNode(keyword.fields.value)) return
      const param = params.find((item) => item.name === key)
      if (!param || param.form === 'pos' || values.has(key)) return
      values.set(key, keyword.fields.value)
      forms.set(key, 'k')
      keywordOrder.push(key)
    }
    if (variadic && rest.length < (variadic.minimum ?? 0)) return
    for (const param of params) if (!param.optional && !values.has(param.name)) return
    return { style, root, alias, receiver, values, forms, keywordOrder, rest }
  }

  function shapeOf(parts: NonNullable<ReturnType<typeof readCall>>): PythonBlockShape | undefined {
    const extra: Record<string, string | number | boolean> = { style: parts.style }
    if (parts.style !== 'path' && parts.style !== 'method') extra.root = parts.root
    const usual = parts.style === 'method' || parts.style === 'path' ? methodNames[0] : canonical
    if (parts.alias !== usual) extra.alias = parts.alias
    const inputs: PythonBlockInput[] = []
    if (parts.style === 'method')
      inputs.push({
        name: 'receiver',
        label: callee.kind === 'method' ? callee.receiver.label : 'objeto',
        role: 'value',
        nodes: [parts.receiver!],
      })
    if (receiverControl) extra['receiver:present'] = parts.style === 'method'
    for (const param of params) {
      const value = parts.values.get(param.name)
      if (param.optional) extra[optionKey(param.name)] = !!value
      if (!value) continue
      if (parts.forms.get(param.name) === 'k' && param.form !== 'kw')
        extra[formKey(param.name)] = 'k'
      inputs.push({ name: param.name, label: param.label, role: 'value', nodes: [value] })
      if (variadic && param === positional.at(-1)) pushRest()
    }
    function pushRest() {
      if (!variadic || extra['args:count'] !== undefined) return
      extra['args:count'] = parts.rest.length
      parts.rest.forEach((value, index) => {
        inputs.push({
          name: `args:${index}`,
          label: `${variadic.label} ${index + 1}`,
          role: 'value',
          nodes: [value],
        })
      })
    }
    // Variadic values follow the fixed positional ones (or come first when there are none).
    if (variadic && extra['args:count'] === undefined) {
      const before = inputs.filter((input) => input.name === 'receiver')
      const after = inputs.filter((input) => input.name !== 'receiver')
      inputs.length = 0
      inputs.push(...before)
      pushRest()
      inputs.push(...after)
    }
    if (parts.keywordOrder.length > 1) {
      const order = parts.keywordOrder.join(',')
      if (order.length > MAX_EXTRA_TEXT) return
      extra.order = order
    }
    return { fields: [], inputs, extra }
  }

  function buildCall(shape: PythonBlockShape): PythonNode {
    const extra = shape.extra ?? {}
    const style = (typeof extra.style === 'string' ? extra.style : defaultStyle()) as Style
    if (!['module', 'imported', 'method', 'path'].includes(style))
      throw new Error('Forma da chamada inválida.')
    const alias =
      typeof extra.alias === 'string'
        ? extra.alias
        : style === 'method'
          ? methodNames[0]!
          : canonical
    if (!(style === 'method' || style === 'path' ? methodNames : moduleNames).includes(alias))
      throw new Error('Nome da chamada inválido.')
    const root = typeof extra.root === 'string' ? extra.root : defaultRoot()
    const byName = pythonInputsByName(shape)
    const input = (key: string) => {
      const found = byName.get(key)
      if (!found) return undefined
      if (found.nodes.length !== 1) throw new Error('Preencha todas as entradas do bloco.')
      return found.nodes[0]!
    }
    const receiver = style === 'method' ? input('receiver') : undefined
    if (style === 'method' && !receiver) throw new Error('Escolha o objeto da chamada.')
    if (
      style !== 'method' &&
      style !== 'path' &&
      !/^[_\p{ID_Start}][_\p{ID_Continue}]*$/u.test(root)
    )
      throw new Error('Escolha o módulo da chamada.')
    const args: PythonNode[] = []
    const keywords = new Map<string, PythonNode>()
    let gap = false
    for (const param of params) {
      const value = input(param.name)
      if (!value) {
        if (!param.optional) throw new Error(`Preencha ${param.label}.`)
        if (param.form !== 'kw') gap = true
        continue
      }
      const keyword = param.form === 'kw' || extra[formKey(param.name)] === 'k' || gap
      if (keyword) {
        if (param.form === 'pos') throw new Error(`Preencha os valores antes de ${param.label}.`)
        keywords.set(param.name, value)
      } else args.push(value)
    }
    const count = variadic ? Number(extra['args:count'] ?? 0) : 0
    if (!Number.isSafeInteger(count) || count < 0 || count > PYTHON_MAX_ITEMS)
      throw new Error('Quantidade de valores inválida.')
    if (
      count &&
      keywords.size &&
      [...keywords.keys()].some((key) => params.find((p) => p.name === key)?.form !== 'kw')
    )
      throw new Error('Os valores extras precisam vir depois dos valores escritos em ordem.')
    for (let index = 0; index < count; index++) {
      const value = input(`args:${index}`)
      if (!value) throw new Error('Preencha todos os valores do bloco.')
      args.push(value)
    }
    const order = typeof extra.order === 'string' ? extra.order.split(',') : []
    const keywordNames = [
      ...order.filter((key) => keywords.has(key)),
      ...params
        .map((param) => param.name)
        .filter((key) => keywords.has(key) && !order.includes(key)),
    ]
    return call(
      funcFor(style, root, alias, receiver),
      args,
      keywordNames.map((key) => node('keyword', { arg: key, value: keywords.get(key)! })),
    )
  }

  function defaultCall(): PythonNode {
    const style = defaultStyle()
    const receiver =
      style === 'method' && callee.kind === 'method' ? callee.receiver.default() : undefined
    return call(
      funcFor(style, defaultRoot(), style === 'method' ? methodNames[0]! : canonical, receiver),
      [
        ...positional
          .filter((param) => !param.optional || param.initial)
          .map((param) => param.default()),
        ...(variadic?.defaults?.() ?? []),
      ],
      params
        .filter((param) => param.form === 'kw' && (!param.optional || param.initial))
        .map((param) => node('keyword', { arg: param.name, value: param.default() })),
    )
  }

  const statement = spec.role === 'statement'
  const unwrap = (value: PythonNode) =>
    statement
      ? value.kind === 'Expr' && isNode(value.fields.value)
        ? value.fields.value
        : undefined
      : value
  const wrap = (value: PythonNode) => (statement ? node('Expr', { value }) : value)

  const controls: NonNullable<PythonBlockCodec['controls']> = [
    ...(receiverControl && callee.kind === 'method'
      ? [{ key: 'receiver:present', label: callee.receiver.label, kind: 'optional' as const }]
      : []),
    ...params
      .filter((param) => param.optional)
      .map((param) => ({
        key: optionKey(param.name),
        label: param.label,
        kind: 'optional' as const,
      })),
    ...(variadic
      ? [
          {
            key: 'args:count',
            label: variadic.label,
            kind: 'count' as const,
            minimum: variadic.minimum ?? 0,
            maximum: PYTHON_MAX_ITEMS,
          },
        ]
      : []),
  ]

  function bindingFor(value: PythonNode): PythonBlockBinding | undefined {
    const target = unwrap(value)
    if (target?.kind !== 'Call' || !isNode(target.fields.func)) return
    const func = target.fields.func
    if (callee.kind === 'path')
      return callee.builtin
        ? { root: callee.path[0]!, builtin: callee.builtin }
        : callee.module
          ? { root: callee.path[0]!, module: callee.module }
          : { root: callee.path[0]! }
    const module = callee.kind === 'module' ? callee.module : callee.module
    if (isName(func))
      return module
        ? { root: func.fields.id as string, module, member: func.fields.id as string }
        : undefined
    if (func.kind !== 'Attribute' || !isNode(func.fields.value)) return
    const object = func.fields.value
    if (callee.kind === 'module')
      return isName(object)
        ? { root: object.fields.id as string, module: callee.module }
        : undefined
    const instance = callee.receiver.instance
    // Distinctive methods (penup, colliderect…) are taught on any receiver: the receiver
    // may live in a list, a dict or self. The provider must still be installed.
    if (
      callee.receiver.any &&
      !(isName(object) && callee.module && object.fields.id === callee.module)
    )
      return {
        // A variable receiver is still checked against what the program says it holds.
        root: isName(object) ? (object.fields.id as string) : '',
        ...(isName(object) ? { anyReceiver: true } : {}),
        ...(isName(object) && instance?.module ? { module: instance.module } : {}),
        ...(instance?.builtin ? { builtin: instance.builtin } : {}),
        ...(callee.module ? { builtin: callee.module } : {}),
      }
    // A Name receiver may be the module itself (procedural form) or an official object.
    if (isName(object) && callee.module)
      return {
        root: object.fields.id as string,
        module: callee.module,
        ...(instance ? { instance: instance.name } : {}),
        moduleOrInstance: true,
      }
    // Distinctive methods and literal-typed receivers need no binding proof here; the
    // provider still has to be installed.
    if (callee.receiver.any || callee.receiver.kinds)
      return { root: '', ...(instance?.builtin ? { builtin: instance.builtin } : {}) }
    if (!instance || !isName(object)) return
    return {
      root: object.fields.id as string,
      ...(instance.module ? { module: instance.module } : {}),
      ...(instance.builtin ? { builtin: instance.builtin } : {}),
      instance: instance.name,
    }
  }

  const codec: PythonBlockCodec = {
    id: spec.id,
    owner: spec.owner,
    title: spec.title,
    category: spec.category,
    level: spec.level,
    role: spec.role,
    help: spec.help,
    api: spec.api,
    ...(spec.dependencies ? { dependencies: spec.dependencies } : {}),
    ...(spec.requiredRuntimeFeatures
      ? { requiredRuntimeFeatures: spec.requiredRuntimeFeatures }
      : {}),
    ...(spec.starter ? { starter: true } : {}),
    ...(spec.replacesStarters ? { replacesStarters: spec.replacesStarters } : {}),
    ...(spec.hidden ? { hidden: true } : {}),
    ...(callee.kind === 'method' && callee.receiver.kinds
      ? { receiverKinds: callee.receiver.kinds }
      : {}),
    match: { kinds: [statement ? 'Expr' : 'Call'], names },
    bindingFor,
    controls,
    defaultNode: () => wrap(defaultCall()),
    decode(value, context) {
      const target = unwrap(value)
      if (!target || (statement && Object.keys(value.fields).length !== 1)) return
      if (Object.keys(target.fields).length !== 3) return
      const parts = readCall(target, context)
      return parts && shapeOf(parts)
    },
    encode(shape) {
      return wrap(buildCall(shape))
    },
    reshape(shape, key, value) {
      const result = structuredClone(shape)
      result.extra = { ...result.extra }
      if (key === 'receiver:present' && callee.kind === 'method' && callee.module) {
        if (typeof value !== 'boolean') throw new Error('Opção inválida do bloco Python.')
        result.extra[key] = value
        result.inputs = result.inputs.filter((input) => input.name !== 'receiver')
        delete result.extra.alias
        if (value) {
          result.extra.style = 'method'
          delete result.extra.root
          result.inputs.unshift({
            name: 'receiver',
            label: callee.receiver.label,
            role: 'value',
            nodes: [callee.receiver.default()],
          })
        } else {
          result.extra.style = 'module'
          result.extra.root = callee.module
        }
        return result
      }
      const param = params.find((item) => optionKey(item.name) === key)
      if (param) {
        if (typeof value !== 'boolean') throw new Error('Opção inválida do bloco Python.')
        result.extra[key] = value
        result.inputs = result.inputs.filter((input) => input.name !== param.name)
        delete result.extra[formKey(param.name)]
        if (value) {
          // Keep sockets in signature order.
          const order = ['receiver', ...params.map((item) => item.name)]
          const entry = {
            name: param.name,
            label: param.label,
            role: 'value' as const,
            nodes: [param.default()],
          }
          const position = result.inputs.findIndex(
            (input) =>
              !input.name.startsWith('args:') &&
              order.indexOf(input.name) > order.indexOf(param.name),
          )
          if (position < 0) result.inputs.push(entry)
          else result.inputs.splice(position, 0, entry)
        }
        return result
      }
      if (key === 'args:count' && variadic) {
        if (
          typeof value !== 'number' ||
          !Number.isSafeInteger(value) ||
          value < (variadic.minimum ?? 0) ||
          value > PYTHON_MAX_ITEMS
        )
          throw new Error('Quantidade de valores inválida.')
        const current = Number(result.extra['args:count'] ?? 0)
        const items = result.inputs.filter((input) => input.name.startsWith('args:'))
        const others = result.inputs.filter((input) => !input.name.startsWith('args:'))
        const next: PythonBlockInput[] = []
        for (let index = 0; index < value; index++)
          next.push(
            items[index] ?? {
              name: `args:${index}`,
              label: `${variadic.label} ${index + 1}`,
              role: 'value',
              nodes: [variadic.defaults?.()[0] ?? name('valor')],
            },
          )
        void current
        // Variadic values sit right after the receiver and the fixed positional values.
        const fixed = new Set(positional.map((param) => param.name))
        let at = 0
        while (
          at < others.length &&
          (others[at]!.name === 'receiver' || fixed.has(others[at]!.name))
        )
          at++
        result.inputs = [...others.slice(0, at), ...next, ...others.slice(at)]
        result.extra['args:count'] = value
        return result
      }
      throw new Error('Opção desconhecida do bloco Python.')
    },
  }
  return codec
}

/** Shorthand used by catalogs: a required parameter. */
export const required = (
  paramName: string,
  label: string,
  value: () => PythonNode,
  form?: PythonApiParam['form'],
): PythonApiParam => ({ name: paramName, label, default: value, ...(form ? { form } : {}) })
/** Shorthand: an optional parameter shown through the block options. */
export const optional = (
  paramName: string,
  label: string,
  value: () => PythonNode,
  form?: PythonApiParam['form'],
): PythonApiParam => ({
  name: paramName,
  label,
  default: value,
  optional: true,
  ...(form ? { form } : {}),
})
export { load as pythonLoadContext }
