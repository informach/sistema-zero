import { expect, test } from 'bun:test'
import type { CourseBenefitClaimSource } from '@sistemazero/core/referrals'
import { captureCourseBenefitContext } from '../../src/application/redeem-scholarship/course-benefit-context'
import type { AcquisitionRecord } from '../../src/domain/acquisition'
import type { CourseBenefitRecord } from '../../src/domain/ports/course-benefit-repository.port'

const benefit: CourseBenefitRecord = {
  id: crypto.randomUUID(),
  codeId: crypto.randomUUID(),
  code: 'guia-cade',
  name: 'Cadê no guia',
  audience: 'kids',
  courseSlug: 'guia',
  giftOfferId: crypto.randomUUID(),
  status: 'active',
  createdAt: new Date(),
}
const baseSource: CourseBenefitClaimSource = {
  courseSlug: 'guia',
  lessonId: crypto.randomUUID(),
  blockId: crypto.randomUUID(),
  accessSource: {
    entitlementId: crypto.randomUUID(),
    sourceKind: 'payment',
    sourceId: 'pay-actual',
    subscriptionId: null,
  },
}
function row(patch: Partial<AcquisitionRecord> = {}): AcquisitionRecord {
  return {
    id: crypto.randomUUID(),
    email: 'parent@example.test',
    accountUserId: crypto.randomUUID(),
    audience: 'kids',
    kind: 'one_time',
    offerId: null,
    offerSlug: 'guia-venda',
    amountCents: 2700n,
    paymentId: 'pay-actual',
    subscriptionId: null,
    redemptionId: null,
    originKind: 'campaign',
    codeId: null,
    campaignId: 'campaign',
    ambassadorId: null,
    place: null,
    utm: null,
    bonusTerms: null,
    status: 'active',
    acquiredAt: new Date('2026-11-20T10:00:00Z'),
    createdAt: new Date(),
    ...patch,
  }
}
async function capture(rows: AcquisitionRecord[], source = baseSource) {
  return captureCourseBenefitContext({
    benefit,
    source,
    account: { userId: crypto.randomUUID(), email: 'parent@example.test' },
    acquisitions: { listActiveForPerson: async () => rows },
    campaigns: { findById: async () => ({ name: 'Palestra real' }) as never },
    referrals: { findAmbassadorById: async () => ({ name: 'Vivianne' }) as never },
  })
}
test('usa o pagamento que abriu a aula; não herda o primeiro contato nem a outra compra', async () => {
  const actual = row()
  const context = await capture([
    row({ paymentId: 'other', originKind: 'ambassador', ambassadorId: 'other' }),
    actual,
  ])
  expect(context.accessOrigin).toMatchObject({
    acquisitionId: actual.id,
    originKind: 'campaign',
    campaignTitle: 'Palestra real',
  })
  expect(context.benefitId).toBe(benefit.id)
  expect(context.accessOrigin?.ambassadorId).toBeNull()
})
test('liga uma matrícula de presente ao resgate exato e guarda o embaixador separadamente', async () => {
  const parent = row({
    paymentId: null,
    redemptionId: 'redeemed-guide',
    kind: 'gift',
    originKind: 'ambassador',
    campaignId: null,
    ambassadorId: 'vivianne',
  })
  const context = await capture([parent], {
    ...baseSource,
    accessSource: {
      ...baseSource.accessSource,
      sourceKind: 'manual',
      sourceId: 'scholarship:redeemed-guide',
    },
  })
  expect(context.accessOrigin).toMatchObject({
    acquisitionId: parent.id,
    originKind: 'ambassador',
    ambassadorName: 'Vivianne',
  })
})
test('liga a matrícula de assinatura à assinatura correspondente', async () => {
  const parent = row({ subscriptionId: 'sub-actual', originKind: 'platform', campaignId: null })
  const context = await capture([parent], {
    ...baseSource,
    accessSource: {
      ...baseSource.accessSource,
      sourceKind: 'subscription',
      sourceId: 'invoice',
      subscriptionId: 'sub-actual',
    },
  })
  expect(context.accessOrigin?.acquisitionId).toBe(parent.id)
})
test('referência ausente permanece desconhecida, mesmo com outras aquisições da pessoa', async () => {
  expect((await capture([row({ paymentId: 'another' })])).accessOrigin).toBeNull()
  expect(
    (
      await capture([row()], {
        ...baseSource,
        accessSource: { ...baseSource.accessSource, sourceKind: 'manual', sourceId: 'staff' },
      })
    ).accessOrigin,
  ).toBeNull()
})
