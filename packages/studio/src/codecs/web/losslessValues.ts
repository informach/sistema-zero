/** Hex canônico minúsculo de 6 dígitos que os campos visuais reemitem sem perda. */
export function isLosslessColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/.test(value.trim())
}
