import type { MoradaCatalog, MoradaInstance, MoradaPiece } from '@sistemazero/core/morada'
import {
  type AnimationMixer,
  DataTexture,
  type Material,
  Mesh,
  MeshStandardMaterial,
  NearestFilter,
  type Object3D,
  Quaternion,
  RGBAFormat,
  type Skeleton,
  SkinnedMesh,
  SRGBColorSpace,
  type Texture,
  Vector3,
} from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'

/** Uma paleta própria: a mesma célula troca em todas as faces que a usam. */
export function moradaPalette(catalog: MoradaCatalog, colors: Record<string, string>): DataTexture {
  const pixels = new Uint8Array(16 * 16 * 4).fill(255)
  for (const [name, entry] of Object.entries(catalog.palette)) {
    const hex = colors[name] ?? entry.hex
    const offset = ((15 - Math.floor(entry.index / 16)) * 16 + (entry.index % 16)) * 4
    pixels[offset] = Number.parseInt(hex.slice(1, 3), 16)
    pixels[offset + 1] = Number.parseInt(hex.slice(3, 5), 16)
    pixels[offset + 2] = Number.parseInt(hex.slice(5, 7), 16)
  }
  const texture = new DataTexture(pixels, 16, 16, RGBAFormat)
  texture.colorSpace = SRGBColorSpace
  texture.minFilter = texture.magFilter = NearestFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return texture
}

/** Clona os ossos e materiais, preservando geometria/cache e as origens autorais. */
export function prepareMoradaScene(
  original: Object3D,
  piece: MoradaPiece,
  instance: Pick<MoradaInstance, 'colors' | 'materials'>,
  catalog: MoradaCatalog,
  textures: ReadonlyMap<string, Texture> = new Map(),
) {
  const scene = clone(original)
  const materials = new Map<Material, Material>()
  const skeletons = new Set<Skeleton>()
  const palette = Object.keys(instance.colors ?? {}).length
    ? moradaPalette(catalog, instance.colors ?? {})
    : null
  const materialCopy = (source: Material) => {
    const existing = materials.get(source)
    if (existing) return existing
    const copy = source.clone()
    if (copy instanceof MeshStandardMaterial) {
      const defaults = piece.materials.find((m) => m.name === source.name)
      const override = instance.materials?.[source.name]
      const map = override?.texture ? catalog.textures[override.texture]?.file : defaults?.map
      if (map && textures.has(map)) copy.map = textures.get(map) ?? null
      // A textura escolhida substitui o acabamento autoral, inclusive o seu tingimento.
      if (override?.texture && map) copy.color.set('#ffffff')
      if (defaults?.emissiveMap && textures.has(defaults.emissiveMap))
        copy.emissiveMap = textures.get(defaults.emissiveMap) ?? null
      if (source.name === 'atlas' && palette) copy.map = palette
      if (override?.color) {
        copy.color.set(override.color)
        if (!override.texture) copy.map = null
      }
      copy.needsUpdate = true
    }
    materials.set(source, copy)
    return copy
  }
  scene.traverse((node) => {
    if (piece.collisionMeshes.includes(node.name) || node.userData.colisao) node.visible = false
    if (!(node instanceof Mesh)) return
    node.castShadow = node.receiveShadow = true
    node.material = Array.isArray(node.material)
      ? node.material.map(materialCopy)
      : materialCopy(node.material)
    if (node instanceof SkinnedMesh) skeletons.add(node.skeleton)
  })
  return {
    scene,
    dispose() {
      for (const material of materials.values()) material.dispose()
      for (const skeleton of skeletons) skeleton.dispose()
      palette?.dispose()
    },
  }
}

export interface MoradaMovingPart {
  object: Object3D
  position: Vector3
  quaternion: Quaternion
  axis: Vector3
  amount: number
  type: 'door' | 'slide'
  value: number
  target: number
}

export function moradaMovingParts(scene: Object3D, piece: MoradaPiece): MoradaMovingPart[] {
  return piece.interactions.flatMap((interaction) => {
    const object = scene.getObjectByName(interaction.id)
    return object
      ? [
          {
            object,
            position: object.position.clone(),
            quaternion: object.quaternion.clone(),
            axis: new Vector3(...interaction.axis).normalize(),
            amount: interaction.amount,
            type: interaction.type,
            value: 0,
            target: 0,
          },
        ]
      : []
  })
}

/** Avança só o relógio local; a pausa conserva a posição da porta e dos seus slots. */
export function stepMoradaParts(parts: MoradaMovingPart[], dt: number): void {
  for (const part of parts) {
    part.value +=
      Math.sign(part.target - part.value) * Math.min(Math.abs(part.target - part.value), dt * 3)
    const smooth = part.value * part.value * (3 - 2 * part.value)
    if (part.type === 'door')
      part.object.quaternion
        .copy(part.quaternion)
        .multiply(new Quaternion().setFromAxisAngle(part.axis, part.amount * smooth))
    else part.object.position.copy(part.position).addScaledVector(part.axis, part.amount * smooth)
  }
}

/** Pausa o mixer e as partes no mesmo instante, sem reiniciar a pose ao retomar. */
export function stepMoradaAnimation(
  mixer: AnimationMixer,
  parts: MoradaMovingPart[],
  dt: number,
  paused: boolean,
): void {
  if (paused) return
  const elapsed = Math.min(dt, 0.1)
  mixer.update(elapsed)
  stepMoradaParts(parts, elapsed)
}
