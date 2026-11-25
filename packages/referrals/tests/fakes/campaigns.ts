import { randomUUID } from 'node:crypto'
import type {
  CampaignAuditView,
  CampaignInput,
  CampaignView,
  GiftAudience,
} from '@sistemazero/core/referrals'
import {
  CampaignAudienceLockedError,
  CampaignConflictError,
  CampaignGiftOfferLockedError,
  CampaignKindLockedError,
  type CampaignRecord,
  CampaignRedirectTakenError,
} from '../../src/domain/campaign'
import type { CampaignRepository } from '../../src/domain/ports/campaign-repository.port'
import type { InMemoryReferralRepository } from './in-memory'

export class InMemoryCampaignRepository implements CampaignRepository {
  items: CampaignRecord[] = []
  audits = new Map<string, CampaignAuditView[]>()
  constructor(private readonly referrals: InMemoryReferralRepository) {}
  async create(input: CampaignInput, actor: string, duplicatedFrom?: string) {
    if (this.referrals.codes.some((code) => code.code === input.code)) return null
    this.assertRedirectFree(input.redirectPath ?? null, null)
    const kind = input.kind ?? 'gift'
    const value: CampaignRecord = {
      ...input,
      audience: input.audience ?? 'kids',
      kind,
      giftOfferId: kind === 'sale' ? null : (input.giftOfferId ?? null),
      saleOfferId: kind === 'sale' ? (input.saleOfferId ?? null) : null,
      linkTarget: kind === 'sale' ? (input.linkTarget ?? 'page') : 'page',
      redirectPath: input.redirectPath ?? null,
      redirectUntil:
        input.redirectPath && input.redirectUntil ? new Date(input.redirectUntil) : null,
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
      audience: value.audience,
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
    const audience = input.audience ?? value.audience
    if (value.status !== 'draft' && audience !== value.audience)
      throw new CampaignAudienceLockedError()
    const ownCode = this.referrals.codes.find((item) => item.campaignId === id)
    if (
      audience !== value.audience &&
      this.referrals.redemptions.some((r) => r.codeId === ownCode?.id)
    )
      throw new CampaignAudienceLockedError()
    // Oferta: espelha a régua do repositório Drizzle (omitida conserva; troca só em rascunho
    // sem cadastros).
    const giftOfferId =
      input.giftOfferId === undefined ? (value.giftOfferId ?? null) : input.giftOfferId
    if (value.giftOfferId && giftOfferId !== value.giftOfferId) {
      if (value.status !== 'draft') throw new CampaignGiftOfferLockedError()
      if (this.referrals.redemptions.some((r) => r.codeId === ownCode?.id))
        throw new CampaignGiftOfferLockedError()
    }
    const kind = input.kind ?? value.kind
    const used =
      this.referrals.redemptions.some((r) => r.codeId === ownCode?.id) ||
      (await this.hasAcquisitions(id))
    if (kind !== value.kind && (value.status !== 'draft' || used))
      throw new CampaignKindLockedError()
    const saleOfferId = input.saleOfferId === undefined ? value.saleOfferId : input.saleOfferId
    if (
      value.saleOfferId &&
      saleOfferId !== value.saleOfferId &&
      (value.status !== 'draft' || used)
    )
      throw new CampaignGiftOfferLockedError()
    const redirectPath = input.redirectPath === undefined ? value.redirectPath : input.redirectPath
    const redirectUntil =
      input.redirectUntil === undefined
        ? value.redirectUntil
        : input.redirectUntil
          ? new Date(input.redirectUntil)
          : null
    this.assertRedirectFree(redirectPath ?? null, id)
    Object.assign(value, input, {
      audience,
      kind,
      giftOfferId: kind === 'sale' ? null : giftOfferId,
      saleOfferId: kind === 'sale' ? saleOfferId : null,
      linkTarget: kind === 'sale' ? (input.linkTarget ?? value.linkTarget) : 'page',
      redirectPath: redirectPath ?? null,
      redirectUntil: redirectPath ? redirectUntil : null,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      updatedAt: new Date(Math.max(Date.now(), value.updatedAt.getTime() + 1)),
    })
    const code = this.referrals.codes.find((item) => item.campaignId === id)
    if (code) {
      code.displayName = input.publicTitle
      code.audience = audience
    }
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
  async findByRedirectPath(path: string) {
    return this.items.find((item) => item.redirectPath === path) ?? null
  }
  async list(opts: {
    q?: string
    audience?: GiftAudience
    ambassadorId?: string
    publishedOnly?: boolean
    limit: number
    offset: number
  }) {
    const items = this.items.filter(
      (item) =>
        (!opts.ambassadorId || item.ambassadorId === opts.ambassadorId) &&
        (!opts.publishedOnly || item.status !== 'draft') &&
        (!opts.audience || item.audience === opts.audience) &&
        (!opts.q || `${item.name} ${item.publicTitle} ${item.code}`.includes(opts.q)),
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
        (c) => c.codeId === code?.id && c.status !== 'canceled' && c.status !== 'superseded',
      ).length,
    }
  }
  async history(id: string) {
    return this.audits.get(id) ?? []
  }
  async hasAcquisitions(id: string) {
    return this.referrals.acquisitions.some((a) => a.campaignId === id)
  }
  /** Espelha o UNIQUE `campaigns_redirect_path_uq`, soltando o caminho cujo prazo passou. */
  private assertRedirectFree(path: string | null, keepId: string | null) {
    if (!path) return
    for (const other of this.items) {
      if (other.id === keepId || other.redirectPath !== path) continue
      if (other.redirectUntil && other.redirectUntil.getTime() <= Date.now()) {
        other.redirectPath = null
        other.redirectUntil = null
        continue
      }
      throw new CampaignRedirectTakenError()
    }
  }
}
