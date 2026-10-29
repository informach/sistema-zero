import { useEffect, useMemo, useRef } from 'react'
import { type Group, Vector3 } from 'three'
import planadorGlb from '../assets/movimento/planador.glb'
import { useEstado } from '../estado/contexto'
import { trocarClipe, useCopiaAnimada } from '../mundo/animado'
import { jogoPausado } from '../sistemas/pausa'

const URL_DO_PLANADOR = new URL(planadorGlb, import.meta.url).href
const SEM_UMA_VEZ: readonly string[] = []
/**
 * Onde a barra do planador fica no desenho do avatar (metros a partir dos pés, olhando para +z):
 * nas mãos do clipe "Planar", fechadas na frente do peito (o script do Mixamo põe as mãos nesta
 * altura e mede 0,2 m à frente). A asa fica uns 1,2 m acima dela, por cima da cabeça e do cabelo.
 * O vazio `pegada` do arquivo é a barra.
 */
export const BARRA_NO_AVATAR = { y: 1.25, z: 0.2 } as const

/**
 * O planador aberto em cima da criança (fase3-09): o `planador.glb` do kit de movimento, com as
 * asas no clipe `planar`, dentro do desenho do avatar (vira com ele). Só aparece no modo planar; o
 * clipe para com o jogo pausado e vai mais devagar com menos movimento (`useCopiaAnimada`).
 */
export function PlanadorAberto() {
  const aberto = useEstado((s) => s.modo === 'planar')
  const pausado = useEstado(jogoPausado)
  const raiz = useRef<Group>(null)
  const { cena, actions } = useCopiaAnimada(URL_DO_PLANADOR, raiz, SEM_UMA_VEZ, pausado)
  // Onde a barra fica no referencial do arquivo (a pose parada), para pô-la nas mãos.
  const barra = useMemo(() => {
    const p = new Vector3()
    const pegada = cena.getObjectByName('pegada')
    if (!pegada) return p
    pegada.getWorldPosition(p)
    return cena.worldToLocal(p)
  }, [cena])
  useEffect(() => {
    if (aberto) trocarClipe(actions, null, 'planar', 0, 'planador')
  }, [aberto, actions])
  return (
    <group
      ref={raiz}
      visible={aberto}
      position={[-barra.x, BARRA_NO_AVATAR.y - barra.y, BARRA_NO_AVATAR.z - barra.z]}
    >
      <primitive object={cena} />
    </group>
  )
}
