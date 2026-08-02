/** Utilitários compartilhados pelos geradores one-off dos exemplos avançados. */
export function stripGeneratedIds<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripGeneratedIds) as unknown as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (key !== '__id') out[key] = stripGeneratedIds(child)
    }
    return out as T
  }
  return value
}

export function collectGeneratedTypes(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectGeneratedTypes(item, out)
  } else if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (typeof record.type === 'string') out.add(record.type)
    for (const child of Object.values(record)) collectGeneratedTypes(child, out)
  }
  return out
}

/** Imprime IR como literal TypeScript estável, com folhas opcionais em uma linha. */
export function printTypeScriptValue(value: unknown, indent: string, compactLeaves = true): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    const inner = `${indent}  `
    const items = value.map((item) => inner + printTypeScriptValue(item, inner, compactLeaves))
    return `[\n${items.join(',\n')},\n${indent}]`
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return '{}'
    if (compactLeaves) {
      const flat = `{ ${entries
        .map(([key, child]) => `${key}: ${printTypeScriptValue(child, indent, compactLeaves)}`)
        .join(', ')} }`
      if (!flat.includes('\n') && indent.length + flat.length <= 96) return flat
    }
    const inner = `${indent}  `
    const lines = entries.map(
      ([key, child]) => `${inner}${key}: ${printTypeScriptValue(child, inner, compactLeaves)}`,
    )
    return `{\n${lines.join(',\n')},\n${indent}}`
  }
  if (typeof value === 'string') return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
  return String(value)
}
