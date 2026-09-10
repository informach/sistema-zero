import { describe, expect, test } from 'bun:test'
import type { Float32BufferAttribute } from 'three'
import { createPart, type MoldaModelAsset, type MoldaPart, SHAPE_IDS } from '../core/model'
import {
  type AtlasLayout,
  mapFaceUv,
  packAtlas,
  packAtlasFallback,
  packAtlasIncremental,
} from '../model/atlas'
import { buildPartGeometry } from '../model/geometry'
import { partPivot } from '../model/transform'
import { mirrorTwinOf } from '../model/twins'
import { makeModel, paintedSkin } from '../testing/fixtures'
import { PartGeometryResource } from './partGeometryResource'

function pack(model: MoldaModelAsset, previous?: AtlasLayout) {
  const result = previous ? packAtlasIncremental(model, previous) : packAtlas(model)
  if (!result.ok) throw new Error('test fixture must fit')
  return result.layout
}

/** Original viewport algorithm, independent of the resource invalidation/update paths. */
function expectOriginal(
  resource: PartGeometryResource,
  part: MoldaPart,
  source: MoldaPart,
  layout: AtlasLayout,
) {
  const built = buildPartGeometry(part)
  const pivot = partPivot(part)
  const positions = Float32Array.from(built.positions, (value, index) => value - pivot[index % 3]!)
  const uvs = new Float32Array(built.uvs.length)
  for (let triangle = 0; triangle < built.triangleCount; triangle++) {
    for (let vertex = 0; vertex < 3; vertex++) {
      const offset = triangle * 6 + vertex * 2
      uvs.set(
        mapFaceUv(
          layout,
          part,
          source,
          built.faceOfTriangle[triangle]!,
          built.uvs[offset]!,
          built.uvs[offset + 1]!,
        ),
        offset,
      )
    }
  }
  expect(resource.geometry.getAttribute('position').array).toEqual(positions)
  expect(resource.geometry.getAttribute('normal').array).toEqual(built.normals)
  expect(resource.geometry.getAttribute('uv').array).toEqual(uvs)
  expect(resource.faceOfTriangle).toEqual(built.faceOfTriangle)
}

describe('part geometry resource', () => {
  test.each([
    ...SHAPE_IDS,
  ])('%s: exact original position/normal/UV bytes through color, paint, layout and twin changes', (shape) => {
    let part = createPart({
      id: 'source',
      name: 'peça',
      shape,
      from: [1, 2, 3],
      to: [3, 5, 7],
      color: 2,
    })
    let source = part
    let model = makeModel({ parts: [part] })
    let layout = pack(model)
    const resource = new PartGeometryResource(part, source, layout)
    expectOriginal(resource, part, source, layout)
    part = { ...part, color: 5 }
    source = part
    resource.update(part, source, layout)
    expectOriginal(resource, part, source, layout)
    const built = buildPartGeometry(part)
    part = {
      ...part,
      faces: Object.fromEntries(
        built.faceOfTriangle.map((face) => [face, paintedSkin(4, 4, (x) => (x % 2) + 1)]),
      ),
    }
    source = part
    model = { ...model, parts: [part] }
    layout = pack(model, layout)
    resource.update(part, source, layout)
    expectOriginal(resource, part, source, layout)
    const twin = mirrorTwinOf(part, { id: 'twin', name: 'gêmeo' })
    resource.update(twin, part, layout)
    expectOriginal(resource, twin, part, layout)
    const fallback = packAtlasFallback(model)
    resource.update(twin, part, fallback)
    expectOriginal(resource, twin, part, fallback)
    resource.dispose()
  })

  test('palette changes never replace spatial buffers or request a UV upload', () => {
    const model = makeModel()
    const part = model.parts[0]!
    const layout = pack(model)
    const resource = new PartGeometryResource(part, part, layout)
    const geometry = resource.geometry
    const uv = geometry.getAttribute('uv') as Float32BufferAttribute
    const version = uv.version
    for (let revision = 1; revision <= 20; revision++) {
      expect(resource.update(part, part, layout)).toBe(false)
      expect(resource.geometry).toBe(geometry)
      expect(uv.version).toBe(version)
      expectOriginal(resource, part, part, layout)
    }
    resource.dispose()
  })

  test('appending a face only invalidates its part UV; other parts keep buffers and versions', () => {
    const model = makeModel()
    const [body, wing] = model.parts as [MoldaPart, MoldaPart]
    const layout = pack(model)
    const resource = new PartGeometryResource(body, body, layout)
    const other = new PartGeometryResource(wing, wing, layout)
    const geometry = resource.geometry
    const otherGeometry = other.geometry
    const uv = geometry.getAttribute('uv') as Float32BufferAttribute
    const otherUv = otherGeometry.getAttribute('uv') as Float32BufferAttribute
    uv.clearUpdateRanges()
    const otherVersion = otherUv.version
    const painted = { ...body, faces: { ...body.faces, px: paintedSkin(4, 4, () => 3) } }
    const nextLayout = pack({ ...model, parts: [painted, wing] }, layout)
    expect(resource.update(painted, painted, nextLayout)).toBe(false)
    expect(other.update(wing, wing, nextLayout)).toBe(false)
    expect(resource.geometry).toBe(geometry)
    expect(other.geometry).toBe(otherGeometry)
    expect(otherUv.version).toBe(otherVersion)
    const range = buildPartGeometry(body).faceRanges.px![0]!
    expect(uv.updateRanges).toEqual([{ start: range.start * 6, count: range.count * 6 }])
    expectOriginal(resource, painted, painted, nextLayout)
    expectOriginal(other, wing, wing, nextLayout)
    resource.dispose()
    other.dispose()
  })

  test('pending UV ranges remain bounded and include earlier changes before a frame uploads', () => {
    const model = makeModel()
    let part = model.parts[0]!
    let layout = pack(model)
    const resource = new PartGeometryResource(part, part, layout)
    const uv = resource.geometry.getAttribute('uv') as Float32BufferAttribute
    uv.clearUpdateRanges()
    for (let revision = 0; revision < 40; revision++) {
      part = {
        ...part,
        color: (revision % 2) + 1,
        faces:
          revision % 2 ? { px: paintedSkin(4, 4, () => 3) } : { pz: paintedSkin(4, 4, () => 4) },
      }
      layout = pack({ ...model, parts: [part] }, layout)
      resource.update(part, part, layout)
      expect(uv.updateRanges).toHaveLength(1)
      expect(uv.updateRanges[0]!.start).toBeGreaterThanOrEqual(0)
      expect(uv.updateRanges[0]!.start + uv.updateRanges[0]!.count).toBeLessThanOrEqual(
        uv.array.length,
      )
      expectOriginal(resource, part, part, layout)
    }
    resource.dispose()
  })

  test('20 open/close cycles dispose every geometry once without reviving a closed resource', () => {
    const model = makeModel()
    const part = model.parts[0]!
    const layout = pack(model)
    let disposals = 0
    for (let cycle = 0; cycle < 20; cycle++) {
      const resource = new PartGeometryResource(part, part, layout)
      const geometry = resource.geometry
      geometry.addEventListener('dispose', () => disposals++)
      resource.dispose()
      resource.dispose()
      expect(resource.update({ ...part, shape: 'sphere' }, part, layout)).toBe(false)
      expect(resource.geometry).toBe(geometry)
      expect(disposals).toBe(cycle + 1)
    }
  })

  test('geometry changes dispose old buffers once; translation, rotation and lock do not', () => {
    const part = createPart({ id: 'p', name: 'peça', from: [0, 0, 0], to: [2, 2, 2], color: 2 })
    const layout = pack(makeModel({ parts: [part] }))
    const resource = new PartGeometryResource(part, part, layout)
    const geometry = resource.geometry
    let disposals = 0
    geometry.addEventListener('dispose', () => disposals++)
    const moved: MoldaPart = {
      ...part,
      from: [1, 0, 0],
      to: [3, 2, 2],
      rotation: [0, 45, 0],
      locked: true,
    }
    expect(resource.update(moved, moved, layout)).toBe(false)
    expectOriginal(resource, moved, moved, layout)
    expect(disposals).toBe(0)
    const resized: MoldaPart = { ...moved, to: [4, 2, 2] }
    expect(resource.update(resized, resized, layout)).toBe(true)
    expect(resource.geometry).not.toBe(geometry)
    expect(disposals).toBe(1)
    expectOriginal(resource, resized, resized, layout)
    resource.dispose()
  })
})
