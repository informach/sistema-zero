import { useFrame } from '@react-three/fiber'
import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { useMemo } from 'react'
import type { Object3D } from 'three'
import cataVentoGlb from '../assets/mundo/cata-vento.glb'
import { lojaDoConforto, useConforto } from '../estado/conforto'
import { useJogo } from '../estado/contexto'
import {
  climaEfetivo,
  climaLiberado,
  FALA_DO_CLIMA,
  GIRO_DO_CATA_VENTO,
  proximoClima,
} from '../sistemas/clima'
import { jogoPausado } from '../sistemas/pausa'
import { Colisores } from './colisores'
import { ehNoDeColisao, lerColisores } from './colisores-da-ilha'
import { useInterativo } from './interativos'
import { alturaDaIlha, CATA_VENTO } from './medidas'
import { ComReserva, useModelo } from './modelos'

const URL_DO_CATA_VENTO = new URL(cataVentoGlb, import.meta.url).href
/** De perto do poste dá para mexer no cata-vento. */
const ALCANCE_DO_CATA_VENTO = 1.8
/** Com menos movimento, a hélice gira devagar (sem parar: o clima continua à vista). */
const GIRO_COM_MENOS_MOVIMENTO = 0.25

/**
 * O cata-vento ao lado da horta (o pedido de arte da fase4-08): a hélice gira mais depressa com o
 * tempo fechado e, com a Ilha das Nuvens aberta (a Iriê ensinou), "Mudar o clima" passa para o
 * próximo (sol, nublado, chuva), o mesmo do menu. Numa visita a ilha é do irmão: só gira.
 */
export function CataVento() {
  return (
    <ComReserva reserva={null}>
      <CataVentoCarregado />
    </ComReserva>
  )
}

function CataVentoCarregado() {
  const { loja } = useJogo()
  const aparelho = useReducedMotion()
  const conforto = lojaDoConforto(loja)
  const preferencia = useConforto(conforto, (s) => s.conforto.menosMovimento)
  const menos = aparelho || preferencia
  const raiz = useModelo(URL_DO_CATA_VENTO)
  const modelo = useMemo(() => {
    const copia = raiz.clone(true)
    // O poste de colisão não desenha (a geometria é do arquivo em cache: só sai da cópia).
    const nos: Object3D[] = []
    copia.traverse((o) => {
      if (ehNoDeColisao(o)) nos.push(o)
    })
    for (const no of nos) no.removeFromParent()
    return copia
  }, [raiz])
  const colisores = useMemo(() => lerColisores(raiz), [raiz])
  const helice = useMemo(() => modelo.getObjectByName('helice'), [modelo])
  const y = alturaDaIlha(CATA_VENTO.x, CATA_VENTO.z)

  useInterativo('cata-vento', {
    x: CATA_VENTO.x,
    z: CATA_VENTO.z,
    raio: ALCANCE_DO_CATA_VENTO,
    rotulo: () => {
      const s = loja.getState()
      return climaLiberado(s.jornada) && !s.visita ? 'Mudar o clima' : null
    },
    agir: () => {
      const s = loja.getState()
      if (!climaLiberado(s.jornada) || s.visita || jogoPausado(s)) return
      const c = proximoClima(s.salvamento.clima)
      s.escolherClima(c)
      s.dizer(FALA_DO_CLIMA[c])
    },
  })

  useFrame((_, dt) => {
    const s = loja.getState()
    if (!helice || jogoPausado(s)) return
    const clima = climaEfetivo(s, Date.now())
    const giro = GIRO_DO_CATA_VENTO[clima] * (menos ? GIRO_COM_MENOS_MOVIMENTO : 1)
    // A hélice olha para o +z do modelo: gira em volta dele.
    helice.rotation.z += giro * Math.min(dt, 0.1)
  })

  return (
    <group
      name="cata-vento"
      position={[CATA_VENTO.x, y, CATA_VENTO.z]}
      rotation={[0, CATA_VENTO.giro, 0]}
    >
      <primitive object={modelo} />
      <Colisores lista={colisores} />
    </group>
  )
}
