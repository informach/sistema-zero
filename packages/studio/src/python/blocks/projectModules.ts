import type { ProjectTree } from '../../core/proProject'
import {
  absolutePythonImport,
  PYTHON_RESERVED_MODULES,
  pythonModulePaths,
  pythonParentPath,
} from '../language/modulePaths'
import type { PythonNode, PythonValue } from '../language/types'
import { isNode, nodes, pythonRootName } from './nodes'
import type { PythonExportedBinding, PythonProjectModules } from './scope'

/** An import as written, resolved against the importing file's package later. */
interface ImportReference {
  level: number
  module: string | null
  /** `from module import name`: the name may itself be a submodule. */
  name?: string
}
/** What one file does to module namespaces, independent of where it lives in the project. */
interface ModuleFacts {
  /** The namespace is changed in a way a static reading cannot follow (globals(), exec…). */
  dynamic: boolean
  /** Names bound at module level and how; several entries for one name collapse to 'other'. */
  bindings: Map<string, PythonExportedBinding[]>
  stars: ImportReference[]
  /** A single unconditional literal `__all__`. */
  all?: readonly string[]
  /** Imported modules whose namespace this file changes (`settings.x = 1`, setattr, vars). */
  mutated: ImportReference[]
}

const OTHER: PythonExportedBinding = { kind: 'other' }
/** Calls that read or rewrite a namespace as a dictionary, or run code built at runtime. */
const DYNAMIC_CALLS = new Set(['globals', 'locals', 'exec', 'eval'])
/** Writing through these changes the interpreter itself (every module's built-ins or imports). */
const INTERPRETER_ROOTS = new Set(['sys', 'builtins', '__builtins__'])
/** Attribute reads that hand out an object's namespace or its attribute machinery. */
const NAMESPACE_DUNDERS = new Set(['__dict__', '__setattr__', '__delattr__', '__getattribute__'])
const FUNCTION_KINDS = new Set(['FunctionDef', 'AsyncFunctionDef', 'ClassDef', 'Lambda'])

const children = (value: PythonValue | undefined): PythonNode[] =>
  Array.isArray(value) ? value.flatMap(children) : isNode(value) ? [value] : []

function importLevel(node: PythonNode): number | undefined {
  const level = node.fields.level
  if (
    !level ||
    typeof level !== 'object' ||
    Array.isArray(level) ||
    !('literal' in level) ||
    level.literal !== 'int' ||
    !/^\d{1,3}$/.test(level.value)
  )
    return undefined
  return Number(level.value)
}

/** The name at the start of `a.b.c` / `a[0].b`, if any. */
const rootName = (value: PythonValue | undefined) =>
  pythonRootName(value)?.fields.id as string | undefined

function literalAll(value: PythonValue | undefined): string[] | undefined {
  if (!isNode(value) || (value.kind !== 'List' && value.kind !== 'Tuple')) return undefined
  if (!nodes(value.fields.elts)) return undefined
  const names: string[] = []
  for (const item of value.fields.elts) {
    if (item.kind !== 'Constant' || typeof item.fields.value !== 'string') return undefined
    names.push(item.fields.value)
  }
  return names
}

const factsByTree = new WeakMap<PythonNode, ModuleFacts>()

/** Module-level bindings of one parsed file; memoized by tree (a new parse is a new tree). */
function moduleFacts(tree: PythonNode): ModuleFacts {
  const cached = factsByTree.get(tree)
  if (cached) return cached
  const facts: ModuleFacts = { dynamic: false, bindings: new Map(), stars: [], mutated: [] }
  const bind = (key: string, binding: PythonExportedBinding) => {
    const found = facts.bindings.get(key)
    if (found) found.push(binding)
    else facts.bindings.set(key, [binding])
  }
  /** Names bound by an import anywhere in the file, for writes through them. */
  const imported = new Map<string, ImportReference[]>()
  const remember = (key: string, reference: ImportReference) => {
    const found = imported.get(key)
    if (found) found.push(reference)
    else imported.set(key, [reference])
  }
  /** Roots written through (`x.attr = …`) or whose namespace is handed out. */
  const written = new Set<string>()
  // A root that is not a name (`self.rect().x = 1`) is an object made at runtime, not a module.
  const writeThrough = (root: string | undefined) => {
    if (root === undefined) return
    if (INTERPRETER_ROOTS.has(root)) facts.dynamic = true
    else written.add(root)
  }
  let allMentions = 0
  const body = nodes(tree.fields.body) ? tree.fields.body : []
  const allStatements = body.filter((statement) => {
    const targets =
      statement.kind === 'Assign' && nodes(statement.fields.targets)
        ? statement.fields.targets
        : statement.kind === 'AnnAssign' && isNode(statement.fields.target)
          ? [statement.fields.target]
          : []
    return targets.some((target) => target.kind === 'Name' && target.fields.id === '__all__')
  })

  function visit(value: PythonNode, moduleLevel: boolean) {
    const fields = value.fields
    switch (value.kind) {
      case 'Name':
        if (fields.id === '__all__') allMentions++
        if (
          typeof fields.id === 'string' &&
          moduleLevel &&
          isNode(fields.ctx) &&
          fields.ctx.kind !== 'Load'
        )
          bind(fields.id, OTHER)
        return
      case 'Global':
        // A function that declares a global can create or replace it whenever it runs.
        for (const item of Array.isArray(fields.names) ? fields.names : [])
          if (typeof item === 'string') {
            if (item === '__all__') allMentions++
            bind(item, OTHER)
          }
        return
      case 'Import':
        for (const alias of nodes(fields.names) ? fields.names : []) {
          if (typeof alias.fields.name !== 'string') continue
          const dotted = alias.fields.name
          const asname = typeof alias.fields.asname === 'string' ? alias.fields.asname : undefined
          const root = dotted.split('.')[0]!
          // Same binding the resolver gives an import in the file itself.
          if (moduleLevel) bind(asname ?? root, { kind: 'module', module: asname ? dotted : root })
          remember(asname ?? root, { level: 0, module: asname ? dotted : root })
        }
        return
      case 'ImportFrom': {
        const level = importLevel(value)
        const module = typeof fields.module === 'string' ? fields.module : null
        // An unreadable level proves nothing about what the import binds.
        if (level === undefined) {
          facts.dynamic = true
          return
        }
        for (const alias of nodes(fields.names) ? fields.names : []) {
          const imported = alias.fields.name
          if (typeof imported !== 'string') continue
          if (imported === '*') {
            if (moduleLevel) facts.stars.push({ level, module })
            else facts.dynamic = true
            continue
          }
          const key = typeof alias.fields.asname === 'string' ? alias.fields.asname : imported
          if (moduleLevel)
            bind(key, level === 0 && module ? { kind: 'module', module, member: imported } : OTHER)
          remember(key, { level, module, name: imported })
        }
        return
      }
      case 'MatchAs':
      case 'MatchStar':
        if (moduleLevel && typeof fields.name === 'string') bind(fields.name, OTHER)
        break
      case 'MatchMapping':
        if (moduleLevel && typeof fields.rest === 'string') bind(fields.rest, OTHER)
        break
      case 'ExceptHandler':
        if (moduleLevel && typeof fields.name === 'string') bind(fields.name, OTHER)
        break
      case 'Attribute':
        if (isNode(fields.ctx) && fields.ctx.kind !== 'Load') writeThrough(rootName(fields.value))
        else if (typeof fields.attr === 'string' && NAMESPACE_DUNDERS.has(fields.attr))
          writeThrough(rootName(fields.value))
        else if (fields.attr === 'modules' && rootName(fields.value) === 'sys') facts.dynamic = true
        break
      case 'Call': {
        const func = isNode(fields.func) ? fields.func : undefined
        const callee = func?.kind === 'Name' ? func.fields.id : undefined
        const args = nodes(fields.args) ? fields.args : []
        if (typeof callee === 'string' && DYNAMIC_CALLS.has(callee)) facts.dynamic = true
        else if (callee === 'vars' && !args.length) facts.dynamic = true
        else if (callee === 'setattr' || callee === 'delattr' || callee === 'vars')
          writeThrough(rootName(args[0]))
        break
      }
    }
    if (FUNCTION_KINDS.has(value.kind)) {
      if (moduleLevel && typeof fields.name === 'string') bind(fields.name, OTHER)
      // Decorators, defaults, annotations and bases run in the enclosing scope.
      for (const [key, child] of Object.entries(fields)) {
        if (key === 'body') continue
        // Parameters (`arg`) bind nothing here; their defaults and annotations are expressions.
        for (const item of children(child)) visit(item, moduleLevel)
      }
      for (const item of children(fields.body)) visit(item, false)
      return
    }
    // Comprehension targets are local to the comprehension; counting them as module names only
    // makes the result more cautious (and a walrus inside does bind at module level).
    for (const child of Object.values(fields))
      for (const item of children(child)) visit(item, moduleLevel)
  }
  for (const statement of body) visit(statement, true)

  if (allMentions) {
    const statement = allStatements.length === 1 ? allStatements[0]! : undefined
    const targets =
      statement?.kind === 'Assign' && nodes(statement.fields.targets)
        ? statement.fields.targets
        : []
    const names =
      statement && allMentions === 1 && targets.length <= 1
        ? literalAll(statement.fields.value)
        : undefined
    if (names) facts.all = names
    else facts.dynamic = true
  }
  for (const root of written)
    for (const reference of imported.get(root) ?? []) facts.mutated.push(reference)
  factsByTree.set(tree, facts)
  return facts
}

const bindingKey = (binding: PythonExportedBinding) =>
  binding.kind === 'other' ? 'other' : `${binding.module}\0${binding.member ?? ''}`

/**
 * What `from <project module> import *` binds, for every module of the child's project.
 * Feed the result to `pythonASTToVisual({ projectModules })` for any file of the same project.
 *
 * A module gets null (the importing file stays cautious) when its file did not parse, its name
 * coincides with a standard or interpreter module, it rewrites its namespace dynamically
 * (globals(), exec, a non-literal or conditional `__all__`), another project file writes into it,
 * or it star-imports a module whose names are not known. Names follow CPython: `__all__` when it
 * is a literal list or tuple of strings, otherwise every module-level name without a leading `_`.
 */
export function pythonProjectModules(input: {
  /** Every path of the project; directories (and non-Python files in them) shape packages. */
  paths: Iterable<string>
  /** Parsed module of each Python file; a missing or null tree proves nothing. */
  trees: ReadonlyMap<string, PythonNode | null | undefined>
  /** Executable entrypoint: its directory is `sys.path[0]`, as in `pythonModulePaths`. */
  entrypoint: string
  /** Star exports already understood (`pythonResolverOptionsOf(codecs).starExports`). */
  starExports?: ReadonlyMap<string, readonly string[]>
}): PythonProjectModules {
  const projectTree: ProjectTree = {}
  for (const path of input.paths) projectTree[path] = { kind: 'file', content: '' }
  const index = pythonModulePaths(projectTree, input.entrypoint)
  const known = input.starExports ?? new Map<string, readonly string[]>()

  interface Module {
    path: string
    packageName: string | null
    facts: ModuleFacts | null
    /** Package `__init__.py`: its submodules become attributes once imported anywhere. */
    submodules: string[]
  }
  const modules = new Map<string, Module>()
  for (const path of Object.keys(projectTree)) {
    if (!path.endsWith('.py')) continue
    const isPackage = path === '__init__.py' || path.endsWith('/__init__.py')
    const location = isPackage
      ? { path: pythonParentPath(path), kind: 'package' as const }
      : { path, kind: 'module' as const }
    const name = index.nameOf(location)
    if (!name) continue
    const resolved = index.resolve(name)
    if (resolved?.path !== location.path || resolved.kind !== location.kind) continue
    const tree = input.trees.get(path)
    const submodules: string[] = []
    if (isPackage)
      for (const other of Object.keys(projectTree)) {
        if (!other.startsWith(`${location.path}/`)) continue
        const child = other
          .slice(location.path.length + 1)
          .split('/')[0]!
          .replace(/\.pyi?$/, '')
        if (
          child !== '__init__' &&
          /^[A-Za-z_][A-Za-z0-9_]*$/.test(child) &&
          !submodules.includes(child)
        )
          submodules.push(child)
      }
    modules.set(name, {
      path,
      packageName: path === input.entrypoint ? null : index.packageOf(path),
      facts:
        tree?.kind === 'Module' && !PYTHON_RESERVED_MODULES.has(name.split('.')[0]!)
          ? moduleFacts(tree)
          : null,
      submodules,
    })
  }

  const unknown = new Set<string>()
  const absolute = (module: Module, reference: ImportReference) => {
    try {
      return absolutePythonImport(module.packageName, reference.module, reference.level)
    } catch {
      return undefined
    }
  }
  /** Project modules first: a project file always shadows a known module of the same name. */
  const inProject = (name: string) => modules.has(name) || !!index.resolve(name)
  const dependencies = new Map<string, string[]>()
  const staticStars = new Map<string, { module: string; names: readonly string[] }[]>()
  for (const [name, module] of modules) {
    if (!module.facts || module.facts.dynamic) {
      unknown.add(name)
      continue
    }
    const dependsOn: string[] = []
    const fromKnown: { module: string; names: readonly string[] }[] = []
    for (const star of module.facts.stars) {
      const target = absolute(module, star)
      if (!target) unknown.add(name)
      else if (modules.has(target)) dependsOn.push(target)
      else if (inProject(target)) {
        // A namespace directory or a stub: nothing this analysis can read.
        unknown.add(target)
        unknown.add(name)
      } else {
        const names = known.get(target)
        if (names) fromKnown.push({ module: target, names })
        else unknown.add(name)
      }
    }
    dependencies.set(name, dependsOn)
    staticStars.set(name, fromKnown)
  }
  // A write into another project module (`settings.x = 1`, setattr) changes what it exports.
  for (const module of modules.values())
    for (const reference of module.facts?.mutated ?? []) {
      const base = absolute(module, reference)
      if (!base) continue
      const parts = base.split('.')
      const candidates = parts.map((_, count) => parts.slice(0, count + 1).join('.'))
      if (reference.name) candidates.push(`${base}.${reference.name}`)
      for (const candidate of candidates) if (inProject(candidate)) unknown.add(candidate)
    }
  // Unknown propagates to every module that star-imports it, through cycles too.
  for (let changed = true; changed; ) {
    changed = false
    for (const [name, dependsOn] of dependencies)
      if (!unknown.has(name) && dependsOn.some((dependency) => unknown.has(dependency))) {
        unknown.add(name)
        changed = true
      }
  }

  // Namespaces as sets of possible bindings per name; star imports only ever add to them,
  // so the fixed point terminates (cyclic star imports included).
  const namespaces = new Map<string, Map<string, Map<string, PythonExportedBinding>>>()
  const add = (
    namespace: Map<string, Map<string, PythonExportedBinding>>,
    key: string,
    binding: PythonExportedBinding,
  ) => {
    let bindings = namespace.get(key)
    if (!bindings) {
      bindings = new Map()
      namespace.set(key, bindings)
    }
    const id = bindingKey(binding)
    if (bindings.has(id)) return false
    bindings.set(id, binding)
    return true
  }
  for (const [name, module] of modules) {
    if (unknown.has(name)) continue
    const namespace = new Map<string, Map<string, PythonExportedBinding>>()
    for (const [key, bindings] of module.facts!.bindings)
      for (const binding of bindings) add(namespace, key, binding)
    for (const submodule of module.submodules) add(namespace, submodule, OTHER)
    for (const star of staticStars.get(name) ?? [])
      for (const member of star.names)
        add(namespace, member, { kind: 'module', module: star.module, member })
    namespaces.set(name, namespace)
  }
  const exported = (name: string) => {
    const namespace = namespaces.get(name)!
    const all = modules.get(name)!.facts!.all
    const result = new Map<string, PythonExportedBinding>()
    const collapse = (key: string): PythonExportedBinding => {
      const bindings = namespace.get(key)
      return bindings?.size === 1 ? [...bindings.values()][0]! : OTHER
    }
    if (all) for (const key of all) result.set(key, collapse(key))
    else
      for (const key of namespace.keys()) if (!key.startsWith('_')) result.set(key, collapse(key))
    return result
  }
  for (let changed = true; changed; ) {
    changed = false
    for (const [name, dependsOn] of dependencies) {
      if (unknown.has(name)) continue
      const namespace = namespaces.get(name)!
      for (const dependency of dependsOn)
        for (const [key, binding] of exported(dependency))
          if (add(namespace, key, binding)) changed = true
    }
  }

  const result = new Map<string, ReadonlyMap<string, PythonExportedBinding> | null>()
  for (const name of unknown) result.set(name, null)
  for (const name of namespaces.keys()) result.set(name, exported(name))
  return result
}
