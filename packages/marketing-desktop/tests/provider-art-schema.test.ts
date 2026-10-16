import { expect, test } from 'bun:test'
import { z } from 'zod'
import { defaultArt } from '@sistemazero/marketing-production/data'
import { canonicalArtProposal, nativeArtProposalSchema } from '../src/main/provider-art-schema'

test('schema nativo exige todas as propriedades, ausência explícita não muda a revisão canônica', () => {
  const inspect = (node: unknown): void => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const value of node) inspect(value)
      return
    }
    const object = z.record(z.string(), z.unknown()).parse(node)
    if (object.type === 'object') {
      expect(object.additionalProperties).toBe(false)
      expect(new Set(z.array(z.string()).parse(object.required))).toEqual(
        new Set(Object.keys(z.record(z.string(), z.unknown()).parse(object.properties))),
      )
    }
    for (const value of Object.values(object)) inspect(value)
  }
  inspect(z.toJSONSchema(nativeArtProposalSchema))
  const native = nativeArtProposalSchema.parse({
    schemaVersion: 1,
    kind: 'art',
    summary: 'Montagem',
    variants: [
      {
        label: 'Versão',
        componentId: '00000000-0000-4000-8000-000000000001',
        composition: { ...defaultArt.composition, designRecipeId: null },
        finalAssetId: null,
        alt: '',
      },
    ],
  })
  expect(canonicalArtProposal(native).variants[0]?.composition).toEqual(defaultArt.composition)
})
