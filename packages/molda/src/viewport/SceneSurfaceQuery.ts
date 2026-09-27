import {
  BufferGeometry,
  DoubleSide,
  type Intersection,
  Matrix4,
  Mesh,
  Ray,
  type Raycaster,
  SkinnedMesh,
} from 'three'
import { MeshBVH } from 'three-mesh-bvh'

interface Entry {
  tree: MeshBVH
  treeGeometry: BufferGeometry
  probe: Mesh
}

function disposeEntry(entry: Entry | null) {
  entry?.treeGeometry.dispose()
  entry?.probe.geometry.dispose()
}

function createEntry(object: Mesh): Entry {
  const source = object.geometry
  const treeGeometry = new BufferGeometry().setAttribute(
    'position',
    source.getAttribute('position').clone(),
  )
  if (source.index) treeGeometry.setIndex(source.index.clone())
  treeGeometry.setDrawRange(source.drawRange.start, source.drawRange.count)
  for (const group of source.groups)
    treeGeometry.addGroup(group.start, group.count, group.materialIndex)
  const probeGeometry = new BufferGeometry().setAttribute(
    'position',
    treeGeometry.getAttribute('position'),
  )
  probeGeometry.setIndex(treeGeometry.index)
  probeGeometry.boundingBox = source.boundingBox?.clone() ?? null
  probeGeometry.boundingSphere = source.boundingSphere?.clone() ?? null
  for (const group of source.groups)
    probeGeometry.addGroup(group.start, group.count, group.materialIndex)
  try {
    const tree = new MeshBVH(treeGeometry, {
      indirect: true,
      setBoundingBox: false,
      maxLeafTris: 10,
    })
    const probe = new Mesh(probeGeometry, [])
    probe.matrixAutoUpdate = false
    return { tree, treeGeometry, probe }
  } catch (error) {
    treeGeometry.dispose()
    probeGeometry.dispose()
    throw error
  }
}

/**
 * Broad phase for owned, immutable draw positions and contiguous triangle groups.
 * The native Three narrow phase still computes every returned field. No prototype
 * patch or render-buffer mutation; UVs, materials and world matrices remain live.
 */
export class SceneSurfaceQuery {
  private readonly entries = new Map<BufferGeometry, Entry | null>()
  private readonly inverse = new Matrix4()
  private readonly localRay = new Ray()
  private disposed = false

  setSources(sources: Iterable<BufferGeometry>): void {
    if (this.disposed) throw new Error('Consulta de superfície já descartada.')
    const live = new Set(sources)
    for (const [geometry, entry] of this.entries) {
      if (live.has(geometry)) continue
      disposeEntry(entry)
      this.entries.delete(geometry)
    }
    for (const geometry of live) if (!this.entries.has(geometry)) this.entries.set(geometry, null)
  }

  intersect(object: Mesh, raycaster: Raycaster): Intersection[] {
    if (this.disposed || !object.layers.test(raycaster.layers)) return []
    const geometry = object.geometry
    if (
      object instanceof SkinnedMesh ||
      !this.entries.has(geometry) ||
      !geometry.getAttribute('position')?.count ||
      geometry.drawRange.count === 0 ||
      object.matrixWorld.determinant() === 0
    )
      return raycaster.intersectObject(object, false)
    let entry = this.entries.get(geometry)
    if (!entry) {
      entry = createEntry(object)
      this.entries.set(geometry, entry)
    }
    this.inverse.copy(object.matrixWorld).invert()
    this.localRay.copy(raycaster.ray).applyMatrix4(this.inverse)
    const triangles = new Set<number>()
    // Local near/far scaling is not equivalent under arbitrary affine shear.
    for (const hit of entry.tree.raycast(this.localRay, DoubleSide, 0, Infinity)) {
      if (
        typeof hit.faceIndex !== 'number' ||
        !Number.isSafeInteger(hit.faceIndex) ||
        hit.faceIndex < 0
      )
        throw new Error('O índice espacial retornou um triângulo inválido.')
      triangles.add(hit.faceIndex)
    }
    const { probe } = entry
    probe.matrixWorld.copy(object.matrixWorld)
    probe.layers.mask = object.layers.mask
    probe.material = object.material
    for (const name of ['uv', 'uv1', 'normal']) {
      const attribute = geometry.getAttribute(name)
      if (attribute) probe.geometry.setAttribute(name, attribute)
      else probe.geometry.deleteAttribute(name)
    }
    const hits: Intersection[] = []
    try {
      // Generated groups are contiguous and ascending: preserve native tie order.
      for (const triangle of [...triangles].sort((a, b) => a - b)) {
        probe.geometry.setDrawRange(triangle * 3, 3)
        for (const hit of raycaster.intersectObject(probe, false)) hits.push({ ...hit, object })
      }
      return hits.sort((a, b) => a.distance - b.distance)
    } finally {
      // A geometry can outlive a material revision; do not retain retired textures.
      probe.material = []
    }
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    for (const entry of this.entries.values()) disposeEntry(entry)
    this.entries.clear()
  }
}
