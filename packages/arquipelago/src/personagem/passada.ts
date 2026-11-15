import { type Object3D, Quaternion, Vector3 } from 'three'
import { ikDeDoisOssos } from './ik'
import type { PernasDoAvatar } from './pes-no-chao'

const alvos = [new Vector3(), new Vector3()]
const giros = [new Quaternion(), new Quaternion()]
const quadril = new Vector3(),
  coxa = new Vector3(),
  joelho = new Vector3(),
  pe = new Vector3()
const local = new Vector3(),
  centro = new Vector3(),
  polo = new Vector3(),
  rotacao = new Quaternion()

/** Amplia a passada por IK: comprimentos dos ossos e escala do avatar permanecem intactos. */
export function ampliarPassada(pernas: PernasDoAvatar, raiz: Object3D, fator: number): number {
  if (fator <= 1.0001) return 0
  raiz.updateWorldMatrix(true, true)
  pernas.quadril.getWorldPosition(quadril)
  centro.copy(quadril)
  raiz.worldToLocal(centro)
  let baixar = 0
  for (let i = 0; i < 2; i++) {
    const [a, b, c] = i === 0 ? pernas.esquerda : pernas.direita
    if (!a || !b || !c) continue
    a.getWorldPosition(coxa)
    b.getWorldPosition(joelho)
    c.getWorldPosition(pe)
    c.getWorldQuaternion(giros[i]!)
    const alcance = coxa.distanceTo(joelho) + joelho.distanceTo(pe) - 0.001
    local.copy(pe)
    raiz.worldToLocal(local)
    local.z = centro.z + (local.z - centro.z) * fator
    alvos[i]!.copy(local)
    raiz.localToWorld(alvos[i]!)
    const horizontal = Math.hypot(alvos[i]!.x - coxa.x, alvos[i]!.z - coxa.z)
    const vertical = Math.sqrt(Math.max(0, alcance * alcance - horizontal * horizontal))
    baixar = Math.max(baixar, coxa.y - alvos[i]!.y - vertical)
  }
  // A compensação não deve transformar a corrida em agachamento.
  baixar = Math.min(baixar, 0.08 * raiz.getWorldScale(local).y)
  if (baixar > 0) {
    quadril.y -= baixar
    pernas.quadril.parent!.worldToLocal(quadril)
    pernas.quadril.position.copy(quadril)
    pernas.quadril.updateMatrixWorld(true)
  }
  raiz.getWorldQuaternion(rotacao)
  polo.set(0, 0, 1).applyQuaternion(rotacao)
  let erro = 0
  for (let i = 0; i < 2; i++) {
    const [a, b, c] = i === 0 ? pernas.esquerda : pernas.direita
    if (!a || !b || !c) continue
    erro = Math.max(erro, ikDeDoisOssos(a, b, c, alvos[i]!, polo))
    c.parent!.getWorldQuaternion(rotacao).invert()
    c.quaternion.copy(rotacao.multiply(giros[i]!))
    c.updateMatrixWorld(true)
  }
  return erro
}
