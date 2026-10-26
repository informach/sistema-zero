import { isNode, nodes } from '../blocks/nodes'
import { pythonBindingResolver } from '../blocks/scope'
import type { PythonNode, PythonValue } from '../language/types'

/** Conservative dependency check: explicit 3D imports also cover aliases re-exported by helpers. */
export function pythonApiReferenceMatcher(
  tree: PythonNode,
  modules: readonly string[],
  names: ReadonlySet<string>,
) {
  const importedRoots = new Set<string>()
  const imports = new WeakSet<PythonNode>()
  const pending: PythonValue[] = [tree]
  while (pending.length) {
    const item = pending.pop()!
    if (Array.isArray(item)) {
      pending.push(...item)
      continue
    }
    if (!isNode(item)) continue
    if (item.kind === 'Import' && nodes(item.fields.names)) {
      for (const alias of item.fields.names)
        if (typeof alias.fields.name === 'string' && modules.includes(alias.fields.name))
          importedRoots.add(
            typeof alias.fields.asname === 'string' ? alias.fields.asname : alias.fields.name,
          )
    }
    if (
      item.kind === 'ImportFrom' &&
      typeof item.fields.module === 'string' &&
      modules.includes(item.fields.module) &&
      nodes(item.fields.names)
    ) {
      const level = item.fields.level
      const absolute =
        level &&
        typeof level === 'object' &&
        !Array.isArray(level) &&
        'literal' in level &&
        level.literal === 'int' &&
        level.value === '0'
      if (absolute)
        for (const alias of item.fields.names) {
          if (typeof alias.fields.name !== 'string') continue
          if (names.has(alias.fields.name)) imports.add(item)
          if (alias.fields.name === 'rl' || alias.fields.name === '*')
            importedRoots.add(typeof alias.fields.asname === 'string' ? alias.fields.asname : 'rl')
        }
    }
    pending.push(...Object.values(item.fields))
  }
  const resolver = pythonBindingResolver(tree, new Set(modules), new Set(), {
    starExports: new Map(modules.map((module) => [module, [...names]])),
  })
  return (value: PythonNode): boolean => {
    if (imports.has(value)) return true
    if (
      value.kind === 'Name' &&
      typeof value.fields.id === 'string' &&
      names.has(value.fields.id)
    ) {
      const root = value.fields.id
      return modules.some((module) => resolver(value, { root, module, member: root }))
    }
    if (
      value.kind === 'Attribute' &&
      typeof value.fields.attr === 'string' &&
      names.has(value.fields.attr) &&
      isNode(value.fields.value)
    ) {
      let receiver = value.fields.value
      // The raw C API is also exposed as raylib.rl.DrawCube.
      if (
        receiver.kind === 'Attribute' &&
        receiver.fields.attr === 'rl' &&
        isNode(receiver.fields.value)
      )
        receiver = receiver.fields.value
      return (
        receiver.kind === 'Name' &&
        typeof receiver.fields.id === 'string' &&
        importedRoots.has(receiver.fields.id)
      )
    }
    return false
  }
}
