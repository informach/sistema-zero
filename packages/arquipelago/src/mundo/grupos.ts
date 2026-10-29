import { interactionGroups } from '@react-three/rapier'

/**
 * Grupos de colisão do Rapier. Por padrão todo colisor está em todos os grupos (o corpo bate em
 * tudo). Os que só seguram o corpo (guarda-corpo invisível) ficam no grupo 1; o raio da câmera só
 * enxerga o grupo 0, então passa por eles.
 */
export const GRUPO_SO_DO_CORPO = interactionGroups([1])
export const GRUPOS_DO_RAIO_DA_CAMERA = interactionGroups([0], [0])
/**
 * Um colisor que não encosta em nada (nenhum corpo, nem o raio da câmera): o de quem vai montada no
 * dino do Vale, que só o controlador do personagem usa para medir o caminho.
 */
export const GRUPO_DE_NINGUEM = interactionGroups([2], [])

/**
 * A propriedade `collisionGroups` de um colisor só para o que segura só o corpo. ⚠️ Nunca
 * `collisionGroups={cond ? GRUPO : undefined}`: o `@react-three/rapier` aplica toda opção presente,
 * e `undefined` vira o grupo 0, que não colide com corpo nenhum (só o controlador do personagem, que
 * não olha grupos, continuava pisando). Foi assim que o caixote, as peças soltas e o galho do Bosque
 * atravessavam a ilha.
 */
export function gruposDoColisor(soDoCorpo: boolean): { collisionGroups?: number } {
  return soDoCorpo ? { collisionGroups: GRUPO_SO_DO_CORPO } : {}
}
