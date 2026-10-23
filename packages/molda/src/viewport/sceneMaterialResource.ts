import { DoubleSide, FrontSide, MeshStandardMaterial, ShaderChunk, SRGBColorSpace } from 'three'
import type { SceneRgba } from '../scene/composite'
import type { SceneMaterial } from '../scene/document'
import type { SceneMaterialImageKind } from '../scene/materialImages'
import type { ScenePaintResource } from './scenePaintResource'

export interface PreparedSceneMaterial {
  source: SceneMaterial
  base: SceneRgba
  /** Non-owning binding; the scene retains paint until its last material leaves. */
  maps: Partial<Record<SceneMaterialImageKind, ScenePaintResource>>
}

/** One material owner per ID. Finish stays independent from the shared paint resource. */
export class SceneMaterialResource {
  readonly material = new MeshStandardMaterial()
  private disposed = false

  constructor() {
    // With MSAA, a covered fragment's center may lie outside its triangle. Sampling
    // UV there reads the next atlas tile, leaving dots around an erased plane.
    // Centroid interpolation samples inside the covered triangle without shrinking UVs.
    this.material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <uv_pars_vertex>',
        ShaderChunk.uv_pars_vertex.replace('varying vec2 vMapUv;', 'centroid varying vec2 vMapUv;'),
      )
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <uv_pars_fragment>',
        ShaderChunk.uv_pars_fragment.replace(
          'varying vec2 vMapUv;',
          'centroid varying vec2 vMapUv;',
        ),
      )
    }
    this.material.customProgramCacheKey = () => 'molda-centroid-color-uv-v1'
  }

  update({ source, base, maps }: PreparedSceneMaterial): void {
    if (this.disposed) throw new Error('Material já descartado.')
    const wasMapped = this.material.map !== null
    const wasNormalMapped = this.material.normalMap !== null
    const wasRoughnessMapped = this.material.roughnessMap !== null
    const wasMetalnessMapped = this.material.metalnessMap !== null
    const oldSide = this.material.side
    const wasTransparent = this.material.transparent
    const paint = maps.color
    if (paint) {
      this.material.map = paint.texture
      this.material.color.setRGB(1, 1, 1)
      this.material.opacity = 1
      this.material.transparent = paint.transparent
    } else {
      this.material.map = null
      this.material.color.setRGB(base[0], base[1], base[2], SRGBColorSpace)
      this.material.opacity = base[3]
      this.material.transparent = base[3] < 1
    }
    this.material.alphaTest = source.alphaMask?.cutoff ?? 0
    if (source.alphaMask) {
      this.material.opacity *= source.alphaMask.opacity
      this.material.transparent = false
    }
    this.material.depthWrite = !this.material.transparent
    this.material.roughness = source.roughness
    this.material.metalness = source.metalness
    this.material.normalMap = maps.normal?.texture ?? null
    this.material.roughnessMap = maps.roughness?.texture ?? null
    this.material.metalnessMap = maps.metalness?.texture ?? null
    const strength = source.normalStrength ?? 1
    this.material.normalScale.set(strength, source.normalFlipY ? -strength : strength)
    this.material.side = source.doubleSided ? DoubleSide : FrontSide
    this.material.name = source.name
    if (
      wasMapped !== (this.material.map !== null) ||
      wasNormalMapped !== (this.material.normalMap !== null) ||
      wasRoughnessMapped !== (this.material.roughnessMap !== null) ||
      wasMetalnessMapped !== (this.material.metalnessMap !== null) ||
      oldSide !== this.material.side ||
      wasTransparent !== this.material.transparent
    )
      this.material.needsUpdate = true
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.material.dispose()
    this.material.map = null
    this.material.normalMap = null
    this.material.roughnessMap = null
    this.material.metalnessMap = null
  }
}
