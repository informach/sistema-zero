import { type Mesh, type Object3D, Vector3 } from 'three'
import type { AguaRasa } from '../estado/contexto'
import { paraOMundo } from './bosque'

type Ponto = { x: number; y: number; z: number }

/** A porta e a marca em frente dela definem onde a Maré fica e para onde olha. */
export function lugarDaMare(modelo: Object3D, meio: Ponto, giro: number) {
  const casa = modelo.getObjectByName('casa-mare')
  const frente = modelo.getObjectByName('morador')
  if (!casa || !frente) return null
  const p = paraOMundo(casa.position, meio, giro, { x: 0, y: 0, z: 0 })
  return {
    ...p,
    descanso:
      Math.atan2(frente.position.x - casa.position.x, frente.position.z - casa.position.z) + giro,
  }
}

/**
 * Contrato do lago, como no Bosque: uma malha elíptica `agua`, sem giro próprio, e uma bacia no
 * col-terreno. Sem a malha, não inventamos água sobre o chão.
 */
export function aguaDoRecife(modelo: Object3D, meio: Ponto, giro: number): AguaRasa | null {
  const no = modelo.getObjectByName('agua') as Mesh | undefined
  if (!no?.isMesh) return null
  no.geometry.computeBoundingBox()
  const b = no.geometry.boundingBox
  if (!b || b.isEmpty()) return null
  const centro = b.getCenter(new Vector3()).add(no.position)
  const p = paraOMundo(centro, meio, giro, { x: 0, y: 0, z: 0 })
  return {
    id: 'recife:lagoa',
    x: p.x,
    z: p.z,
    raioX: (b.max.x - b.min.x) / 2,
    raioZ: (b.max.z - b.min.z) / 2,
    giro,
    y: meio.y + b.max.y + no.position.y,
  }
}
