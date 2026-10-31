import { useFrame } from '@react-three/fiber'
import type { Ilha } from '@sistemazero/arquipelago-contracts'
import { useEffect, useMemo, useRef } from 'react'
import type { Group } from 'three'
import { useJogo } from '../estado/contexto'
import { PERCURSO_DOS_CORAIS } from '../sistemas/percurso'
import { segredoObrigatorio } from '../sistemas/segredos'
import { ancorasDosLumis, BorroesDaIlha } from './borroes-da-ilha'
import { CoraisDoRecife } from './corais-do-recife'
import { type CoresDoColetavel, CorridaNaIlha } from './corrida-na-ilha'
import type { IlhaPreparada, Troca } from './ilha-completa'
import { Mare } from './mare'
import { giroDaIlha, raioMaximoDaIlha } from './medidas'
import { MergulhoDoRecife } from './mergulho-do-recife'
import { MesaDeMapas } from './mesa-de-mapas'
import { ComReserva } from './modelos'
import { deslocar, percursoDosCorais } from './percursos-das-ilhas'
import { aguaDoRecife } from './recife'
import { SegredoNoAlto } from './segredos-das-ilhas'

/** Só existe com a ilha ativa. Água e conversa são retiradas junto com a ilha. */
/** As pérolas dos pulos nos corais: brancas com o brilho lilás da lagoa. */
const CORES_DA_PEROLA: CoresDoColetavel = {
  nucleo: '#fffaf4',
  brilho: '#e9d8ff',
  degrade: ['rgba(255,252,246,1)', 'rgba(225,205,255,0.55)', 'rgba(200,180,255,0)'],
}
/** Os pés a menos disto do chão da lagoa, pisando, contam como queda dos corais. */
const CHAO_DOS_CORAIS = 0.3

/** O segredo desta ilha (N12): o baú no alto do vento. */
const SEGREDO_RECIFE = segredoObrigatorio('recife')

export function RecifeVivo({
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
  const { movimento } = useJogo()
  const giro = giroDaIlha(ilha)
  const meio = useMemo(() => ({ ...centro, y: 0 }), [centro])
  const lugaresDosLumis = useMemo(
    () => ancorasDosLumis(preparada.modelo, meio, giro),
    [preparada, meio, giro],
  )
  const agua = useMemo(() => aguaDoRecife(preparada.modelo, meio, giro), [preparada, meio, giro])
  const pecas = useRef<Group>(null)
  const corais = useMemo(() => {
    const p = percursoDosCorais(preparada.colisores, raioMaximoDaIlha(ilha))
    return p ? deslocar(p, meio) : null
  }, [preparada, meio, ilha])
  useEffect(() => {
    if (!agua) return
    movimento.aguas.push(agua)
    return () => {
      const i = movimento.aguas.indexOf(agua)
      if (i >= 0) movimento.aguas.splice(i, 1)
    }
  }, [agua, movimento])
  useFrame(() => {
    if (pecas.current) pecas.current.visible = troca.opacidade >= 0.99
  })
  return (
    <group ref={pecas} visible={false}>
      <BorroesDaIlha ilha="recife" ancoras={lugaresDosLumis} meio={meio} />
      <SegredoNoAlto segredo={SEGREDO_RECIFE} meio={meio} giro={giro} />
      <MergulhoDoRecife modelo={preparada.modelo} centro={meio} giro={giro} troca={troca} />
      <CoraisDoRecife modelo={preparada.modelo} centro={meio} giro={giro} troca={troca} />
      <MesaDeMapas modelo={preparada.modelo} centro={meio} giro={giro} troca={troca} />
      <ComReserva reserva={null}>
        <Mare modelo={preparada.modelo} meio={meio} giro={giro} />
      </ComReserva>
      {corais ? (
        <CorridaNaIlha
          ilhaId={ilha.id}
          config={PERCURSO_DOS_CORAIS}
          pontos={corais}
          largada={corais.largada}
          alturaDoChao={corais.centro.y + CHAO_DOS_CORAIS}
          cores={CORES_DA_PEROLA}
        />
      ) : null}
    </group>
  )
}
