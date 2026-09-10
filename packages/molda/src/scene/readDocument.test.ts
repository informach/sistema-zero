import { describe, expect, test } from 'bun:test'
import { readMoldaDocument } from '../core/documentReader'
import { MOLDA_DOCUMENT_WRITE_VERSION, MOLDA_MAX_READ_VERSION } from '../core/documentVersion'
import { createPart } from '../core/model'
import { sanitizeMoldaAsset } from '../core/sanitize'
import { makeModel } from '../testing/fixtures'
import type { MoldaSceneDocument } from './document'
import { sceneToJson } from './documentJson'
import { SCENE_LIMITS } from './limits'
import { migrateLegacyModel } from './migrateLegacy'
import { readSceneDocument } from './readDocument'

function fixture(): MoldaSceneDocument {
  const model = makeModel()
  model.parts.push(
    createPart({
      id: 'mesh',
      name: 'malha',
      shape: 'mesh',
      from: [-1, 0, -1],
      to: [1, 2, 1],
      color: 2,
    }),
  )
  return migrateLegacyModel(model).document
}

describe('unreleased scene document reader', () => {
  test('creation ids obey platform limits while internal resource ids keep their own namespace', () => {
    const source = fixture()
    expect(readSceneDocument({ ...source, id: 'x'.repeat(64) }).status).toBe('valid')
    for (const id of ['x'.repeat(65), 'profile:creation', '', '../other'])
      expect(readSceneDocument({ ...source, id }).status).toBe('invalid')
    expect(source.geometries[0]?.id).toContain(':')
    expect(readSceneDocument(source).status).toBe('valid')
  })
  test('native and JSON roundtrips preserve fractional transforms, geometry, UVs, bytes and palette bindings', () => {
    const source = fixture()
    const node = source.nodes[0]
    const geometry = source.geometries[2]
    if (node?.transform.kind !== 'trs' || geometry?.kind !== 'mesh')
      throw new Error('Missing fixture')
    node.transform.translation = [1.23456, -2.34567, 3.45678]
    node.transform.scale = [-1.234, 0.0001, 2.713456]
    const face = Object.values(geometry.faces)[0]
    if (!face?.corners[0]) throw new Error('Missing face')
    face.corners[0].uv = [-0.12345, 2.34567]
    const original = structuredClone(source)
    const json = sceneToJson(source)
    expect(json.formatVersion).toBe(2)
    expect(typeof json.images[0]?.layers[0]?.pixels).toBe('string')
    const read = readSceneDocument(JSON.parse(JSON.stringify(json)))
    expect(read).toEqual({ status: 'valid', document: source })
    if (read.status !== 'valid') throw new Error('Invalid roundtrip')
    expect(read.document.images[0]?.layers[0]?.pixels).not.toBe(source.images[0]?.layers[0]?.pixels)
    expect(read.document.nodes[0]?.transform).not.toBe(node.transform)
    expect(json.nodes[0]?.transform).not.toBe(node.transform)
    expect(source).toEqual(original)
    expect(readSceneDocument(source)).toEqual({ status: 'valid', document: source })
  })

  test('hierarchy and affine shear are accepted without collapsing local transforms', () => {
    const source = fixture()
    const child = source.nodes[0]
    if (!child) throw new Error('Missing child')
    source.nodes.push({
      id: 'group',
      name: 'Grupo',
      kind: 'group',
      parentId: null,
      hidden: false,
      locked: false,
      transform: { kind: 'affine', matrix: [1, 0, 0, 0, 0.25, 2, 0, 0, 0, 0.4, -1, 0, 1, 2, 3, 1] },
    })
    child.parentId = 'group'
    expect(readSceneDocument(sceneToJson(source))).toEqual({ status: 'valid', document: source })
  })

  test('one mesh may exceed the legacy per-piece limit within the aggregate budget', () => {
    const source = fixture()
    const geometry = source.geometries[2]
    if (geometry?.kind !== 'mesh') throw new Error('Missing mesh')
    geometry.vertices = Object.fromEntries(
      Array.from({ length: 2048 }, (_, i) => [`v${i}`, [i / 17, i / 19, i / 23]]),
    )
    geometry.faces = {}
    expect(readSceneDocument(source)).toEqual({ status: 'valid', document: source })
  })

  test('signed zero has the same canonical representation in memory and JSON without snapping', () => {
    const source = fixture()
    const node = source.nodes[0]
    if (node?.transform.kind !== 'trs') throw new Error('Missing transform')
    node.transform.translation = [-0, 0.000000001, 1.123456789]
    const read = readSceneDocument(source)
    if (read.status !== 'valid') throw new Error('Expected valid')
    const transform = read.document.nodes[0]?.transform
    if (transform?.kind !== 'trs') throw new Error('Missing transform')
    expect(transform.translation).toEqual([0, 0.000000001, 1.123456789])
    expect(Object.is(node.transform.translation[0], -0)).toBe(true)
    expect(readSceneDocument(JSON.parse(JSON.stringify(sceneToJson(source))))).toEqual(read)
  })

  test('composed positions and mirror planes cannot overflow despite finite input numbers', () => {
    const source = fixture()
    const node = source.nodes[0]
    if (node?.transform.kind !== 'trs') throw new Error('Missing transform')
    node.transform.scale = [Number.MAX_VALUE, 1, 1]
    expect(readSceneDocument(source).status).toBe('invalid')
    node.transform.scale = [1, 1, 1]
    source.mirrors = [
      { id: 'mirror', name: 'Espelho', sourceId: node.id, axis: 'x', offset: Number.MAX_VALUE },
    ]
    expect(readSceneDocument(source).status).toBe('invalid')
  })

  test('ler a geração seguinte não autoriza o caminho v1 a escrevê-la nem a saneá-la', () => {
    const json = sceneToJson(fixture())
    // O cliente sabe abrir a v2, mas por ESTE leitor, não pelo v1 nem pelo sanitize.
    expect(MOLDA_MAX_READ_VERSION).toBe(2)
    expect(MOLDA_DOCUMENT_WRITE_VERSION).toBe(1)
    expect(readMoldaDocument(json)).toEqual({ status: 'unsupported', version: 2, raw: json })
    expect(sanitizeMoldaAsset(json)).toBeNull()
    const future = { ...json, formatVersion: 3, newAuthorialData: ['keep'] }
    expect(readSceneDocument(future)).toEqual({ status: 'unsupported', version: 3, raw: future })
  })

  test('unknown fields and malformed values retain the entire raw document for recovery', () => {
    const source = sceneToJson(fixture())
    const invalid = [
      { ...source, futureModifier: { keep: true } },
      { ...source, formatVersion: '2' },
      { ...source, formatVersion: null },
      { ...source, nodes: [{ ...source.nodes[0], pivot: [1, 2, 3] }] },
      { ...source, nodes: [{ ...source.nodes[0], hidden: 'false' }] },
      { ...source, nodes: [{ ...source.nodes[0], parentId: 'missing' }] },
      { ...source, nodes: [{ ...source.nodes[0], parentId: source.nodes[0]?.id }] },
      { ...source, nodes: [source.nodes[0], source.nodes[0]] },
      {
        ...source,
        nodes: [
          {
            ...source.nodes[0],
            transform: {
              kind: 'trs',
              translation: [0, 0, 0],
              rotation: [0, 0, 0, 0],
              scale: [1, 1, 1],
            },
          },
        ],
      },
      { ...source, settings: { ...source.settings, snap: '1' } },
    ]
    for (const raw of invalid) {
      const before = structuredClone(raw)
      const read = readSceneDocument(raw)
      expect(read.status).toBe('invalid')
      if (read.status !== 'invalid') throw new Error('Expected invalid')
      expect(read.raw).toBe(raw)
      expect(raw).toEqual(before)
    }
  })

  test('missing geometry, face vertices, material maps and mirror identities fail as a whole', () => {
    const broken: Array<(source: MoldaSceneDocument) => void> = [
      (source) => {
        source.geometries = []
      },
      (source) => {
        source.materials = []
      },
      (source) => {
        source.images = []
      },
      (source) => {
        source.geometries.push(source.geometries[0]!)
      },
      (source) => {
        source.materials[0]!.baseColor = { kind: 'palette', index: 999 }
      },
      (source) => {
        const geometry = source.geometries[2]
        if (geometry?.kind === 'mesh')
          Object.values(geometry.faces)[0]!.corners[0]!.vertexId = 'toString'
      },
      (source) => {
        source.mirrors = [
          {
            id: source.nodes[0]!.id,
            sourceId: source.nodes[0]!.id,
            name: 'Espelho',
            axis: 'x',
            offset: 0,
          },
        ]
      },
      (source) => {
        source.mirrors = [
          { id: 'mirror', sourceId: 'missing', name: 'Espelho', axis: 'x', offset: 0 },
        ]
      },
    ]
    for (const breakDocument of broken) {
      const raw = fixture()
      breakDocument(raw)
      expect(readSceneDocument(raw).status).toBe('invalid')
      expect(() => sceneToJson(raw)).toThrow()
    }
  })

  test('pixel dimensions, palette indexes, layer counts and duplicate IDs are strict', () => {
    const raw = fixture()
    const image = raw.images[0]
    if (!image?.layers[0]) throw new Error('Missing image')
    const layer = image.layers[0]
    for (const changed of [
      { ...image, width: 0 },
      { ...image, height: '16' },
      { ...image, width: 1025 },
      { ...image, layers: [] },
      { ...image, layers: [layer, layer] },
      { ...image, layers: [{ ...layer, pixels: new Uint8Array(1) }] },
      { ...image, layers: [{ ...layer, pixels: new Uint8Array(layer.pixels.length).fill(255) }] },
      { ...image, layers: [{ ...layer, opacity: 1.1 }] },
      {
        ...image,
        layers: [{ ...layer, pixels: '!'.repeat(Math.ceil(layer.pixels.length / 3) * 4) }],
      },
    ])
      expect(readSceneDocument({ ...raw, images: [changed, ...raw.images.slice(1)] }).status).toBe(
        'invalid',
      )
  })

  test('aggregate budgets include shared geometry instances and layers before oversized allocation', () => {
    const raw = fixture()
    const first = raw.nodes[0]!
    const nodes = Array.from({ length: SCENE_LIMITS.renderedParts + 1 }, (_, i) => ({
      ...first,
      id: `node${i}`,
    }))
    expect(readSceneDocument({ ...raw, nodes }).status).toBe('invalid')
    const pixels = new Uint8Array(1024 * 1024 * 4)
    const images = Array.from({ length: 9 }, (_, i) => ({
      id: `image${i}`,
      name: 'RGBA',
      width: 1024,
      height: 1024,
      encoding: 'rgba',
      layers: [{ id: 'layer', name: 'Pintura', visible: true, opacity: 1, pixels }],
    }))
    const read = readSceneDocument({ ...raw, images })
    expect(read.status).toBe('invalid')
    if (read.status !== 'invalid') throw new Error('Expected budget failure')
    expect(read.path).toBe('images[8]')
    expect(read.message).toBe('Camadas fora do orçamento.')
  })
})
