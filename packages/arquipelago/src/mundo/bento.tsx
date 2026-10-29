import { useMemo } from 'react'
import type { Object3D } from 'three'
import bentoGlb from '../assets/personagens/bento.glb'
import { PAINEL_DO_BENTO } from '../estado/moradores'
import { BENTO_NA_VILA } from '../sistemas/bento'
import { comecarConversaComOBento } from '../sistemas/conversa-do-bento'
import { paraOMundo } from './bosque'
import { MoradorDaIlha, type MoradorNoMundo } from './morador'

const BENTO: MoradorNoMundo = {
  quem: 'bento',
  url: new URL(bentoGlb, import.meta.url).href,
  painel: PAINEL_DO_BENTO,
  rotulo: 'Conversar com o Bento',
  medidas: BENTO_NA_VILA,
  alturaDaCabeca: BENTO_NA_VILA.alturaDaCabeca,
  comecar: comecarConversaComOBento,
}

/**
 * O Bento na frente da padaria (a âncora `morador` do `vila-doce.glb`), de costas para a porta
 * (a âncora `padaria`), olhando para a praça. O painel é `interface/bento.tsx`.
 */
export function Bento({
  modelo,
  meio,
  giro,
}: {
  /** O modelo da ilha completa (as âncoras). */
  modelo: Object3D
  meio: { x: number; y: number; z: number }
  giro: number
}) {
  const lugar = useMemo(() => {
    const morador = modelo.getObjectByName('morador')?.position ?? { x: -1.49, y: 1, z: -5.66 }
    const porta = modelo.getObjectByName('padaria')?.position ?? { x: -1.54, y: 1, z: -6.63 }
    const p = paraOMundo(morador, meio, giro, { x: 0, y: 0, z: 0 })
    const descanso = Math.atan2(morador.x - porta.x, morador.z - porta.z) + giro
    return { ...p, descanso }
  }, [modelo, meio, giro])
  return <MoradorDaIlha morador={BENTO} lugar={lugar} meio={meio} />
}
