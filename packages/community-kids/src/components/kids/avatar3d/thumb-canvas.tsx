'use client'

import { Bounds, useGLTF, useProgress } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { clone as cloneSkinnedScene } from 'three/examples/jsm/utils/SkeletonUtils.js'
import {
  AVATAR_PART_INFO,
  baseGlbUrl,
  DEFAULT_AVATAR_SLOTS,
  partGlbUrl,
} from '@/lib/avatar3d-catalog'

/** Categorias que ficam NA CABEÇA → a thumbnail mostra a peça sobre uma cabeça base (em contexto). */
const HEAD_SITTING = new Set<string>([
  'hair',
  'eyes',
  'eyebrows',
  'nose',
  'faceDecor',
  'facialHair',
  'glasses',
  'hat',
  'accessory',
])

/** Acha o esqueleto compartilhado a partir do 1º skinned mesh (robusto a nomes). */
function findSkeleton(scene: THREE.Object3D): THREE.Skeleton | null {
  let found: THREE.Skeleton | null = null
  scene.traverse((o) => {
    const sm = o as THREE.SkinnedMesh
    if (sm.isSkinnedMesh && !found) found = sm.skeleton
  })
  return found
}
/** Osso raiz (cujo pai não é osso) — pra colocar a árvore de ossos na cena. */
function rootBoneOf(skeleton: THREE.Skeleton): THREE.Bone | null {
  const set = new Set<THREE.Object3D>(skeleton.bones)
  return skeleton.bones.find((b) => !b.parent || !set.has(b.parent)) ?? skeleton.bones[0] ?? null
}
/** Cor representativa da peça (default da categoria, senão deixa a do material). */
function representativeColor(partId: string): string | undefined {
  const cat = AVATAR_PART_INFO[partId]?.category
  return cat ? DEFAULT_AVATAR_SLOTS[cat]?.color : undefined
}

type ThumbMesh = {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  mtd?: { [key: string]: number }
  mti?: number[]
}

/**
 * Uma peça presa ao esqueleto (clonado), com MATERIAL CLONADO + recolorido — NÃO o material
 * compartilhado do `useGLTF` (senão pintar a thumbnail vazaria a cor pro avatar real, que usa o
 * MESMO material). `Skin_*` usa o material de pele do mini-rig. Geometria é compartilhada (só
 * dados, sem mutação); os materiais clonados são descartados ao desmontar.
 */
function ThumbAssetMeshes({
  assetId,
  color,
  skin,
  skeleton,
}: {
  assetId: string
  color?: string
  skin: THREE.Material
  skeleton: THREE.Skeleton
}) {
  // `false, false` = SEM Draco/Meshopt (GLB simples; o Meshopt do drei instancia WASM →
  // bloqueado pela CSP do kids). Mesmos args do avatar-rig/asset-part (cache por URL).
  const { scene } = useGLTF(partGlbUrl(assetId), false, false)
  const meshes = useMemo<ThumbMesh[]>(() => {
    const items: ThumbMesh[] = []
    scene.traverse((child) => {
      const mesh = child as THREE.Mesh
      if (!mesh.isMesh) return
      const src = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as
        | THREE.MeshStandardMaterial
        | undefined
      let material: THREE.Material
      if (src?.name?.includes('Skin_')) {
        material = skin
      } else if (src) {
        const cl = src.clone()
        if (color && cl.name?.includes('Color_')) cl.color.set(color)
        material = cl
      } else {
        material = new THREE.MeshStandardMaterial()
      }
      items.push({
        geometry: mesh.geometry,
        material,
        mtd: mesh.morphTargetDictionary,
        mti: mesh.morphTargetInfluences,
      })
    })
    return items
  }, [scene, color, skin])

  // Descarta SÓ os materiais clonados (não a pele compartilhada, nem a geometria do cache).
  useEffect(() => {
    return () => {
      for (const m of meshes) if (m.material !== skin) m.material.dispose()
    }
  }, [meshes, skin])

  return (
    <>
      {meshes.map((m, i) => (
        <skinnedMesh
          // biome-ignore lint/suspicious/noArrayIndexKey: ordem estável dos meshes do GLB.
          key={i}
          geometry={m.geometry}
          material={m.material}
          skeleton={skeleton}
          morphTargetDictionary={m.mtd}
          morphTargetInfluences={m.mti}
          // não deixa o R3F descartar a geometria COMPARTILHADA (quebraria o avatar real).
          dispose={null}
        />
      ))}
    </>
  )
}

/**
 * Mini-rig de UMA peça: esqueleto CLONADO/independente (um Object3D só pode estar numa cena por
 * vez) + a peça presa nele — o MESMO caminho de render do personagem real (que funciona), por
 * isso NÃO sai em branco. Traços de rosto vão sobre a cabeça base `head-01`; roupas sozinhas.
 */
function ThumbRig({ partId, category }: { partId: string; category: string }) {
  const armature = useGLTF(baseGlbUrl('Armature'), false, false)
  const cloned = useMemo(() => cloneSkinnedScene(armature.scene), [armature.scene])
  const skeleton = useMemo(() => findSkeleton(cloned), [cloned])
  const rootBone = useMemo(() => (skeleton ? rootBoneOf(skeleton) : null), [skeleton])
  const skin = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ecad80', roughness: 1 }), [])
  useEffect(() => () => skin.dispose(), [skin])
  const onHead = HEAD_SITTING.has(category)
  if (!skeleton) return null
  return (
    <group rotation={[Math.PI / 2, 0, 0]} scale={0.01} dispose={null}>
      {rootBone ? <primitive object={rootBone} /> : null}
      {onHead ? (
        <ThumbAssetMeshes
          assetId={DEFAULT_AVATAR_SLOTS.head.asset}
          skin={skin}
          skeleton={skeleton}
        />
      ) : null}
      <ThumbAssetMeshes
        assetId={partId}
        color={representativeColor(partId)}
        skin={skin}
        skeleton={skeleton}
      />
    </group>
  )
}

// Cache de SESSÃO: cada peça é "fotografada" 1× (render → PNG) e depois mostrada como `<img>` —
// ZERO WebGL no display (o jeito mais leve, igual às thumbnails pré-renderizadas do WawaSensei).
// Regenera só em sessão nova (barato). `null` enquanto gera.
const thumbCache = new Map<string, string>()

/** Tira a "foto" da cena assentada (carregada + enquadrada pelo `<Bounds>`) e devolve a dataURL. */
function CaptureBridge({ onCaptured }: { onCaptured: (url: string) => void }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const { active } = useProgress()
  const settle = useRef(0)
  const done = useRef(false)
  useFrame(() => {
    if (done.current) return
    if (active) {
      settle.current = 0 // ainda carregando algum GLB → reinicia a espera
      return
    }
    // espera uns frames pro `<Bounds>` enquadrar + renderizar antes de capturar.
    settle.current += 1
    if (settle.current < 5) return
    done.current = true
    gl.render(scene, camera)
    onCaptured(gl.domElement.toDataURL('image/png'))
  })
  return null
}

/**
 * MINIATURA de uma peça. Ordem: (1) PNG **PRÉ-GERADO e commitado** em `public/avatar3d/thumbs/<id>.png`
 * (`bun run gen:avatar-thumbs`) — `<img>` estático, ZERO WebGL (o jeito do WawaSensei); (2) faltando o
 * PNG, renderiza AO VIVO 1× (reusando o render do personagem — skinnedMesh + esqueleto; o offscreen
 * anterior saía EM BRANCO), "tira a foto" e troca pra `<img>` (cache de sessão). Mais leve que `<Canvas>`
 * vivo ou drei `<View>` (que renderizam ao vivo). `<Bounds>` enquadra; "nenhum" = ✕ (tratado no pai).
 */
export function AvatarThumb({ partId, category }: { partId: string; category: string }) {
  const [captured, setCaptured] = useState<string | null>(() => thumbCache.get(partId) ?? null)
  const [staticFailed, setStaticFailed] = useState(false)
  // Foto capturada ao vivo nesta sessão (fallback que já rodou) → mostra.
  if (captured) {
    return (
      <img
        src={captured}
        alt=""
        width={96}
        height={96}
        className="size-full object-contain"
        draggable={false}
      />
    )
  }
  // (1) PNG pré-gerado e commitado → zero WebGL. Faltou (404)? cai pro render ao vivo.
  if (!staticFailed) {
    return (
      <img
        src={`/avatar3d/thumbs/${partId}.png`}
        alt=""
        width={96}
        height={96}
        className="size-full object-contain"
        draggable={false}
        onError={() => setStaticFailed(true)}
      />
    )
  }
  // (2) Sem PNG → renderiza ao vivo 1× + captura.
  return (
    <Canvas
      frameloop="always"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      camera={{ fov: 30, position: [0, 0, 4] }}
      className="size-full"
    >
      <ambientLight intensity={1.05} />
      <directionalLight position={[2, 3, 4]} intensity={1.6} />
      <directionalLight position={[-2, 1, -2]} intensity={0.4} />
      <Suspense fallback={null}>
        <Bounds fit clip observe margin={1.1}>
          <ThumbRig partId={partId} category={category} />
        </Bounds>
      </Suspense>
      <CaptureBridge
        onCaptured={(u) => {
          thumbCache.set(partId, u)
          setCaptured(u)
        }}
      />
    </Canvas>
  )
}

useGLTF.preload(baseGlbUrl('Armature'), false, false)
