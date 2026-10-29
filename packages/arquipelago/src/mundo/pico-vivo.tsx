import { useFrame } from '@react-three/fiber'
import type { Ilha } from '@sistemazero/arquipelago-contracts'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'
import { Floco } from './floco'
import type { IlhaPreparada, Troca } from './ilha-completa'
import { giroDaIlha } from './medidas'
import { ComReserva } from './modelos'

/**
 * O Pico Gelado vivo (fase3-06): só existe com a ilha ativa. Por enquanto, o Floco no palco; a
 * trilha até o cume, o trenó e a caverna de cristal são da fase3-07.
 */
export function PicoVivo({
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
        <Floco modelo={preparada.modelo} meio={meio} giro={giro} />
      </ComReserva>
    </group>
  )
}
