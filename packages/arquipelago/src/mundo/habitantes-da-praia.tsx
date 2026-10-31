import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { Group } from 'three'
import buzioGlb from '../assets/lumis/buzio.glb'
import estrelinhaGlb from '../assets/lumis/estrelinha.glb'
import nicoGlb from '../assets/personagens/nico.glb'
import { useEstado, useJogo } from '../estado/contexto'
import {
  ACENO_DO_NICO,
  criarEstadoDoNico,
  HABITANTES_DA_PRAIA,
  type HabitanteDaPraia,
  olharDoNico,
  passoDoNico,
} from '../sistemas/habitantes-da-praia'
import { jogoPausado } from '../sistemas/pausa'
import { suavizarAngulo } from '../sistemas/zappy'
import { duracaoDoClipe, olhosNoInstante, PISCAR, trocarClipe, useCopiaAnimada } from './animado'
import { Colisores } from './colisores'
import { colisoresDoHabitante } from './habitantes-da-praia-colisao'
import { alturaDaIlha } from './medidas'
import { ComReserva } from './modelos'

const MODELOS = {
  nico: new URL(nicoGlb, import.meta.url).href,
  estrelinha: new URL(estrelinhaGlb, import.meta.url).href,
  buzio: new URL(buzioGlb, import.meta.url).href,
}
const UMA_VEZ = ['acenar', 'feliz'] as const
const EM_LACO: readonly string[] = []
// O Nico virou morador (conversa, amizade e o correio do dia, §6.28 A19): `mundo/nico.tsx`.
const NOMES = ['estrelinha', 'buzio'] as const
const COLISORES = {
  nico: colisoresDoHabitante('nico'),
  estrelinha: colisoresDoHabitante('estrelinha'),
  buzio: colisoresDoHabitante('buzio'),
}

/** Presença visual na praia. Cartas, captura e rotinas dos Lumis pertencem a outras etapas. */
export function HabitantesDaPraia() {
  return NOMES.map((nome) => (
    <ComReserva key={nome} reserva={null}>
      <Habitante nome={nome} />
    </ComReserva>
  ))
}

function Habitante({ nome }: { nome: HabitanteDaPraia }) {
  const lugar = HABITANTES_DA_PRAIA[nome]
  const raiz = useRef<Group>(null)
  const { cena, actions, mixer, olhos } = useCopiaAnimada(
    MODELOS[nome],
    raiz,
    nome === 'nico' ? UMA_VEZ : EM_LACO,
  )
  const { rastro } = useJogo()
  const pausado = useEstado(jogoPausado)
  const estado = useRef(criarEstadoDoNico())
  const tocando = useRef<string>('parado')
  const piscarEm = useRef<number>(PISCAR.aCada)
  const olhar = useRef<number>(lugar.giro)

  useEffect(() => {
    trocarClipe(actions, null, 'parado', 0, nome)
  }, [actions, nome])

  useEffect(() => {
    for (const acao of Object.values(actions)) if (acao) acao.paused = pausado
  }, [actions, pausado])

  useFrame((_, dt) => {
    if (nome !== 'nico' || pausado) return
    const quer = passoDoNico(
      estado.current,
      dt,
      (rastro.x - lugar.x) ** 2 + (rastro.z - lugar.z) ** 2,
      duracaoDoClipe(actions, mixer, 'acenar'),
      false,
    )
    if (quer !== tocando.current) {
      trocarClipe(actions, tocando.current, quer, 0.25, nome)
      tocando.current = quer
    }
    // Vira para a criança que chega perto, como a Capi.
    olhar.current = suavizarAngulo(
      olhar.current,
      olharDoNico(rastro),
      ACENO_DO_NICO.rapidezDoGiro,
      dt,
    )
    if (raiz.current) raiz.current.rotation.y = olhar.current
    olhosNoInstante(olhos, estado.current.tempo, piscarEm, false)
  })

  return (
    <group name={`habitante-${nome}`} position={[lugar.x, alturaDaIlha(lugar.x, lugar.z), lugar.z]}>
      <group ref={raiz} rotation={[0, lugar.giro, 0]} scale={lugar.escala} dispose={null}>
        <primitive object={cena} />
      </group>
      <Colisores lista={COLISORES[nome]} />
    </group>
  )
}
