import { expect, test } from 'bun:test'
import { clipSchema, demonstrationSchema } from '@sistemazero/marketing-contracts'
import { defaultTimeline } from '@sistemazero/marketing-production/data'
import { z } from 'zod'
import {
  canonicalVideoProposal,
  nativeVideoProposalSchema,
} from '../src/main/provider-video-schema'

test('JSON estruturado nativo de vídeo não omite propriedades e conserva a montagem canônica', () => {
  function inspect(node: unknown): void {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const item of node) inspect(item)
      return
    }
    const object = z.record(z.string(), z.unknown()).parse(node)
    if (object.type === 'object') {
      expect(object.additionalProperties).toBe(false)
      expect(new Set(z.array(z.string()).parse(object.required))).toEqual(
        new Set(Object.keys(z.record(z.string(), z.unknown()).parse(object.properties))),
      )
    }
    for (const item of Object.values(object)) inspect(item)
  }
  inspect(z.toJSONSchema(nativeVideoProposalSchema))
  const native = nativeVideoProposalSchema.parse({
    schemaVersion: 1,
    kind: 'video',
    summary: 'Montagem',
    variants: [
      {
        label: 'Versão',
        videoId: crypto.randomUUID(),
        finalAssetId: null,
        timeline: { ...defaultTimeline.timeline, fontAssetId: null },
      },
    ],
  })
  expect(canonicalVideoProposal(native).variants[0]?.timeline).toEqual(defaultTimeline.timeline)
})

test('transporte nativo conserva demonstração e remove null sem alterar os IDs ou hashes', () => {
  const id = () => crypto.randomUUID()
  const demonstration = demonstrationSchema.parse({
    schemaVersion: 1,
    recipeId: 'detail-context-v1',
    headline: 'Um detalhe real',
    sources: [
      {
        id: id(),
        assetId: id(),
        sha256: 'a'.repeat(64),
        width: 800,
        height: 600,
        evidenceId: id(),
        evidenceRevisionId: id(),
        label: 'Fonte',
        focus: { x: 0, y: 0, width: 1, height: 1 },
      },
    ],
  })
  const trackId = defaultTimeline.timeline.tracks[0]?.id
  const clip = clipSchema.parse({
    id: id(),
    trackId,
    kind: 'image',
    assetId: demonstration.sources[0]?.assetId,
    demonstration,
    fit: 'contain',
    startFrame: 0,
    durationInFrames: 150,
  })
  const proposal = nativeVideoProposalSchema.parse({
    schemaVersion: 1,
    kind: 'video',
    summary: 'Receita',
    variants: [
      {
        label: 'Versão',
        videoId: id(),
        finalAssetId: null,
        timeline: {
          ...defaultTimeline.timeline,
          fontAssetId: null,
          clips: [
            { ...clip, art: null, text: null, counter: null, listItems: null, showCaptions: null },
          ],
        },
      },
    ],
  })
  expect(canonicalVideoProposal(proposal).variants[0]?.timeline.clips[0]).toEqual(clip)
})
