import { expect, test } from 'bun:test'
import { LineSegments, Mesh } from 'three'
import { makeSceneCutoutPlane } from '../testing/sceneCutoutPlane'
import { SceneComponentOverlay } from './SceneComponentOverlay'
import { SceneSelectionOutline } from './SceneSelectionOutline'
import { SceneRenderResource } from './sceneRenderResource'

test('an erased island border samples inside its face instead of opaque pixels outside the UV island', () => {
  const source = makeSceneCutoutPlane(true),
    resource = new SceneRenderResource()
  try {
    resource.update(source)
    const object = resource.root.children[0]
    if (!(object instanceof Mesh)) throw new Error('Missing plane')
    expect(resource.edgePositionsFor(object)).toEqual([])
    const mirrored = structuredClone(source),
      mesh = mirrored.geometries[0]!
    if (mesh.kind !== 'mesh') throw new Error('Missing plane')
    for (const face of Object.values(mesh.faces))
      for (const corner of face.corners) corner.uv[0] = 1 - corner.uv[0]
    resource.update(mirrored)
    expect(resource.edgePositionsFor(object)).toEqual([])
  } finally {
    resource.dispose()
  }
})

test('paint, undo and UV changes refresh only visible portions, without replacing the mesh GPU buffers', () => {
  const source = makeSceneCutoutPlane(),
    resource = new SceneRenderResource()
  try {
    resource.update(source)
    const object = resource.root.children[0]
    if (!(object instanceof Mesh)) throw new Error('Missing plane')
    const geometry = object.geometry
    expect(resource.edgePositionsFor(object)).toEqual([])
    expect(resource.edgePositionsFor(object)).toBe(resource.edgePositionsFor(object))
    const painted = { ...source, images: structuredClone(source.images) }
    for (let x = 2; x < 6; x++) painted.images[0]!.layers[0]!.pixels[x * 4 + 3] = 255
    resource.update(painted)
    expect(object.geometry).toBe(geometry)
    expect(resource.edgePositionsFor(object)).toEqual([
      [
        [0.5, 0, -1],
        [-0.5, 0, -1],
      ],
    ])
    const mesh = painted.geometries[0]!
    if (mesh.kind !== 'mesh') throw new Error('Missing editable plane')
    const rotatedUv = {
      ...painted,
      geometries: [
        {
          ...mesh,
          faces: {
            ...mesh.faces,
            plane: {
              ...mesh.faces.plane!,
              corners: mesh.faces.plane!.corners.map((corner) => ({
                ...corner,
                uv: [corner.uv[0], 1 - corner.uv[1]] as [number, number],
              })),
            },
          },
        },
      ],
    }
    resource.update(rotatedUv)
    expect(object.geometry).toBe(geometry)
    expect(resource.edgePositionsFor(object)).toEqual([
      [
        [-0.5, 0, 1],
        [0.5, 0, 1],
      ],
    ])
    resource.update(source)
    expect(resource.edgePositionsFor(object)).toEqual([])
  } finally {
    resource.dispose()
  }
})

test('a shared edge remains visible when either material is opaque, and is not duplicated', () => {
  const source = makeSceneCutoutPlane(),
    resource = new SceneRenderResource()
  const mesh = source.geometries[0]!
  if (mesh.kind !== 'mesh') throw new Error('Missing editable plane')
  mesh.faces.other = { corners: [...mesh.faces.plane!.corners].reverse(), materialId: 'opaque' }
  source.materials.push({
    ...source.materials[0]!,
    id: 'opaque',
    colorImageId: undefined,
    alphaMask: undefined,
    baseColor: { kind: 'palette', index: 3 },
  })
  try {
    resource.update(source)
    const object = resource.root.children[0]
    if (!(object instanceof Mesh)) throw new Error('Missing plane')
    expect(resource.edgePositionsFor(object)).toHaveLength(4)
    expect(
      resource
        .edgePositionsFor(object)
        .every(([a, b]) => a.some((value, axis) => Math.abs(value - b[axis]!) === 2)),
    ).toBe(true)
  } finally {
    resource.dispose()
  }
})

test('cutoff zero, invisible opacity, isolated construction edges and animation frames follow render visibility', () => {
  const source = makeSceneCutoutPlane(),
    resource = new SceneRenderResource()
  const image = source.images[0]!
  const next = new Uint8Array(8 * 16 * 4)
  next.set(image.layers[0]!.pixels)
  next.fill(255, 8 * 8 * 4)
  source.images = [
    {
      ...image,
      height: 16,
      layers: [{ ...image.layers[0]!, pixels: next }],
      flipbook: { frameWidth: 8, frameHeight: 8, frames: [1, 0], fps: 8, loop: true },
    },
  ]
  try {
    resource.update(source)
    const object = resource.root.children[0]
    if (!(object instanceof Mesh)) throw new Error('Missing plane')
    expect(resource.edgePositionsFor(object)).toEqual([])
    resource.setImageFrame('cutout', 0)
    expect(resource.edgePositionsFor(object)).toHaveLength(4)
    resource.setImageFrame('cutout', 1)
    expect(resource.edgePositionsFor(object)).toEqual([])
    const zero = structuredClone(source)
    zero.materials[0]!.alphaMask = { cutoff: 0, opacity: 0 }
    resource.update(zero)
    expect(resource.edgePositionsFor(object)).toHaveLength(4)
    zero.materials[0] = { ...zero.materials[0]!, alphaMask: { cutoff: 0.5, opacity: 0 } }
    resource.update({ ...zero })
    expect(resource.edgePositionsFor(object)).toEqual([])
    const loose = structuredClone(source)
    const mesh = loose.geometries[0]!
    if (mesh.kind !== 'mesh') throw new Error('Missing editable plane')
    mesh.looseEdges.push(['a', 'b'])
    resource.update(loose)
    expect(resource.edgePositionsFor(object)).toHaveLength(1)
  } finally {
    resource.dispose()
  }
})

test('blue editing guides refresh with paint and release only their own buffers', () => {
  const source = makeSceneCutoutPlane(),
    resource = new SceneRenderResource(),
    overlay = new SceneComponentOverlay(),
    outline = new SceneSelectionOutline()
  const mesh = source.geometries[0]!
  if (mesh.kind !== 'mesh') throw new Error('Missing editable plane')
  const selection = { nodeId: source.nodes[0]!.id, mode: 'edge' as const, ids: [] }
  try {
    resource.update(source)
    overlay.update(resource, mesh, selection)
    const wire = overlay.root.children[0]!.children[0]
    const original = resource.root.children[0]
    if (!(original instanceof Mesh) || !(wire instanceof LineSegments))
      throw new Error('Missing wire')
    const initial = wire.geometry
    let wireDisposals = 0,
      meshDisposals = 0
    initial.addEventListener('dispose', () => wireDisposals++)
    original.geometry.addEventListener('dispose', () => meshDisposals++)
    expect(overlay.root.children[0]!.children[0]).toHaveProperty(
      'geometry.attributes.position.count',
      0,
    )
    const painted = { ...source, images: structuredClone(source.images) }
    painted.images[0]!.layers[0]!.pixels.fill(255)
    resource.update(painted)
    overlay.update(resource, mesh, selection)
    expect(overlay.root.children[0]!.children[0]).toHaveProperty(
      'geometry.attributes.position.count',
      8,
    )
    expect(overlay.root.children[0]!.children[0]).not.toHaveProperty('geometry', initial)
    expect(wireDisposals).toBe(1)
    expect(meshDisposals).toBe(0)
    outline.update(resource, new Set([selection.nodeId]), null)
    resource.update(source)
    overlay.update(resource, mesh, selection)
    outline.update(resource, new Set([selection.nodeId]), null)
    expect(overlay.root.children[0]!.children[0]).toHaveProperty(
      'geometry.attributes.position.count',
      0,
    )
    expect(outline.root.children[0]).toHaveProperty('geometry.attributes.instanceStart.count', 0)
  } finally {
    overlay.dispose()
    outline.dispose()
    resource.dispose()
  }
})

test('an invalid face omitted from rendering cannot crash the masked contour or conceal its geometry issue', () => {
  const source = makeSceneCutoutPlane(),
    resource = new SceneRenderResource()
  const mesh = source.geometries[0]!
  if (mesh.kind !== 'mesh') throw new Error('Missing editable plane')
  Object.assign(mesh.vertices, { e: [2, 0, 0], f: [3, 0, 0], g: [4, 0, 0] })
  mesh.faces.bad = {
    materialId: 'invalid',
    corners: ['e', 'f', 'g'].map((vertexId) => ({ vertexId, uv: [0, 0] })),
  }
  source.materials.push({ ...source.materials[0]!, id: 'invalid' })
  try {
    expect(resource.update(source).length).toBeGreaterThan(0)
    const object = resource.root.children[0]
    if (!(object instanceof Mesh)) throw new Error('Missing plane')
    expect(resource.edgePositionsFor(object)).toEqual([])
  } finally {
    resource.dispose()
  }
})
