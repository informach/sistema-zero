import { BufferGeometry, Float32BufferAttribute } from 'three'
import type { FaceId, MoldaPart } from '../core/model'
import { type AtlasLayout, mapFaceUv } from '../model/atlas'
import { buildPartGeometry, type FaceRange } from '../model/geometry'
import { partPivot } from '../model/transform'
import { spatialGeometryHash } from './viewportMath'

/** Owns the buffers of one part, independently of its scene, controls and selection. */
export class PartGeometryResource {
  geometry: BufferGeometry
  faceOfTriangle: FaceId[]
  private hash: string
  private localUvs: Float32Array
  private faceSpans: Map<FaceId, FaceRange[]>
  private readonly mappings = new Map<FaceId, string>()
  private layout: AtlasLayout | null = null
  private sourceId = ''
  private sourceColor = -1
  private mirrored = false
  private disposed = false

  constructor(part: MoldaPart, source: MoldaPart, layout: AtlasLayout) {
    const built = buildGeometry(part)
    this.geometry = built.geometry
    this.faceOfTriangle = built.faceOfTriangle
    this.localUvs = built.localUvs
    this.faceSpans = built.faceSpans
    this.hash = spatialGeometryHash(part)
    this.syncUvs(part, source, layout)
  }

  /** Returns true only when the spatial geometry has been replaced. */
  update(part: MoldaPart, source: MoldaPart, layout: AtlasLayout): boolean {
    if (this.disposed) return false
    const hash = spatialGeometryHash(part)
    const replaced = hash !== this.hash
    if (replaced) {
      const built = buildGeometry(part)
      this.geometry.dispose()
      this.geometry = built.geometry
      this.faceOfTriangle = built.faceOfTriangle
      this.localUvs = built.localUvs
      this.faceSpans = built.faceSpans
      this.hash = hash
      this.mappings.clear()
      this.layout = null
    }
    this.syncUvs(part, source, layout)
    return replaced
  }

  private syncUvs(part: MoldaPart, source: MoldaPart, layout: AtlasLayout): void {
    const mirrored = part.mirrorOf !== undefined
    if (
      this.layout === layout &&
      this.sourceId === source.id &&
      this.sourceColor === source.color &&
      this.mirrored === mirrored
    )
      return
    const attribute = this.geometry.getAttribute('uv') as Float32BufferAttribute
    let start = Infinity
    let end = 0
    for (const [face, spans] of this.faceSpans) {
      // An affine face mapping is fully described by its two opposite corners.
      // RGB, pixel content and unrelated atlas regions cannot change this signature.
      const mapping = [
        ...mapFaceUv(layout, part, source, face, 0, 0),
        ...mapFaceUv(layout, part, source, face, 1, 1),
      ].join(',')
      if (this.mappings.get(face) === mapping) continue
      this.mappings.set(face, mapping)
      for (const range of spans) {
        for (let i = range.start * 6; i < (range.start + range.count) * 6; i += 2) {
          const [u, v] = mapFaceUv(
            layout,
            part,
            source,
            face,
            this.localUvs[i] as number,
            this.localUvs[i + 1] as number,
          )
          attribute.array[i] = u
          attribute.array[i + 1] = v
        }
        start = Math.min(start, range.start * 6)
        end = Math.max(end, (range.start + range.count) * 6)
      }
    }
    if (end > start) {
      // Keep one bounded union, including edits queued while the viewport is hidden.
      // Three clears these ranges after upload; never lose an earlier pending face.
      for (const range of attribute.updateRanges) {
        start = Math.min(start, range.start)
        end = Math.max(end, range.start + range.count)
      }
      attribute.clearUpdateRanges()
      attribute.addUpdateRange(start, end - start)
      attribute.needsUpdate = true
    }
    this.layout = layout
    this.sourceId = source.id
    this.sourceColor = source.color
    this.mirrored = mirrored
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.geometry.dispose()
    this.mappings.clear()
    this.layout = null
  }
}

function buildGeometry(part: MoldaPart) {
  const built = buildPartGeometry(part)
  const faceSpans = new Map(Object.entries(built.faceRanges) as [FaceId, FaceRange[]][])
  const pivot = partPivot(part)
  const positions = new Float32Array(built.positions.length)
  for (let i = 0; i < built.positions.length; i += 3) {
    positions[i] = (built.positions[i] as number) - pivot[0]
    positions[i + 1] = (built.positions[i + 1] as number) - pivot[1]
    positions[i + 2] = (built.positions[i + 2] as number) - pivot[2]
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(built.normals, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(new Float32Array(built.uvs.length), 2))
  return { geometry, faceOfTriangle: built.faceOfTriangle, faceSpans, localUvs: built.uvs }
}
