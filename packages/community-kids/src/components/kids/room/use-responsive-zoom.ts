'use client'

import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import type { OrthographicCamera } from 'three'

/**
 * Ajusta o `zoom` da câmera ORTOGRÁFICA fixa para caber o quarto no container (retrato no
 * mobile, maior no desktop) sem orbitar. `worldW`/`worldH` = footprint isométrico aproximado
 * da cena em unidades (tunado no QA). Recalcula a cada resize e pede um frame (`invalidate`).
 */
export function useResponsiveZoom(worldW: number, worldH: number, margin = 0.94): void {
  const camera = useThree((s) => s.camera)
  const width = useThree((s) => s.size.width)
  const height = useThree((s) => s.size.height)
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    const cam = camera as OrthographicCamera
    cam.zoom = Math.max(8, Math.min(width / worldW, height / worldH) * margin)
    cam.updateProjectionMatrix()
    invalidate()
  }, [camera, width, height, worldW, worldH, margin, invalidate])
}
