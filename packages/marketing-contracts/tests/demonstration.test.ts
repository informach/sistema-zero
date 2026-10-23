import { expect, test } from 'bun:test'
import { clipSchema, demonstrationSchema, videoAssetIds, videoSchema } from '../src'

const id = () => crypto.randomUUID()
const source = () => ({
  id: id(),
  assetId: id(),
  sha256: 'a'.repeat(64),
  width: 800,
  height: 600,
  evidenceId: id(),
  evidenceRevisionId: id(),
  label: 'Estado observado',
  focus: { x: 0.2, y: 0.3, width: 0.25, height: 0.2 },
})

test('receitas exigem fontes na quantidade correta e foco dentro da imagem', () => {
  const detail = {
    schemaVersion: 1,
    recipeId: 'detail-context-v1',
    headline: 'Uma decisão',
    sources: [source()],
  }
  expect(demonstrationSchema.safeParse(detail).success).toBe(true)
  expect(demonstrationSchema.safeParse({ ...detail, recipeId: 'before-after-v1' }).success).toBe(
    false,
  )
  expect(demonstrationSchema.safeParse({ ...detail, recipeId: 'unavailable-v2' }).success).toBe(
    false,
  )
  expect(
    demonstrationSchema.safeParse({
      ...detail,
      sources: [{ ...source(), focus: { x: 0.9, y: 0, width: 0.2, height: 1 } }],
    }).success,
  ).toBe(false)
  expect(
    demonstrationSchema.safeParse({
      ...detail,
      sources: [{ ...source(), assetId: 'C:/arquivo.png' }],
    }).success,
  ).toBe(false)
  const duplicate = source()
  expect(
    demonstrationSchema.safeParse({
      ...detail,
      recipeId: 'rule-result-v1',
      sources: [duplicate, duplicate],
    }).success,
  ).toBe(false)
})

test('demonstração conserva mídia secundária e só pertence a uma cena de imagens reais', () => {
  const sources = [source(), source()]
  const demonstration = demonstrationSchema.parse({
    schemaVersion: 1,
    recipeId: 'before-after-v1',
    headline: 'Uma mudança para testar',
    sources,
  })
  const trackId = id()
  const clip = clipSchema.parse({
    id: id(),
    trackId,
    kind: 'image',
    assetId: sources[0]?.assetId,
    demonstration,
    startFrame: 0,
    durationInFrames: 120,
    fit: 'contain',
  })
  const timeline = videoSchema.parse({
    schemaVersion: 1,
    recipeVersion: 'marketing-timeline-v1',
    width: 1080,
    height: 1350,
    fps: { numerator: 30000, denominator: 1001 },
    durationInFrames: 120,
    tracks: [{ id: trackId, kind: 'visual' }],
    clips: [clip],
    captions: [],
    background: '#172a46',
    accent: '#ffdb56',
  })
  expect(videoAssetIds(timeline)).toEqual(sources.map((entry) => entry.assetId))
  expect(clipSchema.safeParse({ ...clip, kind: 'video' }).success).toBe(false)
  expect(clipSchema.safeParse({ ...clip, assetId: id() }).success).toBe(false)
  expect(clipSchema.safeParse({ ...clip, effect: 'zoom' }).success).toBe(false)
})
