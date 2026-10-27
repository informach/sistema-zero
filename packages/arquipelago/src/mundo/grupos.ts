import { interactionGroups } from '@react-three/rapier'

/**
 * Grupos de colisão do Rapier. Por padrão todo colisor está em todos os grupos (o corpo bate em
 * tudo). Os que só seguram o corpo (guarda-corpo invisível) ficam no grupo 1; o raio da câmera só
 * enxerga o grupo 0, então passa por eles.
 */
export const GRUPO_SO_DO_CORPO = interactionGroups([1])
export const GRUPOS_DO_RAIO_DA_CAMERA = interactionGroups([0], [0])
