import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { type RefObject, useMemo, useRef } from 'react'
import { type Bone, type Group, type Object3D, Vector3 } from 'three'
import lanternaGlb from '../assets/itens/lanterna.glb'

const LANTERNA_URL = new URL(lanternaGlb, import.meta.url).href
/** O osso que segura a alça (o mesmo esqueleto Mixamo dos braços no cipó). */
export const OSSO_DA_LANTERNA = 'mixamorigRightHand'
/** A lanterna do arquivo tem 33 cm; na mão grande do avatar (1,6 m) ela cresce para uns 46. */
export const ESCALA_DA_LANTERNA = 1.4
/**
 * O osso da mão fica no punho: a alça vai na ponta dos dedos (para baixo dele) e um pouco para
 * fora do corpo, senão a mão tapa a lanterna.
 */
export const ALCA_ABAIXO_DO_PUNHO = 0.11
export const ALCA_PARA_FORA = 0.04

/**
 * A lanterna acesa pendurada na mão direita (fase2-06). Fica dentro do `avatar-visual`, de pé no
 * referencial do avatar (pende reta, vira com ele), com o vazio `mao` do arquivo (a alça) na ponta
 * dos dedos a cada quadro, depois da pose. O papel brilha pelo material `luz` do arquivo, sem luz de
 * verdade na cena (uma luz a mais recompilaria todos os materiais ao acender e apagar).
 */
export function LanternaNaMao({
  avatar,
  personagem,
}: {
  avatar: RefObject<Object3D | null>
  personagem: RefObject<Object3D | null>
}) {
  const gltf = useGLTF(LANTERNA_URL, false, false)
  const { lanterna, alca } = useMemo(() => {
    const no = gltf.scene.getObjectByName('lanterna')
    const mao = gltf.scene.getObjectByName('mao')
    return { lanterna: no ? no.clone() : null, alca: mao ? mao.position.y : 0 }
  }, [gltf])
  const grupo = useRef<Group>(null)
  const osso = useRef<Bone | null>(null)
  const ponto = useMemo(() => new Vector3(), [])

  useFrame(() => {
    const a = avatar.current
    const corpo = personagem.current
    const g = grupo.current
    if (!a || !corpo || !g) return
    // O avatar pode remontar as peças (e o esqueleto): procura de novo se o osso saiu da cena.
    if (!osso.current?.parent) {
      osso.current = null
      corpo.traverse((o) => {
        if (!osso.current && (o as Bone).isBone && o.name === OSSO_DA_LANTERNA)
          osso.current = o as Bone
      })
    }
    if (!osso.current) {
      g.visible = false
      return
    }
    osso.current.getWorldPosition(ponto)
    a.worldToLocal(ponto)
    const lado = Math.hypot(ponto.x, ponto.z) || 1
    g.position.set(
      ponto.x + (ponto.x / lado) * ALCA_PARA_FORA,
      ponto.y - ALCA_ABAIXO_DO_PUNHO - alca * ESCALA_DA_LANTERNA,
      ponto.z + (ponto.z / lado) * ALCA_PARA_FORA,
    )
    g.visible = true
  })

  return lanterna ? (
    <group ref={grupo} name="lanterna-na-mao" visible={false} scale={ESCALA_DA_LANTERNA}>
      <primitive object={lanterna} />
    </group>
  ) : null
}
