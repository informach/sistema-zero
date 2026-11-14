import { type Bone, type Object3D, Quaternion, Vector3 } from 'three'
import { CIPO } from '../sistemas/cipo'
import { CORPO } from '../sistemas/corpo'
import { ikDeDoisOssos } from './ik'

/**
 * As mãos na corda do cipó. Até a arte mandar a animação de se pendurar, o cipó usa a pose do ar
 * (`POSE_DO_ESTADO.Corda`), e depois da pose de cada quadro cada braço é dobrado por IK de dois
 * ossos (`ik.ts`) até o ponto de segurar do pack (`LeftHandProp`/`RightHandProp`, o encaixe
 * `mao_*` do catálogo) chegar à corda.
 *
 * O pack é chibi: a cabeça é quase metade do corpo e o braço é curto (ombro a 0,99 m e braço de
 * 0,48 m na ponte de 1,85). As mãos seguram meio braço acima do ombro, e a corda passa logo fora da
 * cabeça, do lado esquerdo: a mão esquerda chega; a direita cruza o peito e chega esticada.
 */
const OSSOS = {
  esquerdo: ['LeftArm', 'LeftForeArm', 'LeftHand', 'LeftHandProp'],
  direito: ['RightArm', 'RightForeArm', 'RightHand', 'RightHandProp'],
} as const

const m = CORPO.medidas
/** A altura das mãos na corda, do pé. */
const MAOS_NA_CORDA = CORPO.doCentroAoPe + CIPO.maosAcimaDoCentro
/** O raio da cabeça (uma bola) na altura das mãos: a corda passa fora dele. */
const CABECA_NA_ALTURA_DAS_MAOS = Math.sqrt(
  Math.max(0, m.headRadius ** 2 - (m.headCenter - MAOS_NA_CORDA) ** 2),
)
/** A folga entre a corda e a cabeça (a corda desenhada tem uns 4 cm de raio). */
const FOLGA_DA_CORDA = 0.06

/**
 * Onde a corda passa no corpo do avatar (metros a partir dos pés; ele olha para +z e a esquerda
 * dele é +x): ao lado da cabeça, do lado esquerdo, um pouco à frente, na altura das mãos do cipó.
 * É como se pendura numa corda de verdade, com a cabeça ao lado dela. O personagem põe o corpo de
 * modo que este ponto caia em cima da corda.
 */
export const CORDA_NO_CORPO = new Vector3(
  CABECA_NA_ALTURA_DAS_MAOS + FOLGA_DA_CORDA,
  MAOS_NA_CORDA,
  0.1,
)

/** O corpo pende para trás no cipó (radianos), além da pose: nada por enquanto. */
export const INCLINACAO_NO_CIPO = 0

/** A mão esquerda segura um palmo acima da direita, como quem sobe numa corda. */
const PALMO = 0.08
const PEGADA_NO_CIPO = {
  esquerdo: new Vector3(CORDA_NO_CORPO.x, CORDA_NO_CORPO.y + PALMO / 2, CORDA_NO_CORPO.z),
  direito: new Vector3(CORDA_NO_CORPO.x, CORDA_NO_CORPO.y - PALMO / 2, CORDA_NO_CORPO.z),
} as const

/** Para onde o cotovelo aponta (para fora e para baixo, como quem se pendura). */
const COTOVELO = {
  esquerdo: new Vector3(1, -1, -0.2).normalize(),
  direito: new Vector3(-1, -1, -0.2).normalize(),
} as const

export interface BracosDoAvatar {
  /** Braço, antebraço, mão e o ponto de segurar, de cada lado. */
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
const alvo = new Vector3()
const polo = new Vector3()
const punho = new Vector3()
const pegada = new Vector3()

/** Fecha as mãos na corda (depois de a pose deste quadro ter sido aplicada). */
export function segurarACorda(bracos: BracosDoAvatar, corpo: Object3D): void {
  corpo.getWorldQuaternion(giroDoCorpo)
  for (const lado of ['esquerdo', 'direito'] as const) {
    const [osso, ante, mao, ponto] = bracos[lado]
    if (!osso || !ante || !mao || !ponto) continue
    polo.copy(COTOVELO[lado]).applyQuaternion(giroDoCorpo)
    // O punho vai para onde a pegada fica na corda, menos o caminho do punho ao ponto de segurar:
    // é o ponto de segurar que encosta na corda, não o punho. A mão gira junto com o antebraço,
    // então esse caminho é medido de novo depois da primeira volta.
    for (let volta = 0; volta < 2; volta++) {
      alvo.copy(PEGADA_NO_CIPO[lado])
      corpo.localToWorld(alvo)
      mao.getWorldPosition(punho)
      ponto.getWorldPosition(pegada)
      alvo.sub(pegada.sub(punho))
      ikDeDoisOssos(osso, ante, mao, alvo, polo)
    }
  }
}
