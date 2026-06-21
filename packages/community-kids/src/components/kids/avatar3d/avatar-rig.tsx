'use client'

import { useAnimations, useGLTF } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import {
  AVATAR_CATEGORIES,
  AVATAR_HIDE_GROUPS,
  AVATAR_REMOVABLE_NONE,
  type AvatarCategory,
  type AvatarSlot,
  baseGlbUrl,
} from '@/lib/avatar3d-catalog'
import { AssetPart } from './asset-part'

type Slots = Partial<Record<string, AvatarSlot>>

/** Acha o esqueleto compartilhado a partir do 1º skinned mesh do Armature (robusto a nomes). */
function findSkeleton(scene: THREE.Object3D): THREE.Skeleton | null {
  let found: THREE.Skeleton | null = null
  scene.traverse((o) => {
    const sm = o as THREE.SkinnedMesh
    if (sm.isSkinnedMesh && !found) found = sm.skeleton
  })
  return found
}
/** Osso raiz da hierarquia (cujo pai não é osso) — pra colocar a árvore de ossos na cena. */
function rootBoneOf(skeleton: THREE.Skeleton): THREE.Bone | null {
  const set = new Set<THREE.Object3D>(skeleton.bones)
  return skeleton.bones.find((b) => !b.parent || !set.has(b.parent)) ?? skeleton.bones[0] ?? null
}

/**
 * Monta o personagem: 1 esqueleto compartilhado (`Armature.glb`) + 1 `<AssetPart>` por
 * categoria equipada (pula "nenhum" e categorias ocultas por chapéu). Material de pele
 * compartilhado (cor do slot `head`). Poses do `Poses.glb` (best-effort). Espelha o
 * `Avatar.jsx` do WawaSensei, sem PocketBase (os dados vêm do nosso catálogo).
 */
export function AvatarRig({ slots, pose = 'Idle' }: { slots: Slots; pose?: string }) {
  const group = useRef<THREE.Group>(null)
  const armature = useGLTF(baseGlbUrl('Armature'))
  const poses = useGLTF(baseGlbUrl('Poses'))
  const { actions } = useAnimations(poses.animations, group)

  const skeleton = useMemo(() => findSkeleton(armature.scene), [armature.scene])
  const rootBone = useMemo(() => (skeleton ? rootBoneOf(skeleton) : null), [skeleton])

  // Material de pele COMPARTILHADO — a cor vem do slot `head`.
  const skin = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ecad80', roughness: 1 }), [])
  const headColor = slots.head?.color
  useEffect(() => {
    if (headColor) skin.color.set(headColor)
  }, [skin, headColor])

  // Pose (animação) — best-effort: action inexistente → fica na pose de bind.
  useEffect(() => {
    const action = actions?.[pose] ?? actions?.Idle
    action?.reset().fadeIn(0.3).play()
    return () => {
      action?.fadeOut(0.3)
    }
  }, [actions, pose])

  // Oclusão: categoria escondida por outra equipada com peça REAL (≠ nenhum) — ex.: chapéu→cabelo.
  const hidden = useMemo(() => {
    const set = new Set<string>()
    for (const cat of Object.keys(AVATAR_HIDE_GROUPS) as AvatarCategory[]) {
      const noneId = AVATAR_REMOVABLE_NONE[cat]
      const asset = slots[cat]?.asset
      if (asset && asset !== noneId) for (const h of AVATAR_HIDE_GROUPS[cat] ?? []) set.add(h)
    }
    return set
  }, [slots])

  // Mixamo: cm + Y-up rotacionado (mesmos valores do Avatar.jsx do WawaSensei).
  return (
    <group ref={group} rotation={[Math.PI / 2, 0, 0]} scale={0.01} dispose={null}>
      {rootBone ? <primitive object={rootBone} /> : null}
      {skeleton
        ? AVATAR_CATEGORIES.map((cat) => {
            const slot = slots[cat]
            const noneId = AVATAR_REMOVABLE_NONE[cat]
            if (!slot?.asset || slot.asset === noneId || hidden.has(cat)) return null
            return (
              <AssetPart
                key={cat}
                asset={slot.asset}
                color={slot.color}
                skin={skin}
                skeleton={skeleton}
              />
            )
          })
        : null}
    </group>
  )
}

// Pré-carrega o esqueleto base + poses (as peças carregam sob demanda por categoria equipada).
useGLTF.preload(baseGlbUrl('Armature'))
useGLTF.preload(baseGlbUrl('Poses'))
