import { randomUUID } from 'node:crypto'
import type { CampaignAuditView, CampaignInput, CampaignView } from '@sistemazero/core/referrals'
import { CampaignConflictError, type CampaignRecord } from '../../src/domain/campaign'
import type { CampaignRepository } from '../../src/domain/ports/campaign-repository.port'
import type { InMemoryReferralRepository } from './in-memory'

export class InMemoryCampaignRepository implements CampaignRepository {
  items: CampaignRecord[] = []
  audits = new Map<string, CampaignAuditView[]>()
  constructor(private readonly referrals: InMemoryReferralRepository) {}
  async create(input: CampaignInput, actor: string, duplicatedFrom?: string) {
    if (this.referrals.codes.some((code) => code.code === input.code)) return null
    const value: CampaignRecord = {
      ...input,
      id: randomUUID(),
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.items.push(value)
    this.referrals.codes.push({
      id: randomUUID(),
      code: input.code,
      ownerKind: 'campaign',
      campaignId: value.id,
      ambassadorId: null,
      accountUserId: null,
      ownerEmail: null,
      displayName: input.publicTitle,
      status: 'active',
      createdAt: new Date(),
    })
    this.audits.set(value.id, [
      {
        id: randomUUID(),
        action: duplicatedFrom ? 'duplicated' : 'created',
        actor,
        changes: input,
        createdAt: new Date().toISOString(),
      },
    ])
    return value
  }
  async update(id: string, input: CampaignInput, actor: string, expectedUpdatedAt: string) {
    const value = this.items.find((item) => item.id === id)
    if (!value) return null
    if (value.updatedAt.toISOString() !== expectedUpdatedAt) throw new CampaignConflictError()
    Object.assign(value, input, {
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      updatedAt: new Date(Math.max(Date.now(), value.updatedAt.getTime() + 1)),
    })
    const code = this.referrals.codes.find((item) => item.campaignId === id)
    if (code) code.displayName = input.publicTitle
    this.audits.get(id)?.unshift({
      id: randomUUID(),
      action: 'updated',
      actor,
      changes: input,
      createdAt: new Date().toISOString(),
    })
    return value
  }
  async findById(id: string) {
    return this.items.find((item) => item.id === id) ?? null
  }
  async list(opts: { q?: string; limit: number; offset: number }) {
    const items = this.items.filter(
      (item) => !opts.q || `${item.name} ${item.publicTitle} ${item.code}`.includes(opts.q),
    )
    return { items: items.slice(opts.offset, opts.offset + opts.limit), total: items.length }
  }
  async stats(id: string): Promise<CampaignView['stats']> {
    const code = this.referrals.codes.find((item) => item.campaignId === id)
    const rows = this.referrals.redemptions.filter((item) => item.codeId === code?.id)
    return {
      redemptions: rows.filter((r) => r.status === 'completed').length,
      pending: rows.filter((r) => r.status === 'pending').length,
      failed: rows.filter((r) => r.status === 'failed').length,
      conversions: this.referrals.conversions.filter(
        (c) => c.codeId === code?.id && c.status === 'unrewarded',
      ).length,
    }
  }
  async history(id: string) {
    return this.audits.get(id) ?? []
  }
}
