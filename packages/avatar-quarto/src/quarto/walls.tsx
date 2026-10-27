'use client'

import { useEffect, useRef } from 'react'
import { Color, type MeshStandardMaterial } from 'three'
import { COLS, FLOOR_HALF_X, FLOOR_HALF_Z, ROWS } from './coords'

const WALL_H = 4
const WALL_T = 0.18

/** Uma parede do recorte em "L". `kind:'z'` corre ao longo de Z (em x=-half); `'x'` ao longo
 * de X (em z=-half). A cor vem da prop (escurecida à noite); em modo pincel, o clique pinta. */
function Wall({
  side,
  kind,
  color,
  dark,
  paintColor,
  onPaint,
}: {
  side: 'left' | 'right'
  kind: 'x' | 'z'
  color: string
  dark: boolean
  paintColor: string | null
  onPaint: (side: 'left' | 'right') => void
}) {
  const matRef = useRef<MeshStandardMaterial>(null)
  useEffect(() => {
    const m = matRef.current
    if (!m) return
    const c = new Color(color)
    if (dark) c.multiplyScalar(0.6)
    m.color.copy(c)
  }, [color, dark])
  const args: [number, number, number] =
    kind === 'z' ? [WALL_T, WALL_H, ROWS] : [COLS, WALL_H, WALL_T]
  const position: [number, number, number] =
    kind === 'z' ? [-FLOOR_HALF_X, WALL_H / 2, 0] : [0, WALL_H / 2, -FLOOR_HALF_Z]
  return (
    <mesh
      position={position}
      onPointerDown={
        paintColor
          ? (e) => {
              e.stopPropagation()
              onPaint(side)
            }
          : undefined
      }
    >
      <boxGeometry args={args} />
      <meshStandardMaterial ref={matRef} roughness={0.96} />
    </mesh>
  )
}

/** As duas paredes do fundo (esquerda = parede em Z; direita = parede em X). */
export function Walls({
  left,
  right,
  dark,
  paintColor,
  onPaint,
}: {
  left: string
  right: string
  dark: boolean
  paintColor: string | null
  onPaint: (side: 'left' | 'right') => void
}) {
  return (
    <>
      <Wall
        side="left"
        kind="z"
        color={left}
        dark={dark}
        paintColor={paintColor}
        onPaint={onPaint}
      />
      <Wall
        side="right"
        kind="x"
        color={right}
        dark={dark}
        paintColor={paintColor}
        onPaint={onPaint}
      />
    </>
  )
}
