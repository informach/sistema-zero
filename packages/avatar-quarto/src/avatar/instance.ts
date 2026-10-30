import {
  type Material,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  type Skeleton,
  SkinnedMesh,
} from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'

function primeiroEsqueleto(original: Object3D): Skeleton | null {
  let skeleton: Skeleton | null = null
  original.traverse((o) => {
    if (o instanceof SkinnedMesh && !skeleton) skeleton = o.skeleton
  })
  return skeleton
}

/** Geometrias e materiais do cache ficam intactos; ossos e boneTexture são da montagem. */
export function copiarEsqueletoDoAvatar(original: Object3D) {
  const cena = clone(original)
  const skeleton = primeiroEsqueleto(cena)
  const ossos = new Set<Object3D>(skeleton?.bones ?? [])
  const raiz =
    skeleton?.bones.find((b) => !b.parent || !ossos.has(b.parent)) ?? skeleton?.bones[0] ?? null
  const esqueletos = new Set<Skeleton>()
  cena.traverse((o) => {
    if (o instanceof SkinnedMesh) esqueletos.add(o.skeleton)
  })
  return {
    skeleton,
    raiz,
    soltar() {
      for (const s of esqueletos) s.dispose()
    },
  }
}

/** Skin e override têm dono externo. Só os materiais próprios são descartados aqui. */
export function prepararPecasDoAvatar(original: Object3D, skin: Material, override?: Material) {
  const proprios = new Map<Material, Material>()
  const pecas: {
    geometry: Mesh['geometry']
    material: Material | Material[]
    morphTargetDictionary?: Mesh['morphTargetDictionary']
    morphTargetInfluences?: number[]
  }[] = []
  const copiar = (mat: Material) => {
    if (override) return override
    if (mat.name.includes('Skin_')) return skin
    let copia = proprios.get(mat)
    if (!copia) {
      copia = mat.clone()
      proprios.set(mat, copia)
    }
    return copia
  }
  original.traverse((o) => {
    if (!(o instanceof Mesh)) return
    pecas.push({
      geometry: o.geometry,
      material: Array.isArray(o.material) ? o.material.map(copiar) : copiar(o.material),
      morphTargetDictionary: o.morphTargetDictionary ? { ...o.morphTargetDictionary } : undefined,
      morphTargetInfluences: o.morphTargetInfluences ? [...o.morphTargetInfluences] : undefined,
    })
  })
  return {
    pecas,
    pintar(cor: string | undefined) {
      if (cor)
        for (const m of proprios.values())
          if (m instanceof MeshStandardMaterial && m.name.includes('Color_')) m.color.set(cor)
    },
    soltar() {
      for (const m of proprios.values()) m.dispose()
    },
  }
}
