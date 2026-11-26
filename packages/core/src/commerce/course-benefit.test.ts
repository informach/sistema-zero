import { expect, test } from 'bun:test'
import { CommerceBlockSchema } from './index'

test('o presente de um curso escolhe um benefício permanente sem campanha', () => {
  expect(CommerceBlockSchema.parse({ kind: 'gift', benefitCode: 'vilao-em-aliado-cade' })).toEqual({
    kind: 'gift',
    benefitCode: 'vilao-em-aliado-cade',
  })
})

test('o presente escolhe exatamente uma origem e mantém as campanhas antigas', () => {
  expect(CommerceBlockSchema.safeParse({ kind: 'gift' }).success).toBe(false)
  expect(
    CommerceBlockSchema.safeParse({
      kind: 'gift',
      campaignCode: 'campanha-valida',
      benefitCode: 'beneficio-valido',
    }).success,
  ).toBe(false)
  expect(
    CommerceBlockSchema.safeParse({ kind: 'gift', campaignCode: 'campanha-valida' }).success,
  ).toBe(true)
  expect(CommerceBlockSchema.safeParse({ kind: 'gift', benefitCode: '' }).success).toBe(false)
})
