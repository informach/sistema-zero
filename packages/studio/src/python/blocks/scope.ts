import type { PythonNode, PythonValue } from '../language/types'
import type { PythonBlockBinding, PythonReceiverKind } from './contract'
import { isNode, nodes, pythonRootName as rootName } from './nodes'

type Binding =
  | { kind: 'module'; module: string; member?: string }
  | { kind: 'instance'; module?: string; builtin?: string; instance: string }
  | { kind: 'other' }
type Scope = {
  parent?: Scope
  bindings: Map<string, Binding>
  writes: Map<string, number>
  uncertain: boolean
  classScope?: boolean
  /** Function (or lambda) scope: the target of `nonlocal`. */
  functionScope?: boolean
  globals?: Set<string>
  nonlocals?: Set<string>
  /** Method scope: the first parameter (self) and the class body it belongs to. */
  selfName?: string
  ownerClass?: PythonNode
}
const children = (value: PythonValue): PythonNode[] =>
  Array.isArray(value) ? value.flatMap(children) : isNode(value) ? [value] : []
const eachChild = (value: PythonNode) => Object.values(value.fields).flatMap(children)

/** Reads that hand out an object's namespace or attribute machinery. Reading __name__ or
 * __class__ replaces nothing by itself; a write through them is still an attribute Store. */
const MUTATING_DUNDERS = new Set([
  '__dict__',
  '__setattr__',
  '__delattr__',
  '__getattribute__',
  '__builtins__',
  '__globals__',
  '__code__',
  '__closure__',
  '__defaults__',
  '__kwdefaults__',
  '__func__',
])

/** Turtle classes whose constructor always makes a new turtle. */
const FRESH_TURTLE_INSTANCES = new Set(['Turtle', 'RawTurtle', 'Pen', 'RawPen'])

/** A name an installed extension provides without import (Pygame Zero's screen, Actor…). */
export interface PythonProvidedBuiltin {
  provider: string
  /** Calling this name constructs an object of this class (Actor('alien') → Actor). */
  constructs?: string
}
/** What a name bound by `from module import *` holds, as the importing file's resolver sees it. */
export type PythonExportedBinding =
  | { kind: 'module'; module: string; member?: string }
  | { kind: 'other' }
/**
 * Modules of the child's own project, by absolute import name: the names `from module import *`
 * binds, or null when the module exists but what it exports cannot be proven.
 */
export type PythonProjectModules = ReadonlyMap<
  string,
  ReadonlyMap<string, PythonExportedBinding> | null
>
export interface PythonResolverOptions {
  builtins?: ReadonlyMap<string, PythonProvidedBuiltin>
  /** Public names of modules whose `from module import *` is understood. */
  starExports?: ReadonlyMap<string, readonly string[]>
  /**
   * Modules that are where an extension's provided names come from (pgzero.builtins): importing
   * a name from one gives the same provided name, not a module member.
   */
  builtinModules?: ReadonlyMap<string, string>
  /** Project modules win over `starExports`: a project file shadows the module of the same name. */
  projectModules?: PythonProjectModules
  /**
   * Names reached only along a module path (pygame.image.load): a store replaces them only
   * when it is made on a module, never on an object such as `self`.
   */
  moduleAttributes?: ReadonlySet<string>
}
export interface PythonBindingResolver {
  (value: PythonNode, binding: PythonBlockBinding | undefined): boolean
  /** True when this Name refers to the given imported module at its position. */
  isModule(nameNode: PythonNode, module: string): boolean
  /** Built-in collection kind proven for this Name (assigned only from that kind of value). */
  receiverKind(nameNode: PythonNode): PythonReceiverKind | undefined
  /** Parameter names of the program's own function this Name refers to (defined once). */
  functionParams(nameNode: PythonNode): readonly string[] | undefined
}

/** Built-ins that only read a list passed to them. */
const READ_ONLY_BUILTINS = new Set([
  'len',
  'list',
  'tuple',
  'sorted',
  'reversed',
  'enumerate',
  'min',
  'max',
  'sum',
  'any',
  'all',
  'print',
  'str',
])

/** `open(nome)` or `open(nome, 'r'|'w'|'a'...)` without 'b': a text file (read gives text). */
function textMode(call: PythonNode): boolean {
  const args = nodes(call.fields.args) ? call.fields.args : []
  const keywords = nodes(call.fields.keywords) ? call.fields.keywords : []
  let mode: PythonNode | undefined = args[1]
  for (const keyword of keywords)
    if (keyword.fields.arg === 'mode' && isNode(keyword.fields.value)) mode = keyword.fields.value
  if (!mode) return true
  return (
    mode.kind === 'Constant' &&
    typeof mode.fields.value === 'string' &&
    !mode.fields.value.includes('b')
  )
}

/** Functions of the random module that only read (or reorder) a list passed to them. */
const READ_ONLY_RANDOM = new Set(['choice', 'choices', 'sample', 'shuffle'])

const LITERAL_KINDS: Readonly<Record<string, 'List' | 'Tuple' | 'Dict' | 'Set'>> = {
  List: 'List',
  ListComp: 'List',
  Tuple: 'Tuple',
  Dict: 'Dict',
  DictComp: 'Dict',
  Set: 'Set',
  SetComp: 'Set',
}
const CONSTRUCTOR_KINDS: Readonly<Record<string, PythonReceiverKind>> = {
  open: 'file',
  list: 'List',
  tuple: 'Tuple',
  dict: 'Dict',
  set: 'Set',
}

/**
 * A method whose first parameter is the object (`self`): no decorator, or only the property
 * ones. `@staticmethod` has no object and `@classmethod` gets the class; any other decorator
 * may hand the function anything.
 */
function instanceMethod(value: PythonNode) {
  const decorators = nodes(value.fields.decorator_list) ? value.fields.decorator_list : []
  return decorators.every(
    (decorator) =>
      (decorator.kind === 'Name' && decorator.fields.id === 'property') ||
      (decorator.kind === 'Attribute' &&
        ['setter', 'getter', 'deleter'].includes(String(decorator.fields.attr))),
  )
}

/** Names a class body binds itself: its methods and class attributes. */
function classLevelNames(value: PythonNode) {
  const found = new Set<string>()
  const bind = (target: PythonValue | undefined) => {
    if (!isNode(target)) return
    if (target.kind === 'Name' && typeof target.fields.id === 'string') found.add(target.fields.id)
    else if (['Tuple', 'List'].includes(target.kind) && nodes(target.fields.elts))
      for (const item of target.fields.elts) bind(item)
    else if (target.kind === 'Starred') bind(target.fields.value)
  }
  for (const item of nodes(value.fields.body) ? value.fields.body : []) {
    if (['FunctionDef', 'AsyncFunctionDef', 'ClassDef'].includes(item.kind))
      bind({ kind: 'Name', fields: { id: item.fields.name ?? null } })
    else if (item.kind === 'Assign' && nodes(item.fields.targets))
      for (const target of item.fields.targets) bind(target)
    else if (item.kind === 'AnnAssign' || item.kind === 'AugAssign') bind(item.fields.target)
  }
  return found
}

/**
 * Conservative lexical resolution. Ambiguous or rebound names keep the generic call block.
 * Only presentation depends on it: every codec still encodes exactly the code it decoded.
 */
export function pythonBindingResolver(
  tree: PythonNode,
  officialModules: ReadonlySet<string> = new Set(),
  guardedAttributes: ReadonlySet<string> = new Set(),
  options: PythonResolverOptions = {},
): PythonBindingResolver {
  const builtins = options.builtins ?? new Map()
  const starExports = options.starExports ?? new Map()
  const builtinModules = options.builtinModules ?? new Map()
  const projectModules: PythonProjectModules = options.projectModules ?? new Map()
  const scopes = new WeakMap<PythonNode, Scope>()
  const classNodes = new WeakMap<Scope, PythonNode>()
  const methodScopes: Scope[] = []
  /** Constructor/literal assignments to a Name, to infer the class of its object. */
  /** `nome = valor`; `alone` is false in `a = b = valor`, where two names hold one object. */
  const typed: { scope: Scope; target: string; value: PythonNode; alone: boolean }[] = []
  const augmented = new Map<Scope, Map<string, number>>()
  /** `lista.append(valor)` and the loops over a list name, for the element class of a list. */
  const appends: { scope: Scope; list: string; value: PythonNode }[] = []
  const loops: { scope: Scope; target: string; list: PythonNode }[] = []
  /** `for t in [a, b]:` over a list written right there, of names only. */
  const literalLoops: { scope: Scope; target: string; items: PythonNode[] }[] = []
  /** Lists also changed by other means: their elements are not proven. */
  const otherwiseFilled: { scope: Scope; list: string }[] = []
  /**
   * Reads of a name where a list cannot escape: a method receiver (`lista.append`), a loop
   * (`for x in lista`), an index (`lista[0]`), `x in lista`, a test (`if not lista:`), or an
   * argument of a read-only built-in (`len(lista)`). Any other read (an alias, an argument of a function the child
   * wrote, a list stored inside another) lets the list be filled elsewhere.
   */
  const safeReads = new WeakSet<PythonNode>()
  /** Arguments of these built-ins, still unshadowed, never change the list. */
  const builtinReads: { scope: Scope; list: string; via: string }[] = []
  /** Attribute writes (stores and deletes), judged once every binding is known. */
  const attributeWrites: {
    scope: Scope
    /** The Name at the start of the target chain (`a` in `a.b.c = …`). */
    root: PythonNode | undefined
    /** The object written on, when it is a plain Name (`a` in `a.c = …`, not `a.b.c = …`). */
    receiver: PythonNode | undefined
    attr: string
    dunder: boolean
    /** `_name` (not a dunder): private machinery of the object's class. */
    private: boolean
    /** The attribute is an official name: replacing it is dangerous on any official object. */
    official: boolean
    /** The attribute names a module member: replacing it is dangerous only on a module. */
    moduleMember: boolean
  }[] = []
  /** Classes of the program: the names each body defines (methods and class attributes). */
  const classBodies = new Map<PythonNode, { scope: Scope; defines: Set<string> }>()
  const moduleAttributes = options.moduleAttributes ?? new Set<string>()
  /** Functions the program defines, for the names of what a call sends. */
  const functionDefs: { scope: Scope; name: string; params: readonly string[] }[] = []
  /** Names read as a value of their own (an alias, an argument), not only as `nome.algo`. */
  const bareReads = new Set<string>()
  let hasDynamicBindings = false
  // Private internals (turtle.Turtle._goto, random._inst) implement the official API too.
  const replacesOfficialName = (attr: string) => attr.startsWith('_') || guardedAttributes.has(attr)
  // getattr(obj, 'velocidade') only reads. A computed, private or setattr-like name may
  // return the machinery that replaces official behavior.
  const harmlessGetattr = (args: PythonValue | undefined) => {
    if (!nodes(args) || args.length < 2) return false
    const name = args[1]!
    if (name.kind !== 'Constant' || typeof name.fields.value !== 'string') return false
    return (
      !replacesOfficialName(name.fields.value) &&
      !MUTATING_DUNDERS.has(name.fields.value) &&
      !['setattr', 'delattr'].includes(name.fields.value)
    )
  }
  const moduleScope = (scope: Scope) => {
    while (scope.parent) scope = scope.parent
    return scope
  }
  /** Where a name assigned in this scope actually lives (global/nonlocal redirect it). */
  function owner(scope: Scope, key: string): Scope {
    if (scope.globals?.has(key)) return moduleScope(scope)
    if (scope.nonlocals?.has(key)) {
      let parent = scope.parent
      while (parent && !parent.functionScope) parent = parent.parent
      if (parent) return parent
    }
    return scope
  }
  function assign(scope: Scope, key: string, binding: Binding) {
    const target = owner(scope, key)
    target.writes.set(key, (target.writes.get(key) ?? 0) + 1)
    const previous = target.bindings.get(key)
    target.bindings.set(
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
  const readOnlyCallOf = new WeakMap<PythonNode, string>()
  function markSafeReads(value: PythonNode) {
    const fields = value.fields
    const mark = (item: PythonValue | undefined) => {
      if (isNode(item) && item.kind === 'Name') safeReads.add(item)
    }
    if (value.kind === 'Call' && isNode(fields.func)) {
      // A method call reads its receiver, except a dunder one (`estrelas.__init__([1])`), which
      // can refill or replace the object behind the evidence.
      if (fields.func.kind === 'Attribute') {
        const attr = String(fields.func.fields.attr)
        if (!(attr.startsWith('__') && attr.endsWith('__'))) mark(fields.func.fields.value)
      } else if (
        fields.func.kind === 'Name' &&
        typeof fields.func.fields.id === 'string' &&
        READ_ONLY_BUILTINS.has(fields.func.fields.id) &&
        nodes(fields.args)
      )
        for (const arg of fields.args)
          if (arg.kind === 'Name') readOnlyCallOf.set(arg, fields.func.fields.id)
      // random.choice(lista) draws one of its items; shuffle only reorders them.
      if (
        fields.func.kind === 'Attribute' &&
        isNode(fields.func.fields.value) &&
        fields.func.fields.value.kind === 'Name' &&
        fields.func.fields.value.fields.id === 'random' &&
        READ_ONLY_RANDOM.has(String(fields.func.fields.attr)) &&
        nodes(fields.args)
      )
        for (const arg of fields.args) if (arg.kind === 'Name') readOnlyCallOf.set(arg, 'random')
    }
    if (value.kind === 'For' || value.kind === 'AsyncFor') mark(fields.iter)
    if (value.kind === 'comprehension') mark(fields.iter)
    if (value.kind === 'Subscript') mark(fields.value)
    // `[nave] + ajudantes` builds a new list: the old one is only read.
    if (value.kind === 'BinOp' && isNode(fields.op) && fields.op.kind === 'Add') {
      mark(fields.left)
      mark(fields.right)
    }
    // Asking whether it is empty (`if not estrelas and vivo:`) only reads it: a condition is
    // checked, never kept. (`x = lista or []` keeps it, so only conditions count.)
    if (['If', 'While', 'IfExp', 'Assert'].includes(value.kind)) markCondition(fields.test)
    const { ops, comparators } = fields
    if (value.kind === 'Compare' && nodes(ops) && nodes(comparators))
      ops.forEach((op, index) => {
        if (op.kind === 'In' || op.kind === 'NotIn') mark(comparators[index])
      })
  }
  function markCondition(test: PythonValue | undefined) {
    if (!isNode(test)) return
    if (test.kind === 'Name') safeReads.add(test)
    else if (test.kind === 'BoolOp' && nodes(test.fields.values))
      for (const item of test.fields.values) markCondition(item)
    else if (test.kind === 'UnaryOp' && isNode(test.fields.op) && test.fields.op.kind === 'Not')
      markCondition(test.fields.operand)
  }
  function visit(value: PythonNode, scope: Scope) {
    scopes.set(value, scope)
    const fields = value.fields
    markSafeReads(value)
    // `with open(...) as arquivo` binds the file like `arquivo = open(...)` does.
    if (
      value.kind === 'withitem' &&
      isNode(fields.optional_vars) &&
      fields.optional_vars.kind === 'Name' &&
      typeof fields.optional_vars.fields.id === 'string' &&
      isNode(fields.context_expr)
    )
      typed.push({
        scope: owner(scope, fields.optional_vars.fields.id),
        target: fields.optional_vars.fields.id,
        value: fields.context_expr,
        alone: true,
      })
    if (
      value.kind === 'Name' &&
      typeof fields.id === 'string' &&
      isNode(fields.ctx) &&
      fields.ctx.kind === 'Load' &&
      !safeReads.has(value)
    ) {
      const via = readOnlyCallOf.get(value)
      if (via) builtinReads.push({ scope, list: fields.id, via })
      else otherwiseFilled.push({ scope, list: fields.id })
    }
    if (
      value.kind === 'AugAssign' &&
      isNode(fields.target) &&
      fields.target.kind === 'Name' &&
      typeof fields.target.fields.id === 'string'
    )
      otherwiseFilled.push({ scope, list: fields.target.fields.id })
    if (
      value.kind === 'Assign' &&
      nodes(fields.targets) &&
      isNode(fields.value) &&
      fields.targets.every((target) => target.kind === 'Name')
    )
      for (const target of fields.targets)
        typed.push({
          scope: owner(scope, target.fields.id as string),
          target: target.fields.id as string,
          value: fields.value,
          alone: fields.targets.length === 1,
        })
    if (
      value.kind === 'AugAssign' &&
      isNode(fields.target) &&
      fields.target.kind === 'Name' &&
      typeof fields.target.fields.id === 'string'
    ) {
      const target = owner(scope, fields.target.fields.id)
      let counts = augmented.get(target)
      if (!counts) {
        counts = new Map()
        augmented.set(target, counts)
      }
      counts.set(fields.target.fields.id, (counts.get(fields.target.fields.id) ?? 0) + 1)
    }
    if (
      value.kind === 'Call' &&
      isNode(fields.func) &&
      fields.func.kind === 'Attribute' &&
      isNode(fields.func.fields.value) &&
      fields.func.fields.value.kind === 'Name' &&
      typeof fields.func.fields.value.fields.id === 'string' &&
      nodes(fields.args)
    ) {
      const list = fields.func.fields.value.fields.id
      if (fields.func.fields.attr === 'append' && fields.args.length === 1)
        appends.push({ scope, list, value: fields.args[0]! })
      else if (
        ['insert', 'extend', '__setitem__', '__iadd__'].includes(String(fields.func.fields.attr))
      )
        otherwiseFilled.push({ scope, list })
    }
    if (
      value.kind === 'Subscript' &&
      isNode(fields.ctx) &&
      fields.ctx.kind === 'Store' &&
      isNode(fields.value) &&
      fields.value.kind === 'Name' &&
      typeof fields.value.fields.id === 'string'
    )
      otherwiseFilled.push({ scope, list: fields.value.fields.id })
    if (
      value.kind === 'For' &&
      isNode(fields.target) &&
      fields.target.kind === 'Name' &&
      typeof fields.target.fields.id === 'string' &&
      isNode(fields.iter) &&
      fields.iter.kind === 'Name'
    )
      loops.push({ scope, target: fields.target.fields.id, list: fields.iter })
    if (
      value.kind === 'For' &&
      isNode(fields.target) &&
      fields.target.kind === 'Name' &&
      typeof fields.target.fields.id === 'string' &&
      isNode(fields.iter) &&
      ['List', 'Tuple'].includes(fields.iter.kind) &&
      nodes(fields.iter.fields.elts) &&
      fields.iter.fields.elts.length > 0 &&
      fields.iter.fields.elts.every((item) => item.kind === 'Name')
    )
      literalLoops.push({ scope, target: fields.target.fields.id, items: fields.iter.fields.elts })
    if (value.kind === 'Attribute' && isNode(fields.ctx) && typeof fields.attr === 'string') {
      // Every store is kept: whether it is harmless depends on what its root turns out to be
      // (any name of the builtins or __main__ module replaces things whatever the attribute).
      if (['Store', 'Del'].includes(fields.ctx.kind)) {
        const dunder = fields.attr.startsWith('__') && fields.attr.endsWith('__')
        attributeWrites.push({
          scope,
          root: rootName(fields.value),
          receiver: isNode(fields.value) && fields.value.kind === 'Name' ? fields.value : undefined,
          attr: fields.attr,
          dunder,
          private: !dunder && fields.attr.startsWith('_'),
          official: replacesOfficialName(fields.attr),
          moduleMember: moduleAttributes.has(fields.attr),
        })
      }
      // object.__setattr__ and __dict__ reach the same mutation without an attribute Store.
      else if (MUTATING_DUNDERS.has(fields.attr)) hasDynamicBindings = true
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
    if (value.kind === 'Global' || value.kind === 'Nonlocal') {
      const declared = Array.isArray(fields.names)
        ? fields.names.filter((item): item is string => typeof item === 'string')
        : []
      if (value.kind === 'Global') scope.globals ??= new Set()
      else scope.nonlocals ??= new Set()
      const set = (value.kind === 'Global' ? scope.globals : scope.nonlocals)!
      for (const item of declared) set.add(item)
      // A class body or the module itself has no function frame to redirect from.
      if (!scope.parent && value.kind === 'Nonlocal') scope.uncertain = true
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
    if (value.kind === 'ImportFrom' && nodes(fields.names)) {
      const absolute =
        typeof fields.module === 'string' &&
        typeof fields.level === 'object' &&
        fields.level !== null &&
        'literal' in fields.level &&
        fields.level.literal === 'int' &&
        fields.level.value === '0'
      // A project module of that name wins over the extension's (see projectModules).
      const provider =
        absolute && !projectModules.has(fields.module as string)
          ? builtinModules.get(fields.module as string)
          : undefined
      for (const alias of fields.names) {
        if (provider) {
          // `from pgzero.builtins import Actor` (or *) names exactly what the extension
          // already provides: the name stays the provided one. A renamed or unknown one does not.
          const imported = alias.fields.name
          const renamed =
            typeof alias.fields.asname === 'string' && alias.fields.asname !== imported
          if (imported === '*') continue
          if (
            typeof imported === 'string' &&
            !renamed &&
            builtins.get(imported)?.provider === provider
          )
            continue
          if (typeof imported === 'string')
            assign(
              scope,
              typeof alias.fields.asname === 'string' ? alias.fields.asname : imported,
              { kind: 'other' },
            )
          continue
        }
        if (alias.fields.name === '*') {
          const module = absolute ? (fields.module as string) : undefined
          if (module !== undefined && projectModules.has(module)) {
            const exported = projectModules.get(module)
            if (!exported) scope.uncertain = true
            else for (const [member, binding] of exported) assign(scope, member, { ...binding })
          } else {
            const exports = module !== undefined ? starExports.get(module) : undefined
            if (!exports) scope.uncertain = true
            else
              for (const member of exports)
                assign(scope, member, { kind: 'module', module: module as string, member })
          }
        } else if (typeof alias.fields.name === 'string')
          assign(
            scope,
            typeof alias.fields.asname === 'string' ? alias.fields.asname : alias.fields.name,
            absolute
              ? { kind: 'module', module: fields.module as string, member: alias.fields.name }
              : { kind: 'other' },
          )
      }
    }
    if (
      value.kind === 'Call' &&
      isNode(fields.func) &&
      fields.func.kind === 'Name' &&
      (['exec', 'eval', 'globals', 'locals', 'vars', 'setattr', 'delattr', '__import__'].includes(
        String(fields.func.fields.id),
      ) ||
        (fields.func.fields.id === 'getattr' && !harmlessGetattr(fields.args)))
    ) {
      scope.uncertain = true
      hasDynamicBindings = true
    }
    if (['FunctionDef', 'AsyncFunctionDef', 'ClassDef', 'Lambda'].includes(value.kind)) {
      if (typeof fields.name === 'string') assign(scope, fields.name, { kind: 'other' })
      if (
        (value.kind === 'FunctionDef' || value.kind === 'AsyncFunctionDef') &&
        typeof fields.name === 'string' &&
        isNode(fields.args)
      ) {
        const params = [fields.args.fields.posonlyargs, fields.args.fields.args].flatMap((list) =>
          nodes(list) ? list.map((arg) => String(arg.fields.arg)) : [],
        )
        functionDefs.push({ scope, name: fields.name, params })
      }
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
        functionScope: value.kind !== 'ClassDef',
      }
      const firstArg =
        isNode(fields.args) && nodes(fields.args.fields.args)
          ? fields.args.fields.args[0]
          : undefined
      if (
        (value.kind === 'FunctionDef' || value.kind === 'AsyncFunctionDef') &&
        scope.classScope &&
        classNodes.has(scope) &&
        instanceMethod(value) &&
        typeof firstArg?.fields.arg === 'string'
      ) {
        local.selfName = firstArg.fields.arg
        local.ownerClass = classNodes.get(scope)
        methodScopes.push(local)
      }
      if (value.kind === 'ClassDef') {
        classNodes.set(local, value)
        classBodies.set(value, { scope, defines: classLevelNames(value) })
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
    // Comprehensions have their own scope for loop targets; the first iterable is evaluated
    // outside it. Walrus targets bind in the enclosing function, as in Python.
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
      let lexicalParent: Scope | undefined = scope
      while (lexicalParent?.classScope) lexicalParent = lexicalParent.parent
      const local: Scope = {
        parent: lexicalParent,
        bindings: new Map(),
        writes: new Map(),
        uncertain: false,
        functionScope: true,
      }
      const generators = nodes(fields.generators) ? fields.generators : []
      generators.forEach((generator, index) => {
        scopes.set(generator, local)
        // Looping over a list inside a comprehension only reads it.
        markSafeReads(generator)
        const iter = generator.fields.iter
        if (isNode(iter)) visit(iter, index === 0 ? scope : local)
        if (isNode(generator.fields.target)) visit(generator.fields.target, local)
        for (const condition of children(generator.fields.ifs ?? null)) visit(condition, local)
      })
      for (const [key, child] of Object.entries(fields))
        if (key !== 'generators') for (const item of children(child)) visit(item, local)
      return
    }
    for (const item of eachChild(value)) visit(item, scope)
  }
  const root: Scope = { bindings: new Map(), writes: new Map(), uncertain: false }
  visit(tree, root)

  function lookup(scope: Scope | undefined, key: string): Binding | undefined {
    while (scope) {
      if (scope.uncertain) return { kind: 'other' }
      if (scope.globals?.has(key)) scope = moduleScope(scope)
      const found = scope.bindings.get(key)
      if (found) return found
      scope = scope.parent
    }
  }
  /** Binding of a Name at its position, including installed extension built-ins. */
  function bindingAt(nameNode: PythonNode): Binding | undefined {
    const key = nameNode.fields.id
    if (typeof key !== 'string') return { kind: 'other' }
    const found = lookup(scopes.get(nameNode), key)
    if (found) return found
    const builtin = builtins.get(key)
    if (builtin && officialModules.has(builtin.provider))
      return { kind: 'module', module: builtin.provider, member: key }
  }
  /** The scope that holds this name for a reader at `scope` (global/nonlocal followed). */
  function holder(scope: Scope | undefined, key: string): Scope | undefined {
    while (scope) {
      if (scope.uncertain) return undefined
      if (scope.globals?.has(key)) scope = moduleScope(scope)
      if (scope.bindings.has(key)) return scope
      scope = scope.parent
    }
  }
  // Infer the class of objects assigned only from one official constructor (or one built-in
  // collection kind). Rebinding from anything else keeps the generic blocks.
  const evidence = new Map<Scope, Map<string, { binding: Binding; count: number } | null>>()
  // Names given `= Something()` where Something is not an official constructor (t =
  // OutraClasse()): proof that they hold another kind of object. Taking one from a list or a
  // draw (a = carros[0], alvo = random.choice(aliens)) proves nothing either way.
  const otherObjects = new Map<Scope, Set<string>>()
  for (const candidate of typed) {
    const inferred = inferValue(candidate.value)
    const func = candidate.value.fields.func
    if (!inferred && candidate.value.kind === 'Call' && isNode(func) && func.kind === 'Name') {
      let names = otherObjects.get(candidate.scope)
      if (!names) {
        names = new Set()
        otherObjects.set(candidate.scope, names)
      }
      names.add(candidate.target)
    }
    let byName = evidence.get(candidate.scope)
    if (!byName) {
      byName = new Map()
      evidence.set(candidate.scope, byName)
    }
    const previous = byName.get(candidate.target)
    if (previous === null) continue
    if (
      !inferred ||
      (previous &&
        (previous.binding.kind !== 'instance' ||
          inferred.kind !== 'instance' ||
          previous.binding.instance !== inferred.instance ||
          previous.binding.module !== inferred.module ||
          previous.binding.builtin !== inferred.builtin))
    ) {
      byName.set(candidate.target, null)
      continue
    }
    byName.set(candidate.target, { binding: inferred, count: (previous?.count ?? 0) + 1 })
  }
  function inferValue(value: PythonNode): Binding | undefined {
    let inferred: Binding | undefined
    const literal = LITERAL_KINDS[value.kind]
    if (literal) inferred = { kind: 'instance', module: 'builtins', instance: literal }
    else if (value.kind === 'Constant' && typeof value.fields.value === 'string')
      inferred = { kind: 'instance', module: 'builtins', instance: 'text' }
    else if (value.kind === 'JoinedStr')
      inferred = { kind: 'instance', module: 'builtins', instance: 'text' }
    else if (value.kind === 'Call' && isNode(value.fields.func)) {
      const func = value.fields.func
      if (func.kind === 'Name' && typeof func.fields.id === 'string') {
        const found = bindingAt(func)
        const builtin = builtins.get(func.fields.id)
        if (
          !found &&
          CONSTRUCTOR_KINDS[func.fields.id] &&
          (func.fields.id !== 'open' || textMode(value))
        )
          inferred = {
            kind: 'instance',
            module: 'builtins',
            instance: CONSTRUCTOR_KINDS[func.fields.id]!,
          }
        else if (
          found?.kind === 'module' &&
          found.member &&
          builtin?.constructs &&
          found.module === builtin.provider
        )
          inferred = { kind: 'instance', builtin: builtin.provider, instance: builtin.constructs }
        else if (found?.kind === 'module' && found.member)
          inferred = { kind: 'instance', module: found.module, instance: found.member }
      } else if (func.kind === 'Attribute') {
        // module.Class() or module.sub.Class() (pygame.sprite.Sprite()): the path names it.
        const path: string[] = []
        let current: PythonNode | undefined = func
        while (current?.kind === 'Attribute' && typeof current.fields.attr === 'string') {
          path.unshift(current.fields.attr)
          current = isNode(current.fields.value) ? current.fields.value : undefined
        }
        const found = current?.kind === 'Name' ? bindingAt(current) : undefined
        if (found?.kind === 'module' && !found.member)
          inferred = { kind: 'instance', module: found.module, instance: path.join('.') }
      }
    }
    return inferred
  }
  for (const [scope, byName] of evidence)
    for (const [key, found] of byName) {
      if (!found) continue
      const augmentedWrites = augmented.get(scope)?.get(key) ?? 0
      // Augmented assignment keeps a collection's kind (lista += [x]); objects never use it.
      const builtinCollection =
        found.binding.kind === 'instance' && found.binding.module === 'builtins'
      if (scope.writes.get(key) === found.count + (builtinCollection ? augmentedWrites : 0))
        scope.bindings.set(key, found.binding)
    }
  // A list made empty and filled only with `lista.append(Actor(...))` holds actors: a loop over
  // it (`for estrela in estrelas`) keeps the actor blocks for its target.
  const elementOf = new Map<Scope, Map<string, Binding | null>>()
  // Names also assigned from something other than a list literal, per scope (one pass, not
  // one search per fill).
  const notOnlyLiterals = new Map<Scope, Set<string>>()
  for (const candidate of typed)
    if (candidate.value.kind !== 'List' || !nodes(candidate.value.fields.elts)) {
      let names = notOnlyLiterals.get(candidate.scope)
      if (!names) {
        names = new Set()
        notOnlyLiterals.set(candidate.scope, names)
      }
      names.add(candidate.target)
    }
  const listScope = (scope: Scope, key: string) => {
    const found = holder(scope, key)
    const binding = found?.bindings.get(key)
    if (
      !found ||
      binding?.kind !== 'instance' ||
      binding.module !== 'builtins' ||
      binding.instance !== 'List' ||
      notOnlyLiterals.get(found)?.has(key)
    )
      return undefined
    return found
  }
  // Items written in the list itself ([Actor('a'), Actor('b')]) count like appended ones.
  const filled = [...appends]
  for (const candidate of typed)
    if (candidate.value.kind === 'List' && nodes(candidate.value.fields.elts))
      for (const item of candidate.value.fields.elts)
        filled.push({ scope: candidate.scope, list: candidate.target, value: item })
  for (const { scope, list, value } of filled) {
    const found = listScope(scope, list)
    if (!found) continue
    let byName = elementOf.get(found)
    if (!byName) {
      byName = new Map()
      elementOf.set(found, byName)
    }
    const element =
      value.kind === 'Name' && typeof value.fields.id === 'string'
        ? (() => {
            const binding = lookup(scopes.get(value), value.fields.id)
            return binding?.kind === 'instance' ? binding : undefined
          })()
        : inferValue(value)
    const previous = byName.get(list)
    if (previous === null) continue
    byName.set(
      list,
      element?.kind === 'instance' &&
        (!previous ||
          (previous.kind === 'instance' &&
            previous.instance === element.instance &&
            previous.module === element.module &&
            previous.builtin === element.builtin))
        ? element
        : null,
    )
  }
  for (const { scope, list, via } of builtinReads) {
    const found = lookup(scope, via)
    // A built-in must still be unbound; `random` must be the random module itself.
    const official =
      via === 'random'
        ? found?.kind === 'module' && found.module === 'random' && !found.member
        : !found
    if (!official) otherwiseFilled.push({ scope, list })
  }
  for (const { scope, list } of otherwiseFilled) {
    const found = listScope(scope, list)
    if (found) elementOf.get(found)?.set(list, null)
  }
  for (const loop of loops) {
    const key = loop.list.fields.id as string
    const found = listScope(scopes.get(loop.list) ?? loop.scope, key)
    const element = found && elementOf.get(found)?.get(key)
    const target = owner(loop.scope, loop.target)
    if (element && (target.writes.get(loop.target) ?? 0) === 1)
      target.bindings.set(loop.target, element)
  }
  // Every name in the list holds the same kind of official object: so does the loop variable.
  for (const loop of literalLoops) {
    const found = loop.items.map((item) => bindingAt(item))
    const first = found[0]
    if (
      first?.kind !== 'instance' ||
      found.some(
        (binding) =>
          binding?.kind !== 'instance' ||
          binding.instance !== first.instance ||
          binding.module !== first.module ||
          binding.builtin !== first.builtin,
      )
    )
      continue
    const target = owner(loop.scope, loop.target)
    if ((target.writes.get(loop.target) ?? 0) === 1) target.bindings.set(loop.target, first)
  }
  // `self` in a class that inherits an official class (Actor, turtle.Turtle) is one of its
  // objects: self.draw(), self.forward(10) keep their blocks.
  for (const method of methodScopes) {
    const selfName = method.selfName!
    if ((method.writes.get(selfName) ?? 0) !== 1) continue
    const bases = nodes(method.ownerClass!.fields.bases) ? method.ownerClass!.fields.bases : []
    for (const base of bases) {
      let inherited: Binding | undefined
      if (base.kind === 'Name') {
        const found = bindingAt(base)
        const provided =
          typeof base.fields.id === 'string' ? builtins.get(base.fields.id) : undefined
        if (
          found?.kind === 'module' &&
          found.member &&
          provided?.constructs &&
          found.module === provided.provider
        )
          inherited = {
            kind: 'instance',
            builtin: provided.provider,
            instance: provided.constructs,
          }
        else if (found?.kind === 'module' && found.member)
          inherited = { kind: 'instance', module: found.module, instance: found.member }
      } else if (
        base.kind === 'Attribute' &&
        isNode(base.fields.value) &&
        base.fields.value.kind === 'Name' &&
        typeof base.fields.attr === 'string'
      ) {
        const found = bindingAt(base.fields.value)
        if (found?.kind === 'module' && !found.member)
          inherited = { kind: 'instance', module: found.module, instance: base.fields.attr }
      }
      if (inherited) {
        method.bindings.set(selfName, inherited)
        break
      }
    }
  }
  /*
   * Attribute writes: one rule for every extension (see "Pygame-ce no Estúdio" in CLAUDE.md).
   * - A store on the interpreter's namespaces (builtins, __main__, sys) replaces built-ins.
   * - A DIRECT store `self.<name> = …` (target `Attribute(Name self)`, not a chain) in an
   *   instance method (no @staticmethod/@classmethod), with `self` never reassigned, is the
   *   object's state and never gives up the file. The class then "defines" that name, so
   *   `self.<name>(…)` on its objects no longer shows the official method block. Dunders stay
   *   guarded, and so do private `_names` when the class may inherit an official class (they
   *   are that class's machinery).
   * - A store on an object PROVEN to come from an official constructor
   *   (`jogador = pygame.sprite.Sprite()`) is that object's state: `jogador.image = …` is
   *   harmless, and replacing an official method (`jogador.kill = f`) only drops the official
   *   blocks on that receiver, while nothing else can hold the object (no alias, no argument).
   * - A store on an object of the program's own class (`b = Bola()`, no possibly official
   *   ancestor) changes only that object: it has no official method to replace.
   * - Any other store of an official name that may reach a module (module root, module alias,
   *   unknown origin, an aliased official object, `self.x.y` where `self.x` may hold a module)
   *   gives up the official blocks of the whole file.
   */
  type ClassFamily = { classes: Set<PythonNode>; mayBeOfficial: boolean }
  const classByScope = new Map<Scope, Map<string, PythonNode>>()
  for (const [klass, body] of classBodies) {
    let byName = classByScope.get(body.scope)
    if (!byName) {
      byName = new Map()
      classByScope.set(body.scope, byName)
    }
    if (typeof klass.fields.name === 'string') byName.set(klass.fields.name, klass)
  }
  /** The class statement a base expression names, when that name is bound only to it. */
  function childClass(base: PythonNode): PythonNode | undefined {
    const key = base.kind === 'Name' ? base.fields.id : undefined
    if (typeof key !== 'string') return
    const found = holder(scopes.get(base), key)
    if (!found || (found.writes.get(key) ?? 0) !== 1) return
    return classByScope.get(found)?.get(key)
  }
  const ancestry = new Map<PythonNode, ClassFamily>()
  /**
   * The program's classes this class inherits (itself included), and whether another base (an
   * official class, or one of unknown origin) may make its objects official ones.
   */
  function ancestorsOf(klass: PythonNode): ClassFamily {
    const known = ancestry.get(klass)
    if (known) return known
    const family: ClassFamily = { classes: new Set([klass]), mayBeOfficial: false }
    ancestry.set(klass, family)
    const pending = [klass]
    while (pending.length) {
      const current = pending.pop()!
      for (const base of nodes(current.fields.bases) ? current.fields.bases : []) {
        const parent = childClass(base)
        if (parent) {
          if (!family.classes.has(parent)) {
            family.classes.add(parent)
            pending.push(parent)
          }
        } else if (!(base.kind === 'Name' && base.fields.id === 'object' && !bindingAt(base)))
          family.mayBeOfficial = true
      }
      // A metaclass (or any class keyword) may build anything.
      if (nodes(current.fields.keywords) && current.fields.keywords.length)
        family.mayBeOfficial = true
      // __new__ can return a shared official object instead of a fresh instance,
      // including when inherited from another class written by the program.
      if (
        (nodes(current.fields.body) ? current.fields.body : []).some(
          (statement) =>
            (statement.kind === 'FunctionDef' || statement.kind === 'AsyncFunctionDef') &&
            statement.fields.name === '__new__',
        )
      )
        family.mayBeOfficial = true
    }
    return family
  }
  /** Public names each class's methods store directly on `self`. */
  const selfWrites = new Map<PythonNode, Set<string>>()
  /** `self` may be an object of the class or of a subclass: the whole family counts. */
  function familyDefines(klass: PythonNode, member: string) {
    for (const [other, body] of classBodies) {
      const related =
        other === klass ||
        ancestorsOf(klass).classes.has(other) ||
        ancestorsOf(other).classes.has(klass)
      if (related && (body.defines.has(member) || selfWrites.get(other)?.has(member))) return true
    }
    return false
  }
  /**
   * The class of `self` when this name, read at `scope`, is the never-reassigned first
   * parameter of an instance method.
   */
  function selfClass(scope: Scope | undefined, key: string): PythonNode | undefined {
    while (scope) {
      if (scope.uncertain) return
      if (scope.globals?.has(key)) scope = moduleScope(scope)
      if (scope.bindings.has(key))
        return scope.selfName === key && (scope.writes.get(key) ?? 0) === 1
          ? scope.ownerClass
          : undefined
      scope = scope.parent
    }
  }
  function collectBareReads(value: PythonNode, receiver: boolean) {
    if (
      value.kind === 'Name' &&
      !receiver &&
      typeof value.fields.id === 'string' &&
      isNode(value.fields.ctx) &&
      value.fields.ctx.kind === 'Load'
    )
      bareReads.add(value.fields.id)
    for (const [key, child] of Object.entries(value.fields))
      for (const item of children(child))
        collectBareReads(item, value.kind === 'Attribute' && key === 'value')
  }
  /**
   * A DIRECT store `nome.attr = …` on an object the program made itself (not `self`): it changes
   * only that object, so the rest of the program keeps its official blocks.
   * - A proven official object (`botao = Actor(…)`, `jogador = pygame.sprite.Sprite()`): a data
   *   attribute (`jogador.image = …`) is its state. Replacing an official method or name
   *   (`botao.text = …`, `jogador.kill = f`) drops the official blocks only on that receiver,
   *   and only while nothing else can hold the object (no alias, no argument, only
   *   constructors bound to the name). Private `_names` are its class's machinery.
   * - An object of the program's own class (`b = Bola()`, with no possibly official ancestor)
   *   has no official methods to replace.
   * Anything else (an alias, an object a function of the program returns) is judged by the
   * whole-file rule.
   */
  function storesOnOwnObject(write: (typeof attributeWrites)[number], key: string) {
    const owner = holder(write.scope, key)
    const found = owner?.bindings.get(key)
    if (!owner || !found) return false
    const writes = owner.writes.get(key) ?? 0
    // A loop variable holds objects that other names hold too: only a constructor's own name.
    const soleHolder = () => {
      const made = typed.filter((entry) => entry.scope === owner && entry.target === key)
      return !bareReads.has(key) && made.every((entry) => entry.alone) && made.length === writes
    }
    if (found.kind === 'instance') {
      if (officialObject(found)) {
        if (write.private) return false
        // Screen() is Turtle's shared screen; changing it also changes the
        // module-level operations. It cannot use the fresh-object exception.
        if (found.module === 'turtle' && !FRESH_TURTLE_INSTANCES.has(found.instance)) return false
        if (!guardedAttributes.has(write.attr)) return true
        if (!soleHolder()) return false
        let names = replacedOn.get(owner)
        if (!names) {
          names = new Set()
          replacedOn.set(owner, names)
        }
        names.add(key)
        return true
      }
      // Another proven kind (a built-in collection): only that name loses its proof.
      if (!write.official || !soleHolder()) return false
      owner.bindings.set(key, { kind: 'other' })
      let names = otherObjects.get(owner)
      if (!names) {
        names = new Set()
        otherObjects.set(owner, names)
      }
      names.add(key)
      return true
    }
    if (found.kind !== 'other' || writes !== 1) return false
    return typed.some((entry) => {
      const func = entry.value.fields.func
      if (entry.scope !== owner || entry.target !== key || entry.value.kind !== 'Call') return false
      const klass = isNode(func) ? childClass(func) : undefined
      return !!klass && !ancestorsOf(klass).mayBeOfficial
    })
  }
  /** The interpreter's own namespaces: a store on them replaces a built-in or a handler. */
  function replacesNamespace(write: (typeof attributeWrites)[number]) {
    const key = write.root?.fields.id
    if (typeof key !== 'string') return false
    if (key === '__builtins__') return true
    const found = write.root && bindingAt(write.root)
    if (!found && (key === 'builtins' || key === '__main__')) return true
    // sys.modules[...] reaches every module, __main__ included.
    return (
      found?.kind === 'module' &&
      !found.member &&
      ['builtins', '__main__', 'sys'].includes(String(found.module))
    )
  }
  // A file object accepts new attributes: after `f.write = print`, f is no longer a plain file.
  for (const write of attributeWrites) {
    if (!write.root) continue
    const found = bindingAt(write.root)
    if (found?.kind === 'instance' && found.module === 'builtins' && found.instance === 'file') {
      const owner = holder(scopes.get(write.root), String(write.root.fields.id))
      owner?.bindings.set(String(write.root.fields.id), { kind: 'other' })
    }
  }
  const officialObject = (found: Binding | undefined) =>
    found?.kind === 'instance' &&
    (found.builtin
      ? officialModules.has(found.builtin)
      : !!found.module && found.module !== 'builtins' && officialModules.has(found.module))
  /** Proven official objects whose official method was replaced (`grupo.update = f`). */
  const replacedOn = new Map<Scope, Set<string>>()
  let hasAttributeWrites = false
  collectBareReads(tree, false)
  for (const write of attributeWrites) {
    if (replacesNamespace(write)) {
      hasAttributeWrites = true
      break
    }
    const key = write.receiver?.fields.id
    if (typeof key === 'string' && !write.dunder) {
      const klass = selfClass(write.scope, key)
      if (klass && (!write.private || !ancestorsOf(klass).mayBeOfficial)) {
        let names = selfWrites.get(klass)
        if (!names) {
          names = new Set()
          selfWrites.set(klass, names)
        }
        names.add(write.attr)
        continue
      }
      if (!klass && storesOnOwnObject(write, key)) continue
    }
    if (write.official || write.moduleMember) {
      hasAttributeWrites = true
      break
    }
  }
  /** `receiver.method(…)`: the method name, when the receiver is this Name. */
  function calledMethod(value: PythonNode, root: string) {
    const target = value.kind === 'Expr' && isNode(value.fields.value) ? value.fields.value : value
    const func = target.kind === 'Call' ? target.fields.func : undefined
    return isNode(func) &&
      func.kind === 'Attribute' &&
      isNode(func.fields.value) &&
      func.fields.value.kind === 'Name' &&
      func.fields.value.fields.id === root &&
      typeof func.fields.attr === 'string'
      ? func.fields.attr
      : undefined
  }
  /**
   * An official method block on this receiver shows something else: an object whose official
   * method was replaced, or `self` of a class whose family defines the method (or that cannot
   * be an official object at all).
   */
  function ownMethod(value: PythonNode, root: string, scope: Scope | undefined) {
    const owner = holder(scope, root)
    if (owner && replacedOn.get(owner)?.has(root)) return true
    const member = calledMethod(value, root)
    const klass = member ? selfClass(scope, root) : undefined
    return !!klass && (!ancestorsOf(klass).mayBeOfficial || familyDefines(klass, member!))
  }

  const resolver = ((value: PythonNode, binding: PythonBlockBinding | undefined) => {
    if (!binding) return true
    if (hasAttributeWrites || hasDynamicBindings) return false
    let scope = scopes.get(value)
    if (binding.handler) {
      // A module-level function the extension calls by name, defined exactly once.
      return (
        officialModules.has(binding.handler) &&
        scope === root &&
        !root.uncertain &&
        root.writes.get(binding.root) === 1
      )
    }
    if (!binding.root) return !binding.builtin || officialModules.has(binding.builtin)
    if (ownMethod(value, binding.root, scope)) return false
    if (binding.anyReceiver) {
      if (binding.builtin && !officialModules.has(binding.builtin)) return false
      while (scope) {
        if (scope.uncertain) return false
        if (scope.globals?.has(binding.root)) scope = moduleScope(scope)
        const found = scope.bindings.get(binding.root)
        if (found) {
          // A proven object counts only if it comes from the same provider (turtle.Turtle()
          // for turtle's forward); a module only if it is that module under another name.
          const provider = binding.builtin ?? binding.module
          if (found.kind === 'instance')
            return !provider || (found.builtin ?? found.module) === provider
          if (found.kind === 'module') return !found.member && found.module === provider
          // A parameter, a loop target or an item taken from a list may hold one; a variable
          // made by another class's constructor does not.
          return !otherObjects.get(scope)?.has(binding.root)
        }
        scope = scope.parent
      }
      return true
    }
    while (scope) {
      if (scope.uncertain) return false
      if (scope.globals?.has(binding.root)) scope = moduleScope(scope)
      const found = scope.bindings.get(binding.root)
      if (found) {
        if (found.kind === 'other') return false
        if (binding.moduleOrInstance && found.kind === 'module' && !found.member)
          return found.module === binding.module && officialModules.has(found.module)
        if (binding.instance)
          return (
            found.kind === 'instance' &&
            found.instance === binding.instance &&
            (binding.builtin
              ? found.builtin === binding.builtin && officialModules.has(binding.builtin)
              : !!binding.module &&
                found.module === binding.module &&
                officialModules.has(binding.module))
          )
        return (
          !!binding.module &&
          found.kind === 'module' &&
          found.member === binding.member &&
          found.module === binding.module &&
          officialModules.has(binding.module)
        )
      }
      scope = scope.parent
    }
    // Unbound: a Python built-in (print) or a name an installed extension provides. A provided
    // name (keyboard, screen) is never proof of an object of a class (an Actor).
    if (binding.instance) return false
    if (binding.builtin) return officialModules.has(binding.builtin) && builtins.has(binding.root)
    return !binding.module
  }) as PythonBindingResolver
  resolver.isModule = (nameNode, module) => {
    const found = bindingAt(nameNode)
    return found?.kind === 'module' && !found.member && found.module === module
  }
  resolver.functionParams = (nameNode) => {
    const key = nameNode.fields.id
    if (typeof key !== 'string') return
    const scope = holder(scopes.get(nameNode), key)
    if (!scope || (scope.writes.get(key) ?? 0) !== 1) return
    return functionDefs.find((entry) => entry.scope === scope && entry.name === key)?.params
  }
  resolver.receiverKind = (nameNode) => {
    const found = bindingAt(nameNode)
    return found?.kind === 'instance' && found.module === 'builtins'
      ? (found.instance as PythonReceiverKind)
      : undefined
  }
  return resolver
}
