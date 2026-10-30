import { ALTURA_DO_PIER } from './colisao-da-ilha-central'
import { PIER } from './medidas'

/** Entre estacas, oposto ao embarque; o tampo tem 6 cm acima do centro do colisor. */
export const PONTO_DA_PESCA = {
  x: PIER.x - 0.45,
  y: ALTURA_DO_PIER + 0.06,
  z: PIER.z + 4.7,
} as const
