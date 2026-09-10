import { expect, test } from 'bun:test'
import { BufferAttribute, Color, Mesh, Points, PointsMaterial } from 'three'
import { addSceneMirror } from '../scene/commands'
import type { SceneMeshGeometry } from '../scene/document'
import { indexSceneDocument } from '../scene/documentIndex'
import { addSceneSkinJoint, createSceneSkin, setSceneSkinWeights } from '../scene/skinCommands'
import { SCENE_SKIN_WEIGHT_COLORS, writeSceneSkinWeightColor } from '../scene/skinWeightColors'
import type { SceneSkinPaintPreview } from '../state/sceneSkinPaintGesture'
import { makeSceneSkinFixture } from '../testing/sceneSkin'
import { SceneSkinWeightOverlay } from './SceneSkinWeightOverlay'
import { SceneRenderResource } from './sceneRenderResource'

function fixture() {
  const {
      document,
      input: { id, ...input },
    } = makeSceneSkinFixture(),
    geometry = document.geometries[0]!
  if (geometry.kind !== 'mesh') throw new Error('Expected mesh')
  geometry.vertices.loose = [2, 3, 4]
  input.weights.loose = [
    { jointId: 'upper', weight: 0.125 },
    { jointId: 'lower', weight: 0.875 },
  ]
  return addSceneMirror(
    createSceneSkin(document, input, () => id),
    'part-0',
    { axis: 'x', offset: 0, nextId: () => 'mirror' },
  )
}
function points(overlay: SceneSkinWeightOverlay) {
  const object = overlay.root.children[0]
  if (!(object instanceof Points) || !(object.material instanceof PointsMaterial))
    throw new Error('Expected weight points')
  return object
}
function attribute(object: Points, name: string) {
  const value = object.geometry.getAttribute(name)
  if (!(value instanceof BufferAttribute)) throw new Error('Expected owned attribute')
  return value
}

test('detached previews update only owned colors with bounded pending uploads and restore exactly on cancel', () => {
  const source = fixture(),
    before = structuredClone(source),
    resource = new SceneRenderResource(),
    overlay = new SceneSkinWeightOverlay(),
    target = { nodeId: 'part-0', jointId: 'upper' }
  try {
    resource.update(source)
    resource.setFormBase('part-0')
    const prepared = overlay.prepare(indexSceneDocument(source), target)!
    overlay.show(prepared, resource, false)
    const drawn = points(overlay),
      colors = attribute(drawn, 'color'),
      positions = attribute(drawn, 'position'),
      original = colors.array.slice(),
      preview: SceneSkinPaintPreview = {
        token: {},
        source,
        ...target,
        delta: new Map(),
        stats: {
          touched: 0,
          changed: 0,
          refused: { precision: 0, 'influence-limit': 0, 'no-recipient': 0 },
        },
      }
    expect(overlay.preview({ ...preview, delta: new Map([['v_0_0', 0.5]]) })).toBe(false)
    expect(overlay.preview(preview)).toBe(false)
    for (let i = 0; i < 100; i++) {
      const delta = new Map([[i % 2 ? 'loose' : 'v_0_0', (i + 1) / 101]])
      expect(overlay.preview({ ...preview, delta })).toBe(true)
      expect(colors.updateRanges).toHaveLength(1)
      delta.clear()
    }
    expect(colors.updateRanges).toEqual([{ start: 0, count: 15 }])
    expect(positions.version).toBe(0)
    expect(drawn.geometry).toBe(points(overlay).geometry)
    const draft = colors.array.slice(),
      version = colors.version
    overlay.show(prepared, resource, true)
    expect(colors.array).toEqual(draft)
    expect(colors.version).toBe(version)
    expect(() =>
      overlay.preview({
        ...preview,
        delta: new Map([
          ['v_0_0', 0.25],
          ['loose', NaN],
        ]),
      }),
    ).toThrow()
    expect(() => overlay.preview({ ...preview, delta: new Map([['missing', 0.5]]) })).toThrow()
    expect(colors.array).toEqual(draft)
    expect(colors.version).toBe(version)
    colors.onUploadCallback()
    expect(colors.updateRanges).toEqual([])
    expect(overlay.preview(null)).toBe(true)
    expect(colors.array).toEqual(original)
    expect(colors.updateRanges).toEqual([{ start: 0, count: 15 }])
    const ended = colors.version
    expect(overlay.preview(preview)).toBe(false)
    expect(overlay.preview({ ...preview, delta: new Map([['v_0_0', 1]]) })).toBe(false)
    expect(colors.version).toBe(ended)
    expect(source).toEqual(before)
    expect([...prepared.colors]).toEqual([...original])
  } finally {
    overlay.dispose()
    resource.dispose()
  }
})

test('new tokens, saved revisions, target changes and hidden views retire previous previews without replay', () => {
  const source = fixture(),
    resource = new SceneRenderResource(),
    overlay = new SceneSkinWeightOverlay(),
    target = { nodeId: 'part-0', jointId: 'upper' }
  const makePreview = (): SceneSkinPaintPreview => ({
    token: {},
    source,
    ...target,
    delta: new Map(),
    stats: {
      touched: 0,
      changed: 0,
      refused: { precision: 0, 'influence-limit': 0, 'no-recipient': 0 },
    },
  })
  try {
    resource.update(source)
    resource.setFormBase('part-0')
    const prepared = overlay.prepare(indexSceneDocument(source), target)!
    overlay.show(prepared, resource, false)
    const colors = attribute(points(overlay), 'color'),
      a = makePreview(),
      b = makePreview()
    overlay.preview(a)
    overlay.preview({ ...a, delta: new Map([['v_0_0', 1]]) })
    overlay.preview(b)
    expect(colors.array).toEqual(prepared.colors)
    expect(overlay.preview(a)).toBe(false)
    overlay.preview({ ...b, delta: new Map([['v_0_0', 0.5]]) })
    const lower = overlay.prepare(indexSceneDocument(source), { ...target, jointId: 'lower' })!
    overlay.show(lower, resource, false)
    expect(colors.array).toEqual(lower.colors)
    overlay.show(prepared, resource, false)
    expect(overlay.preview(b)).toBe(false)
    const c = makePreview()
    overlay.preview(c)
    overlay.preview({ ...c, delta: new Map([['v_0_0', 0.75]]) })
    const hidden = resource.root.children[0]!
    for (const object of resource.root.children) object.visible = false
    overlay.show(prepared, resource, false)
    expect(overlay.root.children).toHaveLength(0)
    hidden.visible = true
    overlay.show(prepared, resource, false)
    expect(overlay.preview(c)).toBe(false)
    expect(attribute(points(overlay), 'color').array).toEqual(prepared.colors)
    const d = makePreview()
    overlay.preview(d)
    overlay.preview({ ...d, delta: new Map([['v_0_0', 0.5]]) })
    const saved = setSceneSkinWeights(source, 'skin', { v_0_0: [{ jointId: 'upper', weight: 1 }] }),
      next = overlay.prepare(indexSceneDocument(saved), target)!
    resource.update(saved)
    overlay.show(next, resource, false)
    expect(overlay.preview(d)).toBe(false)
    expect(attribute(points(overlay), 'color').array).toEqual(next.colors)
  } finally {
    overlay.dispose()
    resource.dispose()
  }
})

test('weight colors match Three linear RGB with strictly increasing luminance from zero to full force', () => {
  const a = new Color(SCENE_SKIN_WEIGHT_COLORS.zero),
    b = new Color(SCENE_SKIN_WEIGHT_COLORS.full),
    output = new Float32Array(3)
  let previous = -1
  for (let i = 0; i <= 100; i++) {
    writeSceneSkinWeightColor(output, 0, i / 100)
    const expected = a
      .clone()
      .lerp(b, i / 100)
      .toArray()
    for (let axis = 0; axis < 3; axis++) expect(output[axis]!).toBeCloseTo(expected[axis]!, 6)
    const luminance = output[0]! * 0.2126 + output[1]! * 0.7152 + output[2]! * 0.0722
    expect(luminance).toBeGreaterThan(previous)
    previous = luminance
  }
})

test('loose and connected authorial points share owned colors across affine mirrors without model mutations or redundant uploads', () => {
  const source = fixture(),
    before = structuredClone(source),
    resource = new SceneRenderResource(),
    overlay = new SceneSkinWeightOverlay(),
    index = indexSceneDocument(source)
  try {
    resource.update(source)
    resource.setFormBase('part-0')
    const target = { nodeId: 'part-0', jointId: 'upper' },
      prepared = overlay.prepare(index, target)!
    target.jointId = 'lower'
    overlay.show(prepared, resource, false)
    const drawn = points(overlay),
      positions = attribute(drawn, 'position'),
      colors = attribute(drawn, 'color'),
      data = colors.array,
      version = colors.version
    expect(prepared.target.jointId).toBe('upper')
    expect(positions.count).toBe(5)
    expect([...positions.array].slice(-3)).toEqual([2, 3, 4])
    expect(positions.array).not.toBe(prepared.positions)
    expect(colors.array).not.toBe(prepared.colors)
    expect(overlay.root.children).toHaveLength(2)
    expect(drawn.material.vertexColors).toBe(true)
    expect(drawn.material.toneMapped).toBe(false)
    expect(drawn.material.sizeAttenuation).toBe(false)
    expect(drawn.material.depthTest).toBe(true)
    for (const object of overlay.root.children) {
      if (!(object instanceof Points)) throw new Error('Expected mirrored points')
      expect(object.geometry).toBe(drawn.geometry)
      const model = resource.root.children.find(
        (model) => resource.instanceFor(model)?.id === object.name,
      )!
      expect([...object.matrix.toArray()]).toEqual([...resource.instanceFor(model)!.worldMatrix])
      if (!(model instanceof Mesh)) throw new Error('Expected model')
      expect(model.geometry.getAttribute('color')).toBeUndefined()
      expect(model.geometry.getAttribute('position').array).not.toBe(positions.array)
    }
    for (let i = 0; i < 120; i++) {
      expect(overlay.prepare(index, prepared.target)).toBe(prepared)
      overlay.show(prepared, resource, false)
    }
    expect(colors.array).toBe(data)
    expect(colors.version).toBe(version)
    const lower = overlay.prepare(index, { nodeId: 'part-0', jointId: 'lower' })!
    overlay.show(lower, resource, true)
    expect(attribute(points(overlay), 'position')).toBe(positions)
    expect(attribute(points(overlay), 'color')).toBe(colors)
    expect(colors.version).toBe(version + 1)
    expect(positions.version).toBe(0)
    expect(points(overlay).material.depthTest).toBe(false)
    expect([...colors.array]).toEqual([...lower.colors])
    expect(source).toEqual(before)
    const newJoint = addSceneSkinJoint(source, 'skin', 'rig'),
      zero = overlay.prepare(indexSceneDocument(newJoint), { nodeId: 'part-0', jointId: 'rig' })!
    resource.update(newJoint)
    overlay.show(zero, resource, false)
    const emptyColor = new Float32Array(3)
    writeSceneSkinWeightColor(emptyColor, 0, 0)
    expect([...attribute(points(overlay), 'color').array]).toEqual(
      Array.from({ length: 5 }, () => [...emptyColor]).flat(),
    )
    expect(attribute(points(overlay), 'position')).toBe(positions)
  } finally {
    overlay.dispose()
    resource.dispose()
  }
})

test('staging invalid precision preserves the visible frame; hidden/skinned/off views free only overlay resources', () => {
  const source = fixture(),
    resource = new SceneRenderResource(),
    overlay = new SceneSkinWeightOverlay(),
    target = { nodeId: 'part-0', jointId: 'upper' }
  try {
    resource.update(source)
    expect(overlay.prepare(indexSceneDocument(source), { ...target, jointId: 'absent' })).toBeNull()
    overlay.show(overlay.prepare(indexSceneDocument(source), target), resource, false)
    expect(overlay.root.children).toHaveLength(0)
    resource.setFormBase('part-0')
    const prepared = overlay.prepare(indexSceneDocument(source), target)!
    overlay.show(prepared, resource, false)
    const drawn = points(overlay),
      values = [...attribute(drawn, 'position').array],
      geometry = source.geometries[0] as SceneMeshGeometry,
      invalid = {
        ...source,
        geometries: [
          {
            ...geometry,
            vertices: { ...geometry.vertices, loose: [1e100, 0, 0] as [number, number, number] },
          },
        ],
      }
    expect(() => overlay.prepare(indexSceneDocument(invalid), target)).toThrow('precisão')
    expect([...attribute(drawn, 'position').array]).toEqual(values)
    expect(overlay.root.children[0]).toBe(drawn)
    let geometryDisposals = 0,
      materialDisposals = 0
    drawn.geometry.addEventListener('dispose', () => {
      geometryDisposals++
    })
    drawn.material.addEventListener('dispose', () => {
      materialDisposals++
    })
    for (const object of resource.root.children) object.visible = false
    overlay.show(prepared, resource, false)
    expect(overlay.root.children).toHaveLength(0)
    expect(geometryDisposals).toBe(1)
    expect(materialDisposals).toBe(1)
    for (const object of resource.root.children) object.visible = true
    overlay.show(overlay.prepare(indexSceneDocument(source), target), resource, false)
    expect(points(overlay).geometry).not.toBe(drawn.geometry)
    overlay.show(null, resource, false)
    overlay.dispose()
    overlay.dispose()
    expect(geometryDisposals).toBe(1)
    expect(materialDisposals).toBe(1)
    expect(overlay.prepare(indexSceneDocument(source), target)).toBeNull()
    expect(resource.root.children).toHaveLength(2)
  } finally {
    overlay.dispose()
    resource.dispose()
  }
})
