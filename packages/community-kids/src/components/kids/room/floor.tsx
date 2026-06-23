'use client'

import { useEffect, useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { floorInfo, type RoomFloorInfo } from '@/lib/room-catalog'
import { COLS, ROWS } from './coords'

/** Desenha o padrão do piso (madeira/tapete/xadrez) num canvas 2D → textura (CSP-safe). */
function makeFloorTexture(info: RoomFloorInfo): CanvasTexture | null {
  const canvas = document.createElement('canvas')
  canvas.width = 480
  canvas.height = 320
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = info.color
  ctx.fillRect(0, 0, 480, 320)
  if (info.kind === 'checker') {
    ctx.fillStyle = info.color2
    const cw = 480 / 12
    const ch = 320 / 8
    for (let i = 0; i < 12; i++) {
      for (let j = 0; j < 8; j++) {
        if ((i + j) % 2 === 0) ctx.fillRect(i * cw, j * ch, cw, ch)
      }
    }
  } else if (info.kind === 'wood') {
    const ph = 320 / 8
    ctx.globalAlpha = 0.16
    ctx.fillStyle = info.color2
    for (let j = 0; j < 8; j += 2) ctx.fillRect(0, j * ph, 480, ph)
    ctx.globalAlpha = 1
    ctx.strokeStyle = info.color2
    ctx.lineWidth = 3
    for (let j = 1; j < 8; j++) {
      ctx.beginPath()
      ctx.moveTo(0, j * ph)
      ctx.lineTo(480, j * ph)
      ctx.stroke()
    }
  } else {
    ctx.strokeStyle = info.color2
    ctx.lineWidth = 24
    ctx.strokeRect(30, 30, 420, 260)
  }
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/** O chão 12×8 (plano deitado em y=0). Clique no vazio (fora do pincel) deseleciona. */
export function Floor({
  floorId,
  editable,
  painting,
  onDeselect,
}: {
  floorId: string
  editable: boolean
  painting: boolean
  onDeselect: () => void
}) {
  const info = floorInfo(floorId)
  // biome-ignore lint/correctness/useExhaustiveDependencies: a textura depende só dos campos do piso.
  const tex = useMemo(() => makeFloorTexture(info), [info.color, info.color2, info.kind])
  useEffect(() => () => tex?.dispose(), [tex])
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={
        editable && !painting
          ? (e) => {
              e.stopPropagation()
              onDeselect()
            }
          : undefined
      }
    >
      <planeGeometry args={[COLS, ROWS]} />
      <meshStandardMaterial map={tex} color={tex ? '#ffffff' : info.color} roughness={0.95} />
    </mesh>
  )
}
