import type { BichoDoBosque } from '@sistemazero/arquipelago-contracts'
import { comprimentoDoCaminho, type PontoNoChao, pontoNoCaminho } from './caminho'

/**
 * As pegadas dos bichos do Bosque (regras puras): o desenho de cada uma, feito de elipses num
 * quadro de 64 por 64 (o mesmo no diário, `interface/pegadas.tsx`, e no chão,
 * `mundo/rastro-de-pegadas.tsx`), e o rastro que cada bicho ainda escondido deixou do cercadinho
 * da Capi até o esconderijo.
 */

export interface Elipse {
  x: number
  y: number
  rx: number
  ry: number
  /** Giro em graus, como no SVG. */
  giro?: number
}

const dedos = (lista: readonly [number, number, number?][], rx: number, ry: number): Elipse[] =>
  lista.map(([x, y, giro]) => ({ x, y, rx, ry, giro: giro ?? 0 }))

/**
 * Cachorro: almofada grande, quatro dedos e a marca das unhas. Gato: almofada de três lóbulos e
 * quatro dedos redondos, sem unhas. Coelho: a pata de trás comprida e a da frente redondinha.
 * Porquinho-da-índia: a pata da frente com quatro dedinhos e a de trás com três.
 */
export const FORMA_DA_PEGADA: Readonly<Record<BichoDoBosque, readonly Elipse[]>> = {
  cachorro: [
    { x: 32, y: 40, rx: 10, ry: 8 },
    ...dedos(
      [
        [17, 27, -25],
        [26, 20, -8],
        [38, 20, 8],
        [47, 27, 25],
      ],
      4,
      5.5,
    ),
    ...dedos(
      [
        [14.6, 20.4, -25],
        [25, 12.6, -8],
        [39, 12.6, 8],
        [49.4, 20.4, 25],
      ],
      1.3,
      2.2,
    ),
  ],
  gato: [
    { x: 32, y: 41, rx: 9, ry: 6.5 },
    { x: 25.5, y: 43, rx: 4.5, ry: 4 },
    { x: 38.5, y: 43, rx: 4.5, ry: 4 },
    ...dedos(
      [
        [18, 29],
        [27, 21],
        [37, 21],
        [46, 29],
      ],
      4,
      4,
    ),
  ],
  coelho: [
    { x: 22, y: 34, rx: 7, ry: 17 },
    { x: 44, y: 44, rx: 6, ry: 8 },
  ],
  porquinho: [
    { x: 20, y: 40, rx: 5, ry: 6 },
    ...dedos(
      [
        [11, 29],
        [17, 29],
        [23, 29],
        [29, 29],
      ],
      2.4,
      3.6,
    ),
    { x: 44, y: 44, rx: 5.5, ry: 7 },
    ...dedos(
      [
        [37, 32],
        [44, 32],
        [51, 32],
      ],
      2.6,
      4,
    ),
  ],
}

export const RASTRO = {
  /** Do esconderijo até a primeira pegada e até a última (m). */
  comeca: 1.2,
  acaba: 8,
  /** Entre uma pegada e a seguinte (m) e quanto cada lado se afasta do meio do rastro. */
  passo: 0.55,
  lado: 0.13,
  /** O tamanho de uma pegada no chão (o lado do quadro de 64). */
  tamanho: 0.32,
} as const

export interface PegadaNoChao {
  x: number
  z: number
  /** Para onde a ponta da pegada aponta (rad, `(sin, cos)` como o giro dos bichos). */
  giro: number
}

/**
 * O rastro de um bicho ainda escondido, no caminho do cercadinho da Capi (de onde ele fugiu) até o
 * esconderijo: `caminho` começa no esconderijo. As pegadas ficam de `RASTRO.comeca` a
 * `RASTRO.acaba` metros dele, em dois lados alternados, todas apontando para o esconderijo. Um
 * caminho curto demais dá um rastro mais curto (ou nenhum).
 */
export function rastroNoCaminho(caminho: readonly PontoNoChao[]): PegadaNoChao[] {
  const ate = Math.min(RASTRO.acaba, comprimentoDoCaminho(caminho) - RASTRO.passo)
  const pegadas: PegadaNoChao[] = []
  let i = 0
  for (let d = RASTRO.comeca; d <= ate + 1e-9; d += RASTRO.passo, i++) {
    const p = pontoNoCaminho(caminho, d)
    // `rumo` é para onde o caminho segue (para longe do esconderijo): a pegada aponta ao contrário.
    const lado = i % 2 === 0 ? RASTRO.lado : -RASTRO.lado
    const fx = Math.sin(p.rumo)
    const fz = Math.cos(p.rumo)
    pegadas.push({ x: p.x + fz * lado, z: p.z - fx * lado, giro: p.rumo + Math.PI })
  }
  return pegadas
}
