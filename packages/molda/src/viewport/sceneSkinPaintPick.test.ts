import { expect, test } from 'bun:test'
import { OrthographicCamera, Vector3 } from 'three'
import type { Vec3 } from '../core/model'
import { addSceneMirror } from '../scene/commands'
import { indexSceneDocument } from '../scene/documentIndex'
import { type AffineMatrix, transformPoint } from '../scene/matrix'
import { createSceneSkin } from '../scene/skinCommands'
import { makeSceneSkinFixture } from '../testing/sceneSkin'
import { SceneRenderResource } from './sceneRenderResource'
import { pickSceneSkinPaint } from './sceneSkinPaintPick'

function setup() {
  const {
      document: source,
      input: { id, ...input },
    } = makeSceneSkinFixture(),
    document = addSceneMirror(
      createSceneSkin(source, input, () => id),
      'part-0',
      { axis: 'x', offset: 3, nextId: () => 'mirror' },
    ),
    index = indexSceneDocument(document),
    resource = new SceneRenderResource(),
    canvas = window.document.createElement('canvas'),
    camera = new OrthographicCamera(-4, 4, 4, -4, 0.1, 100)
  canvas.getBoundingClientRect = () => new DOMRect(20, 30, 400, 400)
  camera.position.set(3, 0, 20)
  camera.lookAt(3, 0, 2)
  camera.updateMatrixWorld(true)
  const project = (point: Vec3) => {
    const ndc = new Vector3(...point).project(camera)
    return { clientX: 20 + (ndc.x + 1) * 200, clientY: 30 + (1 - ndc.y) * 200 }
  }
  resource.update(document)
  resource.setFormBase(input.nodeId)
  const point = transformPoint(index.scene.worldMatrices.get(input.nodeId)!, [0.1, 0.1, 0]),
    target = { nodeId: input.nodeId, jointId: 'upper' }
  return {
    document,
    index,
    resource,
    point,
    project,
    canvas,
    camera,
    target,
    pick: (point: Vec3) =>
      pickSceneSkinPaint(canvas, camera, resource, index, target, project(point)),
  }
}

test('real surface hits resolve the authorial face and undo only the mirror plane under negative affine shear', () => {
  const f = setup()
  try {
    for (const point of [f.point, [6 - f.point[0], f.point[1], f.point[2]] as Vec3]) {
      const hit = f.pick(point),
        sample = hit?.sample
      expect(sample?.faceId).toBe('f_0_0')
      for (let axis = 0; axis < 3; axis++)
        expect(sample!.point[axis]!).toBeCloseTo(f.point[axis]!, 12)
      for (let axis = 0; axis < 3; axis++)
        expect(hit!.surface!.point[axis]!).toBeCloseTo(point[axis]!, 12)
      expect(Math.hypot(...hit!.surface!.normal)).toBeCloseTo(1, 12)
      expect(hit!.surface!.point).not.toBe(sample!.point)
      const matrix = f.index.scene.worldMatrices.get('part-0')!,
        origin = transformPoint(matrix, [0, 0, 0]),
        normal = new Vector3(...hit!.surface!.normal)
      for (const corner of [
        [1, 0, 0],
        [0, 1, 0],
      ] satisfies Vec3[]) {
        const transformed = transformPoint(matrix, corner),
          tangent = new Vector3(...transformed).sub(new Vector3(...origin))
        if (point !== f.point) tangent.x *= -1
        expect(normal.dot(tangent)).toBeCloseTo(0, 12)
      }
    }
    expect(
      pickSceneSkinPaint(f.canvas, f.camera, f.resource, f.index, f.target, {
        clientX: -1,
        clientY: -1,
      }),
    ).toBeNull()
    for (const value of [NaN, Infinity, -Infinity])
      expect(
        pickSceneSkinPaint(f.canvas, f.camera, f.resource, f.index, f.target, {
          clientX: value,
          clientY: 50,
        }),
      ).toBeNull()
    f.resource.setFormBase(null)
    expect(f.pick(f.point)).toBeNull()
  } finally {
    f.resource.dispose()
  }
})

test('the nearest visible part occludes even when locked; hidden, unrelated and undeformed support targets are not paintable', () => {
  const f = setup()
  try {
    const node = f.document.nodes[0]!
    if (node.transform.kind !== 'affine') throw new Error('Affine fixture expected')
    const matrix: AffineMatrix = [...node.transform.matrix],
      transform = { ...node.transform, matrix }
    transform.matrix[14]! += 1
    const next = {
      ...f.document,
      nodes: [...f.document.nodes, { ...node, id: 'obstacle', locked: true, transform }],
    }
    f.resource.update(next)
    expect(f.pick(f.point)).toBeNull()
    f.resource.update({
      ...next,
      nodes: next.nodes.map((node) => (node.id === 'obstacle' ? { ...node, hidden: true } : node)),
    })
    expect(f.pick(f.point)?.sample.faceId).toBe('f_0_0')
    expect(
      pickSceneSkinPaint(
        f.canvas,
        f.camera,
        f.resource,
        f.index,
        { ...f.target, jointId: 'rig' },
        f.project(f.point),
      ),
    ).toBeNull()
    f.resource.update({
      ...f.document,
      nodes: f.document.nodes.map((node) => (node.id === 'rig' ? { ...node, locked: true } : node)),
    })
    expect(f.pick(f.point)).toBeNull()
  } finally {
    f.resource.dispose()
  }
})
