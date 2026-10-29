import { useFrame } from '@react-three/fiber'
import type { Ilha } from '@sistemazero/arquipelago-contracts'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'
import type { IlhaPreparada, Troca } from './ilha-completa'
import { Irie } from './irie'
import { ALTURA_DAS_NUVENS, giroDaIlha } from './medidas'
import { ComReserva } from './modelos'

/** As Nuvens (fase4-06): a Iriê só existe com a ilha completa ativa. */
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
  const pecas = useRef<Group>(null)
  useFrame(() => {
    if (pecas.current) pecas.current.visible = troca.opacidade >= 0.99
  })
  return (
    <group ref={pecas} visible={false}>
      <ComReserva reserva={null}>
        <Irie modelo={preparada.modelo} meio={meio} giro={giro} />
      </ComReserva>
    </group>
  )
}
