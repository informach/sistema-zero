/**
 * A matemática de cor da casa — pura, sem dependência, e a mesma no gerador, nos testes e no
 * navegador (o dia do seletor livre não vai pedir biblioteca nova).
 *
 * A conversão sRGB↔OKLab e a régua de contraste vêm do
 * `packages/member-shell/tests/scene-contrast.test.ts`, onde nasceram e foram revisadas; aqui
 * elas viram módulo compartilhado, com as autoverificações do original preservadas em teste.
 *
 * ⚠️ `mixOklab` é o `color-mix(in oklab, …)` do navegador, nunca `in oklch`: o branco
 * `oklch(1 0 0)` tem matiz explícito e a interpolação cilíndrica gira, deixando cinza rosa.
 */

/** OKLab: `[L, a, b]`. */
export type Lab = readonly [number, number, number]
/** OKLCH: `[L, C, H]`, com H em graus. */
export type Lch = readonly [number, number, number]
/** sRGB com canais de 0 a 1. */
export type Rgb = readonly [number, number, number]

const HEX = /^#[0-9a-f]{6}$/i

export function hexToRgb(hex: string): Rgb {
  if (!HEX.test(hex)) throw new Error(`Hexadecimal inválido: ${hex}`)
  return [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255) as unknown as Rgb
}

export function rgbToHex([r, g, b]: Rgb): string {
  const canal = (c: number) =>
    Math.round(Math.min(1, Math.max(0, c)) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${canal(r)}${canal(g)}${canal(b)}`
}

const paraLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const paraSrgb = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

export function rgbToOklab([r0, g0, b0]: Rgb): Lab {
  const [r, g, b] = [r0, g0, b0].map(paraLinear) as [number, number, number]
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

/**
 * OKLab → sRGB **sem prender na faixa**: é o que permite perguntar se a cor existe no monitor.
 * Prender aqui esconderia o estouro de gamut, que é justamente o que `inSrgb` precisa ver.
 */
export function oklabToRgbRaw([L, a, bb]: Lab): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * bb) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * bb) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * bb) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(paraSrgb) as unknown as Rgb
}

export function oklabToRgb(lab: Lab): Rgb {
  return oklabToRgbRaw(lab).map((c) => Math.min(1, Math.max(0, c))) as unknown as Rgb
}

export const hexToOklab = (hex: string): Lab => rgbToOklab(hexToRgb(hex))
export const oklabToHex = (lab: Lab): string => rgbToHex(oklabToRgb(lab))

export function oklchToOklab([L, C, H]: Lch): Lab {
  const rad = (H * Math.PI) / 180
  return [L, C * Math.cos(rad), C * Math.sin(rad)]
}

export function oklabToOklch([L, a, b]: Lab): Lch {
  const H = (Math.atan2(b, a) * 180) / Math.PI
  return [L, Math.hypot(a, b), H < 0 ? H + 360 : H]
}

export const hexToOklch = (hex: string): Lch => oklabToOklch(hexToOklab(hex))
export const oklchToHex = (lch: Lch): string => oklabToHex(oklchToOklab(lch))

/** Uma folga de meio passo de 8 bits: o arredondamento para hexadecimal não conta como estouro. */
const FOLGA = 0.5 / 255

export function inSrgb(lab: Lab): boolean {
  return oklabToRgbRaw(lab).every((c) => c >= -FOLGA && c <= 1 + FOLGA)
}

/**
 * A maior croma que cabe no monitor naquela luminosidade e matiz, nunca acima do pedido.
 *
 * É o que impede uma paleta de prometer um verde tão vivo quanto o azul: o sRGB simplesmente não
 * tem esse verde, e sem o corte a cor sairia presa na borda, com o matiz torto.
 */
export function fitChroma(l: number, chroma: number, h: number): number {
  if (inSrgb(oklchToOklab([l, chroma, h]))) return chroma
  let baixo = 0
  let alto = chroma
  for (let i = 0; i < 24; i++) {
    const meio = (baixo + alto) / 2
    if (inSrgb(oklchToOklab([l, meio, h]))) baixo = meio
    else alto = meio
  }
  return baixo
}

/** O mesmo que `color-mix(in oklab, a <pct>%, b)` faz. */
export function mixOklab(a: Lab, b: Lab, pct: number): Lab {
  return [
    a[0] * pct + b[0] * (1 - pct),
    a[1] * pct + b[1] * (1 - pct),
    a[2] * pct + b[2] * (1 - pct),
  ]
}

export function relativeLuminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map(paraLinear) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** O contraste da WCAG entre dois hexadecimais. Preto no branco é 21. */
export function contrast(a: string, b: string): number {
  const x = relativeLuminance(hexToRgb(a)) + 0.05
  const y = relativeLuminance(hexToRgb(b)) + 0.05
  return Math.max(x, y) / Math.min(x, y)
}

/** A distância perceptual em OKLab — abaixo de ~0,02 ninguém vê. */
export function deltaE(a: string, b: string): number {
  const x = hexToOklab(a)
  const y = hexToOklab(b)
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2])
}

/**
 * A cor de ação de uma matiz: a luminosidade que dá EXATAMENTE o contraste pedido contra o
 * branco, com a croma mais viva que couber.
 *
 * ⭐ Este é o invariante da paleta da casa, medido nas três cores aprovadas à mão: azul 5,42,
 * rosa 5,33 e verde 5,35 de contraste com o branco, em três luminosidades BEM diferentes
 * (0,538 · 0,554 · 0,514). Quem escolheu aquelas cores estava igualando contraste, não
 * luminosidade — e é só seguindo isso que uma matiz nova entra na família com o texto branco
 * legível no botão, o link legível no cartão e no chão, e sem CTA amarelo ilegível.
 *
 * O contraste cai quando a luminosidade sobe, então a bisseção acha uma raiz só.
 */
export function solveActionLightness(hue: number, alvo: number, tetoDeCroma: number): Lch {
  const contrasteEm = (l: number) => {
    const c = fitChroma(l, tetoDeCroma, hue)
    return contrast('#ffffff', oklchToHex([l, c, hue]))
  }
  let baixo = 0.05
  let alto = 0.99
  for (let i = 0; i < 40; i++) {
    const meio = (baixo + alto) / 2
    if (contrasteEm(meio) > alvo) baixo = meio
    else alto = meio
  }
  const l = (baixo + alto) / 2
  return [l, fitChroma(l, tetoDeCroma, hue), hue]
}
