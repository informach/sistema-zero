/**
 * Cor no Molda: `#rrggbb` MINÚSCULO é o formato canônico (o mesmo do Pinta).
 * `normalizeHex` é o portão único — aceita `#rgb` ou `#rrggbb`, com ou sem `#`,
 * e devolve minúsculo ou `null`. Cópia por VALOR do `core/color.ts` do Pinta
 * (zero import entre as ferramentas).
 */

const HEX6 = /^#?([0-9a-f]{6})$/i
const HEX3 = /^#?([0-9a-f]{3})$/i

/** Normaliza para `#rrggbb` minúsculo (expande `#rgb`); `null` se inválido. */
export function normalizeHex(input: string): string | null {
  const s = input.trim()
  const m6 = HEX6.exec(s)
  if (m6?.[1]) return `#${m6[1].toLowerCase()}`
  const m3 = HEX3.exec(s)
  if (m3?.[1]) {
    const [r, g, b] = m3[1].toLowerCase()
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return null
}

/** `#rrggbb` → [r, g, b] em 0..255. Entrada inválida cai em preto (nunca lança). */
export function hexToRgb(hex: string): [number, number, number] {
  const norm = normalizeHex(hex) ?? '#000000'
  const value = Number.parseInt(norm.slice(1), 16)
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]
}

/** [r, g, b] em 0..255 → `#rrggbb` minúsculo (componentes cortados na faixa). */
export function rgbToHex(r: number, g: number, b: number): string {
  const to2 = (n: number): string =>
    Math.min(255, Math.max(0, Math.round(n)))
      .toString(16)
      .padStart(2, '0')
  return `#${to2(r)}${to2(g)}${to2(b)}`
}

/** Canal sRGB (0..255) → linear (0..1), pela curva exata (não a aproximação 2.2). */
export function srgbToLinear(channel: number): number {
  const c = Math.min(1, Math.max(0, channel / 255))
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** Linear (0..1) → canal sRGB (0..255), pela curva exata. */
export function linearToSrgb(value: number): number {
  const v = Math.min(1, Math.max(0, value))
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055
  return Math.round(c * 255)
}
