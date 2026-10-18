/** CPython's float.hex wire format and JS use the same binary64 representation. */
export function pythonFloatFromHex(hex: string): number {
  const match = /^(0x[01])\.([0-9a-f]{13})p([+-]\d+)$/.exec(hex)
  if (!match) throw new Error('Número decimal fora do formato visual.')
  const fraction = Number.parseInt(match[2]!, 16) / 2 ** 52
  const value = (match[1] === '0x1' ? 1 + fraction : fraction) * 2 ** Number(match[3])
  if (!Number.isFinite(value)) throw new Error('Número decimal fora do limite.')
  return value
}

export function pythonFloatToHex(value: number): string {
  if (!Number.isFinite(value) || value < 0 || Object.is(value, -0))
    throw new Error('Use um decimal positivo ou zero; para negativo, use o bloco de sinal.')
  if (value === 0) return '0x0.0p+0'
  const bytes = new DataView(new ArrayBuffer(8))
  bytes.setFloat64(0, value, false)
  const bits = bytes.getBigUint64(0, false)
  const exponent = Number((bits >> 52n) & 0x7ffn)
  const fraction = (bits & 0xfffffffffffffn).toString(16).padStart(13, '0')
  const power = exponent === 0 ? -1022 : exponent - 1023
  return `0x${exponent === 0 ? '0' : '1'}.${fraction}p${power >= 0 ? '+' : ''}${power}`
}

export function pythonDecimalFieldToHex(source: string): string {
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(source))
    throw new Error('Digite um número decimal, como 2.5 ou 1e3.')
  return pythonFloatToHex(Number(source))
}
