import { type Bone, type Object3D, Quaternion, Vector3 } from 'three'

/**
 * Os braços para cima no cipó e no tronco. As poses da plataforma (`Poses.glb`) não têm uma de
 * segurar no alto, então, depois da pose de cada quadro, o braço e o antebraço de cada lado são
 * apontados para cima (o mesmo rumo: braço esticado). Os ossos são os do Mixamo, com o nome que o
 * `GLTFLoader` deixa (sem os dois-pontos).
 */
const OSSOS = {
  esquerdo: ['mixamorigLeftArm', 'mixamorigLeftForeArm'],
  direito: ['mixamorigRightArm', 'mixamorigRightForeArm'],
} as const

/**
 * Para onde cada braço aponta, no corpo do avatar (ele olha para +z; a esquerda dele é +x). No
 * cipó as mãos se juntam na corda, em cima da cabeça; no tronco elas vão para cima e para a frente,
 * na casca.
 */
const RUMOS = {
  cipo: { esquerdo: new Vector3(0.18, 1, 0.08), direito: new Vector3(-0.18, 1, 0.08) },
  escalada: { esquerdo: new Vector3(0.35, 0.85, 0.5), direito: new Vector3(-0.35, 0.85, 0.5) },
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
const alvo = new Vector3()

/** Aponta os braços para cima (depois de a pose deste quadro ter sido aplicada). */
export function levantarBracos(
  bracos: BracosDoAvatar,
  corpo: Object3D,
  modo: keyof typeof RUMOS,
): void {
  corpo.getWorldQuaternion(giroDoCorpo)
  for (const lado of ['esquerdo', 'direito'] as const) {
    alvo.copy(RUMOS[modo][lado]).normalize().applyQuaternion(giroDoCorpo)
    for (const osso of bracos[lado]) {
      const pai = osso.parent
      if (!pai) continue
      // O osso cresce no +y dele: gira o mundo dele até esse +y apontar para o alvo.
      osso.getWorldQuaternion(doOsso)
      eixo.set(0, 1, 0).applyQuaternion(doOsso)
      troca.setFromUnitVectors(eixo, alvo)
      doOsso.premultiply(troca)
      pai.getWorldQuaternion(doPai).invert()
      osso.quaternion.copy(doPai.multiply(doOsso))
      osso.updateMatrixWorld(true)
    }
  }
}
