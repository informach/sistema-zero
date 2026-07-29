'use client'

import { useCursor } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { useState } from 'react'
import { ROOM_ITEM_INFO, SURFACE_CHILD_SCALE, SURFACE_SLOTS } from '@/lib/room-catalog'
import { cellToWorld, effectiveFootprint, type Rot, wallToWorld } from './coords'
import { FurnitureModel } from './furniture-models'

/** Filho posicionado num NICHO desta peça (superfícies, 24/07). */
export interface StackedChild {
  /** Índice do filho em `placedItems` (identidade p/ seleção). */
  index: number
  itemId: string
  slot: number
  selected: boolean
}

/** Realce de seleção do FILHO no nicho (anel pequeno na base). */
function SlotPad() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
      <planeGeometry args={[0.9, 0.9]} />
      <meshBasicMaterial color="#ff4d6d" transparent opacity={0.4} depthWrite={false} />
    </mesh>
  )
}

/** Pad de seleção no CHÃO (sob a peça — alinhado ao footprint girado). */
function FloorPad({ w, h }: { w: number; h: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
      <planeGeometry args={[w * 0.98, h * 0.98]} />
      <meshBasicMaterial color="#ff4d6d" transparent opacity={0.34} depthWrite={false} />
    </mesh>
  )
}

/** Pad de seleção na PAREDE (atrás do painel — borda quente). */
function WallPad({ w, h }: { w: number; h: number }) {
  return (
    <mesh position={[0, 0, -0.03]}>
      <planeGeometry args={[w * 1.06, h * 1.06]} />
      <meshBasicMaterial color="#ff4d6d" transparent opacity={0.42} depthWrite={false} />
    </mesh>
  )
}

/**
 * Uma peça POSICIONADA. Item de CHÃO: ancorado no centro do footprint (a rotação gira o grupo).
 * Item de PAREDE (`info.mount==='wall'`): pendurado na parede (x=horizontal, y=ALTURA), girado p/
 * encarar a sala (parede esquerda = 90°). Em modo edição responde ao ponteiro (hover = cursor
 * "grab"; pointer-down inicia o arraste). Em view não captura ponteiro nem mostra seleção.
 */
export function FurniturePiece({
  index,
  itemId,
  x,
  y,
  rot,
  wall,
  selected,
  editable,
  onStart,
  stacked = [],
  onSelectChild,
}: {
  index: number
  itemId: string
  x: number
  y: number
  rot: Rot
  wall?: 'left' | 'right'
  selected: boolean
  editable: boolean
  onStart: (index: number, e: ThreeEvent<PointerEvent>) => void
  /** Filhos nos NICHOS desta superfície (renderizados DENTRO do grupo — herdam pos/rot). */
  stacked?: StackedChild[]
  /** Toque num filho SELECIONA (não arrasta — v1 move por botão). */
  onSelectChild?: (index: number) => void
}) {
  const info = ROOM_ITEM_INFO[itemId]
  const [hovered, setHovered] = useState(false)
  useCursor(editable && hovered, 'grab')
  if (!info) return null

  const handlers = editable
    ? {
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          setHovered(true)
        },
        onPointerOut: () => setHovered(false),
        onPointerDown: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          onStart(index, e)
        },
      }
    : {}

  if (info.mount === 'wall') {
    const side = wall ?? 'right'
    const c = wallToWorld(side, x, y, info.w, info.h)
    return (
      <group
        position={[c.x, c.y, c.z]}
        rotation={[0, side === 'left' ? Math.PI / 2 : 0, 0]}
        {...handlers}
      >
        <FurnitureModel itemId={itemId} w={info.w} h={info.h} />
        {selected ? <WallPad w={info.w} h={info.h} /> : null}
      </group>
    )
  }

  const fp = effectiveFootprint(info.w, info.h, rot)
  const c = cellToWorld(x, y, fp.w, fp.h)
  const slots = SURFACE_SLOTS[itemId]
  return (
    <group position={[c.x, 0, c.z]} rotation={[0, (rot * Math.PI) / 2, 0]} {...handlers}>
      <FurnitureModel itemId={itemId} w={info.w} h={info.h} />
      {selected ? <FloorPad w={info.w} h={info.h} /> : null}
      {stacked.map((s) => {
        const slot = slots?.[s.slot]
        const childInfo = ROOM_ITEM_INFO[s.itemId]
        if (!slot || !childInfo) return null
        // Item alto (h=2, ex.: foguete) encolhe mais p/ caber sob a prateleira de cima.
        const scale = childInfo.h > 1 ? 0.45 : SURFACE_CHILD_SCALE
        return (
          <group
            key={s.index}
            position={[slot.x, slot.y, slot.z]}
            scale={scale}
            onPointerDown={
              editable
                ? (e: ThreeEvent<PointerEvent>) => {
                    e.stopPropagation()
                    onSelectChild?.(s.index)
                  }
                : undefined
            }
          >
            <FurnitureModel itemId={s.itemId} w={childInfo.w} h={childInfo.h} />
            {s.selected && editable ? <SlotPad /> : null}
          </group>
        )
      })}
    </group>
  )
}
