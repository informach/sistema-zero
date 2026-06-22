'use client'

import { CameraControls } from '@react-three/drei'
import { type ComponentRef, type RefObject, useEffect, useRef } from 'react'
import * as THREE from 'three'

export type CamMode = 'customize' | 'photo'

/**
 * Câmera do configurador (drei `CameraControls`). Espelha a IDEIA do WawaSensei (posição fixa,
 * sem zoom por categoria — os placements dele vinham do PocketBase). Aqui mede o bounding box
 * do personagem (estável, pois ele fica em pé UMA vez) e enquadra GENTIL:
 * - **Personalizar**: SEMPRE o CORPO INTEIRO, câmera bem mais LONGE e mais BAIXA (cabeça E pés
 *   com folga) — a criança escolhe traços pelas MINIATURAS, sem precisar de zoom no rosto ao vivo.
 * - **Cabine de fotos**: RETRATO (cabeça+ombros), pro avatar redondo.
 * Reenquadra SÓ em [mode, ready] — trocar peça/cor NÃO mexe a câmera (fim do "recarrega a cena").
 * Guarda `h > 0.8`: não enquadra um box parcial (era a causa do "só metade da cabeça").
 */
export function CameraManager({
  charRef,
  mode,
  ready,
}: {
  charRef: RefObject<THREE.Group | null>
  mode: CamMode
  /** Vira `true` quando o rig fica em pé — só então a moldura faz sentido. */
  ready: boolean
}) {
  const controls = useRef<ComponentRef<typeof CameraControls>>(null)
  const box = useRef(new THREE.Box3())
  const center = useRef(new THREE.Vector3())

  useEffect(() => {
    const cc = controls.current
    const obj = charRef.current
    if (!cc || !obj || !ready) return
    obj.updateWorldMatrix(true, true)
    box.current.setFromObject(obj)
    if (box.current.isEmpty()) return
    const b = box.current
    const c = b.getCenter(center.current)
    const h = Math.max(0.001, b.max.y - b.min.y)
    // GUARDA anti-"meia cabeça": só enquadra com o CORPO INTEIRO medido (peça parcial → h pequeno).
    if (h < 0.8) return
    const { min, max } = b

    if (mode === 'photo') {
      // RETRATO (cabeça + ombros) — o avatar é mostrado REDONDO, então a foto foca a cara.
      const ty = max.y - h * 0.18
      void cc.setLookAt(c.x, max.y - h * 0.12, c.z + h * 1.3, c.x, ty, c.z, true)
    } else {
      // CORPO INTEIRO — MUITO mais longe e mais baixa (quase no nível), cabeça E pés com folga.
      const ty = min.y + h * 0.5
      void cc.setLookAt(c.x - h * 0.2, min.y + h * 0.4, c.z + h * 3.2, c.x, ty, c.z, true)
    }
  }, [charRef, mode, ready])

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={0.6}
      maxDistance={14}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 1.9}
    />
  )
}
