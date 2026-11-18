/** Mesma diagonal dos triângulos do terreno; sem interpolação bilinear. */
export function interpolarAlturasDaCelula(
  a: number,
  b: number,
  c: number,
  d: number,
  u: number,
  v: number,
) {
  return u + v <= 1 ? a + (b - a) * u + (c - a) * v : d + (c - d) * (1 - u) + (b - d) * (1 - v)
}
