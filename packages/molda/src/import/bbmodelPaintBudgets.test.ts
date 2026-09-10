import { expect, test } from 'bun:test'
import { encodePng } from '../export/png'
import { directBbmodelImport } from '../testing/bbmodelImportFixture'
import {
  bbmodelPaintImportFixture,
  bbmodelPaintSource,
  bbmodelPaintUri,
} from '../testing/bbmodelPaintImportFixture'
import { pngChunk, pngParts } from '../testing/pngFixture'
import { readBbmodelAppearance } from './bbmodelAppearance'
import { readBbmodelEnvelope } from './bbmodelEnvelope'
import { BBMODEL_INPUT_LIMITS, BbmodelInputError } from './bbmodelInput'
import { convertBbmodelDocument } from './bbmodelNativeDocument'
import { readBbmodelPaintLayers } from './bbmodelPaintLayers'

function error(run: () => unknown, reason: BbmodelInputError['reason'], path: string) {
  let result: unknown
  try {
    run()
  } catch (caught) {
    result = caught
  }
  if (!(result instanceof BbmodelInputError))
    throw new Error('Expected bounded source failure', { cause: result })
  expect(result.reason).toBe(reason)
  expect(result.path).toEndWith(path)
}
function header(depth: 8 | 16, tag: number) {
  const bytes = new Uint8Array(13),
    view = new DataView(bytes.buffer)
  view.setUint32(0, 1024)
  view.setUint32(4, 1024)
  bytes[8] = depth
  bytes[9] = 6
  return pngParts([
    pngChunk('IHDR', bytes),
    pngChunk('tEXt', Uint8Array.of(65, 0, tag)),
    pngChunk('IDAT', Uint8Array.of(0)),
    pngChunk('IEND', new Uint8Array()),
  ])
}
function large(layers: unknown[], source = bbmodelPaintUri(header(8, 0))) {
  const model = bbmodelPaintSource()
  return bbmodelPaintImportFixture({
    ...model,
    resolution: { width: 1024, height: 1024 },
    textures: [{ ...model.textures[0], source, layers }],
  })
}

test('bbmodel active-layer text budget includes every root and active layer before numeric values, but inactive payloads stay opaque', () => {
  const input = bbmodelPaintImportFixture(),
    appearance = readBbmodelAppearance(readBbmodelEnvelope(input.bytes))
  appearance.textures[0]!.embedded = 'x'.repeat(BBMODEL_INPUT_LIMITS.embeddedTextChars)
  Object.defineProperty(appearance.textures[0]!.layers[0], 'opacity', {
    get() {
      throw new Error('Numeric metadata must wait')
    },
  })
  error(() => readBbmodelPaintLayers(appearance), 'budget', '.data_url')
  appearance.textures[0]!.layersEnabled = false
  expect(readBbmodelPaintLayers(appearance).size).toBe(0)
})

test('bbmodel native layer count and hidden alias-copy budget fail before compressed pixels are opened', () => {
  const uri = bbmodelPaintUri(header(8, 1))
  error(
    () => directBbmodelImport(large(Array(33).fill({ data_url: uri }))),
    'budget',
    'textures[0].layers',
  )
  // Two unique decoded images total 8 MiB, but nine independent editable aliases would be 36 MiB.
  error(
    () => directBbmodelImport(large(Array(9).fill({ data_url: uri, visible: false, opacity: 0 }))),
    'budget',
    'layers[8].data_url',
  )
  // Eight copies fit exactly. The deliberately broken root's compressed stream is then reached.
  error(
    () => directBbmodelImport(large(Array(8).fill({ data_url: uri }))),
    'invalid',
    'textures[0].source',
  )
})

test('bbmodel root and layer headers share one decoded budget, with precision rejection before decompression', () => {
  const root = bbmodelPaintUri(header(16, 0)),
    layers = [1, 2, 3, 4].map((tag) => ({ data_url: bbmodelPaintUri(header(16, tag)) })),
    input = large(layers, root)
  input.options.images = { layers: 'molda-layers', rgba16: 'round-to-rgba8' }
  // Root plus four layers is 40 MiB, not two independent 32 MiB budgets.
  error(() => directBbmodelImport(input), 'budget', 'layers[3].data_url')
  const precision = large([layers[0]], root)
  error(() => directBbmodelImport(precision), 'unsupported', 'layers[0].data_url')
})

test('bbmodel combined encoded-resource budget precedes PNG opening and missing roots never yield partial editable images', () => {
  const model = bbmodelPaintSource(),
    texture = model.textures[0]!,
    input = bbmodelPaintImportFixture({
      ...model,
      textures: [{ ...texture, source: '', relative_path: 'root.png' }],
    })
  input.files = [{ path: 'root.png', bytes: new Uint8Array(BBMODEL_INPUT_LIMITS.fileBytes) }]
  error(() => directBbmodelImport(input), 'budget', 'resources')
  input.files = []
  expect(
    convertBbmodelDocument(
      { entryPath: input.entryPath, bytes: input.bytes, files: [] },
      input.identity,
      input.options,
    ),
  ).toEqual({ status: 'missing', paths: ['root.png'] })
})

test('bbmodel exact native pixel budget preserves eight independent editable copies of one embedded raster', () => {
  const rgba = new Uint8Array(1024 * 1024 * 4).fill(37),
    uri = bbmodelPaintUri(encodePng(rgba, 1024, 1024)),
    result = directBbmodelImport(large(Array(8).fill({ data_url: uri }), uri)),
    image = result.document.images[0]!
  expect(result.report.costs.pixelBytes).toBe(32 * 1024 * 1024)
  expect(new Set(image.layers.map((layer) => layer.pixels.buffer)).size).toBe(8)
  image.layers[0]!.pixels[0] = 200
  expect(image.layers[1]!.pixels[0]).toBe(37)
})
