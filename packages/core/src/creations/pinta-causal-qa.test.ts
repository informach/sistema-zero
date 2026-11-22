import { expect, test } from 'bun:test'
import { parsePintaCausalQaProfiles, pintaCausalQaAllows } from './pinta-causal'

const accountId = '11111111-1111-4111-8111-111111111111'
const userId = '22222222-2222-4222-8222-222222222222'
const stranger = '33333333-3333-4333-8333-333333333333'
const student = { audience: 'kids', accountId, userId } as const
const adult = { audience: 'adult', accountId, userId: accountId } as const

test('private Pinta candidates match the exact account, authenticated profile and audience', () => {
  const profiles = parsePintaCausalQaProfiles(JSON.stringify([student, adult]))
  expect(pintaCausalQaAllows(profiles, student)).toBe(true)
  expect(pintaCausalQaAllows(profiles, adult)).toBe(true)
  expect(pintaCausalQaAllows(profiles, { ...student, accountId: stranger })).toBe(false)
  expect(pintaCausalQaAllows(profiles, { ...student, userId: stranger })).toBe(false)
  expect(pintaCausalQaAllows(profiles, { ...adult, audience: 'kids' })).toBe(false)
})

test('missing or invalid QA configuration fails closed even beside an otherwise valid entry', () => {
  for (const configuration of [
    undefined,
    '',
    '[',
    JSON.stringify(student),
    JSON.stringify([student, { ...adult, userId }]),
    JSON.stringify([student, { ...student, privileged: true }]),
    JSON.stringify([student, { ...student, userId: '*' }]),
  ]) {
    const profiles = parsePintaCausalQaProfiles(configuration)
    expect(profiles).toEqual([])
    expect(pintaCausalQaAllows(profiles, student)).toBe(false)
  }
})
