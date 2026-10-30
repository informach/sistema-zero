import { useFrame } from '@react-three/fiber'
import type { Ilha } from '@sistemazero/arquipelago-contracts'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'
import { PERCURSO_DAS_PEGADAS } from '../sistemas/percurso'
import { type CoresDoColetavel, CorridaNaIlha } from './corrida-na-ilha'
import { DescobertasDoVale } from './descobertas-do-vale'
import { FilhoteDoVale } from './filhote-do-vale'
import type { IlhaPreparada, Troca } from './ilha-completa'
import { Jade } from './jade'
import { giroDaIlha, raioMaximoDaIlha } from './medidas'
import { ComReserva } from './modelos'
import { MontariaDoVale } from './montaria-do-vale'
import { deslocar, percursoDasPedrasDoVulcao } from './percursos-das-ilhas'

/** O fóssil da trilha: osso claro com o brilho laranja do vulcão. */
const CORES_DO_FOSSIL: CoresDoColetavel = {
  nucleo: '#fff3dc',
  brilho: '#ffc27a',
  degrade: ['rgba(255,244,222,1)', 'rgba(255,190,110,0.55)', 'rgba(255,160,80,0)'],
}

/** Jade, pegadas, escavação, ninhos, o filhote e a montaria só existem com a ilha completa ativa. */
export function ValeVivo({
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
  const meio = useMemo(() => ({ ...centro, y: 0 }), [centro])
  const pecas = useRef<Group>(null)
  const trilha = useMemo(() => {
    const p = percursoDasPedrasDoVulcao(preparada.colisores, raioMaximoDaIlha(ilha))
    return p ? deslocar(p, meio) : null
  }, [preparada, meio, ilha])
  useFrame(() => {
    if (pecas.current) pecas.current.visible = troca.opacidade >= 0.99
  })
  return (
    <group ref={pecas} visible={false}>
      <ComReserva reserva={null}>
        <Jade modelo={preparada.modelo} meio={meio} giro={giro} />
        <DescobertasDoVale preparada={preparada} meio={meio} giro={giro} troca={troca} />
        <FilhoteDoVale preparada={preparada} meio={meio} giro={giro} troca={troca} />
        <ComReserva reserva={null}>
          <MontariaDoVale preparada={preparada} meio={meio} giro={giro} troca={troca} />
        </ComReserva>
      </ComReserva>
      {trilha ? (
        <CorridaNaIlha
          ilhaId={ilha.id}
          config={PERCURSO_DAS_PEGADAS}
          pontos={trilha}
          largada={trilha.largada}
          // Ninguém cai na trilha: as paradas ficam no chão (a pé ou montado).
          alturaDoChao={Number.NEGATIVE_INFINITY}
          cores={CORES_DO_FOSSIL}
        />
      ) : null}
    </group>
  )
}
