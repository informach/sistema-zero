import { useFrame } from '@react-three/fiber'
import type { Ilha } from '@sistemazero/arquipelago-contracts'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'
import { PERCURSO_DOS_SALTOS, type PontosDoPercurso } from '../sistemas/percurso'
import { BalaoDasNuvens } from './balao-das-nuvens'
import { ancorasDosLumis, BorroesDaIlha } from './borroes-da-ilha'
import { percursoNoMundo } from './bosque'
import { ColecoesDaIlha } from './colecoes-das-ilhas'
import { ConstelacoesDasNuvens } from './constelacoes-das-nuvens'
import { CorridaDeBalao } from './corrida-de-balao'
import { type CoresDoColetavel, CorridaNaIlha } from './corrida-na-ilha'
import type { IlhaPreparada, Troca } from './ilha-completa'
import { Irie } from './irie'
import { ALTURA_DAS_NUVENS, giroDaIlha } from './medidas'
import { ComReserva } from './modelos'
import { FOLGA_DA_VOLTA, saltosNoModelo, tamposDosSaltos } from './saltos-das-nuvens'

/** Os pés a menos disto do chão das Nuvens, pisando, contam como queda dos saltos. */
const CHAO_DAS_NUVENS = 0.3

/** A fita do arco-íris: o rosa do arco com o brilho dourado da Iriê. */
const CORES_DA_FITA: CoresDoColetavel = {
  nucleo: '#ffb3e6',
  brilho: '#ffe08a',
  degrade: ['rgba(255,240,250,1)', 'rgba(255,170,220,0.55)', 'rgba(255,210,120,0)'],
}

/**
 * As Nuvens (fase4-06): a Iriê, o balão (fase4-09), os saltos entre nuvens, a corrida de balão e
 * o mirante das constelações (fase4-07) só existem com a ilha completa ativa.
 */
export function NuvensVivo({
  ilha,
  centro,
  preparada,
  troca,
}: {
  ilha: Ilha
  centro: { x: number; z: number }
  preparada: IlhaPreparada
  troca: Troca
}) {
  const giro = giroDaIlha(ilha)
  const meio = useMemo(() => ({ ...centro, y: ALTURA_DAS_NUVENS }), [centro])
  const lugaresDosLumis = useMemo(
    () => ancorasDosLumis(preparada.modelo, meio, giro),
    [preparada, meio, giro],
  )
  const pecas = useRef<Group>(null)
  const tampos = useMemo(() => tamposDosSaltos(preparada.colisores, giro), [preparada, giro])
  const saltos = useMemo<PontosDoPercurso | null>(
    () => (tampos ? percursoNoMundo(saltosNoModelo(tampos), meio, giro) : null),
    [tampos, meio, giro],
  )
  useFrame(() => {
    if (pecas.current) pecas.current.visible = troca.opacidade >= 0.99
    // A volta de uma queda numa plataforma vai para onde o tampo dela está agora.
    if (!saltos || !tampos) return
    for (let i = 0; i < saltos.deques.length; i++) {
      const k = tampos[i]?.plataforma
      const deque = saltos.deques[i]
      const plataforma = k === null || k === undefined ? null : preparada.plataformas[k]
      if (deque && plataforma) deque.volta.y = deque.y + plataforma.elevacao + FOLGA_DA_VOLTA
    }
  })
  return (
    <group ref={pecas} visible={false}>
      <BorroesDaIlha ilha="nuvens" ancoras={lugaresDosLumis} meio={meio} />
      <ColecoesDaIlha ilha="nuvens" meio={meio} giro={giro} />
      <ComReserva reserva={null}>
        <Irie modelo={preparada.modelo} meio={meio} giro={giro} />
      </ComReserva>
      <BalaoDasNuvens modelo={preparada.modelo} meio={meio} giro={giro} />
      <CorridaDeBalao meio={meio} giro={giro} />
      <ConstelacoesDasNuvens meio={meio} giro={giro} />
      {saltos ? (
        <CorridaNaIlha
          ilhaId={ilha.id}
          config={PERCURSO_DOS_SALTOS}
          pontos={saltos}
          largada={saltos.largada}
          alturaDoChao={meio.y + 1 + CHAO_DAS_NUVENS}
          cores={CORES_DA_FITA}
        />
      ) : null}
    </group>
  )
}
