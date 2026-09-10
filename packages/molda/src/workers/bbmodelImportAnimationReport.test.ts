import { expect, test } from 'bun:test'
import type { BbmodelClipProblem } from '../import/bbmodelClipPlanTypes'
import { collectBbmodelConversionReport } from '../import/bbmodelConversionReport'
import { BBMODEL_REPORT_LIMITS } from '../import/bbmodelReportLimits'
import { importDocumentCosts } from '../import/importDocumentCosts'
import {
  bbmodelAnimatedImportFixture,
  bbmodelAnimatedSource,
  BBMODEL_ANIMATED_TARGET as target,
} from '../testing/bbmodelAnimatedImportFixture'
import { directBbmodelImport } from '../testing/bbmodelImportFixture'
import { bbmodelImportReply, readBbmodelImportReply } from './bbmodelImportProtocol'

function setup() {
  const input = bbmodelAnimatedImportFixture(),
    ready = directBbmodelImport(input),
    report = ready.report.animations
  if (!report) throw new Error('Expected animation report')
  return {
    input,
    ready,
    report,
    read: (animations: unknown) =>
      readBbmodelImportReply(
        {
          ...bbmodelImportReply(input, ready),
          result: { ...ready, report: { ...ready.report, animations } },
        },
        input,
      ),
  }
}

test('bbmodel animation wire report rejects missing, unknown, stale and inconsistent structures', () => {
  const { read, report } = setup(),
    clip = report.source[0],
    conversion = report.conversions[0],
    bounds = report.bounds[0]
  if (clip?.kind !== 'prepared' || !conversion || !bounds)
    throw new Error('Expected prepared report')
  const track = conversion.tracks[0]
  if (!track) throw new Error('Expected track report')
  for (const candidate of [
    null,
    undefined,
    { ...report, script: {} },
    { ...report, policy: {} },
    { ...report, policy: { ...report.policy, fps: 30 } },
    { ...report, source: [] },
    { ...report, conversions: [] },
    { ...report, bounds: [] },
    { ...report, counts: { ...report.counts, keys: report.counts.keys + 1 } },
    { ...report, sourceCounts: { ...report.sourceCounts, clips: 2 } },
    { ...report, keyCounts: { ...report.keyCounts, transformKeys: 0 } },
    { ...report, bindingCounts: { ...report.bindingCounts, bound: 0 } },
    ...[
      { clip: 2 },
      { path: 'animations[5]' },
      { sourceUuid: '' },
      { sourceName: undefined },
      { sourceName: false },
      { sourceName: 'x'.repeat(4097) },
      { extra: true },
      { duration: { ...clip.duration, native: 2 } },
      { playback: { ...clip.playback, standalone: false } },
      { weight: { value: 0, defaulted: true, clamped: true } },
      { metadataFields: 1 },
      { firstMetadataPath: 'other' },
      { nameReferences: 1 },
    ].map((changes) => ({ ...report, source: [{ ...clip, ...changes }] })),
    ...[
      { clip: 1 },
      { clipId: 'other' },
      { path: 'animations[1]' },
      { nameChange: 'unknown' },
      { duration: 2 },
      { fps: 8 },
      { loop: false },
      { weight: 0.5 },
      { catmullLoopNeighbours: true },
    ].map((changes) => ({ ...report, conversions: [{ ...conversion, ...changes }] })),
    ...[
      { nodeId: 'bbmodel_node_0' },
      { channel: 'scale' },
      { keys: 0 },
      { keys: track.keys + 1 },
      { sourceKeys: 0 },
      { sourceKeys: 1e7 },
      { prePostKeys: 1 },
      { migration: { pointAxes: 1, bezierValueAxes: 0 } },
      { zeroScaleComponents: 1 },
      { underflowComponents: 1e9 },
      { reordered: 0 },
      { sampling: 'curve' },
      { path: 'animations[9].animators["x"].position' },
      { extra: {} },
    ].map((changes) => ({
      ...report,
      conversions: [
        { ...conversion, tracks: [{ ...track, ...changes }, ...conversion.tracks.slice(1)] },
      ],
    })),
    ...[
      { method: 'endpoint-only' },
      { clipId: 'other' },
      { nodes: 1 },
      { maximumPointBound: 0 },
      { maximumScaleBound: Infinity },
      { maximumTranslationBound: NaN },
      { extra: {} },
    ].map((changes) => ({ ...report, bounds: [{ ...bounds, ...changes }] })),
  ])
    expect(() => read(candidate)).toThrow()
})

test('bbmodel transport rejects animated output in static requests and changed local values even with matching costs', () => {
  const { input, ready } = setup(),
    changed = structuredClone(ready),
    track = changed.document.animations?.[0]?.tracks[0]
  if (track?.channel !== 'translation' || !track.keys[0]) throw new Error('Translation expected')
  track.keys[0].value[0] = 1e39
  changed.report.costs = importDocumentCosts(changed.document)
  expect(() => readBbmodelImportReply(bbmodelImportReply(input, changed), input)).toThrow()
  expect(() =>
    readBbmodelImportReply(bbmodelImportReply(input, ready), {
      ...input,
      options: { ...input.options, remainder: { animations: 'omit' } },
    }),
  ).toThrow()
  const noAnimation = structuredClone(ready)
  noAnimation.document.animations = []
  noAnimation.report.costs = importDocumentCosts(noAnimation.document)
  expect(() => readBbmodelImportReply(bbmodelImportReply(input, noAnimation), input)).toThrow()
})

test('bbmodel transport preserves discarded metadata, pre/post and zero-scale policies and owns nested reports', () => {
  const source = bbmodelAnimatedSource(),
    input = bbmodelAnimatedImportFixture({
      ...source,
      animations: [
        {
          uuid: 'details',
          length: 1,
          markers: [{ name: 'Marca' }],
          custom: { code: 'never_execute()' },
          animators: {
            [target]: {
              name: 'Corpo',
              type: 'bone',
              keyframes: [
                {
                  channel: 'scale',
                  time: 0,
                  data_points: [
                    { x: 0, y: 1, z: 1 },
                    { x: 1, y: 1, z: 1 },
                  ],
                },
                { channel: 'scale', time: 1, data_points: [{ x: 1, y: 1, z: 1 }] },
              ],
            },
          },
        },
      ],
    })
  input.options.clips = {
    adaptation: 'continuous-sampled',
    metadata: 'discard',
    unmapped: 'discard',
    discontinuities: 'sample-pre',
    zeroScale: 'preserve-zero',
  }
  const ready = directBbmodelImport(input),
    wire = bbmodelImportReply(input, ready),
    received = readBbmodelImportReply(wire, input)
  if (received.type !== 'result' || received.result.status !== 'ready')
    throw new Error('Ready expected')
  expect(received.result.report).toEqual(ready.report)
  const actual = ready.report.animations,
    owned = received.result.report.animations
  if (!actual || !owned) throw new Error('Expected report')
  expect(owned.source[0]).toMatchObject({
    kind: 'prepared',
    metadataFields: 2,
    unmappedFields: 1,
    markers: 1,
  })
  expect(owned.conversions[0]?.tracks[0]).toMatchObject({
    prePostKeys: 1,
    zeroScaleComponents: 1,
    sampling: 'grid',
  })
  const track = actual.conversions[0]?.tracks[0]
  if (!track) throw new Error('Expected track')
  track.migration.pointAxes = 99
  expect(owned.conversions[0]?.tracks[0]?.migration.pointAxes).toBe(0)
})

test('bbmodel animation transport budgets track headers before nested details and rejects overlong source text', () => {
  const { report, read } = setup(),
    conversion = report.conversions[0]
  if (!conversion) throw new Error('Conversion expected')
  const tooMany = {
    ...conversion,
    tracks: Array.from({ length: 4097 }, () => ({
      get path() {
        throw new Error('Do not read nested tracks')
      },
    })),
  }
  expect(() => read({ ...report, conversions: [tooMany] })).toThrow(
    'Relatório de movimentos inconsistente.',
  )
  const first = report.source[0]
  if (!first) throw new Error('Source expected')
  expect(() =>
    read({
      ...report,
      source: [{ ...first, path: 'x'.repeat(BBMODEL_REPORT_LIMITS.pathChars + 1) }],
    }),
  ).toThrow('Texto inválido.')
})

test('bbmodel real source omission reasons survive transport as closed owned diagnostics', () => {
  const source = bbmodelAnimatedSource(),
    clip = source.animations[0]
  if (!clip) throw new Error('Clip expected')
  const animator = clip.animators[target]
  if (!animator) throw new Error('Animator expected')
  const sourceKey = { channel: 'position', time: 0, data_points: [{ x: 0, y: 0, z: 0 }] },
    keys = (keyframes: unknown[]) => ({ animators: { [target]: { type: 'bone', keyframes } } }),
    examples = {
      binding: { animators: { absent: animator } },
      'animator-mode': { animators: { [target]: { ...animator, quaternion_interpolation: true } } },
      channel: keys([{ ...sourceKey, channel: 'custom' }]),
      track: keys([{ ...sourceKey, data_points: [{ x: 'query.time', y: 0, z: 0 }] }]),
      timing: { start_delay: '1' },
      weight: { blend_weight: 'query.time' },
      loop: { loop: 'unknown' },
      duration: { length: 0 },
      'pre-post': keys([
        {
          ...sourceKey,
          data_points: [
            { x: 0, y: 0, z: 0 },
            { x: 1, y: 1, z: 1 },
          ],
        },
      ]),
      metadata: { selected: false },
      unmapped: { custom: { script: 'never_execute()' } },
    } satisfies Record<BbmodelClipProblem['code'], Record<string, unknown>>
  for (const [code, changes] of Object.entries(examples)) {
    const input = bbmodelAnimatedImportFixture({ ...source, animations: [{ ...clip, ...changes }] })
    input.options.clips = { adaptation: 'continuous-sampled', unresolved: 'omit-clip' }
    const ready = directBbmodelImport(input),
      received = readBbmodelImportReply(bbmodelImportReply(input, ready), input)
    if (received.type !== 'result' || received.result.status !== 'ready')
      throw new Error('Ready expected')
    expect(received.result.document.animations).toEqual([])
    expect(received.result.report).toEqual(ready.report)
    const actual = received.result.report.animations?.source[0]
    expect(actual).toMatchObject({ kind: 'omitted', problem: { code } })
    const original = ready.report.animations?.source[0]
    expect(actual).not.toBe(original)
    if (original?.kind !== 'omitted') throw new Error('Omission expected')
    const invalid = {
      ...bbmodelImportReply(input, ready),
      result: {
        ...ready,
        report: {
          ...ready.report,
          animations: {
            ...ready.report.animations,
            source: [{ ...original, problem: { ...original.problem, script: {} } }],
          },
        },
      },
    }
    expect(() => readBbmodelImportReply(invalid, input)).toThrow()
  }
})

test('bbmodel producer and receiver share a combined animation and static report budget', () => {
  const input = bbmodelAnimatedImportFixture()
  input.options.remainder = { animations: 'convert', unmapped: 'discard' }
  const ready = directBbmodelImport(input),
    animationReport = ready.report.animations,
    collector = collectBbmodelConversionReport(ready.report.source),
    issue = {
      stage: 'remainder',
      detail: {
        code: 'unmapped-field-discarded',
        path: 'x'.repeat(BBMODEL_REPORT_LIMITS.pathChars),
      },
    } as const
  if (!animationReport) throw new Error('Animation report expected')
  collector.setAnimations(animationReport)
  for (let index = 0; index < 63; index++) collector.add(issue)
  const report = collector.finish(ready.document)
  expect(readBbmodelImportReply(bbmodelImportReply(input, { ...ready, report }), input).type).toBe(
    'result',
  )
  expect(() => collector.add(issue)).toThrow('O relatório tem textos demais')
  expect(() =>
    readBbmodelImportReply(
      bbmodelImportReply(input, {
        ...ready,
        report: { ...report, issues: [...report.issues, issue] },
      }),
      input,
    ),
  ).toThrow('O relatório tem textos demais')
})
