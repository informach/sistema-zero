import nicoGlb from '../assets/personagens/nico.glb'
import { PAINEL_DO_NICO } from '../estado/moradores'
import { HABITANTES_DA_PRAIA } from '../sistemas/habitantes-da-praia'
import { comecarConversaComONico, NICO_NA_PRAIA } from '../sistemas/nico'
import { alturaDaIlha } from './medidas'
import { ComReserva } from './modelos'
import { MoradorDaIlha, type MoradorNoMundo } from './morador'

export const NICO: MoradorNoMundo = {
  quem: 'nico',
  url: new URL(nicoGlb, import.meta.url).href,
  painel: PAINEL_DO_NICO,
  rotulo: 'Conversar com o Nico',
  medidas: NICO_NA_PRAIA,
  alturaDaCabeca: NICO_NA_PRAIA.alturaDaCabeca,
  comecar: (s, dia) => comecarConversaComONico(s, dia),
}

const { x, z, giro } = HABITANTES_DA_PRAIA.nico
const LUGAR = { x, y: alturaDaIlha(x, z), z, descanso: giro }
const MEIO = { x: 0, z: 0 }

/** O Nico na areia da sua ilha, no mesmo lugar de antes, agora com conversa (§6.28, A19). */
export function Nico() {
  return (
    <ComReserva reserva={null}>
      <MoradorDaIlha morador={NICO} lugar={LUGAR} meio={MEIO} />
    </ComReserva>
  )
}
