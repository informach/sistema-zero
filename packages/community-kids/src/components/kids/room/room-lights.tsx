'use client'

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { PointLight } from 'three'
import type { LightingPreset } from '@/lib/room-catalog'

/**
 * Luz da cena por preset: ambiente + "sol" (directional) + fita de neon opcional. O modo
 * `festa` cicla a matiz do neon por frame (gateado por `prefers-reduced-motion`). Sem shadow
 * map (caro em tablet). O fundo/atmosfera é setado pela cena (scene.background).
 */
export function RoomLights({
  preset,
  reducedMotion,
}: {
  preset: LightingPreset
  reducedMotion: boolean
}) {
  const neonRef = useRef<PointLight>(null)
  const hueRef = useRef(0)
  useFrame((_, dt) => {
    if (preset.party && !reducedMotion && neonRef.current) {
      hueRef.current = (hueRef.current + dt * 0.12) % 1
      neonRef.current.color.setHSL(hueRef.current, 0.85, 0.6)
    }
  })
  const showNeon = Boolean(preset.neon) || Boolean(preset.party)
  return (
    <>
      <ambientLight color={preset.ambient.color} intensity={preset.ambient.intensity} />
      <directionalLight
        color={preset.sun.color}
        intensity={preset.sun.intensity}
        position={preset.sun.position}
      />
      {showNeon ? (
        <pointLight
          ref={neonRef}
          color={preset.neon ?? '#ffffff'}
          intensity={1.4}
          distance={20}
          decay={1.1}
          position={[0, 3.6, 0]}
        />
      ) : null}
    </>
  )
}
