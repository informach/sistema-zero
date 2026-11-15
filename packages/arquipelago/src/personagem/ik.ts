/**
 * IK de dois ossos (braço e antebraço, coxa e canela), pela lei dos cossenos. Gira cada osso pela
 * direção até o FILHO, medida nas posições de mundo: não supõe para que eixo o osso cresce (o
 * Mixamo usa +y; o pack não precisa usar), nem a escala do esqueleto. Nada aloca: os vetores de
 * trabalho são do módulo. Roda depois da pose do quadro (o mixer já pôs os ossos).
 */
import { type Object3D, Quaternion, Vector3 } from 'three'

const a0 = new Vector3()
const a1 = new Vector3()
const a2 = new Vector3()
const rumo = new Vector3()
const lado = new Vector3()
const dir = new Vector3()
const atual = new Vector3()
const qOsso = new Quaternion()
const qPai = new Quaternion()
const troca = new Quaternion()

/**
 * Gira `osso` (no mundo) para que o caminho dele até `filho` aponte para `para` (unitário). Só o
 * menor giro: a torção em volta do eixo do osso fica como a pose deixou.
 */
export function apontarOsso(osso: Object3D, filho: Object3D, para: Vector3): void {
  const pai = osso.parent
  if (!pai) return
  osso.getWorldPosition(a0)
  filho.getWorldPosition(atual)
  atual.sub(a0)
  if (atual.lengthSq() < 1e-12) return
  atual.normalize()
  troca.setFromUnitVectors(atual, para)
  osso.getWorldQuaternion(qOsso)
  qOsso.premultiply(troca)
  pai.getWorldQuaternion(qPai).invert()
  osso.quaternion.copy(qPai.multiply(qOsso))
  osso.updateMatrixWorld(true)
}

/**
 * Leva a `ponta` (o filho do `meio`) até `alvo` (no mundo), dobrando a junta do `meio` para o lado
 * do `polo` (uma direção no mundo: para onde o cotovelo ou o joelho aponta). Fora do alcance, o
 * membro estica reto na direção do alvo. Devolve a distância que sobrou até o alvo (0 se chegou).
 */
export function ikDeDoisOssos(
  raiz: Object3D,
  meio: Object3D,
  ponta: Object3D,
  alvo: Vector3,
  polo: Vector3,
): number {
  raiz.getWorldPosition(a0)
  meio.getWorldPosition(a1)
  ponta.getWorldPosition(a2)
  const a = a0.distanceTo(a1)
  const b = a1.distanceTo(a2)
  if (a < 1e-6 || b < 1e-6) return alvo.distanceTo(a2)
  rumo.subVectors(alvo, a0)
  const longe = rumo.length()
  if (longe < 1e-6) return 0
  // Sem passar do comprimento do membro (longe demais, estica) nem dobrar sobre si mesmo.
  const d = Math.min(Math.max(longe, Math.abs(a - b) + 1e-4), a + b - 1e-4)
  rumo.divideScalar(longe)
  // Lei dos cossenos: o ângulo na raiz entre o rumo do alvo e o primeiro osso.
  const cosA = Math.min(1, Math.max(-1, (a * a + d * d - b * b) / (2 * a * d)))
  const senA = Math.sqrt(1 - cosA * cosA)
  // O polo sem a parte que vai na direção do alvo: o lado para onde a junta dobra.
  lado.copy(polo).addScaledVector(rumo, -polo.dot(rumo))
  if (lado.lengthSq() < 1e-10) {
    // Polo na mesma linha do alvo: dobra para o lado em que a junta já está.
    atual.subVectors(a1, a0)
    lado.copy(atual).addScaledVector(rumo, -atual.dot(rumo))
    if (lado.lengthSq() < 1e-10) lado.set(0, 1, 0).addScaledVector(rumo, -rumo.y)
  }
  lado.normalize()
  dir.copy(rumo).multiplyScalar(cosA).addScaledVector(lado, senA)
  apontarOsso(raiz, meio, dir)
  // O segundo osso, do meio novo até o ponto do alvo dentro do alcance.
  meio.getWorldPosition(a1)
  dir.copy(a0).addScaledVector(rumo, d).sub(a1).normalize()
  apontarOsso(meio, ponta, dir)
  ponta.getWorldPosition(a2)
  return a2.distanceTo(alvo)
}
