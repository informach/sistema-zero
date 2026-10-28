import type { Vec3 } from '../../../core/model'

/**
 * As conferências do molde (28/10/2026), puras: a criação cabe na caixa, a frente encosta na
 * marca rosa (a face +z) e os triângulos cabem no teto do objeto. Folga de meio passo da grade
 * (1/32): as posições guardadas andam em 1/16.
 */
const FOLGA = 1 / 32

export interface ConferenciasDoMolde {
  /** Nada desenhado ainda (a criança apagou tudo): o cartão convida a começar. */
  vazio: boolean
  cabe: boolean
  frente: boolean
  triangulos: number
  leve: boolean
}

export function conferirMolde(
  limites: { min: Vec3; max: Vec3 } | null,
  triangulos: number,
  molde: { min: Vec3; max: Vec3; maxTriangles: number },
): ConferenciasDoMolde {
  const cabe =
    limites !== null &&
    [0, 1, 2].every(
      (eixo) =>
        (limites.min[eixo] as number) >= (molde.min[eixo] as number) - FOLGA &&
        (limites.max[eixo] as number) <= (molde.max[eixo] as number) + FOLGA,
    )
  const frente =
    limites !== null && Math.abs((limites.max[2] as number) - (molde.max[2] as number)) <= FOLGA
  return {
    vazio: limites === null,
    cabe,
    frente,
    triangulos,
    leve: triangulos <= molde.maxTriangles,
  }
}
