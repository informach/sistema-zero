'use client'

import { useCursor } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { PdfPages } from './use-pdf-pages'

/**
 * Livro 3D com páginas que DOBRAM ao virar — implementação própria da técnica
 * de skinned mesh: cada folha é um BoxGeometry segmentado ao longo de X com uma
 * cadeia de bones na lombada; girar os bones com easing por frame produz a
 * curvatura natural do papel. As texturas (frente/verso) vêm do pdf.js — frente
 * da folha i = página 2i+1 do PDF, verso = página 2i+2.
 */

const PAGE_WIDTH = 1.28
const PAGE_DEPTH = 0.004
const SEGMENTS = 24
/** Velocidade do damp exponencial (quanto maior, mais rápida a virada). */
const EASE_LAMBDA = 5
/** Curvatura de repouso das páginas abertas (leve arco de papel). */
const REST_CURL = 0.07
/** Curvatura extra enquanto a folha está virando (dobra viajante). */
const TURN_CURL = 0.18
/** Duração aproximada da dobra de virada (ms). */
const TURN_MS = 600
/** Contracapa (lado de fora do livro fechado no fim) — tom escuro do tema. */
const BACK_COVER_COLOR = '#15181e'

/** Geometria compartilhada por todas as folhas (skinIndex/skinWeight ao longo de X). */
function createPageGeometry(height: number): THREE.BoxGeometry {
  const geo = new THREE.BoxGeometry(PAGE_WIDTH, height, PAGE_DEPTH, SEGMENTS, 2)
  geo.translate(PAGE_WIDTH / 2, 0, 0) // origem na lombada — a folha gira por ela
  const segW = PAGE_WIDTH / SEGMENTS
  const pos = geo.getAttribute('position')
  const v = new THREE.Vector3()
  const skinIndex: number[] = []
  const skinWeight: number[] = []
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos as THREE.BufferAttribute, i)
    const x = Math.max(0, v.x)
    const idx = Math.min(SEGMENTS - 1, Math.floor(x / segW))
    const w = Math.min(1, (x - idx * segW) / segW)
    skinIndex.push(idx, idx + 1, 0, 0)
    skinWeight.push(1 - w, w, 0, 0)
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4))
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4))
  return geo
}

const PAPER_EDGE = new THREE.Color('#f5f1e8')

/** Damp exponencial frame-rate-independent (mesma família do MathUtils.damp). */
function damp(current: number, target: number, delta: number): number {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-EASE_LAMBDA * delta))
}

interface SheetProps {
  number: number
  totalSheets: number
  /** Folhas viradas — `number < page` significa que ESTA folha está à esquerda. */
  page: number
  geometry: THREE.BoxGeometry
  front: THREE.Texture | null
  back: THREE.Texture | null
  onFlip: (toPage: number) => void
}

function Sheet({ number, totalSheets, page, geometry, front, back, onFlip }: SheetProps) {
  // Verso da ÚLTIMA folha = lado de fora do livro fechado no fim (contracapa):
  // sem página do PDF ali (total ímpar), pinta com o tom escuro do tema.
  const isBackCover = number === totalSheets - 1
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)

  const turned = number < page
  const turnedAtRef = useRef(0)
  const lastTurnedRef = useRef(turned)

  // Materiais frente/verso ficam estáveis; só o `map` muda quando a textura chega.
  const { frontMat, backMat } = useMemo(
    () => ({
      frontMat: new THREE.MeshStandardMaterial({ color: 'white', roughness: 0.9 }),
      backMat: new THREE.MeshStandardMaterial({ color: 'white', roughness: 0.9 }),
    }),
    [],
  )
  useEffect(() => {
    frontMat.map = front
    frontMat.color.set(front ? 'white' : '#e8e4da')
    frontMat.needsUpdate = true
    backMat.map = back
    backMat.color.set(back ? 'white' : isBackCover ? BACK_COVER_COLOR : '#e8e4da')
    backMat.needsUpdate = true
  }, [front, back, frontMat, backMat, isBackCover])

  // SkinnedMesh manual: cadeia de bones da lombada à borda externa da folha.
  const mesh = useMemo(() => {
    const sideMat = new THREE.MeshStandardMaterial({ color: PAPER_EDGE, roughness: 1 })
    // Ordem de materiais do BoxGeometry: +x, -x, +y, -y, +z (frente), -z (verso).
    const materials = [sideMat, sideMat, sideMat, sideMat, frontMat, backMat]
    const skinned = new THREE.SkinnedMesh(geometry, materials)
    skinned.frustumCulled = false

    const bones: THREE.Bone[] = []
    const segW = PAGE_WIDTH / SEGMENTS
    for (let i = 0; i <= SEGMENTS; i++) {
      const bone = new THREE.Bone()
      bone.position.x = i === 0 ? 0 : segW
      const prev = bones[i - 1]
      if (prev) prev.add(bone)
      bones.push(bone)
    }
    const root = bones[0]
    if (root) skinned.add(root)
    skinned.bind(new THREE.Skeleton(bones))
    return skinned
  }, [geometry, frontMat, backMat])

  useEffect(() => {
    return () => {
      frontMat.dispose()
      backMat.dispose()
    }
  }, [frontMat, backMat])

  useFrame((_, delta) => {
    if (!mesh) return
    if (lastTurnedRef.current !== turned) {
      lastTurnedRef.current = turned
      turnedAtRef.current = performance.now()
    }
    // Progresso 0→1→0 da dobra viajante durante a virada.
    const t = Math.min(1, (performance.now() - turnedAtRef.current) / TURN_MS)
    const turnBump = Math.sin(t * Math.PI)

    const bookClosed = page === 0 || page === totalSheets
    // Ângulo-alvo da folha inteira, DE FRENTE pro leitor: não virada = 0 (página
    // à direita, face pra câmera — livro fechado mostra a CAPA), virada = -π
    // (deita à esquerda, verso pra câmera). Leque sutil por folha no miolo.
    const fan = bookClosed ? 0 : (number - page + 0.5) * 0.01
    const rootTarget = (turned ? -Math.PI : 0) + fan

    const bones = mesh.skeleton.bones
    for (let i = 0; i < bones.length; i++) {
      const bone = bones[i]
      if (!bone) continue
      const u = i / (bones.length - 1)
      if (i === 0) {
        bone.rotation.y = damp(bone.rotation.y, rootTarget, delta)
        continue
      }
      // Curl de repouso (arco suave) + dobra viajante enquanto vira. O sinal
      // acompanha o lado: páginas à esquerda curvam para o lado oposto.
      const side = turned ? 1 : -1
      const rest = bookClosed ? 0 : REST_CURL * Math.sin(u * Math.PI * 0.7 + 0.2)
      const bump = TURN_CURL * turnBump * Math.sin(u * Math.PI)
      const target = ((side * (rest + bump)) / SEGMENTS) * Math.PI
      bone.rotation.y = damp(bone.rotation.y, target, delta)
    }
  })

  // Empilhamento: folhas não viradas descem (z-) na ordem; viradas sobem.
  const z = -number * PAGE_DEPTH + page * PAGE_DEPTH

  return (
    <group
      ref={groupRef}
      position-z={z}
      onPointerEnter={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerLeave={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation()
        // Clique na folha vira para frente (direita) ou para trás (esquerda).
        onFlip(turned ? number : number + 1)
      }}
    >
      <primitive object={mesh} />
    </group>
  )
}

export interface Book3DProps {
  pdf: PdfPages
  /** Folhas viradas (0 = capa fechada; totalSheets = contracapa). */
  page: number
  onFlip: (toPage: number) => void
}

export function Book3D({ pdf, page, onFlip }: Book3DProps) {
  const groupRef = useRef<THREE.Group>(null)
  const totalSheets = Math.ceil(pdf.numPages / 2)
  const height = PAGE_WIDTH * pdf.pageAspect

  const geometry = useMemo(() => createPageGeometry(height), [height])
  useEffect(() => () => geometry.dispose(), [geometry])

  // Flutuação idle sutil (vida sem distrair da leitura).
  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    groupRef.current.rotation.z = Math.sin(t * 0.4) * 0.006
    groupRef.current.position.y = Math.sin(t * 0.6) * 0.01
  })

  // Livro fechado fica centralizado; aberto, a lombada vai ao centro.
  const bookClosed = page === 0 || page === totalSheets
  const xTarget = bookClosed ? (page === 0 ? -PAGE_WIDTH / 2 : PAGE_WIDTH / 2) : 0
  const innerRef = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (!innerRef.current) return
    innerRef.current.position.x = damp(innerRef.current.position.x, xTarget, delta)
  })

  return (
    // Inclinação MÍNIMA: o livro abre praticamente de frente (legibilidade);
    // o aluno inclina mais se quiser via drag (OrbitControls).
    <group ref={groupRef} rotation-x={-0.06}>
      <group ref={innerRef}>
        {Array.from({ length: totalSheets }, (_, i) => {
          // pdf.version na key NÃO — as texturas mudam por prop (getTexture).
          const front = pdf.getTexture(2 * i + 1)
          const back = pdf.getTexture(2 * i + 2)
          return (
            <Sheet
              key={`sheet-${
                // biome-ignore lint/suspicious/noArrayIndexKey: folhas são posicionais e estáveis
                i
              }`}
              number={i}
              totalSheets={totalSheets}
              page={page}
              geometry={geometry}
              front={front}
              back={back}
              onFlip={onFlip}
            />
          )
        })}
      </group>
    </group>
  )
}
