import type { Object3D } from 'three'
import { paraOMundo } from './bosque'

type Ponto = { x: number; y: number; z: number }

/**
 * O meio do deque do mirante das constelações nas Nuvens (fase4-07), no referencial do `nuvens.glb`.
 * O `nuvens-constelacoes.glb` já vem nesse referencial, com o mirante aqui (`MIRANTE_NO_ARQUIVO`):
 * o jogo leva o arquivo da diferença. Fica em constante até o `nuvens.glb` ganhar a âncora `mirante`
 * (pedido de arte do plano da fase4-07); o teste confere chão livre e alcance a pé.
 */
export const MIRANTE_DAS_NUVENS = { x: -6, y: 1, z: -8 } as const
export const MIRANTE_NO_ARQUIVO = { x: -6, y: 1, z: -8 } as const

/** Na âncora do chão, olhando para a chegada. O meio inclui a altura da ilha. */
export function lugarDaIrie(modelo: Object3D, meio: Ponto, giro: number) {
  const morador = modelo.getObjectByName('morador')
  const chegada = modelo.getObjectByName('chegada')
  if (!morador || !chegada) return null
  const p = paraOMundo(morador.position, meio, giro, { x: 0, y: 0, z: 0 })
  return {
    ...p,
    descanso:
      Math.atan2(chegada.position.x - morador.position.x, chegada.position.z - morador.position.z) +
      giro,
  }
}
