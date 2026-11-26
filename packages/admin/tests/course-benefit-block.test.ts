import { expect, test } from 'bun:test'
import { CommerceBlockSchema } from '@sistemazero/core/commerce'
import { buildContent, EMPTY_BLOCK, validateBlock } from '../src/lib/lesson-block-form'

test('salvar benefício do curso conserva benefitCode e não cria uma campanha vazia', () => {
  const form = {
    ...EMPTY_BLOCK,
    kind: 'gift' as const,
    commerceBenefitCode: 'vilao-em-aliado-cade',
  }
  expect(validateBlock(form)).toBeNull()
  const content = buildContent(form)
  expect(content).toEqual({ kind: 'gift', benefitCode: 'vilao-em-aliado-cade' })
  expect(CommerceBlockSchema.safeParse(content).success).toBe(true)
})
