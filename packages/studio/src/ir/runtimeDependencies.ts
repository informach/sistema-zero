import { runtimeExtensionForGlobal } from '../extensions/lifecycle'

const PREFIXES: Readonly<Record<string, string>> = {
  g2d: 'game-2d',
  gk: 'game-2d-advanced',
  g3d: 'game-3d',
  g3k: 'game-3d-advanced',
  w3d: 'world-3d',
}

/** Referências estruturadas também usam o motor quando vêm de blocos do núcleo. */
export function requiredRuntimeExtensions(program: unknown): string[] {
  const result = new Set<string>()
  const pending: unknown[] = [program]
  const seen = new Set<object>()
  while (pending.length) {
    const value = pending.pop()
    if (!value || typeof value !== 'object') continue
    if (seen.has(value)) continue
    seen.add(value)
    if (Array.isArray(value)) {
      pending.push(...value)
      continue
    }
    const record = value
    const type = 'type' in record ? record.type : null
    if (typeof type === 'string' && type.includes(':')) {
      const extension = PREFIXES[type.split(':', 1)[0]!]
      if (extension) result.add(extension)
    }
    const object = 'object' in record ? record.object : null
    if (
      (type === 'memberCall' || type === 'memberCallExpr') &&
      object &&
      typeof object === 'object'
    ) {
      if (
        'type' in object &&
        object.type === 'var' &&
        'name' in object &&
        typeof object.name === 'string'
      ) {
        const extension = runtimeExtensionForGlobal(object.name)
        if (extension) result.add(extension)
      }
    }
    pending.push(...Object.values(record))
  }
  return [...result].sort()
}
