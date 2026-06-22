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
 * Mede o bounding box do personagem, mas enquadra GENTIL (e só com o corpo inteiro medido):
 * - **Personalizar (default + roupas)**: CORPO INTEIRO, câmera mais longe e mais baixa (cabeça E pés).
 * - **Personalizar (rosto)**: upper-body GENTIL (cabeça bem visível, corpo ainda à vista).
 * - **Cabine de fotos**: RETRATO (cabeça+ombros) + órbita LIVRE (a criança posiciona a foto).
 * Reenquadra ao mudar modo/categoria e na 1ª vez que o personagem fica em pé (`ready`); a guarda
 * `h > 0.8` evita enquadrar um box parcial — era a causa do "só metade da cabeça".
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
    // GUARDA anti-"meia cabeça": só enquadra com o CORPO INTEIRO medido. Box parcial (só a
    // cabeça carregou, ou a spring da "cabine" ainda encolhida) → h pequeno → espera o
    // próximo frame. O personagem tem ~1.7 de altura, então 0.8 separa "parcial" de "inteiro".
    if (h < 0.8) return
    const { min, max } = b

    let frameResult: unknown
    if (mode === 'photo') {
      // Retrato (cabeça + ombros) — o avatar é mostrado REDONDO, então a foto foca a cara.
      const ty = max.y - h * 0.18
      frameResult = cc.setLookAt(c.x, max.y - h * 0.1, c.z + h * 1.15, c.x, ty, c.z, true)
    } else if (FACE_CATEGORIES.has(category)) {
      // Upper-body GENTIL: cabeça bem visível, mas o corpo ainda aparece (sem crop justo).
      const ty = max.y - h * 0.28
      frameResult = cc.setLookAt(
        c.x - h * 0.18,
        max.y - h * 0.16,
        c.z + h * 1.6,
        c.x,
        ty,
        c.z,
        true,
      )
    } else {
      // CORPO INTEIRO (default): câmera mais LONGE e mais BAIXA (quase no nível) — cabeça E pés.
      const ty = min.y + h * 0.5
      frameResult = cc.setLookAt(c.x - h * 0.28, min.y + h * 0.6, c.z + h * 2.3, c.x, ty, c.z, true)
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
