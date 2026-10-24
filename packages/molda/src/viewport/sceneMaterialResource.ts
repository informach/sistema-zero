import { DoubleSide, FrontSide, MeshStandardMaterial, ShaderChunk, SRGBColorSpace } from 'three'
import type { SceneRgba } from '../scene/composite'
import type { SceneMaterial } from '../scene/document'
import type { SceneMaterialImageKind } from '../scene/materialImages'
import type { ScenePaintResource } from './scenePaintResource'

/** X-ray alpha, close to Blender's default: enough to read the front, see what's behind. */
export const SCENE_XRAY_ALPHA = 0.4

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
  private xray = false
  private authoredTransparent = false
  // Fades after alphaTest: the cutout and authored opacity stay as painted.
  private readonly xrayAlpha = { value: 1 }

  constructor() {
    // With MSAA, a covered fragment's center may lie outside its triangle. Sampling
    // UV there reads the next atlas tile, leaving dots around an erased plane.
    // Centroid interpolation samples inside the covered triangle without shrinking UVs.
    this.material.onBeforeCompile = (shader) => {
      shader.uniforms.moldaXrayAlpha = this.xrayAlpha
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
      shader.fragmentShader = shader.fragmentShader
        .replace('void main() {', 'uniform float moldaXrayAlpha;\nvoid main() {')
        .replace(
          '#include <alphatest_fragment>',
          '#include <alphatest_fragment>\ndiffuseColor.a *= moldaXrayAlpha;',
        )
    }
    this.material.customProgramCacheKey = () => 'molda-centroid-color-uv-xray-v2'
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
    this.authoredTransparent = this.material.transparent
    this.applyXray()
    this.material.roughness = source.roughness
    this.material.metalness = source.metalness
    this.material.normalMap = maps.normal?.texture ?? null
    this.material.roughnessMap = maps.roughness?.texture ?? null
    this.material.metalnessMap = maps.metalness?.texture ?? null
    const strength = source.normalStrength ?? 1
    this.material.normalScale.set(strength, source.normalFlipY ? -strength : strength)
    // Same sides as the exported GLB, so picking and painting never reach a hidden back.
    // The workshop shows that back separately, in a dark tone (SceneRenderResource).
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

  /** Workshop view only: the authored material and its export stay unchanged. */
  setXray(on: boolean): void {
    if (this.disposed || this.xray === on) return
    this.xray = on
    const wasTransparent = this.material.transparent
    this.applyXray()
    if (wasTransparent !== this.material.transparent) this.material.needsUpdate = true
  }

  private applyXray(): void {
    this.material.transparent = this.authoredTransparent || this.xray
    this.material.depthWrite = !this.material.transparent
    this.xrayAlpha.value = this.xray ? SCENE_XRAY_ALPHA : 1
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
