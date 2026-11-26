import { expect, test } from 'bun:test'
import { giftBonusTerms, originFromCode } from '../../src/domain/acquisition'

const code = {
  id: '11111111-1111-4111-8111-111111111111',
  ownerKind: 'benefit' as const,
  campaignId: null,
  ambassadorId: null,
  ownerEmail: null,
}

test('benefício do curso tem origem própria, sem atribuir o resgate à origem anterior', () => {
  expect(originFromCode(code, { place: 'course_benefit' })).toEqual({
    originKind: 'course',
    codeId: code.id,
    campaignId: null,
    ambassadorId: null,
    place: 'course_benefit',
    utm: null,
  })
})

test('o benefício do curso não cria acordo automático de comissão', () => {
  expect(
    giftBonusTerms({ campaignReferral: null, bonusAmounts: null }, code, {
      amounts: { monthly: 3000, annual: 8000 },
      legacyCents: 3000,
      windowDays: 45,
    }),
  ).toBeNull()
})
