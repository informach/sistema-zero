'use client'

import { CameraControls, useProgress } from '@react-three/drei'
import { type ComponentRef, type RefObject, useEffect, useRef } from 'react'
import * as THREE from 'three'

export type CamMode = 'customize' | 'photo'

/** Categorias de ROSTO → câmera aproxima na cabeça (as demais enquadram o corpo todo). */
const FACE_CATEGORIES = new Set([
  'head',
  'hair',
  'eyes',
  'eyebrows',
  'nose',
  'facialHair',
  'glasses',
  'hat',
])

/**
 * Câmera do configurador — espelha o `CameraManager.jsx` do WawaSensei com drei `CameraControls`.
 * - **Personalizar (corpo)**: `fitToBox` no bounding box do personagem → cabeça E pés sempre
 *   visíveis (conserta o "começa perto demais / corta a cabeça").
 * - **Personalizar (rosto)**: aproxima na altura da cabeça (`setLookAt`, transição suave).
 * - **Cabine de fotos**: enquadramento RETRATO (rosto centralizado + headroom) e órbita LIVRE
 *   (a criança posiciona antes de tirar a foto).
 * Reenquadra quando muda modo/categoria, e na 1ª vez que o personagem fica em pé (`ready`).
 */
export function CameraManager({
  charRef,
  mode,
  category,
  ready,
  fitKey,
  onFramed,
}: {
  charRef: RefObject<THREE.Group | null>
  mode: CamMode
  category: string
  /** Vira `true` quando o rig fica em pé (pés no pódio) — só então a 1ª moldura faz sentido. */
  ready: boolean
  /** Chave da combinação que precisa estar enquadrada antes da captura. */
  fitKey: string
  onFramed: (fitKey: string) => void
}) {
  const controls = useRef<ComponentRef<typeof CameraControls>>(null)
  const box = useRef(new THREE.Box3())
  const center = useRef(new THREE.Vector3())
  const { active } = useProgress()

  useEffect(() => {
    const cc = controls.current
    const obj = charRef.current
    if (!cc || !obj || !ready || active) return
    let cancelled = false
    const markFramed = (result: unknown) => {
      void Promise.resolve(result).then(
        () => {
          if (!cancelled) onFramed(fitKey)
        },
        () => {},
      )
    }

    obj.updateWorldMatrix(true, true)
    box.current.setFromObject(obj)
    if (box.current.isEmpty()) return
    const b = box.current
    const c = b.getCenter(center.current)
    const h = Math.max(0.001, b.max.y - b.min.y)

    let frameResult: unknown
    if (mode === 'photo') {
      // Retrato: rosto centralizado + folga em cima (o avatar é mostrado REDONDO → foca a cara).
      const ty = b.max.y - h * 0.16
      frameResult = cc.setLookAt(c.x, ty + h * 0.06, c.z + h * 1.05, c.x, ty, c.z, true)
    } else if (FACE_CATEGORIES.has(category)) {
      const ty = b.max.y - h * 0.12
      frameResult = cc.setLookAt(c.x, ty + h * 0.05, c.z + h * 0.85, c.x, ty, c.z, true)
    } else {
      // Corpo inteiro — fitToBox enquadra cabeça+pés com folga.
      frameResult = cc.fitToBox(obj, true, {
        paddingLeft: 0.35,
        paddingRight: 0.35,
        paddingTop: 0.12,
        paddingBottom: 0.12,
      })
    }
    markFramed(frameResult)

    return () => {
      cancelled = true
    }
  }, [charRef, mode, category, ready, active, fitKey, onFramed])

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={0.6}
      maxDistance={9}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 1.85}
    />
  )
}
