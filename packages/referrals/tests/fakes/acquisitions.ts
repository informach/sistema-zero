import { randomUUID } from 'node:crypto'
import type { GiftAudience } from '@sistemazero/core/referrals'
import type { AcquisitionRecord, NewAcquisition } from '../../src/domain/acquisition'
import type { AcquisitionRepository } from '../../src/domain/ports/acquisition-repository.port'
import type { InMemoryReferralRepository } from './in-memory'

/** Espelho em memória das regras do repositório Drizzle (UNIQUEs por pagamento e resgate). */
export class InMemoryAcquisitionRepository implements AcquisitionRepository {
  constructor(private readonly referrals: InMemoryReferralRepository) {}

  get items(): AcquisitionRecord[] {
    return this.referrals.acquisitions
  }

  async insert(input: NewAcquisition) {
    const existing = this.items.find(
      (a) =>
        (input.paymentId !== null && a.paymentId === input.paymentId) ||
        (input.redemptionId !== null && a.redemptionId === input.redemptionId),
    )
    if (existing) return { created: false, acquisition: existing }
    if (input.kind === 'gift' ? !input.redemptionId : !input.paymentId)
      throw new Error('acquisitions_source_check')
    const acquisition: AcquisitionRecord = {
      ...input,
      offerSlug: input.offerSlug ?? null,
      email: input.email.trim().toLowerCase(),
      id: randomUUID(),
      status: 'active',
      createdAt: new Date(),
    }
    this.items.push(acquisition)
    return { created: true, acquisition }
  }

  async findByPayment(paymentId: string) {
    return this.items.find((a) => a.paymentId === paymentId) ?? null
  }

  async hasSubscription(subscriptionId: string) {
    return this.items.some((a) => a.subscriptionId === subscriptionId)
  }

  async markRefundedByPayment(paymentId: string) {
    const found = this.items.find((a) => a.paymentId === paymentId)
    if (!found) return null
    found.status = 'refunded'
    return found
  }

  async listActiveForPerson(input: {
    email: string
    accountUserId?: string | null
    audience: GiftAudience
  }) {
    const email = input.email.trim().toLowerCase()
    return this.items
      .filter(
        (a) =>
          a.audience === input.audience &&
          a.status === 'active' &&
          (a.email === email || (!!input.accountUserId && a.accountUserId === input.accountUserId)),
      )
      .sort(
        (a, b) =>
          a.acquiredAt.getTime() - b.acquiredAt.getTime() ||
          a.createdAt.getTime() - b.createdAt.getTime(),
      )
  }

  async listCompletedRedemptionsWithoutAcquisition(limit: number) {
    return this.referrals.redemptions
      .filter((r) => r.status === 'completed' && !this.items.some((a) => a.redemptionId === r.id))
      .slice(0, limit)
      .flatMap((redemption) => {
        const code = this.referrals.codes.find((c) => c.id === redemption.codeId)
        return code ? [{ redemption, code }] : []
      })
  }

  async listMissingOfferSlug(limit: number) {
    return this.items
      .filter((a) => a.offerSlug === null && a.offerId !== null)
      .slice(0, limit)
      .map((a) => ({ id: a.id, offerId: a.offerId as string }))
  }

  async setOfferSlug(id: string, offerSlug: string, asSubscription = false) {
    const found = this.items.find((a) => a.id === id)
    if (!found || found.offerSlug !== null) return
    found.offerSlug = offerSlug
    if (asSubscription && found.kind === 'one_time') found.kind = 'subscription'
  }

  private sorted(list: AcquisitionRecord[]) {
    return list
      .slice()
      .sort(
        (a, b) =>
          a.acquiredAt.getTime() - b.acquiredAt.getTime() ||
          a.createdAt.getTime() - b.createdAt.getTime(),
      )
  }

  async listByCampaigns(campaignIds: string[]) {
    return this.sorted(this.items.filter((a) => a.campaignId && campaignIds.includes(a.campaignId)))
  }

  async listByAmbassadors(ambassadorIds: string[]) {
    return this.sorted(
      this.items.filter((a) => a.ambassadorId && ambassadorIds.includes(a.ambassadorId)),
    )
  }

  async listInPeriod(input: { audience?: GiftAudience; from: Date; to: Date }) {
    return this.sorted(
      this.items.filter(
        (a) =>
          (!input.audience || a.audience === input.audience) &&
          a.acquiredAt >= input.from &&
          a.acquiredAt < input.to,
      ),
    )
  }

  async listForEmails(audience: GiftAudience, emails: string[]) {
    return this.sorted(
      this.items.filter((a) => a.audience === audience && emails.includes(a.email)),
    )
  }

  async listByEmail(email: string) {
    const normalized = email.trim().toLowerCase()
    return this.sorted(this.items.filter((a) => a.email === normalized))
  }
}
