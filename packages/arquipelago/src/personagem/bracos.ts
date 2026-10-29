import { type Bone, type Object3D, Quaternion, Vector3 } from 'three'
import { CIPO } from '../sistemas/cipo'
import { CORPO } from '../sistemas/corpo'

/**
 * As mãos na corda do cipó. As poses da plataforma (`Poses.glb`) não têm uma de segurar uma corda,
 * então, depois da pose de cada quadro, cada braço é dobrado por IK de dois ossos (braço e
 * antebraço) até o punho chegar ao ponto da pegada. Os ossos são os do Mixamo, com o nome que o
 * `GLTFLoader` deixa (sem os dois-pontos).
 *
 * O avatar é chibi: o ombro fica a 1,01 m do pé, do ombro ao punho são 0,36 m e a cabeça é grande
 * (vai de 1,28 m a 2,13 m, 0,98 m de largura, com o rosto 0,44 m à frente). Por isso as mãos
 * seguram na altura do queixo, não acima da cabeça.
 */
const OSSOS = {
  esquerdo: ['mixamorigLeftArm', 'mixamorigLeftForeArm', 'mixamorigLeftHand'],
  direito: ['mixamorigRightArm', 'mixamorigRightForeArm', 'mixamorigRightHand'],
} as const

/**
 * Onde a corda passa no corpo do avatar (metros a partir dos pés; ele olha para +z e a esquerda
 * dele é +x): ao lado do rosto, do lado esquerdo, na altura das mãos do cipó
 * (`CIPO.maosAcimaDoCentro` acima do centro). É como se pendura numa corda de verdade, com a
 * cabeça ao lado dela; e a cabeça grande do avatar não entra na corda. O personagem põe o corpo de
 * modo que este ponto caia em cima da corda.
 */
export const CORDA_NO_CORPO = new Vector3(0.24, CORPO.doCentroAoPe + CIPO.maosAcimaDoCentro, 0.4)

/** O corpo pende um pouco para trás no cipó (radianos), com os braços à frente. */
export const INCLINACAO_NO_CIPO = 0.3

/**
 * Onde cada punho segura: um pouco antes da corda (a palma passa do punho e fecha em volta dela),
 * a mão esquerda logo acima da direita. O braço direito, curto, cruza o peito e chega esticado.
 */
const PEGADA_NO_CIPO = {
  esquerdo: new Vector3(CORDA_NO_CORPO.x - 0.02, CORDA_NO_CORPO.y + 0.1, CORDA_NO_CORPO.z - 0.1),
  direito: new Vector3(CORDA_NO_CORPO.x - 0.08, CORDA_NO_CORPO.y - 0.06, CORDA_NO_CORPO.z - 0.1),
} as const

/** Para onde o cotovelo aponta (para fora e para baixo, como quem se pendura). */
const COTOVELO = {
  esquerdo: new Vector3(1, -1, -0.2).normalize(),
  direito: new Vector3(-1, -1, -0.2).normalize(),
} as const

export interface BracosDoAvatar {
  esquerdo: Bone[]
  direito: Bone[]
}

/** Procura os ossos dos braços (uma vez, depois que o avatar carregou). */
export function acharBracos(raiz: Object3D): BracosDoAvatar | null {
  const achados: BracosDoAvatar = { esquerdo: [], direito: [] }
  for (const lado of ['esquerdo', 'direito'] as const) {
    for (const nome of OSSOS[lado]) {
      const osso = raiz.getObjectByName(nome) as Bone | undefined
      if (!osso?.isBone) return null
      achados[lado].push(osso)
    }
  }
  return achados
}

const giroDoCorpo = new Quaternion()
const doOsso = new Quaternion()
const doPai = new Quaternion()
const troca = new Quaternion()
const eixo = new Vector3()
const ombro = new Vector3()
const cotovelo = new Vector3()
const punho = new Vector3()
const alvo = new Vector3()
const rumo = new Vector3()
const polo = new Vector3()
const braco = new Vector3()

/** Fecha as mãos na corda (depois de a pose deste quadro ter sido aplicada). */
export function segurarACorda(bracos: BracosDoAvatar, corpo: Object3D): void {
  corpo.getWorldQuaternion(giroDoCorpo)
  for (const lado of ['esquerdo', 'direito'] as const) {
    const [osso, ante, mao] = bracos[lado]
    if (!osso || !ante || !mao) continue
    osso.getWorldPosition(ombro)
    ante.getWorldPosition(cotovelo)
    mao.getWorldPosition(punho)
    const a = ombro.distanceTo(cotovelo)
    const b = cotovelo.distanceTo(punho)
    alvo.copy(PEGADA_NO_CIPO[lado])
    corpo.localToWorld(alvo)
    // Do ombro ao alvo, sem passar do comprimento do braço (longe demais, estica reto).
    rumo.subVectors(alvo, ombro)
    const d = Math.min(Math.max(rumo.length(), Math.abs(a - b) + 1e-4), a + b - 1e-4)
    rumo.normalize()
    // Lei dos cossenos: o ângulo no ombro entre o rumo do alvo e o braço.
    const cosA = Math.min(1, Math.max(-1, (a * a + d * d - b * b) / (2 * a * d)))
    const senA = Math.sqrt(1 - cosA * cosA)
    polo.copy(COTOVELO[lado]).applyQuaternion(giroDoCorpo)
    polo.addScaledVector(rumo, -polo.dot(rumo)).normalize()
    braco.copy(rumo).multiplyScalar(cosA).addScaledVector(polo, senA)
    apontar(osso, braco)
    // O antebraço vai do cotovelo novo até o alvo (no alcance).
    cotovelo.copy(ombro).addScaledVector(braco, a)
    alvo.copy(ombro).addScaledVector(rumo, d)
    apontar(ante, braco.subVectors(alvo, cotovelo).normalize())
  }
}

/** Gira o osso (no mundo) até o +y dele, a direção em que ele cresce, apontar para `para`. */
function apontar(osso: Bone, para: Vector3): void {
  const pai = osso.parent
  if (!pai) return
  osso.getWorldQuaternion(doOsso)
  eixo.set(0, 1, 0).applyQuaternion(doOsso)
  troca.setFromUnitVectors(eixo, para)
  doOsso.premultiply(troca)
  pai.getWorldQuaternion(doPai).invert()
  osso.quaternion.copy(doPai.multiply(doOsso))
  osso.updateMatrixWorld(true)
}
