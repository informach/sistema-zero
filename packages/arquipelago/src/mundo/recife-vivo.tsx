import { useFrame } from '@react-three/fiber'
import type { Ilha } from '@sistemazero/arquipelago-contracts'
import { useEffect, useMemo, useRef } from 'react'
import type { Group } from 'three'
import { useJogo } from '../estado/contexto'
import { CoraisDoRecife } from './corais-do-recife'
import type { IlhaPreparada, Troca } from './ilha-completa'
import { Mare } from './mare'
import { giroDaIlha } from './medidas'
import { MergulhoDoRecife } from './mergulho-do-recife'
import { MesaDeMapas } from './mesa-de-mapas'
import { ComReserva } from './modelos'
import { aguaDoRecife } from './recife'

/** Só existe com a ilha ativa. Água e conversa são retiradas junto com a ilha. */
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
  const agua = useMemo(() => aguaDoRecife(preparada.modelo, meio, giro), [preparada, meio, giro])
  const pecas = useRef<Group>(null)
  useEffect(() => {
    if (!agua) return
    movimento.aguas.push(agua)
    return () => {
      const i = movimento.aguas.indexOf(agua)
      if (i >= 0) movimento.aguas.splice(i, 1)
    }
  }, [agua, movimento])
  useEffect(
    () => () => {
      if (movimento.barco) movimento.barco.recifePronto = false
    },
    [movimento],
  )
  useFrame(() => {
    if (movimento.barco)
      movimento.barco.recifePronto = troca.colisoresNaCena === true && troca.opacidade >= 0.99
    if (pecas.current) pecas.current.visible = troca.opacidade >= 0.99
  })
  return (
    <group ref={pecas} visible={false}>
      <MergulhoDoRecife modelo={preparada.modelo} centro={meio} giro={giro} troca={troca} />
      <CoraisDoRecife centro={meio} giro={giro} troca={troca} />
      <MesaDeMapas modelo={preparada.modelo} centro={meio} giro={giro} troca={troca} />
      <ComReserva reserva={null}>
        <Mare modelo={preparada.modelo} meio={meio} giro={giro} />
      </ComReserva>
    </group>
  )
}
