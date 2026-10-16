import { expect, test } from 'bun:test'
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
