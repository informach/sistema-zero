/**
 * Conversões de cor PURAS para o seletor personalizado. Trabalhamos em HSV
 * (matiz/saturação/valor) porque o quadrado saturação×valor + a faixa de matiz
 * é o seletor mais intuitivo para a criança: área grande, um dedo só.
 *
 * Formato canônico de cor no Pinta: `#rrggbb` MINÚSCULO (o mesmo do `projectRef`
 * e dos swatches indexados). `normalizeHex` é o portão único — aceita `#rgb` ou
 * `#rrggbb`, com ou sem `#`, e devolve minúsculo ou `null`.
 */

export interface Hsv {
  /** Matiz 0–360. */
  h: number
  /** Saturação 0–1. */
  s: number
  /** Valor/brilho 0–1. */
  v: number
}

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

/** `#rrggbb` → HSV. Entrada inválida cai em preto (nunca lança). */
export function hexToHsv(hex: string): Hsv {
  const norm = normalizeHex(hex) ?? '#000000'
  const value = Number.parseInt(norm.slice(1), 16)
  const r = ((value >> 16) & 0xff) / 255
  const g = ((value >> 8) & 0xff) / 255
  const b = (value & 0xff) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  const s = max === 0 ? 0 : d / max
  return { h, s, v: max }
}

/** HSV → `#rrggbb` minúsculo. Componentes fora do range são cortados. */
export function hsvToHex(hsv: Hsv): string {
  const h = ((hsv.h % 360) + 360) % 360
  const s = Math.min(Math.max(hsv.s, 0), 1)
  const v = Math.min(Math.max(hsv.v, 0), 1)
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const to2 = (n: number): string =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${to2(r)}${to2(g)}${to2(b)}`
}
