import {
  BufferAttribute,
  type BufferGeometry,
  Color,
  Group,
  Mesh,
  ShaderMaterial,
  SkinnedMesh,
  Vector2,
  Vector4,
} from 'three'
import type { BrushSize } from '../paint/skinPaint'
import type { MoldaSceneDocument, SceneGeometry, SceneImage } from '../scene/document'
import { indexSceneDocument } from '../scene/documentIndex'
import { buildSceneGeometry } from '../scene/geometry'
import { sceneFlipbookRegion } from '../scene/imageFlipbook'
import type {
  ScenePaintContact,
  ScenePaintRgba,
  ScenePaintSample,
  ScenePaintTarget,
} from '../scene/imagePaint'
import { SCENE_MATERIAL_IMAGE_FIELDS } from '../scene/materialImages'
import { prepareScenePaintContact, sampleScenePaintContact } from '../scene/paintContact'
import type { SceneRenderResource } from './sceneRenderResource'
import type { ScenePaintSurfaceScope } from './sceneViewportTypes'

export interface ScenePaintGuideSettings {
  grid: boolean
  brush: BrushSize
  ink: ScenePaintRgba
  cursor: boolean
}
const vertexShader = `
varying vec2 paintUv;
#include <skinning_pars_vertex>
void main() {
  paintUv = uv;
  #include <skinbase_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  #include <project_vertex>
}`
const fragmentShader = `
varying vec2 paintUv;
uniform vec2 resolution;
uniform float grid;
uniform vec3 ink;
uniform vec4 brushRect;
uniform vec4 mirrorRect;
vec2 coverage(vec2 p, vec4 rect, vec2 pixel) {
  vec2 edge = min((p - rect.xy) / pixel, (rect.zw - p) / pixel);
  float distance = min(edge.x, edge.y);
  return vec2(smoothstep(-0.6, 0.6, distance), 1.0 - smoothstep(1.0, 2.0, distance));
}
void main() {
  vec2 p = paintUv * resolution;
  vec2 pixel = max(fwidth(p), vec2(0.00001));
  vec2 distance = abs(fract(p - 0.5) - 0.5) / pixel;
  float line = 1.0 - smoothstep(0.25, 0.8, min(distance.x, distance.y));
  float density = 1.0 - smoothstep(0.2, 0.8, max(pixel.x, pixel.y));
  vec4 color = vec4(vec3(0.9), line * grid * density * 0.28);
  vec2 mirror = coverage(p, mirrorRect, pixel);
  if (mirror.x > 0.0) color = vec4(mix(vec3(0.46, 0.16, 0.78), vec3(1.0), mirror.y), mirror.x * mix(0.4, 1.0, mirror.y));
  vec2 brush = coverage(p, brushRect, pixel);
  if (brush.x > 0.0) color = vec4(mix(ink, vec3(1.0), brush.y), brush.x * mix(0.42, 1.0, brush.y));
  if (color.a < 0.001) discard;
  gl_FragColor = color;
  #include <colorspace_fragment>
}`
function material() {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      resolution: { value: new Vector2(1, 1) },
      grid: { value: 0 },
      ink: { value: new Color() },
      brushRect: { value: new Vector4(-2, -2, -1, -1) },
      mirrorRect: { value: new Vector4(-2, -2, -1, -1) },
    },
    transparent: true,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    toneMapped: false,
  })
}
interface Drawing {
  source: BufferGeometry
  geometry: SceneGeometry
  mesh: Mesh<BufferGeometry, ShaderMaterial[]>
  buffers: ReturnType<typeof buildSceneGeometry>
}

/** UV-based overlays show actual texel coverage, without changing a texture or render resource. */
export class ScenePaintGuides {
  readonly root = new Group()
  private drawings = new Map<Mesh, Drawing>()
  private preparations = new WeakMap<
    MoldaSceneDocument,
    Map<string, ReturnType<typeof prepareScenePaintContact>>
  >()
  private indexed: {
    document: MoldaSceneDocument
    index: ReturnType<typeof indexSceneDocument>
  } | null = null
  constructor() {
    this.root.name = 'molda-paint-guides'
  }

  contact(document: MoldaSceneDocument, contact: ScenePaintContact) {
    let entries = this.preparations.get(document)
    if (!entries) {
      entries = new Map()
      this.preparations.set(document, entries)
    }
    const key = JSON.stringify([contact.nodeId, contact.faceId, contact.mirror?.faceId])
    let prepared = entries.get(key)
    if (!prepared) {
      prepared = prepareScenePaintContact(document, contact)
      entries.set(key, prepared)
    }
    const sample = sampleScenePaintContact(prepared.document, prepared.target, contact)
    const mirrored =
      contact.mirror && prepared.sample.mirror?.target
        ? sampleScenePaintContact(prepared.document, prepared.sample.mirror.target, contact.mirror)
        : null
    return {
      document: prepared.document,
      sample: mirrored ? { ...sample, mirror: mirrored } : sample,
    }
  }
  update(
    document: MoldaSceneDocument | null,
    resource: SceneRenderResource,
    settings: ScenePaintGuideSettings | null,
    scope: ScenePaintSurfaceScope | null,
    target: ScenePaintTarget | null,
    hover: { document: MoldaSceneDocument; sample: ScenePaintSample } | null,
  ) {
    const source = hover?.document ?? document
    this.root.visible = !!settings && !!source
    if (!settings || !source) {
      this.clear()
      return
    }
    if (this.indexed?.document !== source)
      this.indexed = { document: source, index: indexSceneDocument(source) }
    const index = this.indexed.index
    const live = new Set<Mesh>()
    for (const object of resource.root.children) {
      if (!(object instanceof Mesh) || !object.visible) continue
      const instance = resource.instanceFor(object)
      if (
        !instance ||
        instance.locked ||
        (scope?.mode === 'selected' && scope.nodeId !== instance.sourceNodeId) ||
        (!scope && target?.nodeId !== instance.sourceNodeId)
      )
        continue
      const node = index.scene.nodes.get(instance.sourceNodeId)
      const geometry = node?.kind === 'mesh' ? index.geometries.get(node.geometryId) : undefined
      if (!geometry || node?.kind !== 'mesh') continue
      live.add(object)
      let drawing = this.drawings.get(object)
      if (!drawing || drawing.source !== object.geometry || drawing.geometry !== geometry) {
        if (drawing) this.release(drawing)
        const buffers = buildSceneGeometry(geometry)
        const owned: BufferGeometry = object.geometry.clone()
        owned.setAttribute('uv', new BufferAttribute(buffers.uvs.slice(), 2))
        const materials = owned.groups.map(() => material())
        let mesh: Mesh<BufferGeometry, ShaderMaterial[]>
        if (object instanceof SkinnedMesh) {
          const skin = new SkinnedMesh(owned, materials)
          skin.bindMode = object.bindMode
          skin.bind(object.skeleton, object.bindMatrix)
          mesh = skin
        } else mesh = new Mesh(owned, materials)
        // Each group owns a guide material, including separate faces sharing a material slot.
        owned.groups.forEach((group, i) => {
          group.materialIndex = i
        })
        mesh.matrixAutoUpdate = false
        mesh.frustumCulled = false
        mesh.renderOrder = 18
        this.root.add(mesh)
        drawing = { source: object.geometry, geometry, mesh, buffers }
        this.drawings.set(object, drawing)
      }
      drawing.mesh.matrix.copy(object.matrixWorld)
      drawing.mesh.matrixWorldNeedsUpdate = true
      drawing.mesh.geometry.groups.forEach((group, i) => {
        const id = drawing.buffers.materialIds[group.start / 3] ?? node.materialId
        const material = index.materials.get(id)
        const imageId =
          material?.[SCENE_MATERIAL_IMAGE_FIELDS[scope ? 'color' : (target?.imageKind ?? 'color')]]
        const image = imageId ? index.images.get(imageId) : undefined
        const guide = drawing.mesh.material[i]!
        guide.visible = !!image
        if (!image) return
        guide.uniforms.resolution!.value.set(
          image.flipbook?.frameWidth ?? image.width,
          image.flipbook?.frameHeight ?? image.height,
        )
        guide.uniforms.grid!.value = settings.grid ? 1 : 0
        guide.uniforms.ink!.value.setRGB(
          settings.ink[0] / 255,
          settings.ink[1] / 255,
          settings.ink[2] / 255,
          'srgb',
        )
        for (const [name, sample] of [
          ['brushRect', hover?.sample],
          ['mirrorRect', hover?.sample.mirror],
        ] as const) {
          const rect: Vector4 = guide.uniforms[name]!.value
          rect.set(-2, -2, -1, -1)
          const binding = sample?.target ?? target
          if (
            settings.cursor &&
            sample &&
            binding?.nodeId === node.id &&
            binding.imageId === imageId
          )
            this.rectangle(
              rect,
              sample,
              image,
              resource.frameForImage(imageId!) ?? 0,
              settings.brush,
            )
        }
      })
    }
    for (const [object, drawing] of this.drawings)
      if (!live.has(object)) {
        this.release(drawing)
        this.drawings.delete(object)
      }
  }
  private rectangle(
    rect: Vector4,
    sample: ScenePaintSample,
    image: SceneImage,
    frame: number,
    size: BrushSize,
  ) {
    const cell = image.flipbook
      ? sceneFlipbookRegion(image, frame)
      : { x0: 0, y0: 0, x1: image.width - 1, y1: image.height - 1 }
    const limit = sample.bounds ?? cell
    const offset = size === 3 ? -1 : 0
    rect.set(
      Math.max(sample.point[0] + offset, limit.x0) - cell.x0,
      Math.max(sample.point[1] + offset, limit.y0) - cell.y0,
      Math.min(sample.point[0] + offset + size, limit.x1 + 1) - cell.x0,
      Math.min(sample.point[1] + offset + size, limit.y1 + 1) - cell.y0,
    )
  }
  private release(drawing: Drawing) {
    drawing.mesh.removeFromParent()
    drawing.mesh.geometry.dispose()
    for (const material of drawing.mesh.material) material.dispose()
  }
  clear() {
    for (const drawing of this.drawings.values()) this.release(drawing)
    this.drawings.clear()
    this.root.visible = false
  }
  dispose() {
    this.clear()
    this.root.removeFromParent()
    this.indexed = null
    this.preparations = new WeakMap()
  }
}
