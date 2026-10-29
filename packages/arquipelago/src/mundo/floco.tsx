import { useMemo } from 'react'
import type { Object3D } from 'three'
import flocoGlb from '../assets/personagens/floco.glb'
import { PAINEL_DO_FLOCO } from '../estado/moradores'
import { comecarConversaComOFloco, FLOCO_NO_PICO } from '../sistemas/floco'
import { MoradorDaIlha, type MoradorNoMundo } from './morador'
import { lugarDoFloco } from './pico'

const FLOCO: MoradorNoMundo = {
  quem: 'floco',
  url: new URL(flocoGlb, import.meta.url).href,
  painel: PAINEL_DO_FLOCO,
  rotulo: 'Conversar com o Floco',
  medidas: FLOCO_NO_PICO,
  alturaDaCabeca: FLOCO_NO_PICO.alturaDaCabeca,
  comecar: comecarConversaComOFloco,
}

export function Floco({
  modelo,
  meio,
  giro,
}: {
  modelo: Object3D
  meio: { x: number; y: number; z: number }
  giro: number
}) {
  const lugar = useMemo(() => lugarDoFloco(modelo, meio, giro), [modelo, meio, giro])
  return lugar ? <MoradorDaIlha morador={FLOCO} lugar={lugar} meio={meio} /> : null
}
