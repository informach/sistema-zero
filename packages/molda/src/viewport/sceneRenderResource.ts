import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  type ColorSpace,
  Group,
  type Intersection,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NoColorSpace,
  type Object3D,
  type Raycaster,
  SkinnedMesh,
  SRGBColorSpace,
  Vector3,
} from 'three'
import type { Vec3 } from '../core/model'
import {
  type ScenePixelRegion,
  type SceneRgba,
  sceneBaseColor,
  scenePalette,
} from '../scene/composite'
import type {
  MoldaSceneDocument,
  SceneGeometry,
  SceneImage,
  SceneImageFlipbook,
  SceneMaterial,
  SceneMeshGeometry,
} from '../scene/document'
import { indexSceneDocument } from '../scene/documentIndex'
import { evaluateSceneInstances, type SceneInstance } from '../scene/evaluate'
import { buildSceneGeometry, type SceneGeometryBuffers } from '../scene/geometry'
import { prepareSceneGeometryUv, type SceneGeometryUvPatch } from '../scene/geometryUv'
import { readSceneImageFlipbook, sceneFlipbookRegion } from '../scene/imageFlipbook'
import {
  prepareSceneImageRaster,
  type SceneRasterPatch,
  type SceneRasterSource,
} from '../scene/imageRaster'
import {
  SCENE_MATERIAL_IMAGE_FIELDS,
  SCENE_MATERIAL_IMAGE_KINDS,
  type SceneMaterialImageKind,
  sceneMaterialImageBase,
} from '../scene/materialImages'
import { meshComponentEdges } from '../scene/meshComponents'
import { sceneGeometryMesh } from '../scene/parametricGeometry'
import type { SceneAnimationPose } from '../scene/sampleAnimation'
import type { SceneSkinBinding } from '../scene/skin'
import { compileSceneSkinGeometry } from '../scene/skinPose'
import { requireScene } from '../scene/validation'
import { SceneSkinResource } from './SceneSkinResource'
import { SceneSurfaceQuery } from './SceneSurfaceQuery'
import { applySceneGeometryUvUpload } from './sceneGeometryUvUpload'
import { SCENE_XRAY_ALPHA, SceneMaterialResource } from './sceneMaterialResource'
import { ScenePaintResource } from './scenePaintResource'
import { type SceneEdgeSegments, sceneVisibleEdges } from './sceneVisibleEdges'

interface SkinEntry {
  binding: SceneSkinBinding
  source: SceneMeshGeometry
  resource: SceneSkinResource
}

interface GeometryEntry {
  source: SceneGeometry
  buffers: SceneGeometryBuffers
  geometry: BufferGeometry
  uvAttribute: BufferAttribute
  slots: Array<string | null>
}

interface MaterialEntry {
  revision: number
  source: SceneMaterial
  images: Partial<Record<SceneMaterialImageKind, SceneImage>>
  paletteKey: string
  base: SceneRgba
  resource: SceneMaterialResource
}

interface PaintSource extends SceneRasterSource {
  colorSpace: ColorSpace
}
interface PaintEntry {
  source: PaintSource
  resource: ScenePaintResource
}

export interface SceneDrawIssue {
  nodeId: string
  faceId: string
  code: SceneGeometryBuffers['issues'][number]['code']
}

function geometryEntry(source: SceneGeometry, buffers: SceneGeometryBuffers): GeometryEntry {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(buffers.positions, 3))
  geometry.setAttribute('normal', new BufferAttribute(buffers.normals, 3))
  const uv = new BufferAttribute(buffers.uvs, 2)
  uv.onUpload(() => uv.clearUpdateRanges())
  geometry.setAttribute('uv', uv)
  const slots = [...new Set(buffers.materialIds)]
  const slotIndices = new Map(slots.map((id, i) => [id, i]))
  for (let i = 0; i < buffers.materialIds.length; i++) {
    const id = buffers.materialIds[i] ?? null
    const slot = slotIndices.get(id)
    if (slot === undefined) throw new Error('Material de desenho ausente.')
    const previous = geometry.groups.at(-1)
    if (previous?.materialIndex === slot) previous.count += 3
    else geometry.addGroup(i * 3, 3, slot)
  }
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return { source, buffers, geometry, slots, uvAttribute: uv }
}

/**
 * Flat draw instances, not a second authorial hierarchy. World transforms come
 * from the pure scene index. Geometry/material/texture are shared by resource ID;
 * selecting/moving nodes never regenerates paint. No renderer/DOM lifecycle here.
 */
export class SceneRenderResource {
  readonly root = new Group()
  private readonly surfaces = new SceneSurfaceQuery()
  private readonly geometries = new Map<string, GeometryEntry>()
  private readonly materials = new Map<string, MaterialEntry>()
  private materialRevision = 0
  private xray = false
  // The back of open meshes and of flipped faces: a dark workshop-only tone that never takes a
  // click or a brush and stays out of photos. Pushed back in depth, a double-sided material's
  // own back still wins where it exists.
  private readonly backMaterial = new MeshBasicMaterial({
    color: 0x1d2333,
    side: BackSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  })
  private readonly hiddenBackMaterial = new MeshBasicMaterial({ visible: false })
  private readonly backs = new Map<Mesh, Mesh>()
  private readonly paints = new Map<string, PaintEntry>()
  private readonly frames = new Map<string, { source: SceneImageFlipbook; frame: number }>()
  private readonly meshes = new Map<string, Mesh<BufferGeometry, MeshStandardMaterial[]>>()
  private readonly skins = new Map<string, SkinEntry>()
  private readonly skinOwners = new WeakMap<Mesh, SceneSkinResource>()
  private readonly identity = new WeakMap<Object3D, string>()
  private instances = new Map<string, SceneInstance>()
  private source: MoldaSceneDocument | null = null
  private index: ReturnType<typeof indexSceneDocument> | null = null
  private pose: SceneAnimationPose | null = null
  private poseRevision = 0
  private formBaseNode: string | null = null
  private disposed = false
  private readonly edgeCache = new WeakMap<
    Mesh,
    {
      source: SceneGeometry
      pose: number
      paint: string
      segments: SceneEdgeSegments
    }
  >()

  /** Current frame bounds, tied to the same authorial revision as the calling viewport. */
  skinLocalBounds(document: MoldaSceneDocument | null) {
    requireScene(
      !this.disposed && document === this.source,
      'bounds',
      'Os limites pertencem a outra revisão do desenho.',
    )
    return new Map(
      [...this.skins]
        .filter(([nodeId]) => nodeId !== this.formBaseNode)
        .map(([nodeId, entry]) => [nodeId, entry.resource.localBounds()]),
    )
  }

  /** Session-only rest geometry for component editing. Keep skeletons and every owned buffer. */
  setFormBase(nodeId: string | null): boolean {
    if (this.disposed) throw new Error('Cena já descartada.')
    const next = nodeId !== null && this.skins.has(nodeId) ? nodeId : null
    requireScene(!this.pose || next === null, 'skin', 'Feche a pose antes de editar a forma-base.')
    if (next === this.formBaseNode) return false
    for (const instance of this.instances.values()) {
      if (instance.sourceNodeId !== next && instance.sourceNodeId !== this.formBaseNode) continue
      const visible = this.meshes.get(instance.id)!.visible,
        skin =
          instance.sourceNodeId === next
            ? undefined
            : this.skins.get(instance.sourceNodeId)?.resource
      this.drawInstance(instance, this.geometries.get(instance.geometryId)!, skin).visible = visible
    }
    this.formBaseNode = next
    this.root.updateMatrixWorld(true)
    return true
  }

  /** View-only: fades every material, including ones the next document brings. */
  setXray(on: boolean): void {
    if (this.disposed) return
    this.xray = on
    for (const entry of this.materials.values()) entry.resource.setXray(on)
    if (this.backMaterial.transparent !== on) this.backMaterial.needsUpdate = true
    this.backMaterial.transparent = on
    this.backMaterial.depthWrite = !on
    this.backMaterial.opacity = on ? SCENE_XRAY_ALPHA : 1
  }

  /** Workshop-only backs, hidden while the thumbnail is taken. */
  backSides(): Object3D[] {
    return [...this.backs.values()]
  }

  instanceFor(object: Object3D): SceneInstance | null {
    const id = this.identity.get(object)
    return id ? (this.instances.get(id) ?? null) : null
  }

  /** Workshop guides must not fill the scene seen through authorial transparency. */
  authoredTransparencyFor(object: Object3D): boolean {
    const instance = this.instanceFor(object)
    const geometry = instance && this.geometries.get(instance.geometryId)
    if (!instance || !geometry) return false
    return geometry.slots.some(
      (id) => this.materials.get(id ?? instance.materialId)?.resource.authoredTransparency,
    )
  }

  /** Authorial boundaries include coplanar cuts; render triangulation is never an edit edge. */
  edgePositionsFor(object: Mesh): Array<readonly [Vec3, Vec3]> {
    const instance = this.instanceFor(object)
    const entry = instance ? this.geometries.get(instance.geometryId) : null
    if (!entry || !instance) return []
    const materials = (Array.isArray(object.material) ? object.material : [object.material]).map(
      (material) => {
        requireScene(
          material instanceof MeshStandardMaterial,
          'contour',
          'Material do contorno ausente.',
        )
        return material
      },
    )
    const paint = materials.map((material) => [
      material.alphaTest,
      material.transparent,
      material.opacity,
      material.map?.uuid,
      material.map?.version,
    ])
    // Paint may change while its first full GPU upload is still pending. Authorial
    // revisions identify that pixel source without retaining old authorial images.
    const revisions = entry.slots.map((id) => {
      const owner = this.materials.get(id ?? instance.materialId)
      requireScene(owner, 'contour', 'Material do contorno ausente.')
      return owner.revision
    })
    const key = JSON.stringify([paint, revisions])
    const cached = this.edgeCache.get(object)
    const pose = object instanceof SkinnedMesh ? this.poseRevision : 0
    if (cached?.source === entry.source && cached.paint === key && cached.pose === pose)
      return cached.segments
    const mesh = sceneGeometryMesh(entry.source)
    const positions = new Map<string, Vec3>()
    if (object instanceof SkinnedMesh) {
      const point = new Vector3()
      for (const [i, cornerIndex] of entry.buffers.cornerIndices.entries()) {
        const faceId = entry.buffers.componentFaceIds[Math.floor(i / 3)]
        const corner = faceId === undefined ? undefined : mesh.faces[faceId]?.corners[cornerIndex]
        requireScene(
          corner,
          'geometry',
          'O contorno perdeu a correspondência com a face desenhada.',
        )
        const vertexId = corner.vertexId
        if (positions.has(vertexId)) continue
        object.getVertexPosition(i, point)
        positions.set(vertexId, [point.x, point.y, point.z])
      }
    } else for (const [id, point] of Object.entries(mesh.vertices)) positions.set(id, point)
    const segments: Array<readonly [Vec3, Vec3]> = []
    for (const [a, b] of meshComponentEdges(mesh).values()) {
      const from = positions.get(a),
        to = positions.get(b)
      if (!from || !to) continue
      requireScene(
        [...from, ...to].every((n) => Number.isFinite(Math.fround(n))),
        'geometry',
        'O contorno excede a precisão de desenho. Seus pontos continuam guardados.',
      )
      segments.push([from, to])
    }
    const visible = materials.some((material) => material.alphaTest > 0 || material.transparent)
      ? sceneVisibleEdges(mesh, positions, (face) => {
          const slot = entry.slots.indexOf(face.materialId ?? null)
          // An invalid face omitted by the triangulator has no rendered material slot.
          if (slot < 0) return null
          const material = materials[slot]
          requireScene(material, 'contour', 'Material do contorno ausente.')
          return material
        })
      : segments
    this.edgeCache.set(object, {
      source: entry.source,
      pose,
      paint: key,
      segments: visible,
    })
    return visible
  }

  surfaceIntersections(raycaster: Raycaster): Intersection[] {
    const hits: Intersection[] = []
    for (const object of this.root.children)
      hits.push(
        ...(object instanceof Mesh && this.identity.has(object)
          ? this.surfaces.intersect(object, raycaster)
          : raycaster.intersectObject(object, false)),
      )
    return hits.sort((a, b) => a.distance - b.distance)
  }

  faceFor(object: Object3D, triangle: number): string | null {
    const instance = this.instanceFor(object)
    return instance
      ? (this.geometries.get(instance.geometryId)?.buffers.faceIds[triangle] ?? null)
      : null
  }
  /** Mesh editing uses individual authorial faces, even on a shared parametric paint surface. */
  componentFaceFor(object: Object3D, triangle: number): string | null {
    const instance = this.instanceFor(object)
    return instance
      ? (this.geometries.get(instance.geometryId)?.buffers.componentFaceIds[triangle] ?? null)
      : null
  }
  materialFor(object: Object3D, triangle: number): string | null {
    const instance = this.instanceFor(object)
    if (!instance) return null
    const buffers = this.geometries.get(instance.geometryId)?.buffers
    return buffers?.faceIds[triangle] === undefined
      ? null
      : (buffers.materialIds[triangle] ?? instance.materialId)
  }

  frameForImage(imageId: string): number | null {
    const chosen = this.frames.get(imageId)
    if (chosen) return chosen.frame
    for (const { source } of this.paints.values())
      if (source.image.id === imageId) return source.image.flipbook?.frames[0] ?? null
    return null
  }

  /** Session-only: update existing frame buffers, never geometry, UV or authorial pixels. */
  setImageFrame(imageId: string, frame: number | null): boolean {
    if (this.disposed) throw new Error('Cena já descartada.')
    const entries = [...this.paints.values()].filter(({ source }) => source.image.id === imageId)
    const image = entries[0]?.source.image
    if (!image?.flipbook) return false
    const next = frame ?? image.flipbook.frames[0]!
    const region = sceneFlipbookRegion(image, next)
    if (next === this.frameForImage(imageId)) return false
    for (const entry of entries) entry.resource.update(null, region)
    this.frames.set(imageId, { source: image.flipbook, frame: next })
    return true
  }

  /** Update only derived matrices/instances, preserving geometry, materials, pixels and isolation. */
  setPose(pose: SceneAnimationPose | null): boolean {
    if (this.disposed) throw new Error('Cena já descartada.')
    if (!this.index || this.pose === pose || (pose !== null && pose.source !== this.source))
      return false
    const instances = evaluateSceneInstances(this.index, pose?.worldMatrices)
    for (const instance of instances)
      requireScene(
        instance.worldMatrix.every((value) => Number.isFinite(Math.fround(value))),
        `nodes.${instance.id}`,
        'A posição animada excede a precisão de desenho.',
      )
    const applySkins = [...this.skins.values()].map(({ resource }) =>
      resource.preparePose(pose?.worldMatrices ?? this.index!.scene.worldMatrices),
    )
    let changed = false
    for (const apply of applySkins) changed = apply() || changed
    if (pose) changed = this.setFormBase(null) || changed
    for (const instance of instances) {
      const mesh = this.meshes.get(instance.id)!
      if (instance.worldMatrix.some((value, i) => value !== mesh.matrix.elements[i])) {
        mesh.matrix.fromArray(instance.worldMatrix)
        mesh.matrixWorldNeedsUpdate = true
        changed = true
      }
    }
    this.instances = new Map(instances.map((instance) => [instance.id, instance]))
    this.pose = pose
    this.poseRevision++
    if (changed) this.root.updateMatrixWorld(true)
    return changed
  }

  update(document: MoldaSceneDocument): SceneDrawIssue[] {
    if (this.disposed) throw new Error('Cena já descartada.')
    const index = indexSceneDocument(document)
    const instances = evaluateSceneInstances(index)
    const wantedGeometry = new Set(instances.map((instance) => instance.geometryId))
    const wantedMaterial = new Set(instances.map((instance) => instance.materialId))
    const preparedGeometry = new Map<
      string,
      { source: SceneGeometry; buffers: SceneGeometryBuffers; uv: SceneGeometryUvPatch | null }
    >()
    // Prepare ALL fallible authorial calculations before touching the visible frame.
    for (const instance of instances)
      requireScene(
        Float32Array.from(instance.worldMatrix).every(Number.isFinite),
        `nodes.${instance.id}`,
        'A posição excede a precisão de desenho.',
      )
    for (const id of wantedGeometry) {
      const source = index.geometries.get(id)
      if (!source) throw new Error('Geometria ausente.')
      const previous = this.geometries.get(id)
      const uv =
        previous && previous.source !== source
          ? prepareSceneGeometryUv(previous.source, source, previous.buffers)
          : null
      const buffers =
        previous && (previous.source === source || uv)
          ? previous.buffers
          : buildSceneGeometry(source)
      if (previous?.source !== source) preparedGeometry.set(id, { source, buffers, uv })
      for (const material of buffers.materialIds)
        if (material !== null) wantedMaterial.add(material)
    }
    const palette = scenePalette(document)
    const paletteKey = JSON.stringify(palette)
    const preparedMaterials = new Map<
      string,
      {
        source: SceneMaterial
        images: Partial<Record<SceneMaterialImageKind, SceneImage>>
        base: SceneRgba
        paintKeys: Partial<Record<SceneMaterialImageKind, string>>
      }
    >()
    const wantedPaint = new Map<string, PaintSource>()
    for (const id of wantedMaterial) {
      const source = index.materials.get(id)
      if (!source) throw new Error('Material ausente.')
      const previous = this.materials.get(id)
      const base =
        previous?.source === source && previous.paletteKey === paletteKey
          ? previous.base
          : sceneBaseColor(source, palette)
      const images: MaterialEntry['images'] = {}
      const paintKeys: Partial<Record<SceneMaterialImageKind, string>> = {}
      for (const kind of SCENE_MATERIAL_IMAGE_KINDS) {
        const imageId = source[SCENE_MATERIAL_IMAGE_FIELDS[kind]]
        if (imageId === undefined) continue
        const image = index.images.get(imageId)!
        images[kind] = image
        const background = kind === 'color' ? base : sceneMaterialImageBase(source, palette, kind)
        const colorSpace = kind === 'color' ? SRGBColorSpace : NoColorSpace
        const preserveTransparentRgb = kind === 'color' && source.alphaMask !== undefined
        const key = JSON.stringify([image.id, background, colorSpace, preserveTransparentRgb])
        paintKeys[kind] = key
        if (!wantedPaint.has(key))
          wantedPaint.set(key, {
            image,
            paletteKey: kind === 'color' ? paletteKey : '',
            base: background,
            colorSpace,
            preserveTransparentRgb,
          })
      }
      if (
        previous?.source === source &&
        SCENE_MATERIAL_IMAGE_KINDS.every((kind) => previous.images[kind] === images[kind]) &&
        previous.paletteKey === paletteKey
      )
        continue
      preparedMaterials.set(id, { source, images, base, paintKeys })
    }
    const preparedPaint = new Map<
      string,
      { source: PaintSource; patch: SceneRasterPatch | null; region: ScenePixelRegion | null }
    >()
    for (const [key, source] of wantedPaint) {
      const previous = this.paints.get(key)
      if (
        previous?.source.image === source.image &&
        previous.source.paletteKey === source.paletteKey
      )
        continue
      const image = source.image
      const chosen = this.frames.get(image.id)
      if (image.flipbook && previous?.source.image.flipbook !== image.flipbook)
        readSceneImageFlipbook(image.flipbook, image)
      const region = image.flipbook
        ? sceneFlipbookRegion(
            image,
            chosen?.source === image.flipbook ? chosen.frame : image.flipbook.frames[0]!,
          )
        : null
      preparedPaint.set(key, {
        source,
        region,
        patch: prepareSceneImageRaster(source, palette, previous?.source),
      })
    }
    // Allocate new resources only after all pure geometry/material/paint preparation succeeds.
    // Existing skins are not touched until EVERY palette and bound is valid.
    const createdGeometry = new Map<string, GeometryEntry>(),
      nextSkins = new Map<string, SkinEntry>(),
      createdSkins = new Set<SceneSkinResource>(),
      applySkins: Array<() => boolean> = []
    try {
      for (const [id, prepared] of preparedGeometry)
        if (!prepared.uv) createdGeometry.set(id, geometryEntry(prepared.source, prepared.buffers))
      for (const [nodeId, binding] of index.skinsByNode) {
        const node = index.scene.nodes.get(nodeId)!
        if (node.kind !== 'mesh') throw new Error('Nó de malha esperado.')
        const source = index.geometries.get(node.geometryId)!
        if (source.kind !== 'mesh') throw new Error('Malha editável esperada.')
        const base = createdGeometry.get(source.id) ?? this.geometries.get(source.id)!,
          previous = this.skins.get(nodeId),
          reuse =
            previous &&
            previous.binding.weights === binding.weights &&
            previous.binding.joints === binding.joints &&
            (previous.source === source ||
              (preparedGeometry.get(source.id)?.uv &&
                previous.source === this.geometries.get(source.id)?.source))
        const resource = reuse
          ? previous.resource
          : new SceneSkinResource(
              compileSceneSkinGeometry(binding, source),
              source,
              base.buffers,
              base.geometry,
            )
        if (!reuse) createdSkins.add(resource)
        nextSkins.set(nodeId, { binding, source, resource })
        applySkins.push(resource.preparePose(index.scene.worldMatrices))
      }
    } catch (error) {
      for (const resource of createdSkins) resource.dispose()
      for (const entry of createdGeometry.values()) entry.geometry.dispose()
      throw error
    }
    const retiredGeometries: BufferGeometry[] = []
    for (const [id, prepared] of preparedGeometry) {
      const previous = this.geometries.get(id)
      if (previous && prepared.uv) {
        applySceneGeometryUvUpload(previous.uvAttribute, prepared.uv)
        previous.source = prepared.source
        continue
      }
      this.geometries.set(id, createdGeometry.get(id)!)
      if (previous) retiredGeometries.push(previous.geometry)
    }
    for (const entry of nextSkins.values()) {
      const patch = preparedGeometry.get(entry.source.id)?.uv
      if (patch)
        applySceneGeometryUvUpload(
          entry.resource.geometry.getAttribute('uv') as BufferAttribute,
          patch,
        )
    }
    for (const apply of applySkins) apply()
    for (const [key, prepared] of preparedPaint) {
      const resource =
        this.paints.get(key)?.resource ?? new ScenePaintResource(prepared.source.colorSpace)
      resource.update(prepared.patch, prepared.region)
      this.paints.set(key, { source: prepared.source, resource })
    }
    for (const [id, prepared] of preparedMaterials) {
      const resource = this.materials.get(id)?.resource ?? new SceneMaterialResource()
      resource.setXray(this.xray)
      resource.update({
        source: prepared.source,
        base: prepared.base,
        maps: Object.fromEntries(
          Object.entries(prepared.paintKeys).map(([kind, key]) => [
            kind,
            this.paints.get(key)!.resource,
          ]),
        ),
      })
      this.materials.set(id, {
        revision: ++this.materialRevision,
        source: prepared.source,
        images: prepared.images,
        paletteKey,
        base: prepared.base,
        resource,
      })
    }
    const issues: SceneDrawIssue[] = []
    const nextInstances = new Map(instances.map((instance) => [instance.id, instance]))
    const formBaseNode =
      document.id === this.source?.id &&
      this.formBaseNode !== null &&
      nextSkins.has(this.formBaseNode)
        ? this.formBaseNode
        : null
    for (const instance of instances) {
      const geometry = this.geometries.get(instance.geometryId)
      if (!geometry) throw new Error('Geometria de desenho ausente.')
      const skin =
        instance.sourceNodeId === formBaseNode
          ? undefined
          : nextSkins.get(instance.sourceNodeId)?.resource
      this.drawInstance(instance, geometry, skin)
      for (const issue of geometry.buffers.issues)
        issues.push({ nodeId: instance.sourceNodeId, ...issue })
    }
    for (const [id, mesh] of this.meshes)
      if (!nextInstances.has(id)) {
        this.releaseMesh(id, mesh)
      }
    for (const [id, previous] of this.skins)
      if (nextSkins.get(id)?.resource !== previous.resource) previous.resource.dispose()
    this.skins.clear()
    for (const [id, entry] of nextSkins) this.skins.set(id, entry)
    for (const geometry of retiredGeometries) geometry.dispose()
    for (const [id, entry] of this.geometries)
      if (!wantedGeometry.has(id)) {
        entry.geometry.dispose()
        this.geometries.delete(id)
      }
    for (const [id, entry] of this.materials)
      if (!wantedMaterial.has(id)) {
        entry.resource.dispose()
        this.materials.delete(id)
      }
    for (const [key, entry] of this.paints)
      if (!wantedPaint.has(key)) {
        entry.resource.dispose()
        this.paints.delete(key)
      }
    const liveImages = new Set([...wantedPaint.values()].map(({ image }) => image.id))
    for (const [id, chosen] of this.frames)
      if (!liveImages.has(id) || index.images.get(id)?.flipbook !== chosen.source)
        this.frames.delete(id)
    this.instances = nextInstances
    this.source = document
    this.index = index
    this.pose = null
    this.poseRevision++
    this.formBaseNode = formBaseNode
    this.surfaces.setSources([...this.geometries.values()].map((entry) => entry.geometry))
    this.root.updateMatrixWorld(true)
    return issues
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.surfaces.dispose()
    for (const entry of this.skins.values()) entry.resource.dispose()
    this.skins.clear()
    for (const entry of this.geometries.values()) entry.geometry.dispose()
    for (const entry of this.materials.values()) entry.resource.dispose()
    for (const entry of this.paints.values()) entry.resource.dispose()
    this.geometries.clear()
    this.materials.clear()
    this.paints.clear()
    this.frames.clear()
    this.meshes.clear()
    this.backs.clear()
    this.backMaterial.dispose()
    this.hiddenBackMaterial.dispose()
    this.instances.clear()
    this.source = null
    this.index = null
    this.pose = null
    this.formBaseNode = null
    this.root.clear()
  }

  private releaseMesh(id: string, mesh: Mesh) {
    if (mesh instanceof SkinnedMesh) this.skinOwners.get(mesh)?.releaseMesh(mesh)
    mesh.removeFromParent()
    this.backs.delete(mesh)
    this.skinOwners.delete(mesh)
    this.identity.delete(mesh)
    this.meshes.delete(id)
  }

  private drawInstance(instance: SceneInstance, geometry: GeometryEntry, skin?: SceneSkinResource) {
    const resources = geometry.slots.map(
      (id) => this.materials.get(id ?? instance.materialId)!.resource,
    )
    const materials = resources.map((resource) => resource.material)
    let mesh = this.meshes.get(instance.id)
    if (mesh && this.skinOwners.get(mesh) !== skin) {
      this.releaseMesh(instance.id, mesh)
      mesh = undefined
    }
    if (!mesh) {
      mesh = skin ? skin.createMesh(materials) : new Mesh(geometry.geometry, materials)
      mesh.castShadow = true
      mesh.receiveShadow = true
      if (skin) this.skinOwners.set(mesh, skin)
      else {
        // A skinned back would need its own skeleton binding; skinned pieces show no back.
        const back = new Mesh(geometry.geometry, this.backMaterial)
        back.raycast = () => {}
        back.name = 'verso'
        mesh.add(back)
        this.backs.set(mesh, back)
      }
      mesh.matrixAutoUpdate = false
      this.meshes.set(instance.id, mesh)
      this.identity.set(mesh, instance.id)
      this.root.add(mesh)
    } else {
      mesh.geometry = skin?.geometry ?? geometry.geometry
      const back = this.backs.get(mesh)
      if (back) back.geometry = mesh.geometry
      const previous = mesh.material
      if (
        previous.length !== materials.length ||
        materials.some((material, i) => previous[i] !== material)
      )
        mesh.material = materials
    }
    // Three.js renders every visible material group into the shadow map, even when
    // its color pass blends alpha. Suppress only those groups so opaque faces and
    // authored cutouts in the same mesh keep casting their normal shadows.
    let shadowState: { material: Material; depthWrite: boolean; colorWrite: boolean } | null = null
    mesh.onBeforeShadow = (_renderer, _object, _camera, _shadowCamera, _geometry, depth, group) => {
      // Three passes a geometry group here; its published callback type says Group.
      const slot = (group as unknown as { materialIndex?: number } | null)?.materialIndex ?? 0
      if (!resources[slot]?.authoredTransparency) return
      shadowState = { material: depth, depthWrite: depth.depthWrite, colorWrite: depth.colorWrite }
      depth.depthWrite = false
      depth.colorWrite = false
    }
    mesh.onAfterShadow = () => {
      if (!shadowState) return
      shadowState.material.depthWrite = shadowState.depthWrite
      shadowState.material.colorWrite = shadowState.colorWrite
      shadowState = null
    }
    mesh.name = instance.name
    const back = this.backs.get(mesh)
    if (back) {
      const transparent = resources.map((resource) => resource.authoredTransparency)
      back.visible = transparent.some((value) => !value)
      back.material = transparent.some(Boolean)
        ? transparent.map((value) => (value ? this.hiddenBackMaterial : this.backMaterial))
        : this.backMaterial
    }
    mesh.matrix.fromArray(instance.worldMatrix)
    mesh.matrixWorldNeedsUpdate = true
    mesh.visible = !instance.hidden
    return mesh
  }
}
