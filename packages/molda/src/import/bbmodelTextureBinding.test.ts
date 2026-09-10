import { expect, test } from 'bun:test'
import { readBbmodelAppearance } from './bbmodelAppearance'
import { readBbmodelEnvelope } from './bbmodelEnvelope'
import { readBbmodelGeometry } from './bbmodelGeometry'
import { BBMODEL_CUBE_DIRECTIONS } from './bbmodelGeometryTypes'
import { readBbmodelGraph } from './bbmodelGraph'
import { BbmodelInputError } from './bbmodelInput'
import { type BbmodelTextureBinding, bindBbmodelTextures } from './bbmodelTextureBinding'

function fixture(
  modelFormat = 'free',
  references: unknown[] = [undefined, false, null, 0, '0', '__proto__'],
) {
  const envelope = readBbmodelEnvelope(
    new TextEncoder().encode(
      JSON.stringify({
        meta: { format_version: '5.0', model_format: modelFormat },
        elements: [
          {
            uuid: 'cube',
            type: 'cube',
            from: [0, 0, 0],
            to: [1, 1, 1],
            faces: Object.fromEntries(
              BBMODEL_CUBE_DIRECTIONS.map((direction, i) => [
                direction,
                { texture: references[i], uv: [0, 0, 16, 16] },
              ]),
            ),
          },
          {
            uuid: 'mesh',
            type: 'mesh',
            vertices: { a: [0, 0, 0] },
            faces: Object.fromEntries(
              references.map((texture, i) => [`f${i}`, { vertices: ['a'], texture }]),
            ),
          },
          { uuid: 'unknown', type: 'plugin' },
        ],
        textures: [
          { uuid: 'first', use_as_default: true },
          { uuid: '0', use_as_default: true },
          { uuid: '__proto__' },
        ],
      }),
    ),
  )
  return {
    geometry: readBbmodelGeometry(readBbmodelGraph(envelope)),
    appearance: readBbmodelAppearance(envelope),
  }
}

test('binds integer and UUID references literally while preserving untextured/disabled states', () => {
  const { geometry, appearance } = fixture()
  const before = structuredClone({ geometry, appearance })
  const bindings = bindBbmodelTextures(geometry, appearance)
  const expected: BbmodelTextureBinding[] = [
    { kind: 'none' },
    { kind: 'none' },
    { kind: 'disabled' },
    { kind: 'texture', texture: 0 },
    { kind: 'texture', texture: 1 },
    { kind: 'texture', texture: 2 },
  ]
  expect(bindings).toEqual([
    { node: 0, faces: expected },
    { node: 1, faces: expected },
    { node: 2, faces: [] },
  ])
  expect({ geometry, appearance }).toEqual(before)
  expect(bindings[0]!.faces).not.toBe(bindings[1]!.faces)
})

test('never guesses default texture from selection, visibility, use_as_default or unknown format id', () => {
  for (const format of ['java_block', 'bedrock', 'plugin', 'free\n']) {
    const { geometry, appearance } = fixture(format)
    const result = bindBbmodelTextures(geometry, appearance)
    expect(result[0]!.faces[0]).toEqual({ kind: 'unresolved-default' })
    expect(result[1]!.faces[0]).toEqual({ kind: 'unresolved-default' })
    expect(result[0]!.faces[3]).toEqual({ kind: 'texture', texture: 0 })
  }
})

test('reports missing textures at the original element/face path, including safe-integer extreme indices', () => {
  for (const reference of [3, Number.MAX_SAFE_INTEGER, 'missing']) {
    const { geometry, appearance } = fixture('free', [reference])
    let error: unknown
    try {
      bindBbmodelTextures(geometry, appearance)
    } catch (caught) {
      error = caught
    }
    expect(error).toBeInstanceOf(BbmodelInputError)
    expect((error as BbmodelInputError).reason).toBe('invalid')
    expect((error as BbmodelInputError).path).toBe('elements[0].faces["north"].texture')
    try {
      bindBbmodelTextures(geometry.slice(1), appearance)
    } catch (caught) {
      error = caught
    }
    expect((error as BbmodelInputError).path).toBe('elements[1].faces["f0"].texture')
  }
})
