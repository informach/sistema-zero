'use client'

import { useCursor } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { useState } from 'react'
import { ROOM_ITEM_INFO } from '@/lib/room-catalog'
import { cellToWorld, effectiveFootprint, type Rot } from './coords'
import { FurnitureModel } from './furniture-models'

/** Pad de seleção (quadrado quente no chão, sob a peça — alinhado ao footprint girado). */
function SelectionPad({ w, h }: { w: number; h: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
      <planeGeometry args={[w * 0.98, h * 0.98]} />
      <meshBasicMaterial color="#ff4d6d" transparent opacity={0.34} depthWrite={false} />
    </mesh>
  )
}

/**
 * Uma peça POSICIONADA: ancorada no centro do footprint efetivo (a rotação gira o grupo —
 * 90°/270° trocam w↔h), com a peça low-poly + pad de seleção. Em modo edição responde ao
 * ponteiro (hover = cursor "grab"; pointer-down inicia o arraste via `onStart`). Em modo
 * view não captura ponteiro nem mostra seleção. Id desconhecido → não renderiza.
 */
export function FurniturePiece({
  index,
  itemId,
  x,
  y,
  rot,
  selected,
  editable,
  onStart,
}: {
  index: number
  itemId: string
  x: number
  y: number
  rot: Rot
  selected: boolean
  editable: boolean
  onStart: (index: number, e: ThreeEvent<PointerEvent>) => void
}) {
  const info = ROOM_ITEM_INFO[itemId]
  const [hovered, setHovered] = useState(false)
  useCursor(editable && hovered, 'grab')
  if (!info) return null
  const fp = effectiveFootprint(info.w, info.h, rot)
  const c = cellToWorld(x, y, fp.w, fp.h)
  return (
    <group
      position={[c.x, 0, c.z]}
      rotation={[0, (rot * Math.PI) / 2, 0]}
      onPointerOver={
        editable
          ? (e) => {
              e.stopPropagation()
              setHovered(true)
            }
          : undefined
      }
      onPointerOut={editable ? () => setHovered(false) : undefined}
      onPointerDown={
        editable
          ? (e) => {
              e.stopPropagation()
              onStart(index, e)
            }
          : undefined
      }
    >
      <FurnitureModel itemId={itemId} w={info.w} h={info.h} />
      {selected ? <SelectionPad w={info.w} h={info.h} /> : null}
    </group>
  )
}
