/** Remove apenas os ids efêmeros da IR para comparar fontes de exemplo. */
export function stripIds<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripIds) as unknown as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (key === '__id') continue
      out[key] = stripIds(nested)
    }
    return out as T
  }
  return value
}

/** Coleta recursivamente os discriminantes `type` presentes numa IR. */
export function collectTypes(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectTypes(item, out)
  } else if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>
    if (typeof object.type === 'string') out.add(object.type)
    for (const nested of Object.values(object)) collectTypes(nested, out)
  }
  return out
}
