import { useMemo } from 'react'
import type { Object3D } from 'three'
import mareGlb from '../assets/personagens/mare.glb'
import { PAINEL_DA_MARE } from '../estado/moradores'
import { comecarConversaComAMare, MARE_NO_RECIFE } from '../sistemas/mare'
import { MoradorDaIlha, type MoradorNoMundo } from './morador'
import { lugarDaMare } from './recife'

const MARE: MoradorNoMundo = {
  quem: 'mare',
  url: new URL(mareGlb, import.meta.url).href,
  painel: PAINEL_DA_MARE,
  rotulo: 'Conversar com a Maré',
  medidas: MARE_NO_RECIFE,
  alturaDaCabeca: MARE_NO_RECIFE.alturaDaCabeca,
  comecar: comecarConversaComAMare,
}

export function Mare({
  modelo,
  meio,
  giro,
}: {
  modelo: Object3D
  meio: { x: number; y: number; z: number }
  giro: number
}) {
  const lugar = useMemo(() => lugarDaMare(modelo, meio, giro), [modelo, meio, giro])
  return lugar ? <MoradorDaIlha morador={MARE} lugar={lugar} meio={meio} /> : null
}
