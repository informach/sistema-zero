import { useMemo } from 'react'
import type { Object3D } from 'three'
import jadeGlb from '../assets/personagens/jade.glb'
import { PAINEL_DA_JADE } from '../estado/moradores'
import { comecarConversaComAJade, JADE_NO_VALE } from '../sistemas/jade'
import { MoradorDaIlha, type MoradorNoMundo } from './morador'
import { lugarDaJade } from './vale'

const JADE: MoradorNoMundo = {
  quem: 'jade',
  url: new URL(jadeGlb, import.meta.url).href,
  painel: PAINEL_DA_JADE,
  rotulo: 'Conversar com a Jade',
  medidas: JADE_NO_VALE,
  alturaDaCabeca: JADE_NO_VALE.alturaDaCabeca,
  comecar: comecarConversaComAJade,
}

export function Jade({
  modelo,
  meio,
  giro,
}: {
  modelo: Object3D
  meio: { x: number; y: number; z: number }
  giro: number
}) {
  const lugar = useMemo(() => lugarDaJade(modelo, meio, giro), [modelo, meio, giro])
  return lugar ? <MoradorDaIlha morador={JADE} lugar={lugar} meio={meio} /> : null
}
