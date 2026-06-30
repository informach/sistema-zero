'use client'

import { useGLTF } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import type { BufferGeometry, Material, Mesh, MeshStandardMaterial, Skeleton } from 'three'
import { partGlbUrl } from '@/lib/avatar3d-catalog'

/**
 * Uma PEÇA do avatar: carrega o GLB (`useGLTF`, fetch+parse, sem WASM), e renderiza cada
 * mesh como `<skinnedMesh>` preso ao esqueleto COMPARTILHADO (vindo do Armature). Aplica a
 * cor da peça nos materiais `Color_*` e usa o material de pele compartilhado nos `Skin_*`
 * (a cor da pele = slot `head`). Espelha o `Asset.jsx` do WawaSensei, sem PocketBase.
 */
export function AssetPart({
  asset,
  color,
  skin,
  skeleton,
}: {
  asset: string
  color?: string
  /** Material de pele COMPARTILHADO (a cor vem do slot `head`). */
  skin: Material
  /** Esqueleto compartilhado (do `Armature.glb`). */
  skeleton: Skeleton
}) {
  // `false, false` = SEM Draco e SEM Meshopt: os GLBs são simples (sem compressão), e
  // o decoder Meshopt do drei instancia WebAssembly ao ser configurado → bloqueado pela
  // CSP do kids (`script-src` sem `wasm-unsafe-eval`, decisão de segurança infantil) e
  // jogava um `CompileError` no console. Desligar mantém a CSP estrita e zera o erro.
  const { scene } = useGLTF(partGlbUrl(asset), false, false)

  // Pinta os materiais tintáveis (`Color_*`) com a cor da peça.
  useEffect(() => {
    if (!color) return
    scene.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      const mat = mesh.material as MeshStandardMaterial
      if (mat?.name?.includes('Color_')) mat.color.set(color)
    })
  }, [scene, color])

  const meshes = useMemo(() => {
    const items: {
      geometry: BufferGeometry
      material: Material
      morphTargetDictionary?: Mesh['morphTargetDictionary']
      morphTargetInfluences?: Mesh['morphTargetInfluences']
    }[] = []
    scene.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      const mat = mesh.material as Material
      items.push({
        geometry: mesh.geometry,
        // `Skin_*` → material de pele compartilhado; senão o material da própria peça.
        material: mat?.name?.includes('Skin_') ? skin : mat,
        morphTargetDictionary: mesh.morphTargetDictionary,
        morphTargetInfluences: mesh.morphTargetInfluences,
      })
    })
    return items
  }, [scene, skin])

  return (
    <>
      {meshes.map((m, i) => (
        <skinnedMesh
          // biome-ignore lint/suspicious/noArrayIndexKey: ordem estável dos meshes do GLB.
          key={i}
          geometry={m.geometry}
          material={m.material}
          skeleton={skeleton}
          morphTargetDictionary={m.morphTargetDictionary}
          morphTargetInfluences={m.morphTargetInfluences}
          castShadow
          receiveShadow
        />
      ))}
    </>
  )
}
