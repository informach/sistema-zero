function encode(value: unknown, compare: (a: string, b: string) => number): string {
  if (value instanceof Date) return JSON.stringify(value.toJSON())
  if (Array.isArray(value)) return `[${value.map((item) => encode(item, compare)).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      compare(a, b),
    )
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${encode(v, compare)}`).join(',')}}`
  }
  return JSON.stringify(value) ?? 'undefined'
}
/** Preserve historical fingerprints which already used locale collation. */
export function stableJson(value: unknown): string {
  return encode(value, (a, b) => a.localeCompare(b))
}
/** New cross-environment seals must never depend on the host locale or ICU version. */
export function canonicalJson(value: unknown): string {
  return encode(value, (a, b) => (a < b ? -1 : a > b ? 1 : 0))
}
