'use client'

import { CameraControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { type ComponentRef, type RefObject, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { measureCharacter } from './measure'
import { type PhotoFraming, photoFrame } from './photo-framing'

export type CamMode = 'customize' | 'photo'

/**
 * Câmera do configurador (drei `CameraControls`) — FIEL ao WawaSensei: posição **FIXA**, SEM
 * medir o bounding box. Medir dependia do timing de carga (refresh frio mede uma caixa
 * diferente da navegação quente → enquadramento diferente, "às vezes mais pra cima, às vezes
 * quase colando no painel"). Como o personagem fica em pé com os **pés em y=0** (auto-stand no
 * rig), uma moldura fixa SEMPRE enquadra igual — determinístico.
 *
 * **Mesmo enquadramento de CORPO INTEIRO nos dois modos** — a Cabine de fotos NÃO aproxima (o
 * WawaSensei também não: o zoom por-categoria dele só roda em CUSTOMIZE; no modo foto cai no
 * enquadramento padrão). Assim a criança VÊ a pose. O "retrato" da imagem do avatar fica por
 * conta do `SnapshotBridge` ("Salvar" força um retrato de rosto, independente do que está na
 * tela). Reenquadra em [ready, mode] (centraliza de frente ao entrar em cada modo); trocar
 * peça/cor NÃO mexe a câmera.
 *
 * A cena 3D ocupa só a faixa ACIMA do painel (layout flex no configurador), então "centrado na
 * cena" = "centrado na área visível, descontando a configuração de baixo".
 */
// Personagem: pés em y=0. ⚠️ A conta antiga supunha ~1,8 de altura, mas com cabelo volumoso o
// boneco passa de 2,2 e com chapéu chega perto de 2,5: a moldura (alvo 0,95, distância 3,1, ~2,6u
// de altura) cortava o topo do cabelo e a aba do chapéu (26/10/2026, medido na prévia). Hoje o
// quadro cobre ~3,2u centrado em 1,15: do pódio ao chapéu mais alto, com folga em cima. Câmera um
// tico à esquerda e acima (vista 3/4 gentil), na mesma direção de antes.
const CAM_POS = [-0.28, 0.72, 2.05] as const
// Cabine de fotos: um tico MAIS LONGE (nunca aproxima — a criança VÊ a pose inteira com folga).
const CAM_POS_PHOTO = [-0.28, 0.72, 2.4] as const
const CAM_TARGET = [0, 0.56, 0] as const

/** Quanto a prévia espera a pose chegar ao auge antes de medir o boneco (as poses param no auge). */
const POSE_ASSENTA_MS = 900

export function CameraManager({
  mode,
  ready,
  framing,
  charRef,
  pose,
}: {
  mode: CamMode
  /** Vira `true` quando o rig fica em pé (pés no pódio) — só então a moldura faz sentido. */
  ready: boolean
  /**
   * Cabine com o enquadramento escolhido (26/11/2026): a prévia mostra o que a foto vai pegar,
   * pela MESMA conta da foto (`photoFrame`), medindo o boneco da pose de agora. Sem ele, a moldura
   * fixa de sempre.
   */
  framing?: PhotoFraming
  charRef?: RefObject<THREE.Group | null>
  /** A pose da Cabine: trocar reenquadra depois que ela assenta. */
  pose?: string
}) {
  const controls = useRef<ComponentRef<typeof CameraControls>>(null)
  const gl = useThree((s) => s.gl)
  const box = useRef(new THREE.Box3())

  // biome-ignore lint/correctness/useExhaustiveDependencies: `pose` não é lida, mas cada troca de pose precisa medir o boneco de novo.
  useEffect(() => {
    const cc = controls.current
    if (!cc || !ready) return
    const enquadrar = () => {
      const char = charRef?.current
      if (mode === 'photo' && framing && char) {
        measureCharacter(char, box.current)
        if (!box.current.isEmpty()) {
          const { position, target } = photoFrame(box.current, gl.domElement, framing === 'face')
          void cc.setLookAt(...position, ...target, true)
          return
        }
      }
      // Mesmo alvo nos dois modos; só a distância muda (foto = mais longe). Reenquadra ao entrar
      // em cada modo (recentraliza de frente) — `mode` é lido de propósito.
      const [px, py, pz] = mode === 'photo' ? CAM_POS_PHOTO : CAM_POS
      void cc.setLookAt(px, py, pz, ...CAM_TARGET, true)
    }
    enquadrar()
    if (mode !== 'photo' || !framing) return
    // A pose escolhida ainda está começando: mede de novo quando ela chega ao auge.
    const t = setTimeout(enquadrar, POSE_ASSENTA_MS)
    return () => clearTimeout(t)
  }, [mode, ready, framing, pose, charRef, gl])

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={0.5}
      maxDistance={5}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 1.9}
    />
  )
}
