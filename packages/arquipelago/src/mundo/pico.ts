import type { Object3D } from 'three'
import { paraOMundo } from './bosque'

type Ponto = { x: number; y: number; z: number }

/**
 * O Floco fica em cima do tablado do palco (âncora `palco`, no topo dele) e olha para a marca
 * `morador`, na frente do palco, de onde a criança chega pelo caminho.
 */
export function lugarDoFloco(modelo: Object3D, meio: Ponto, giro: number) {
  const palco = modelo.getObjectByName('palco')
  const frente = modelo.getObjectByName('morador')
  if (!palco || !frente) return null
  const p = paraOMundo(palco.position, meio, giro, { x: 0, y: 0, z: 0 })
  return {
    ...p,
    descanso:
      Math.atan2(frente.position.x - palco.position.x, frente.position.z - palco.position.z) + giro,
  }
}
