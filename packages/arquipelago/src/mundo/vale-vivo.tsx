import { useFrame } from '@react-three/fiber'
import type { Ilha } from '@sistemazero/arquipelago-contracts'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'
import { corridaDaMontaria, portoesDoCaminho } from '../sistemas/corrida-de-portoes'
import { PERCURSO_DA_MONTARIA, PERCURSO_DAS_PEGADAS } from '../sistemas/percurso'
import { ancorasDosLumis, BorroesDaIlha } from './borroes-da-ilha'
import { paraOMundo } from './bosque'
import { CorridaDePortoes } from './corrida-de-portoes'
import { type CoresDoColetavel, CorridaNaIlha } from './corrida-na-ilha'
import { DescobertasDoVale } from './descobertas-do-vale'
import { FilhoteDoVale } from './filhote-do-vale'
import type { IlhaPreparada, Troca } from './ilha-completa'
import { Jade } from './jade'
import { giroDaIlha, raioMaximoDaIlha } from './medidas'
import { ComReserva } from './modelos'
import { MontariaDoVale } from './montaria-do-vale'
import { deslocar, percursoDasPedrasDoVulcao } from './percursos-das-ilhas'
import { CinzaQuente, SegredoNaIlha } from './segredos-dos-movimentos'
import { lugarDaJade } from './vale'

/** O fóssil da trilha: osso claro com o brilho laranja do vulcão. */
const CORES_DO_FOSSIL: CoresDoColetavel = {
  nucleo: '#fff3dc',
  brilho: '#ffc27a',
  degrade: ['rgba(255,244,222,1)', 'rgba(255,190,110,0.55)', 'rgba(255,160,80,0)'],
}

/** A corrida da montaria pela praia (lacunas, 01/11/2026) usa os mesmos fósseis da trilha. */
export const FALA_DO_PRIMEIRO_PORTAO_DA_MONTARIA =
  'Montada no dino, passe pelo primeiro portão de osso na praia para começar a corrida.'

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
  const lugaresDosLumis = useMemo(
    () => ancorasDosLumis(preparada.modelo, meio, giro),
    [preparada, meio, giro],
  )
  const pecas = useRef<Group>(null)
  const trilha = useMemo(() => {
    // Os colisores já vêm girados em volta do meio da ilha: a Jade vai no mesmo referencial.
    const jade = lugarDaJade(preparada.modelo, { x: 0, y: 0, z: 0 }, giro)
    const p = percursoDasPedrasDoVulcao(
      preparada.colisores,
      raioMaximoDaIlha(ilha),
      jade ?? undefined,
    )
    return p ? deslocar(p, meio) : null
  }, [preparada, meio, ilha, giro])
  useFrame(() => {
    if (pecas.current) pecas.current.visible = troca.opacidade >= 0.99
  })
  // A corrida da montaria pela praia (lacunas, 01/11/2026): os portões de osso no mundo.
  const daMontaria = useMemo(() => {
    const noModelo = corridaDaMontaria()
    const lugar = (p: { x: number; y: number; z: number }) =>
      paraOMundo(p, meio, giro, { x: 0, y: 0, z: 0 })
    return {
      portoes: portoesDoCaminho(noModelo.portoes.map(lugar), noModelo.portoes[0]?.meiaLargura ?? 2),
      coisas: noModelo.coisas.map(lugar),
    }
  }, [meio, giro])
  return (
    <group ref={pecas} visible={false}>
      <BorroesDaIlha ilha="vale-dos-dinos" ancoras={lugaresDosLumis} meio={meio} />
      <CorridaDePortoes
        config={PERCURSO_DA_MONTARIA}
        portoes={daMontaria.portoes}
        coisas={daMontaria.coisas}
        ponto={(m, r) => (m.modo === 'montar' ? r : null)}
        cor="#f0c35a"
        coresDaCoisa={CORES_DO_FOSSIL}
        falaDoPrimeiro={FALA_DO_PRIMEIRO_PORTAO_DA_MONTARIA}
      />
      <CinzaQuente modelo={preparada.modelo} meio={meio} giro={giro} />
      <SegredoNaIlha id="montaria" modelo={preparada.modelo} meio={meio} giro={giro} />
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
