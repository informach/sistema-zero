'use client'

import { CameraControls } from '@react-three/drei'
import { type ComponentRef, useEffect, useRef } from 'react'

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
// Personagem: pés em y=0, ~1,8 de altura (centro ~0,95). O quadro cobre ~2,6u → ~12% de folga
// em cima (chapéu alto) e embaixo. Câmera um tico à esquerda e acima (vista 3/4 gentil).
const CAM_POS = [-0.4, 1.1, 3.1] as const
// Cabine de fotos: um tico MAIS LONGE (nunca aproxima — a criança VÊ a pose inteira com folga).
const CAM_POS_PHOTO = [-0.4, 1.1, 3.6] as const
const CAM_TARGET = [0, 0.95, 0] as const

export function CameraManager({
  mode,
  ready,
}: {
  mode: CamMode
  /** Vira `true` quando o rig fica em pé (pés no pódio) — só então a moldura faz sentido. */
  ready: boolean
}) {
  const controls = useRef<ComponentRef<typeof CameraControls>>(null)

  useEffect(() => {
    const cc = controls.current
    if (!cc || !ready) return
    // Mesmo alvo nos dois modos; só a distância muda (foto = mais longe). Reenquadra ao entrar
    // em cada modo (recentraliza de frente) — `mode` é lido de propósito.
    const [px, py, pz] = mode === 'photo' ? CAM_POS_PHOTO : CAM_POS
    void cc.setLookAt(px, py, pz, ...CAM_TARGET, true)
  }, [mode, ready])

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={1.5}
      maxDistance={9}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 1.9}
    />
  )
}
