import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  applyTimelineOperations,
  canonicalJson,
  captionsForClip,
  clipSchema,
  counterText,
  measurementSchema,
  videoSchema,
} from '../src'

const trackId = randomUUID(),
  assetId = randomUUID(),
  clipId = randomUUID()
const video = videoSchema.parse({
  schemaVersion: 1,
  recipeVersion: 'marketing-timeline-v1',
  width: 1080,
  height: 1920,
  fps: { numerator: 30000, denominator: 1001 },
  durationInFrames: 300,
  tracks: [{ id: trackId, kind: 'visual' }],
  clips: [
    {
      id: clipId,
      trackId,
      assetId,
      kind: 'video',
      startFrame: 0,
      durationInFrames: 300,
      sourceStartMs: 1000,
      playbackRate: 2,
    },
  ],
  captions: [{ id: randomUUID(), assetId, startMs: 1000, endMs: 3000, text: 'Olá' }],
  background: '#000000',
  accent: '#ffffff',
})
test('divisão conserva o tempo da origem com FPS racional e velocidade', () => {
  const split = applyTimelineOperations(video, [
    { type: 'split', clipId, atFrame: 100, newClipId: randomUUID() },
  ])
  expect(split.clips[1]?.sourceStartMs).toBeCloseTo(7673.3333, 3)
  expect(split.clips[1]?.startFrame).toBe(100)
  expect(video.clips).toHaveLength(1)
  const first = video.clips[0]
  if (!first) throw new Error('Fixture sem clipe')
  expect(captionsForClip(video, first)[0]?.durationInFrames).toBe(30)
})
test('edição inválida ou de clipe protegido não altera o original', () => {
  expect(() =>
    applyTimelineOperations(video, [{ type: 'duration', durationInFrames: 10 }]),
  ).toThrow()
  const protectedVideo = structuredClone(video)
  if (protectedVideo.clips[0]) protectedVideo.clips[0].protected = true
  expect(() => applyTimelineOperations(protectedVideo, [{ type: 'remove', clipId }])).toThrow(
    'protegido',
  )
  expect(video.durationInFrames).toBe(300)
})
test('legendas contíguas não aparecem antes da fala nem se sobrepõem em FPS racional', () => {
  const clip = video.clips[0]
  if (!clip) throw new Error('Clipe ausente')
  const changed = {
    ...video,
    captions: [
      { id: randomUUID(), assetId, startMs: 1000, endMs: 2500, text: 'Primeira', corrected: false },
      { id: randomUUID(), assetId, startMs: 2500, endMs: 3500, text: 'Segunda', corrected: false },
    ],
  }
  const [first, second] = captionsForClip(changed, clip)
  if (!first || !second) throw new Error('Legendas ausentes')
  expect(first.from + first.durationInFrames).toBe(second.from)
  expect(second.from).toBe(23)
})
test('contador tem extremos exatos em qualquer quadro e parâmetros incompatíveis são recusados', () => {
  const counter = clipSchema.parse({
    id: randomUUID(),
    trackId,
    kind: 'text',
    text: 'Etapas da criação',
    startFrame: 0,
    durationInFrames: 31,
    effect: 'counter',
    counter: { from: 0, to: 3, decimals: 1, prefix: '', suffix: ' etapas' },
  })
  expect(counterText(counter, -1)).toBe('0,0 etapas')
  expect(counterText(counter, 15)).toBe('1,5 etapas')
  expect(counterText(counter, 30)).toBe('3,0 etapas')
  expect(counterText(counter, 100)).toBe('3,0 etapas')
  expect(clipSchema.safeParse({ ...counter, effect: 'none' }).success).toBe(false)
  expect(clipSchema.safeParse({ ...counter, kind: 'image', assetId }).success).toBe(false)
  expect(
    clipSchema.safeParse({
      ...counter,
      counter: undefined,
      effect: 'list',
      listItems: ['Planejar', 'Criar', 'Testar'].map((text) => ({ id: randomUUID(), text })),
    }).success,
  ).toBe(true)
  expect(
    clipSchema.safeParse({ ...counter, counter: undefined, effect: 'list', listItems: [] }).success,
  ).toBe(false)
})

test('métrica ausente não pode se passar por zero observado', () => {
  expect(
    measurementSchema.safeParse({
      value: 0,
      availability: 'unavailable',
      denominator: null,
      definition: 'views',
    }).success,
  ).toBe(false)
  expect(
    measurementSchema.safeParse({
      value: null,
      availability: 'unavailable',
      denominator: null,
      definition: 'views',
    }).success,
  ).toBe(true)
})
test('hash canônico independe da ordem de campos mas preserva ordem de componentes', () => {
  expect(canonicalJson({ b: 2, a: [1, 2] })).toBe(canonicalJson({ a: [1, 2], b: 2 }))
  expect(canonicalJson({ a: [2, 1], b: 2 })).not.toBe(canonicalJson({ a: [1, 2], b: 2 }))
})
