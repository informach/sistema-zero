import { useEffect, useMemo, useRef } from 'react'
import { type Group, Vector3 } from 'three'
import planadorGlb from '../assets/movimento/planador.glb'
import { useEstado } from '../estado/contexto'
import { trocarClipe, useCopiaAnimada } from '../mundo/animado'
import { NO_PLANADOR } from '../sistemas/lugares-dos-clipes'
import { jogoPausado } from '../sistemas/pausa'

const URL_DO_PLANADOR = new URL(planadorGlb, import.meta.url).href
const SEM_UMA_VEZ: readonly string[] = []
/**
 * Onde a barra do planador fica no desenho do avatar (metros a partir dos pés, olhando para +z):
 * nas duas mãos do clipe `planar` da arte, que mediu a barra acima e à frente da origem
 * (`NO_PLANADOR`). As mãos seguram ali a barra do pack (`mao_barra_planador`); a asa do arquivo
 * fica uns 1,2 m acima dela, por cima da cabeça e do cabelo. O vazio `pegada` do arquivo é a barra.
 */
export const BARRA_NO_AVATAR = { y: NO_PLANADOR.barra, z: NO_PLANADOR.aFrente } as const

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
