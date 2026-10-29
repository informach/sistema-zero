import { useFrame } from '@react-three/fiber'
import type { Ilha } from '@sistemazero/arquipelago-contracts'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'
import { DescobertasDoVale } from './descobertas-do-vale'
import { FilhoteDoVale } from './filhote-do-vale'
import type { IlhaPreparada, Troca } from './ilha-completa'
import { Jade } from './jade'
import { giroDaIlha } from './medidas'
import { ComReserva } from './modelos'
import { MontariaDoVale } from './montaria-do-vale'

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
    </group>
  )
}
