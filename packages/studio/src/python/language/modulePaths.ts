import type { ProjectTree } from '../../core/proProject'
import standardModules from './standardModules.json'

// CPython 3.14.2 sys.stdlib_module_names plus interpreter-owned browser modules.
// A cached, builtin or frozen module may outrank a source file; never guess its binding.
export const PYTHON_RESERVED_MODULES: ReadonlySet<string> = new Set([
  ...standardModules,
  'js',
  'pyodide',
  'pyodide_js',
  '_pyodide',
  '_pyodide_core',
])

export interface PythonModuleLocation {
  path: string
  kind: 'module' | 'package' | 'namespace'
}
export const pythonParentPath = (path: string) =>
  path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''
export const pythonPathWithin = (path: string, directory: string) =>
  !directory || path === directory || path.startsWith(`${directory}/`)
export const movedPythonPath = (path: string, from: string, to: string) =>
  pythonPathWithin(path, from) ? to + path.slice(from.length) : path
const keywords = new Set(
  'False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield'.split(
    ' ',
  ),
)

/** Portable filenames are ASCII. A static import additionally requires Python identifier segments. */
export function isPythonModuleName(name: string) {
  return (
    !!name &&
    name.split('.').every((part) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(part) && !keywords.has(part))
  )
}

/** Mirrors the project's normal import root: the directory containing the executable entrypoint. */
export function pythonModulePaths(tree: ProjectTree, entrypoint: string) {
  const root = pythonParentPath(entrypoint)
  const files = new Set(
    Object.entries(tree)
      .filter(([, node]) => node.kind === 'file')
      .map(([path]) => path),
  )
  const directories = new Set<string>()
  for (const [path, node] of Object.entries(tree)) {
    if (node.kind === 'dir') directories.add(path)
    for (let parent = pythonParentPath(path); parent; parent = pythonParentPath(parent))
      directories.add(parent)
  }
  function pathFor(name: string) {
    return (root ? `${root}/` : '') + name.replaceAll('.', '/')
  }
  function nameOf(location: PythonModuleLocation) {
    if (!pythonPathWithin(location.path, root) || location.path === root) return null
    const relative = root ? location.path.slice(root.length + 1) : location.path
    const name = (
      location.kind === 'module' ? relative.replace(/\.pyi?$/, '') : relative
    ).replaceAll('/', '.')
    return isPythonModuleName(name) ? name : null
  }
  function resolve(name: string): PythonModuleLocation | null {
    if (!isPythonModuleName(name)) return null
    const parts = name.split('.')
    for (let count = 1; count <= parts.length; count++) {
      const path = pathFor(parts.slice(0, count).join('.'))
      const location: PythonModuleLocation | null = files.has(`${path}/__init__.py`)
        ? { path, kind: 'package' }
        : files.has(`${path}.py`)
          ? { path: `${path}.py`, kind: 'module' }
          : files.has(`${path}/__init__.pyi`)
            ? { path, kind: 'package' }
            : files.has(`${path}.pyi`)
              ? { path: `${path}.pyi`, kind: 'module' }
              : directories.has(path)
                ? { path, kind: 'namespace' }
                : null
      if (!location || (count < parts.length && location.kind === 'module')) return null
      if (count === parts.length) return location
    }
    return null
  }
  function packageOf(path: string) {
    const parent = pythonParentPath(path)
    if (!pythonPathWithin(parent, root)) return null
    if (parent === root) return ''
    const name = (root ? parent.slice(root.length + 1) : parent).replaceAll('/', '.')
    const location = resolve(name)
    return location && location.kind !== 'module' ? name : null
  }
  return { root, resolve, nameOf, packageOf }
}

export function absolutePythonImport(
  packageName: string | null,
  module: string | null,
  level: number,
) {
  if (!level) return module ?? ''
  const parts = packageName?.split('.').filter(Boolean) ?? []
  if (level < 1 || level > parts.length)
    throw new Error('Este import relativo não está dentro de um pacote Python válido.')
  return [...parts.slice(0, parts.length - level + 1), ...(module?.split('.') ?? [])].join('.')
}

export function relativePythonImport(packageName: string | null, target: string) {
  if (!packageName) return target
  const from = packageName.split('.'),
    to = target.split('.')
  let common = 0
  while (common < from.length && common < to.length && from[common] === to[common]) common++
  return common ? '.'.repeat(from.length - common + 1) + to.slice(common).join('.') : target
}
