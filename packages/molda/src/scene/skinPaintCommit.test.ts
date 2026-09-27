import { expect, test } from 'bun:test'
import { makeSceneSkinFixture } from '../testing/sceneSkin'
import { indexSceneDocument } from './documentIndex'
import { SCENE_LIMITS } from './limits'
import { transformPoint } from './matrix'
import { readSceneDocument } from './readDocument'
import { addSceneSkinJoint, createSceneSkin, setSceneSkinWeights } from './skinCommands'
import { createSceneSkinPaintStroke } from './skinPaint'
import { normalizeSceneSkinWeights } from './skinWeights'

function setup() {
  const {
      document,
      input: { id, ...input },
    } = makeSceneSkinFixture(),
    asset = createSceneSkin(document, input, () => id),
    mesh = asset.geometries[0]!
  if (mesh.kind !== 'mesh') throw new Error('Mesh expected')
  const matrix = indexSceneDocument(asset).scene.worldMatrices.get(input.nodeId)!,
    sample = { faceId: 'f_0_0', point: transformPoint(matrix, mesh.vertices.v_0_0!) }
  return { asset, mesh, sample }
}

test('prepared private commits match the fully checked command for varied forces, zeros, tiny values and shared geometry', () => {
  const { asset, mesh, sample } = setup(),
    withJoint = addSceneSkinJoint(asset, 'skin', 'rig'),
    source = createSceneSkin(
      { ...withJoint, nodes: [...withJoint.nodes, { ...withJoint.nodes[0]!, id: 'second' }] },
      {
        name: 'Outro vínculo',
        nodeId: 'second',
        jointIds: ['lower'],
        weights: Object.fromEntries(
          Object.keys(mesh.vertices).map((id) => [id, [{ jointId: 'lower', weight: 1 }]]),
        ),
      },
      () => 'second-skin',
    )
  for (let run = 0; run < 64; run++) {
    const values = normalizeSceneSkinWeights([
        { jointId: 'upper', weight: run % 4 === 0 ? 0 : run / 64 },
        { jointId: 'lower', weight: (run + 1) / 64 },
        {
          jointId: 'rig',
          weight: run % 3 === 0 ? Number.MIN_VALUE : run % 3 === 1 ? 1e-100 : 0.25,
        },
      ]),
      document = setSceneSkinWeights(source, 'skin', { v_0_0: values }),
      before = structuredClone(document),
      stroke = createSceneSkinPaintStroke(document, 'skin', run % 3 ? 'upper' : 'lower', {
        mode: run % 2 ? 'add' : 'subtract',
        radius: 2,
        strength: run / 63,
      })
    stroke.sample(sample)
    stroke.sample({ ...sample, point: [sample.point[0] + 0.02, sample.point[1], sample.point[2]] })
    const patch = stroke.result().patch,
      current = {
        ...document,
        updatedAt: document.updatedAt + run + 1,
        thumb: 'data:image/png;base64,iVBORw0KGgo=',
      },
      expected = setSceneSkinWeights(current, 'skin', patch),
      result = stroke.commit(current)
    expect(result).toEqual(expected)
    expect(readSceneDocument(result)).toMatchObject({ status: 'valid' })
    expect(result.geometries).toBe(document.geometries)
    expect(result.nodes).toBe(document.nodes)
    expect(result.skins![1]).toBe(document.skins![1])
    expect(result.skins![0]!.joints).toBe(document.skins![0]!.joints)
    const first = Object.keys(patch)[0]
    if (first) {
      patch[first]![0]!.weight = 99
      result.skins![0]!.weights[first]![0]!.weight = 88
      expect(stroke.commit(current)).toEqual(expected)
    }
    expect(document).toEqual(before)
  }
})

test('a prepared commit accepts only the captured COW content and cannot erase a new source, even on an empty stroke', () => {
  const { asset, sample } = setup(),
    stroke = createSceneSkinPaintStroke(asset, 'skin', 'upper', {
      mode: 'add',
      radius: 0.1,
      strength: 0.25,
    }),
    empty = createSceneSkinPaintStroke(asset, 'skin', 'upper', {
      mode: 'add',
      radius: 0.1,
      strength: 0,
    })
  stroke.sample(sample)
  for (const current of [
    { ...asset, name: 'Changed' },
    { ...asset, id: 'different' },
    { ...asset, nodes: [...asset.nodes] },
    { ...asset, skins: [...asset.skins!] },
    { ...asset, geometries: [...asset.geometries] },
    { ...asset, animations: [] },
  ]) {
    expect(() => stroke.commit(current)).toThrow('mudou')
    expect(() => empty.commit(current)).toThrow('mudou')
  }
  const thumbnail = { ...asset, thumb: 'new', updatedAt: asset.updatedAt + 1 }
  expect(empty.commit(thumbnail)).toBe(thumbnail)
  expect(stroke.commit(thumbnail).thumb).toBe('new')
})

test('prepared commits keep general byte budgets and world overflow checks, with the same errors as the full command', () => {
  const { asset, mesh, sample } = setup(),
    oversized = {
      ...asset,
      images: [
        {
          id: 'image',
          name: 'Image',
          width: 512,
          height: 512,
          encoding: 'rgba' as const,
          layers: [
            {
              id: 'layer',
              name: 'Layer',
              opacity: 1,
              visible: true,
              pixels: new Uint8Array(SCENE_LIMITS.pixelBytes + 1),
            },
          ],
        },
      ],
    },
    overflow = {
      ...asset,
      geometries: [
        { ...mesh, vertices: { ...mesh.vertices, far: [1e308, 0, 0] as [number, number, number] } },
      ],
      skins: [
        {
          ...asset.skins![0]!,
          weights: { ...asset.skins![0]!.weights, far: [{ jointId: 'lower', weight: 1 }] },
        },
      ],
    }
  for (const source of [oversized, overflow]) {
    const stroke = createSceneSkinPaintStroke(source, 'skin', 'upper', {
      mode: 'add',
      radius: 0.1,
      strength: 0.25,
    })
    stroke.sample(sample)
    const result = stroke.result(),
      error = (operation: () => unknown) => {
        try {
          operation()
        } catch (error) {
          return error
        }
        throw new Error('Expected refusal')
      }
    expect(error(() => stroke.commit())).toEqual(
      error(() => setSceneSkinWeights(source, 'skin', result.patch)),
    )
    expect(stroke.result()).toEqual(result)
  }
})
