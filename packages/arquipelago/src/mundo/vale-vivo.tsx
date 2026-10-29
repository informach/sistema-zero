import { useFrame } from '@react-three/fiber'
import type { Ilha } from '@sistemazero/arquipelago-contracts'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'
import type { IlhaPreparada, Troca } from './ilha-completa'
import { Jade } from './jade'
import { giroDaIlha } from './medidas'
import { ComReserva } from './modelos'

/** O Vale vivo (fase4-01): a Jade só existe com a ilha completa ativa. */
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
      </ComReserva>
    </group>
  )
}
