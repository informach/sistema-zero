import { expect, test } from 'bun:test'
import { directBbmodelImport } from '../testing/bbmodelImportFixture'
import { bbmodelPaintImportFixture } from '../testing/bbmodelPaintImportFixture'
import { readBbmodelImportReport } from './bbmodelImportReport'

test('bbmodel layer transport requires complete ordered provenance, matching options and no unknown fields', () => {
  const input = bbmodelPaintImportFixture(),
    result = directBbmodelImport(input),
    issue = result.report.issues.find((row) => row.stage === 'paint-layers')
  if (issue?.stage !== 'paint-layers') throw new Error('Expected layer report')
  const detail = issue.detail,
    layer = detail.layers[0]!,
    read = (changes: unknown[]) =>
      readBbmodelImportReport(
        {
          ...result.report,
          issues: [
            ...result.report.issues.filter((row) => row.stage !== 'paint-layers'),
            ...changes,
          ],
        },
        result.document,
        input,
      ),
    wrap = (value: unknown) => [{ stage: 'paint-layers', detail: value }]
  expect(read(wrap(detail))).toEqual(result.report)
  for (const changes of [
    { extra: true },
    { code: 'unknown' },
    { texture: 1 },
    { path: 'textures[1].layers' },
    { targetId: 'other' },
    { composition: 'browser-canvas' },
    { rootBitmap: 'flattened' },
    { layers: [] },
    { layers: detail.layers.slice(1) },
    { layers: [...detail.layers].reverse() },
    { layers: Array(33).fill(layer) },
    ...[
      { layer: 1 },
      { targetId: 'other' },
      { sourceName: false },
      { sourceName: 'x'.repeat(4097) },
      { nameChange: 'name-shortened' },
      { visible: false },
      { sourceOpacity: 99 },
      { sourceOpacity: -1 },
      { sourceOpacity: NaN },
      { declared: [null] },
      { declared: [-1, 2] },
      { actual: [1, 2] },
      { rgba16: true },
      { script: {} },
    ].map((change) => ({ layers: [{ ...layer, ...change }, ...detail.layers.slice(1)] })),
  ])
    expect(() => read(wrap({ ...detail, ...changes }))).toThrow()
  for (const key of Object.keys(layer)) {
    const missing: Record<string, unknown> = { ...layer }
    delete missing[key]
    expect(() => read(wrap({ ...detail, layers: [missing, ...detail.layers.slice(1)] }))).toThrow()
  }
  expect(() => read([])).toThrow()
  expect(() => read([...wrap(detail), ...wrap(detail)])).toThrow()
  input.options.images = { layers: 'reject' }
  expect(() => read(wrap(detail))).toThrow()
})

test('bbmodel receiver owns nested layer details and rejects missing provenance even for a single native paint layer', () => {
  const input = bbmodelPaintImportFixture(),
    result = directBbmodelImport(input),
    parsed = readBbmodelImportReport(result.report, result.document, input),
    owned = parsed.issues.find((row) => row.stage === 'paint-layers'),
    original = result.report.issues.find((row) => row.stage === 'paint-layers')
  if (owned?.stage !== 'paint-layers' || original?.stage !== 'paint-layers')
    throw new Error('Missing layers')
  const before = structuredClone(original)
  owned.detail.layers[0]!.declared[0] = 200
  owned.detail.layers[0]!.actual[0] = 200
  owned.detail.layers[0]!.sourceName = 'Changed'
  expect(original).toEqual(before)
  result.document.images[0]!.layers = result.document.images[0]!.layers.slice(0, 1)
  result.report.costs.pixelBytes = 16
  expect(() =>
    readBbmodelImportReport(
      {
        ...result.report,
        issues: result.report.issues.filter((row) => row.stage !== 'paint-layers'),
      },
      result.document,
      input,
    ),
  ).toThrow()
})
