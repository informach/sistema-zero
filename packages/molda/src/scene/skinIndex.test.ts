import { expect, test } from 'bun:test'
import { makeSceneSkinFixture } from '../testing/sceneSkin'
import type { MoldaSceneDocument } from './document'
import { indexSceneDocument } from './documentIndex'
import { readSceneDocument } from './readDocument'
import { createSceneSkin } from './skinCommands'

function fixture() {
  const {
      document,
      input: { id, ...input },
    } = makeSceneSkinFixture(),
    mesh = document.geometries[0]!
  if (mesh.kind !== 'mesh') throw new Error('Mesh expected')
  const names = ['10', '2', '__proto__', 'constructor'],
    asset = {
      ...document,
      geometries: [
        {
          ...mesh,
          faces: {},
          vertices: Object.fromEntries(
            names.map((name, i) => [name, [i, 0, 0] as [number, number, number]]),
          ),
        },
      ],
    }
  return createSceneSkin(
    asset,
    {
      ...input,
      weights: Object.fromEntries(
        names.map((name, i) => [
          name,
          [
            { jointId: 'upper', weight: i / 3 },
            { jointId: 'lower', weight: 1 - i / 3 },
          ],
        ]),
      ),
    },
    () => id,
  )
}

test('skin indexing keeps numeric/prototype IDs as own ordered data, without replacing bindings or rows', () => {
  const document = fixture(),
    source = structuredClone(document),
    index = indexSceneDocument(document),
    skin = document.skins![0]!
  expect(Object.keys(skin.weights)).toEqual(['2', '10', '__proto__', 'constructor'])
  expect(index.skinVertexCount).toBe(4)
  expect(index.skins.get(skin.id)).toBe(skin)
  expect(index.skinsByNode.get(skin.nodeId)).toBe(skin)
  expect([...index.skinJointNodes]).toEqual(['upper', 'lower'])
  expect(skin.weights['2']![0]!.weight).toBe(1 / 3)
  expect(skin.weights['10']![0]!.weight).toBe(0)
  expect(readSceneDocument(document).status).toBe('valid')
  expect(document).toEqual(source)
})

test('index errors retain point order: row capacity, membership and missing vertices are not reordered', () => {
  const document = fixture(),
    skin = document.skins![0]!,
    mesh = document.geometries[0]!
  if (mesh.kind !== 'mesh') throw new Error('Mesh expected')
  const invalid: MoldaSceneDocument = {
    ...document,
    skins: [
      {
        ...skin,
        weights: {
          ...skin.weights,
          '2': [],
          '10': [{ jointId: 'missing', weight: 1 }],
        },
      },
    ],
  }
  expect(() => indexSceneDocument(invalid)).toThrow('Influências fora do orçamento')
  invalid.skins![0]!.weights['2'] = skin.weights['2']!
  expect(() => indexSceneDocument(invalid)).toThrow('osso fora do vínculo')
  const missing = {
    ...document,
    geometries: [
      {
        ...mesh,
        vertices: Object.fromEntries(
          Object.entries(mesh.vertices).map(([id, point]) => [id === '2' ? 'absent' : id, point]),
        ),
      },
    ],
    skins: [{ ...skin, weights: { ...skin.weights, '2': [] } }],
  }
  expect(() => indexSceneDocument(missing)).toThrow('ponto ausente')
  expect(() => indexSceneDocument({ ...invalid, geometries: [{ ...mesh, vertices: {} }] })).toThrow(
    'Cada ponto da malha precisa de pesos',
  )
})

test('differently ordered weights retain references and validate errors in weight order', () => {
  const document = fixture(),
    skin = document.skins![0]!,
    weights = Object.fromEntries(Object.entries(skin.weights).reverse()),
    reordered = { ...document, skins: [{ ...skin, weights }] },
    source = structuredClone(reordered),
    index = indexSceneDocument(reordered)
  expect(Object.keys(weights)).toEqual(['2', '10', 'constructor', '__proto__'])
  expect(index.skinVertexCount).toBe(4)
  expect(index.skins.get(skin.id)).toBe(reordered.skins[0]!)
  expect(weights.constructor).toBe(skin.weights.constructor)
  expect(readSceneDocument(reordered).status).toBe('valid')
  expect(reordered).toEqual(source)

  const invalid: MoldaSceneDocument = {
    ...reordered,
    skins: [
      {
        ...skin,
        weights: Object.fromEntries(
          Object.entries(weights).map(([id, row]) => [
            id,
            id === 'constructor'
              ? [{ jointId: 'missing', weight: 1 }]
              : id === '__proto__'
                ? []
                : row,
          ]),
        ),
      },
    ],
  }
  expect(() => indexSceneDocument(invalid)).toThrow('osso fora do vínculo')
  invalid.skins![0]!.weights.constructor = weights.constructor!
  expect(() => indexSceneDocument(invalid)).toThrow('Influências fora do orçamento')
  expect(reordered).toEqual(source)
})
