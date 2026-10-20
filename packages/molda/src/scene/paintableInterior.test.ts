import { expect, test } from 'bun:test'
import { Raycaster, Vector3 } from 'three'
import { makeModel } from '../testing/fixtures'
import { SceneRenderResource } from '../viewport/sceneRenderResource'
import { addSceneShape } from './commands'
import { sceneToJson } from './documentJson'
import { migrateLegacyModel } from './migrateLegacy'
import { addScenePaintableInterior, hasScenePaintableInteriorGap } from './paintableInterior'
import { ensureScenePaintSurface } from './paintSurface'
import { readSceneDocument } from './readDocument'

const ids = () => {
  let value = 0
  return () => `interior-${++value}`
}

test('an open painted face gains a visible, independently paintable inner face', () => {
  const nextId = ids()
  const empty = migrateLegacyModel(makeModel({ parts: [] })).document
  const plane = addSceneShape(empty, 'plane', 'car body', nextId)
  const node = plane.nodes.at(-1)!
  if (node.kind !== 'mesh') throw new Error('Expected mesh')
  const singleSided = {
    ...plane,
    materials: plane.materials.map((material) => ({ ...material, doubleSided: false })),
  }
  const painted = ensureScenePaintSurface(singleSided, { nodeId: node.id }, nextId)
  if (painted.status !== 'ready') throw new Error('Expected paint target')
  const originalImage = painted.document.images.find(
    (image) => image.id === painted.target.imageId,
  )!
  const resource = new SceneRenderResource()
  const innerRay = new Raycaster(new Vector3(0, -2, 0), new Vector3(0, 1, 0))
  try {
    resource.update(painted.document)
    expect(resource.surfaceIntersections(innerRay)).toHaveLength(0)
    expect(hasScenePaintableInteriorGap(painted.document, node.id)).toBe(true)

    const interior = addScenePaintableInterior(painted.document, node.id, nextId)
    expect(readSceneDocument(sceneToJson(interior)).status).toBe('valid')
    resource.update(interior)
    const hit = resource.surfaceIntersections(innerRay)[0]
    expect(hit).toBeDefined()
    const insideFace = resource.faceFor(hit!.object, hit!.faceIndex!)!
    const geometry = interior.geometries.find((entry) => entry.id === node.geometryId)!
    if (geometry.kind !== 'mesh') throw new Error('Expected mesh')
    expect(insideFace).not.toBe('plane')
    expect(geometry.faces[insideFace]?.materialId).not.toBe(node.materialId)
    expect(hasScenePaintableInteriorGap(interior, node.id)).toBe(false)

    const insidePaint = ensureScenePaintSurface(
      interior,
      { nodeId: node.id, faceId: insideFace },
      nextId,
    )
    if (insidePaint.status !== 'ready') throw new Error('Expected inner paint target')
    expect(insidePaint.target.imageId).not.toBe(painted.target.imageId)
    expect(insidePaint.document.images.find((image) => image.id === originalImage.id)).toBe(
      originalImage,
    )
    expect(addScenePaintableInterior(interior, node.id, nextId)).toBe(interior)
  } finally {
    resource.dispose()
  }
})

test('a double-sided sheet gets separate front and back materials without changing a shared copy', () => {
  const nextId = ids()
  const empty = migrateLegacyModel(makeModel({ parts: [] })).document
  const source = addSceneShape(empty, 'plane', 'roof', nextId)
  const node = source.nodes.at(-1)!
  if (node.kind !== 'mesh') throw new Error('Expected mesh')
  const shared = {
    ...source,
    nodes: [...source.nodes, { ...node, id: nextId(), name: 'other roof' }],
  }
  const interior = addScenePaintableInterior(shared, node.id, nextId)
  const front = interior.nodes.find((entry) => entry.id === node.id)!
  const other = interior.nodes.find((entry) => entry.name === 'other roof')!
  if (front.kind !== 'mesh' || other.kind !== 'mesh') throw new Error('Expected meshes')
  expect(front.geometryId).not.toBe(other.geometryId)
  expect(other.geometryId).toBe(node.geometryId)
  expect(interior.materials.find((entry) => entry.id === node.materialId)?.doubleSided).toBe(true)
  const frontMesh = interior.geometries.find((entry) => entry.id === front.geometryId)!
  if (frontMesh.kind !== 'mesh') throw new Error('Expected mesh')
  expect(Object.keys(frontMesh.faces)).toHaveLength(2)
  for (const face of Object.values(frontMesh.faces)) {
    const material = interior.materials.find((entry) => entry.id === face.materialId)!
    expect(material.doubleSided).toBe(false)
  }
  expect(hasScenePaintableInteriorGap(interior, node.id)).toBe(false)
  expect(hasScenePaintableInteriorGap(interior, other.id)).toBe(true)
})
