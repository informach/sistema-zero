'use client'

import type { RoomStateView } from '../../../lib/types'

import { MoradaRoomScene } from './morada-room-scene'

export interface Room3DProps {
  state: RoomStateView

  mode: 'edit' | 'view'

  selectedIndex?: number | null

  onSelect?: (index: number | null) => void

  onMove?: (index: number, x: number, y: number, wall?: 'left' | 'right') => void

  onPaintWall?: (wall: 'left' | 'right', color: string) => void

  paintColor?: string | null

  staticView?: boolean

  className?: string
}

/** Perfis e prévias usam o mesmo documento e as mesmas peças do editor. */

export function RoomCanvas3D({
  state,
  onSelect,
  selectedIndex,
  staticView,
  className,
}: Room3DProps) {
  const house = state.house

  if (!house)
    return (
      <div className="grid h-full place-items-center p-6 text-muted-foreground text-sm">
        Este quarto ainda não foi montado.
      </div>
    )

  const instances = house.instances.filter((instance) => instance.roomId === house.roomId)

  return (
    <MoradaRoomScene
      house={house}
      selectedId={selectedIndex != null ? instances[selectedIndex]?.id : null}
      onSelect={
        onSelect
          ? (instance) => onSelect(instances.findIndex((i) => i.id === instance.id))
          : undefined
      }
      staticView={staticView}
      className={className}
    />
  )
}
