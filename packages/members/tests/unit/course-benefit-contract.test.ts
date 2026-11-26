import { expect, test } from 'bun:test'
import { CommerceBlockSchema } from '@sistemazero/core/commerce'
import { getSchemaValidator } from 'elysia'
import { LessonBlockContentSchema } from '../../src/interfaces/http/dtos'
import {
  draftCommand,
  parsePublishedLessonBlock,
} from '../../src/interfaces/http/lesson-draft.dtos'

test('benefício e campanha têm o mesmo contrato no editor, na borda e na publicação', () => {
  const validator = getSchemaValidator(LessonBlockContentSchema)
  for (const content of [
    { kind: 'gift', benefitCode: 'vilao-em-aliado-cade' },
    { kind: 'gift', campaignCode: 'campanha-presente' },
    { kind: 'gift' },
    { kind: 'gift', benefitCode: 'vilao-em-aliado-cade', campaignCode: 'campanha-presente' },
  ] as const) {
    const legal = CommerceBlockSchema.safeParse(content).success
    expect(validator.Check(content)).toBe(legal)
    if (legal) {
      expect(parsePublishedLessonBlock(content)).toEqual(content)
      const command = {
        expectedRevision: crypto.randomUUID(),
        operationId: crypto.randomUUID(),
        change: { type: 'block' as const, block: { id: crypto.randomUUID(), content } },
      }
      expect(draftCommand(command as never).change).toMatchObject({ block: { content } })
    }
  }
})
