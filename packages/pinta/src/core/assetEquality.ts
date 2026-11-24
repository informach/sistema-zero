/** Dados autorais: revisões e horários não substituem a comparação do conteúdo. */
export function pintaValuesEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false
  if (ArrayBuffer.isView(a) && ArrayBuffer.isView(b)) {
    if (a.constructor !== b.constructor || a.byteLength !== b.byteLength) return false
    const x = new Uint8Array(a.buffer, a.byteOffset, a.byteLength),
      y = new Uint8Array(b.buffer, b.byteOffset, b.byteLength)
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false
    return true
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const x = Object.entries(a),
    y = Object.entries(b)
  return (
    x.length === y.length &&
    x.every(([key, value]) => Object.hasOwn(b, key) && pintaValuesEqual(value, Reflect.get(b, key)))
  )
}
