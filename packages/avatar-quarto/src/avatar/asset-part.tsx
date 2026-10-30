'use client'

import { useGLTF } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import type { Material, Skeleton } from 'three'
import { partGlbUrl } from './catalog'
import { prepararPecasDoAvatar } from './instance'

/**
 * Uma PEÇA do avatar: carrega o GLB (`useGLTF`, fetch+parse, sem WASM), e renderiza cada
 * mesh como `<skinnedMesh>` preso ao esqueleto próprio do avatar, dividido entre suas peças.
 * Aplica a cor nos materiais `Color_*` próprios e usa a pele do avatar nos `Skin_*`
 * (a cor da pele = slot `head`). Espelha o `Asset.jsx` do WawaSensei, sem PocketBase.
 */
export function AssetPart({
  asset,
  color,
  skin,
  skeleton,
  onSettled,
  materialOverride,
}: {
  asset: string
  color?: string
  /** Material de pele COMPARTILHADO (a cor vem do slot `head`). */
  skin: Material
  /** Esqueleto desta montagem, derivado do `Armature.glb`. */
  skeleton: Skeleton
  /** Avisa que a peça já está na cena (o rig só mede o corpo com todas lá). */
  onSettled?: () => void
  /** Material de apresentação de dono externo, como a silhueta do jogo. */
  materialOverride?: Material
}) {
  // `false, false` = SEM Draco e SEM Meshopt: os GLBs são simples (sem compressão), e
  // o decoder Meshopt do drei instancia WebAssembly ao ser configurado → bloqueado pela
  // CSP do kids (`script-src` sem `wasm-unsafe-eval`, decisão de segurança infantil) e
  // jogava um `CompileError` no console. Desligar mantém a CSP estrita e zera o erro.
  const { scene } = useGLTF(partGlbUrl(asset), false, false)

  // Depois do commit as malhas desta peça já estão no grafo da cena.
  useEffect(() => {
    onSettled?.()
  }, [onSettled])

  const montagem = useMemo(
    () => prepararPecasDoAvatar(scene, skin, materialOverride),
    [scene, skin, materialOverride],
  )
  useEffect(() => {
    montagem.pintar(color)
  }, [montagem, color])
  useEffect(() => () => montagem.soltar(), [montagem])

  return (
    <>
      {montagem.pecas.map((m, i) => (
        <skinnedMesh
          // biome-ignore lint/suspicious/noArrayIndexKey: ordem estável dos meshes do GLB.
          key={i}
          geometry={m.geometry}
          material={m.material}
          skeleton={skeleton}
          morphTargetDictionary={m.morphTargetDictionary}
          morphTargetInfluences={m.morphTargetInfluences}
          castShadow={!materialOverride}
          receiveShadow={!materialOverride}
        />
      ))}
    </>
  )
}
