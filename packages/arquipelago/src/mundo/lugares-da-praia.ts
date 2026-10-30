import { ALTURA_DO_PIER } from './colisao-da-ilha-central'
import { PIER } from './medidas'

/** Entre estacas, oposto ao embarque; o tampo tem 6 cm acima do centro do colisor. */
export const PONTO_DA_PESCA = {
  x: PIER.x - 0.45,
  y: ALTURA_DO_PIER + 0.06,
  z: PIER.z + 4.7,
} as const

/**
 * Os quatro lugares dos Lumis da praia (a família da sua ilha) e dos borrões da noite dela, na
 * beira do gramado, entre as pontes e longe do píer e do farol: os "cantos cinzas" da proposta.
 * Ângulos em graus (x = cos, z = sin), a 23 m do meio. O teste confere que o chão é livre.
 */
export const LUGARES_DOS_LUMIS_DA_PRAIA: readonly { angulo: number }[] = [
  { angulo: 50 },
  { angulo: 110 },
  { angulo: 170 },
  { angulo: 230 },
]
export const DISTANCIA_DOS_LUMIS_DA_PRAIA = 23
