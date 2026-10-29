import type { Object3D } from 'three'
import { paraOMundo } from './bosque'

type Ponto = { x: number; y: number; z: number }

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
