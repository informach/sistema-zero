import { useFrame } from '@react-three/fiber'
import type { Ilha } from '@sistemazero/arquipelago-contracts'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'
import { BalcoesDaVila } from './balcoes-da-vila'
import { Bento } from './bento'
import type { IlhaPreparada, Troca } from './ilha-completa'
import { giroDaIlha } from './medidas'
import { ComReserva } from './modelos'

/**
 * O que mexe na Vila Doce (montado pelo `anel.tsx` só com a ilha completa ATIVA, em coordenadas do
 * mundo): o Bento na frente da padaria e os balcões dos turnos (fase2-03). Os Lumis da Vila entram
 * aqui.
 */
export function VilaViva({
  ilha,
  centro,
  preparada,
  troca,
}: {
  ilha: Ilha
  centro: { x: number; z: number }
  preparada: IlhaPreparada
  /** A troca da leve pela completa: as peças daqui aparecem quando a completa terminou de entrar. */
  troca: Troca
}) {
  const giro = giroDaIlha(ilha)
  const meio = useMemo(() => ({ x: centro.x, y: 0, z: centro.z }), [centro.x, centro.z])
  const pecas = useRef<Group>(null)
  useFrame(() => {
    if (pecas.current) pecas.current.visible = troca.opacidade >= 0.99
  })
  return (
    <group ref={pecas} visible={false}>
      <ComReserva reserva={null}>
        <Bento modelo={preparada.modelo} meio={meio} giro={giro} />
      </ComReserva>
      <BalcoesDaVila modelo={preparada.modelo} meio={meio} giro={giro} />
    </group>
  )
}
