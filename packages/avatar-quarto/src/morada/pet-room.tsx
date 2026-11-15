'use client'
import { useFrame } from '@react-three/fiber'
import type { MoradaCatalog, MoradaHouse } from '@sistemazero/core/morada'
import { useMemo, useRef, useState } from 'react'
import type { Group } from 'three'
import { MoradaPetView } from './pet'
import { type MoradaPetWalk, moradaPetArea, safeMoradaPetPosition, stepMoradaPet } from './pet-walk'

export function MoradaRoomPet({
  house,
  catalog,
  paused,
  reducedMotion = false,
}: {
  house: MoradaHouse
  catalog: MoradaCatalog
  paused: boolean
  reducedMotion?: boolean
}) {
  const area = useMemo(() => moradaPetArea(house, catalog), [house, catalog])
  const start = useMemo(() => safeMoradaPetPosition(area), [area])
  const state = useRef<MoradaPetWalk>({
    x: start?.[0] ?? 0,
    z: start?.[1] ?? 0,
    heading: Math.PI / 2,
    elapsed: 0,
    walking: false,
  })
  const group = useRef<Group>(null)
  const [walking, setWalking] = useState(false)
  const room = house.rooms.find((r) => r.id === house.roomId)
  useFrame((_, dt) => {
    if (!group.current) return
    stepMoradaPet(state.current, area, dt, { paused, reducedMotion })
    const s = state.current
    group.current.position.set(
      (room?.origin[0] ?? 0) + s.x,
      room?.origin[1] ?? 0,
      (room?.origin[2] ?? 0) + s.z,
    )
    group.current.rotation.y = s.heading
    if (s.walking !== walking) setWalking(s.walking)
  })
  if (!house.pet || !start) return null
  const origin = room?.origin ?? [0, 0, 0]
  return (
    <group
      ref={group}
      position={[origin[0] + state.current.x, origin[1], origin[2] + state.current.z]}
    >
      <MoradaPetView
        pieceId={house.pet}
        catalog={catalog}
        paused={paused || reducedMotion}
        animation={walking ? 'andar' : 'parado'}
      />
    </group>
  )
}
