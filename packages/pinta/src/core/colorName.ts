/**
 * O NOME de uma cor para quem não a enxerga. Um hex cru lido por leitor de tela
 * vira "cerquilha f f nove dois dois um", letra a letra — inútil para uma
 * criança. As 15 cores da paleta têm nome próprio (`COPY.colorNames`); qualquer
 * outra (e a razão de ser do conta-gotas em cima de uma figura é justamente
 * pegar cores de FORA da paleta) recebe o nome da mais parecida, marcada como
 * aproximação para não mentir.
 *
 * Puro e sem DOM. A distância é a euclidiana em RGB — a mesma régua que o
 * `remapBitmapColors` (`pixel/ops.ts`) já usa para escolher "a cor mais
 * parecida que já existe" quando a paleta enche.
 */
import { normalizeHex } from './color'
import { COPY } from './copy'

function rgbOf(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function distance2(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): number {
  const dr = a[0] - b[0]
  const dg = a[1] - b[1]
  const db = a[2] - b[2]
  return dr * dr + dg * dg + db * db
}

/**
 * Nome exato quando a cor está na paleta; senão "parecido com <nome>". Hex
 * inválido volta como veio (defensivo: nunca lança no meio de um anúncio).
 */
export function colorNameFor(hex: string): string {
  const normalized = normalizeHex(hex)
  if (!normalized) return hex
  const exact = COPY.colorNames[normalized]
  if (exact) return exact
  const target = rgbOf(normalized)
  let bestName: string | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const [candidate, name] of Object.entries(COPY.colorNames)) {
    const distance = distance2(target, rgbOf(candidate))
    if (distance < bestDistance) {
      bestDistance = distance
      bestName = name
    }
  }
  return bestName ? COPY.vector.colorApprox(bestName) : normalized
}
