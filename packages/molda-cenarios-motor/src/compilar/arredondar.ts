/**
 * Números mais curtos no JSON da cena (plano "Mundos de 2 km", lote 5, 23/11/2026). O JSON da cena
 * tem teto de 1 MiB no Estúdio, e quase tudo nele são as matrizes e os volumes de cada objeto, com 17
 * algarismos (cerca de 880 bytes por objeto: uns 1.100 objetos no teto). Arredondados, cabem mais
 * que o dobro:
 *
 * - a posição (a coluna de translação da matriz) a 1 mm;
 * - rotação e escala com 7 algarismos significativos (relativo: uma escala pequena nunca vira zero,
 *   e a matriz continua invertível);
 * - o volume para FORA (mínimo para baixo, máximo para cima, a 1 mm): a caixa continua cobrindo o
 *   objeto, e quem pertence a cada região é calculado DEPOIS, sobre os números arredondados (o
 *   leitor confere as listas com os mesmos números).
 *
 * Só na compilação em campo (os mundos grandes): a publicação para o Arquipélago e as exportações
 * saem com os mesmos bytes de antes.
 */

const MILIMETRO = 1000

export function arredondarPosicao(v: number): number {
  const r = Math.round(v * MILIMETRO) / MILIMETRO
  return r === 0 ? 0 : r
}

export function arredondarFator(v: number): number {
  if (v === 0 || !Number.isFinite(v)) return v === 0 ? 0 : v
  return Number(v.toPrecision(7))
}

/** A matriz (16 números, coluna a coluna, como o three.js) com a translação a 1 mm. */
export function arredondarMatriz(m: readonly number[]): number[] {
  return m.map((v, i) =>
    i === 12 || i === 13 || i === 14
      ? arredondarPosicao(v)
      : i === 15 || i % 4 === 3
        ? v
        : arredondarFator(v),
  )
}

interface Ponto3 {
  x: number
  y: number
  z: number
}

/** A caixa arredondada para fora, a 1 mm. */
export function arredondarVolume(v: { min: Ponto3; max: Ponto3 }): { min: Ponto3; max: Ponto3 } {
  const baixo = (n: number) => {
      const r = Math.floor(n * MILIMETRO) / MILIMETRO
      return r === 0 ? 0 : r
    },
    cima = (n: number) => {
      const r = Math.ceil(n * MILIMETRO) / MILIMETRO
      return r === 0 ? 0 : r
    }
  return {
    min: { x: baixo(v.min.x), y: baixo(v.min.y), z: baixo(v.min.z) },
    max: { x: cima(v.max.x), y: cima(v.max.y), z: cima(v.max.z) },
  }
}

/** Arredonda matriz e volume de cada item que tem os dois (entidades, nós, colisões), no lugar. */
export function arredondarItensDaCena(
  ...listas: Array<Array<{ matriz?: number[]; volume?: { min: Ponto3; max: Ponto3 } }>>
): void {
  for (const lista of listas)
    for (const item of lista) {
      if (item.matriz) item.matriz = arredondarMatriz(item.matriz)
      if (item.volume) item.volume = arredondarVolume(item.volume)
    }
}
