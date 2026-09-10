import { expect, test } from 'bun:test'
import { encodePng } from '../export/png'
import { planObjAppearance } from './objAppearance'
import { readObjBundle } from './objBundle'
import { collectObjConversionIssues } from './objConversionReport'
import { ObjInputError } from './objInput'
import { planObjMaterials } from './objMaterialSelection'
import { convertObjDocument } from './objNativeDocument'
import { convertObjMaterials } from './objNativeMaterials'
import type { ObjNativeOptions } from './objNativeOptions'
import { decodeObjRasters } from './objRasters'
import { OBJ_CONVERSION_REPORT_LIMITS } from './objReportLimits'
import { ObjReportTextBudget } from './objReportText'

const options: ObjNativeOptions = {
    appearance: {
      base: { rgbSpace: 'linear' },
      textures: { colorSpace: 'srgb', scalarSpace: 'linear' },
    },
    images: { colorAlpha: 'multiply', normalY: 'positive', doubleSided: false },
  },
  identity = { id: 'obj-review', name: 'Importado', createdAt: 1, updatedAt: 2 },
  bytes = (text: string) => new TextEncoder().encode(text)
function failure(run: () => unknown) {
  try {
    run()
  } catch (error) {
    expect(error).toBeInstanceOf(ObjInputError)
    if (!(error instanceof ObjInputError)) throw error
    expect(error.reason).toBe('budget')
    expect(error.path).toBe('report.text')
    return
  }
  throw new Error('Expected aggregate text budget failure')
}

test('OBJ report text counts keys and UTF-16 string values across records/arrays, allowing the exact limit', () => {
  const limit = OBJ_CONVERSION_REPORT_LIMITS.textChars
  for (const value of [
    'x'.repeat(limit),
    { ab: { cd: 'x'.repeat(limit - 4) } },
    ['😀'.repeat(limit / 2)],
  ]) {
    const budget = new ObjReportTextBudget()
    budget.add(value)
    budget.add([1, 2, false, null]) // no array-index keys and no claim to count numeric JSON bytes
    failure(() => budget.add('x'))
  }
  const aggregated = new ObjReportTextBudget()
  for (let i = 0; i < 1024; i++) aggregated.add('x'.repeat(limit / 1024))
  failure(() => aggregated.add('x'))
})

function longPaths(count: number) {
  const directory = Array.from({ length: 50 }, () => 'd'.repeat(70)).join('/'),
    library = `${directory}/a.mtl`,
    obj = `mtllib ${library}\nv 0 0 0\nv 1 0 0\nv 0 1 0\nvt 0 0\nvt 1 0\nvt 0 1\n${Array.from({ length: count }, (_, i) => `usemtl M${i}\nf 1/1 2/2 3/3\n`).join('')}`,
    source = readObjBundle(bytes(obj), [
      {
        path: library,
        bytes: bytes(
          Array.from({ length: count }, (_, i) => `newmtl M${i}\nmap_Kd image.png\n`).join(''),
        ),
      },
      { path: `${directory}/image.png`, bytes: encodePng(Uint8Array.of(64, 128, 255, 128), 1, 1) },
    ])
  if (source.status !== 'ready') throw new Error('Complete fixture expected')
  return source
}

test('OBJ material report streams into its budget before any native bake, bounding repeated long file context without changing source', () => {
  const source = longPaths(500),
    before = structuredClone(source),
    appearance = planObjAppearance(source, planObjMaterials(source), options.appearance),
    decoded = decodeObjRasters(source, appearance.references),
    report = collectObjConversionIssues(source, appearance)
  Object.defineProperty(decoded.rasters[0]!, 'rgba', {
    get() {
      throw new Error('Native bake ran before complete report budget')
    },
  })
  let issues = 0
  failure(() =>
    convertObjMaterials(source, appearance, decoded, options.images, (detail) => {
      issues++
      report.add({ stage: 'materials', detail })
    }),
  )
  expect(issues).toBeLessThan(1500)
  expect(issues).toBeGreaterThan(500)
  expect(source).toEqual(before)
  failure(() => convertObjDocument(source, identity, options))
})

test('OBJ whole-report validation matches incremental accounting and material callbacks preserve standalone output and owned layers', () => {
  const source = longPaths(2),
    appearance = planObjAppearance(source, planObjMaterials(source), options.appearance),
    decoded = decodeObjRasters(source, appearance.references),
    received: unknown[] = [],
    streamed = convertObjMaterials(source, appearance, decoded, options.images, (issue) =>
      received.push(issue),
    ),
    standalone = convertObjMaterials(source, appearance, decoded, options.images),
    result = convertObjDocument(source, identity, options),
    budget = new ObjReportTextBudget()
  expect(streamed).toEqual(standalone)
  expect(received).toEqual(streamed.issues)
  budget.add(result.report)
  expect(
    streamed.images[0]!.layers[0]!.pixels.buffer === standalone.images[0]!.layers[0]!.pixels.buffer,
  ).toBe(false)
  expect(
    result.report.issues
      .filter((issue) => issue.stage === 'materials')
      .map((issue) => issue.detail),
  ).toEqual(streamed.issues)
})
