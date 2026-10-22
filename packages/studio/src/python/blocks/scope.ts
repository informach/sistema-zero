import type { PythonNode, PythonValue } from '../language/types'
import type { PythonBlockCodec } from './contract'
import { isNode, nodes } from './nodes'

type Binding =
  | { kind: 'module'; module: string; member?: string }
  | { kind: 'instance'; module: string; instance: 'Turtle' | 'Screen' | 'Shape' }
  | { kind: 'other' }
type Scope = {
  parent?: Scope
  bindings: Map<string, Binding>
  writes: Map<string, number>
  uncertain: boolean
  classScope?: boolean
}
const children = (value: PythonValue): PythonNode[] =>
  Array.isArray(value) ? value.flatMap(children) : isNode(value) ? [value] : []
const eachChild = (value: PythonNode) => Object.values(value.fields).flatMap(children)

/** Conservative lexical resolution. Ambiguous or rebound names keep the generic call block. */
export function pythonBindingResolver(
  tree: PythonNode,
  officialModules: ReadonlySet<string> = new Set(),
  guardedAttributes: ReadonlySet<string> = new Set(),
) {
  const scopes = new WeakMap<PythonNode, Scope>()
  const constructors: { scope: Scope; target: string; call: PythonNode }[] = []
  // Attribute writes can mutate imported modules (including builtins) through
  // aliases. The alias graph is unknown, so a write to any name an official block
  // resolves through (or to a dunder) withdraws every specialized label. Ordinary
  // object state such as self.velocidade cannot replace official behavior.
  let hasAttributeWrites = false
  let hasDynamicBindings = false
  function assign(scope: Scope, key: string, binding: Binding) {
    scope.writes.set(key, (scope.writes.get(key) ?? 0) + 1)
    const previous = scope.bindings.get(key)
    scope.bindings.set(
      key,
      !previous ||
        (previous.kind === 'module' &&
          binding.kind === 'module' &&
          previous.module === binding.module &&
          previous.member === binding.member)
        ? binding
        : { kind: 'other' },
    )
  }
  function visit(value: PythonNode, scope: Scope) {
    scopes.set(value, scope)
    const fields = value.fields
    if (
      value.kind === 'Assign' &&
      nodes(fields.targets) &&
      fields.targets.length === 1 &&
      fields.targets[0]!.kind === 'Name' &&
      typeof fields.targets[0]!.fields.id === 'string' &&
      isNode(fields.value) &&
      fields.value.kind === 'Call'
    )
      constructors.push({ scope, target: fields.targets[0]!.fields.id, call: fields.value })
    if (value.kind === 'Attribute' && isNode(fields.ctx) && typeof fields.attr === 'string') {
      const dunder = fields.attr.startsWith('__') && fields.attr.endsWith('__')
      if (
        ['Store', 'Del'].includes(fields.ctx.kind) &&
        (dunder || guardedAttributes.has(fields.attr))
      )
        hasAttributeWrites = true
      // object.__setattr__, __dict__ and __class__ reach the same mutation indirectly.
      else if (dunder && fields.attr !== '__init__') hasDynamicBindings = true
    }
    if (['MatchAs', 'MatchStar'].includes(value.kind) && typeof fields.name === 'string')
      assign(scope, fields.name, { kind: 'other' })
    if (value.kind === 'MatchMapping' && typeof fields.rest === 'string')
      assign(scope, fields.rest, { kind: 'other' })
    if (
      value.kind === 'Name' &&
      typeof fields.id === 'string' &&
      isNode(fields.ctx) &&
      ['Store', 'Del'].includes(fields.ctx.kind)
    )
      assign(scope, fields.id, { kind: 'other' })
    if (value.kind === 'arg' && typeof fields.arg === 'string')
      assign(scope, fields.arg, { kind: 'other' })
    if (value.kind === 'ExceptHandler' && typeof fields.name === 'string')
      assign(scope, fields.name, { kind: 'other' })
    if (['Global', 'Nonlocal'].includes(value.kind)) {
      scope.uncertain = true
      hasDynamicBindings = true
    }
    if (value.kind === 'Import' && nodes(fields.names))
      for (const alias of fields.names) {
        if (typeof alias.fields.name !== 'string') continue
        const root = alias.fields.name.split('.')[0]!
        assign(scope, typeof alias.fields.asname === 'string' ? alias.fields.asname : root, {
          kind: 'module',
          module: typeof alias.fields.asname === 'string' ? alias.fields.name : root,
        })
      }
    if (value.kind === 'ImportFrom' && nodes(fields.names))
      for (const alias of fields.names) {
        if (alias.fields.name === '*') scope.uncertain = true
        else if (typeof alias.fields.name === 'string')
          assign(
            scope,
            typeof alias.fields.asname === 'string' ? alias.fields.asname : alias.fields.name,
            typeof fields.module === 'string' &&
              typeof fields.level === 'object' &&
              fields.level !== null &&
              'literal' in fields.level &&
              fields.level.literal === 'int' &&
              fields.level.value === '0'
              ? { kind: 'module', module: fields.module, member: alias.fields.name }
              : { kind: 'other' },
          )
      }
    if (
      value.kind === 'Call' &&
      isNode(fields.func) &&
      fields.func.kind === 'Name' &&
      ['exec', 'eval', 'globals', 'locals', 'vars', 'setattr', 'delattr'].includes(
        String(fields.func.fields.id),
      )
    ) {
      scope.uncertain = true
      hasDynamicBindings = true
    }
    if (['FunctionDef', 'AsyncFunctionDef', 'ClassDef', 'Lambda'].includes(value.kind)) {
      if (typeof fields.name === 'string') assign(scope, fields.name, { kind: 'other' })
      // Function defaults, decorators and bases are evaluated in the enclosing scope.
      for (const [key, child] of Object.entries(fields))
        if (!['body', 'args'].includes(key)) for (const item of children(child)) visit(item, scope)
      let lexicalParent: Scope | undefined = scope
      while (lexicalParent?.classScope) lexicalParent = lexicalParent.parent
      const local: Scope = {
        parent: lexicalParent,
        bindings: new Map(),
        writes: new Map(),
        uncertain: false,
        classScope: value.kind === 'ClassDef',
      }
      if (isNode(fields.args)) {
        scopes.set(fields.args, local)
        for (const [key, child] of Object.entries(fields.args.fields))
          for (const item of children(child))
            visit(item, ['defaults', 'kw_defaults'].includes(key) ? scope : local)
      }
      for (const item of children(fields.body ?? null)) visit(item, local)
      return
    }
    // Comprehension scopes are outside the visual contract. Do not infer specialized
    // names from inside one or allow its target names to pollute the outer scope.
    if (['ListComp', 'SetComp', 'DictComp', 'GeneratorExp'].includes(value.kind)) {
      function bindWalrus(child: PythonNode) {
        if (['FunctionDef', 'AsyncFunctionDef', 'ClassDef', 'Lambda'].includes(child.kind)) return
        if (
          child.kind === 'NamedExpr' &&
          isNode(child.fields.target) &&
          child.fields.target.kind === 'Name' &&
          typeof child.fields.target.fields.id === 'string'
        )
          assign(scope, child.fields.target.fields.id, { kind: 'other' })
        for (const nested of eachChild(child)) bindWalrus(nested)
      }
      bindWalrus(value)
      const local: Scope = {
        parent: scope,
        bindings: new Map(),
        writes: new Map(),
        uncertain: true,
      }
      for (const item of eachChild(value)) visit(item, local)
      return
    }
    for (const item of eachChild(value)) visit(item, scope)
  }
  visit(tree, { bindings: new Map(), writes: new Map(), uncertain: false })
  function lookup(scope: Scope | undefined, root: string): Binding | undefined {
    while (scope) {
      if (scope.uncertain) return { kind: 'other' }
      const found = scope.bindings.get(root)
      if (found) return found
      scope = scope.parent
    }
  }
  // Only a single direct constructor assignment is inferred. Aliased objects,
  // subclass factories, parameters and reassigned variables stay generic.
  for (const candidate of constructors) {
    if (candidate.scope.writes.get(candidate.target) !== 1) continue
    const func = candidate.call.fields.func
    if (!isNode(func)) continue
    let found: Binding | undefined
    let member: string | undefined
    if (func.kind === 'Name' && typeof func.fields.id === 'string') {
      found = lookup(scopes.get(func), func.fields.id)
      if (found?.kind === 'module') member = found.member
    } else if (
      func.kind === 'Attribute' &&
      isNode(func.fields.value) &&
      func.fields.value.kind === 'Name' &&
      typeof func.fields.value.fields.id === 'string' &&
      typeof func.fields.attr === 'string'
    ) {
      found = lookup(scopes.get(func), func.fields.value.fields.id)
      if (found?.kind === 'module' && !found.member) member = func.fields.attr
    }
    if (
      found?.kind === 'module' &&
      found.module === 'turtle' &&
      (member === 'Turtle' || member === 'Screen' || member === 'Shape')
    )
      candidate.scope.bindings.set(candidate.target, {
        kind: 'instance',
        module: 'turtle',
        instance: member,
      })
  }
  return (value: PythonNode, binding: PythonBlockCodec['binding']) => {
    if (!binding) return true
    if (hasAttributeWrites || hasDynamicBindings) return false
    let scope = scopes.get(value)
    while (scope) {
      if (scope.uncertain) return false
      const found = scope.bindings.get(binding.root)
      if (found)
        return (
          !!binding.module &&
          (binding.instance
            ? found.kind === 'instance' && found.instance === binding.instance
            : found.kind === 'module' && found.member === binding.member) &&
          found.kind !== 'other' &&
          found.module === binding.module &&
          officialModules.has(binding.module)
        )
      scope = scope.parent
    }
    return !binding.module
  }
}
