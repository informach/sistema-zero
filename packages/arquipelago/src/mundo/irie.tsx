import { useMemo } from 'react'
import type { Object3D } from 'three'
import irieGlb from '../assets/personagens/irie.glb'
import { PAINEL_DA_IRIE } from '../estado/moradores'
import { comecarConversaComAIrie, IRIE_NAS_NUVENS } from '../sistemas/irie'
import { MoradorDaIlha, type MoradorNoMundo } from './morador'
import { lugarDaIrie } from './nuvens'

export const IRIE: MoradorNoMundo = {
  quem: 'irie',
  url: new URL(irieGlb, import.meta.url).href,
  painel: PAINEL_DA_IRIE,
  rotulo: 'Conversar com a Iriê',
  medidas: IRIE_NAS_NUVENS,
  alturaDaCabeca: IRIE_NAS_NUVENS.alturaDaCabeca,
  comecar: comecarConversaComAIrie,
}

export function Irie({
  modelo,
  meio,
  giro,
}: {
  modelo: Object3D
  meio: { x: number; y: number; z: number }
  giro: number
}) {
  const lugar = useMemo(() => lugarDaIrie(modelo, meio, giro), [modelo, meio, giro])
  return lugar ? <MoradorDaIlha morador={IRIE} lugar={lugar} meio={meio} /> : null
}
