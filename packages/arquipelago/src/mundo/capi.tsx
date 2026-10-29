import { useMemo } from 'react'
import type { Object3D } from 'three'
import capiGlb from '../assets/personagens/capi.glb'
import { PAINEL_DA_CAPI } from '../estado/moradores'
import { comecarConversa } from '../sistemas/conversa-da-capi'
import { CAPI_NO_BOSQUE } from '../sistemas/moradores'
import { paraOMundo } from './bosque'
import { MoradorDaIlha, type MoradorNoMundo } from './morador'

const CAPI: MoradorNoMundo = {
  quem: 'capi',
  url: new URL(capiGlb, import.meta.url).href,
  painel: PAINEL_DA_CAPI,
  rotulo: 'Conversar com a Capi',
  medidas: CAPI_NO_BOSQUE,
  alturaDaCabeca: 1.25,
  comecar: comecarConversa,
}

/**
 * A Capi na frente da cabana (a âncora `morador` do `bosque.glb`), de costas para a porta. O que
 * ela faz no mundo é o de qualquer morador (`mundo/morador.tsx`); o painel é `interface/capi.tsx`.
 */
export function Capi({
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
    const morador = modelo.getObjectByName('morador')?.position ?? { x: 4.4, y: 1, z: -3.81 }
    const porta = modelo.getObjectByName('cabana')?.position ?? { x: 5.11, y: 1, z: -4.65 }
    const p = paraOMundo(morador, meio, giro, { x: 0, y: 0, z: 0 })
    // De costas para a porta: olha para onde a porta não está.
    const descanso = Math.atan2(morador.x - porta.x, morador.z - porta.z) + giro
    return { ...p, descanso }
  }, [modelo, meio, giro])
  return <MoradorDaIlha morador={CAPI} lugar={lugar} meio={meio} />
}
