import { expect, test } from 'bun:test'
import sharp from 'sharp'
import { reverseRgbaRowsInPlace } from '../core/rgbaRows'
import { encodePng } from '../export/png'
import { encodeSceneGlb } from '../export/sceneGlb'
import { compositeSceneImage } from '../scene/composite'
import { editSceneImageLayers } from '../scene/imageLayerCommands'
import { readSceneDocument } from '../scene/readDocument'
import { directBbmodelImport } from '../testing/bbmodelImportFixture'
import {
  bbmodelPaintImportFixture,
  bbmodelPaintSource,
  bbmodelPaintUri,
} from '../testing/bbmodelPaintImportFixture'
import { readGlb, readImage } from '../testing/glbRead'
import { expectValidGlb } from '../testing/gltfValidation'
import { makePngFixture } from '../testing/pngFixture'
import { bbmodelImportReply, readBbmodelImportReply } from '../workers/bbmodelImportProtocol'
import { readBbmodelImportRequest } from '../workers/bbmodelImportRequest'
import { BbmodelInputError } from './bbmodelInput'

function withLayers(layers: readonly unknown[], texture: Record<string, unknown> = {}) {
  const source = bbmodelPaintSource()
  return { ...source, textures: [{ ...source.textures[0], ...texture, layers }] }
}
function failure(
  run: () => unknown,
  field: string,
  reason: BbmodelInputError['reason'] = 'unsupported',
) {
  let error: unknown
  try {
    run()
  } catch (caught) {
    error = caught
  }
  if (!(error instanceof BbmodelInputError))
    throw new Error('Expected typed bbmodel error', { cause: error })
  expect(error.reason).toBe(reason)
  expect(error.path).toEndWith(field)
}

test('bbmodel mixes flat and layered textures without confusing resource aliases or inactive authoring data', () => {
  const source = bbmodelPaintSource(),
    texture = source.textures[0]!,
    piece = source.elements[0]!,
    input = bbmodelPaintImportFixture({
      ...source,
      elements: [
        { ...piece, faces: { ...piece.faces, second: { ...piece.faces.face, texture: 1 } } },
      ],
      textures: [
        texture,
        {
          ...texture,
          uuid: 'flat',
          layers_enabled: false,
          layers: [{ data_url: 'javascript:never_execute()', opacity: 'invalid-but-inactive' }],
        },
      ],
    }),
    result = directBbmodelImport(input)
  expect(result.document.images.map((image) => image.layers.length)).toEqual([3, 1])
  expect(result.report.costs.pixelBytes).toBe(64)
  expect(result.document.images[1]!.layers[0]!.pixels.every((value) => value === 255)).toBe(true)
  expect(
    result.report.issues
      .filter((issue) => issue.stage === 'resources')
      .map((issue) => issue.detail.resource),
  ).toEqual([0, 0])
  expect(result.report.issues.filter((issue) => issue.stage === 'paint-layers')).toHaveLength(1)
  expect(
    result.report.issues.filter((issue) => issue.detail.code === 'inactive-texture-layers-omitted'),
  ).toHaveLength(1)
  expect(readBbmodelImportReply(bbmodelImportReply(input, result), input).type).toBe('result')
  const layers = Array.from({ length: 32 }, () => texture.layers[0]!)
  expect(
    directBbmodelImport(bbmodelPaintImportFixture(withLayers(layers))).document.images[0]!.layers,
  ).toHaveLength(32)
})

test.each([
  '4.9',
  '4.10',
  '5.0',
] as const)('bbmodel %s preserves editable layer order, opacity, invisible pixels, row orientation and report through worker and GLB', async (version) => {
  const input = bbmodelPaintImportFixture(bbmodelPaintSource(version)),
    before = structuredClone(input),
    result = directBbmodelImport(input),
    received = readBbmodelImportReply(bbmodelImportReply(input, result), input)
  if (received.type !== 'result' || received.result.status !== 'ready')
    throw new Error('Expected ready reply')
  expect(received.result).toEqual(result)
  expect(readSceneDocument(result.document).status).toBe('valid')
  const image = received.result.document.images[0]!
  expect(image.layers.map((layer) => [layer.id, layer.name, layer.visible, layer.opacity])).toEqual(
    [
      ['bbmodel_image_0_layer_0', 'Base', true, 1],
      ['bbmodel_image_0_layer_1', 'Detalhes', true, 0.5],
      ['bbmodel_image_0_layer_2', 'Escondida', false, 0],
    ],
  )
  expect(image.layers[0]!.pixels).toEqual(
    Uint8Array.of(0, 0, 255, 255, 41, 42, 43, 0, 255, 0, 0, 255, 0, 255, 0, 255),
  )
  expect(image.layers[2]!.pixels).toEqual(image.layers[0]!.pixels)
  expect(image.layers[2]!.pixels.buffer).not.toBe(image.layers[0]!.pixels.buffer)
  const composite = compositeSceneImage(image, [])
  expect(composite).toEqual(
    Uint8Array.of(128, 128, 255, 255, 0, 0, 0, 0, 191, 0, 64, 255, 128, 128, 0, 255),
  )
  expect(result.report.costs.pixelBytes).toBe(48)
  const issue = result.report.issues.find((row) => row.stage === 'paint-layers')
  if (issue?.stage !== 'paint-layers') throw new Error('Missing layer report')
  expect(issue.detail.layers[1]).toMatchObject({
    declared: [99, 0],
    actual: [2, 2],
    sourceOpacity: 50,
  })
  expect(JSON.stringify(result.report)).not.toContain('data:image')
  expect(
    result.report.issues.some((issue) => issue.detail.code === 'inactive-texture-layers-omitted'),
  ).toBe(false)
  const edited = editSceneImageLayers(result.document, image.id, {
    kind: 'visible',
    layerId: image.layers[1]!.id,
    value: false,
  })
  expect(edited.images[0]!.layers[1]!.visible).toBe(false)
  expect(result.document.images[0]!.layers[1]!.visible).toBe(true)
  const glb = encodeSceneGlb(received.result.document).bytes
  await expectValidGlb(glb)
  const png = readImage(readGlb(glb), 0)
  const decoded = new Uint8Array(await sharp(png).ensureAlpha().raw().toBuffer())
  reverseRgbaRowsInPlace(decoded, 2, 2)
  expect([...decoded]).toEqual([...composite])
  result.document.images[0]!.layers[0]!.pixels.fill(0)
  issue.detail.layers[0]!.actual[0] = 99
  expect(image.layers[0]!.pixels[2]).toBe(255)
  expect(
    received.result.report.issues.find((row) => row.stage === 'paint-layers')?.detail,
  ).not.toEqual(issue.detail)
  expect(input).toEqual(before)
})

test('bbmodel refuses unrepresentable layers without bitmap fallback, including invisible or zero-opacity layers', () => {
  const layer = bbmodelPaintSource().textures[0]!.layers[0]!
  const mutations: Array<[Record<string, unknown>, string, BbmodelInputError['reason']?]> = [
    [{ offset: [1, 0] }, '.offset'],
    [{ scale: [-1, 1] }, '.scale'],
    [{ scale: [0.5, 1] }, '.scale'],
    [{ blend_mode: 'multiply' }, '.blend_mode'],
    [{ blend_mode: 'alpha_mask' }, '.blend_mode'],
    [{ image_data: { data: [255] } }, 'layers[0]'],
    [{ in_limbo: false }, 'layers[0]'],
    [{ data_url: '' }, '.data_url'],
    [{ data_url: null }, '.data_url', 'invalid'],
    [{ data_url: 'https://example.invalid/paint.png' }, '.data_url'],
    [{ data_url: 'javascript:never_execute()' }, '.data_url'],
    [{ opacity: 101 }, '.opacity', 'invalid'],
    [{ opacity: '50' }, '.opacity', 'invalid'],
    [{ visible: 0 }, '.visible', 'invalid'],
    [{ offset: [0] }, '.offset', 'invalid'],
    [{ width: -1 }, '.width', 'invalid'],
    [{ data_url: bbmodelPaintUri(encodePng(Uint8Array.of(1, 2, 3, 4), 1, 1)) }, '.data_url'],
  ]
  for (const [changes, field, reason] of mutations)
    failure(
      () =>
        directBbmodelImport(
          bbmodelPaintImportFixture(
            withLayers([{ ...layer, visible: false, opacity: 0, ...changes }]),
          ),
        ),
      field,
      reason,
    )
  const input = bbmodelPaintImportFixture()
  input.options.images = {}
  failure(() => directBbmodelImport(input), '.layers_enabled')
  failure(() => directBbmodelImport(bbmodelPaintImportFixture(withLayers([]))), '.layers')
  // Unknown layer values are not executed or copied; discarding them requires explicit consent.
  const extra = bbmodelPaintImportFixture(
    withLayers([{ ...layer, plugin: { script: 'never_execute()' } }]),
  )
  failure(() => directBbmodelImport(extra), '["plugin"]')
  extra.options.remainder = { unmapped: 'discard' }
  const report = directBbmodelImport(extra).report
  expect(report.issues).toContainEqual({
    stage: 'remainder',
    detail: { code: 'unmapped-field-discarded', path: 'textures[0].layers[0]["plugin"]' },
  })
  expect(JSON.stringify(report)).not.toContain('never_execute')
})

test('bbmodel preserves empty and long source layer names, handles 16-bit layers only by explicit choice, and validates options before source', () => {
  const png = makePngFixture({ width: 2, height: 2, depth: 16, colorType: 6 }),
    input = bbmodelPaintImportFixture(
      withLayers([
        { name: '', data_url: bbmodelPaintUri(png.bytes) },
        { name: 'x'.repeat(129), data_url: bbmodelPaintUri(png.bytes) },
      ]),
    )
  failure(() => directBbmodelImport(input), '.data_url')
  input.options.images = { layers: 'molda-layers', rgba16: 'round-to-rgba8' }
  const result = directBbmodelImport(input),
    pixels = Uint8Array.from(png.rgba, (value) => Math.round(value / 257))
  reverseRgbaRowsInPlace(pixels, 2, 2)
  expect(result.document.images[0]!.layers[0]!.pixels).toEqual(pixels)
  expect(result.document.images[0]!.layers.map((layer) => layer.name)).toEqual([
    'Camada 1',
    'x'.repeat(128),
  ])
  expect(
    result.report.issues.find((issue) => issue.stage === 'paint-layers')?.detail,
  ).toMatchObject({
    layers: [
      { sourceName: '', nameChange: 'name-generated', rgba16: true },
      { sourceName: 'x'.repeat(129), nameChange: 'name-shortened', rgba16: true },
    ],
  })
  expect(readBbmodelImportReply(bbmodelImportReply(input, result), input).type).toBe('result')
  for (const layers of [null, true, 'flatten', 1])
    expect(() =>
      readBbmodelImportRequest({
        ...input,
        bytes: Uint8Array.of(0),
        options: { ...input.options, images: { layers } },
      }),
    ).toThrow()
})
