/**
 * Ruído DETERMINÍSTICO por semente (zero `Math.random`): hash inteiro, value
 * noise bilinear com suavização e fbm de poucas oitavas. É o que desenha as
 * nuvens do céu: mesma semente = mesmas nuvens, na prévia e no export.
 */

/** Hash inteiro → [0, 1). Entradas inteiras (o chamador arredonda). */
export function hash2(x: number, y: number, seed: number): number {
  let h =
    Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1274126177)
  h = Math.imul(h ^ (h >>> 13), 1103515245)
  h ^= h >>> 16
  h = Math.imul(h, 2246822519)
  h ^= h >>> 13
  return (h >>> 0) / 4294967296
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t)
}

/** Value noise bilinear em [0, 1]. */
export function valueNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = smooth(x - x0)
  const fy = smooth(y - y0)
  const a = hash2(x0, y0, seed)
  const b = hash2(x0 + 1, y0, seed)
  const c = hash2(x0, y0 + 1, seed)
  const d = hash2(x0 + 1, y0 + 1, seed)
  const top = a + (b - a) * fx
  const bottom = c + (d - c) * fx
  return top + (bottom - top) * fy
}

/** fbm normalizado para [0, 1]. */
export function fbm(x: number, y: number, seed: number, octaves = 4): number {
  let sum = 0
  let amplitude = 0.5
  let total = 0
  let fx = x
  let fy = y
  for (let i = 0; i < octaves; i += 1) {
    sum += valueNoise(fx, fy, seed + i * 131) * amplitude
    total += amplitude
    amplitude *= 0.5
    fx = fx * 2.03 + 17.1
    fy = fy * 2.03 + 9.7
  }
  return total > 0 ? sum / total : 0
}
