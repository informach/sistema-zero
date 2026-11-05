import type {
  CampaignAuditView,
  CampaignInput,
  CampaignView,
  GiftAudience,
} from '@sistemazero/core/referrals'
import { and, count, desc, eq, ilike, ne, or, sql } from 'drizzle-orm'
import {
  CampaignAudienceLockedError,
  CampaignConflictError,
  type CampaignRecord,
  CampaignValidationError,
} from '../../../domain/campaign'
import { requiresActiveCampaignAmbassador } from '../../../domain/campaign-referral'
import type { CampaignRepository } from '../../../domain/ports/campaign-repository.port'
import type { Database } from './db'
import { escapeLike, isUniqueViolation } from './pg-errors'
import {
  ambassadors,
  campaignHistory,
  campaigns,
  codes,
  conversions,
  scholarshipRedemptions,
} from './schema'

function record(row: typeof campaigns.$inferSelect, code: string): CampaignRecord {
  return {
    ...row,
    code,
    status: row.status as CampaignRecord['status'],
    context: row.context as CampaignRecord['context'],
  }
}

function values(input: CampaignInput) {
  return {
    name: input.name,
    publicTitle: input.publicTitle,
    description: input.description,
    context: input.context,
    status: input.status,
    startsAt: new Date(input.startsAt),
    endsAt: new Date(input.endsAt),
    channel: input.channel,
    schedule: input.schedule ?? null,
    coupon: input.coupon ?? null,
    audience: input.audience ?? 'kids',
    ambassadorId: input.ambassadorId ?? null,
    commissionEnabled: input.commissionEnabled ?? false,
    commissionAmountCents: input.commissionEnabled ? input.commissionAmountCents : null,
    commissionAnnualAmountCents: input.commissionEnabled ? input.commissionAnnualAmountCents : null,
    commissionWindowDays: input.commissionEnabled ? input.commissionWindowDays : null,
  }
}

export class DrizzleCampaignRepository implements CampaignRepository {
  constructor(private readonly db: Database) {}

  async create(
    input: CampaignInput,
    actor: string,
    duplicatedFrom?: string,
  ): Promise<CampaignRecord | null> {
    try {
      return await this.db.transaction(async (tx) => {
        if (input.ambassadorId) {
          const [beneficiary] = await tx
            .select()
            .from(ambassadors)
            .where(eq(ambassadors.id, input.ambassadorId))
            .for('share')
          if (beneficiary?.status !== 'active')
            throw new CampaignValidationError('Escolha um embaixador ativo para a campanha.')
        }
        const [campaign] = await tx.insert(campaigns).values(values(input)).returning()
        if (!campaign) throw new Error('Campanha não criada')
        await tx.insert(codes).values({
          code: input.code,
          ownerKind: 'campaign',
          campaignId: campaign.id,
          displayName: input.publicTitle,
          // O código espelha o público da campanha (leituras por código não dependem do JOIN).
          audience: campaign.audience,
        })
        await tx.insert(campaignHistory).values({
          campaignId: campaign.id,
          actor,
          action: duplicatedFrom ? 'duplicated' : 'created',
          changes: input,
        })
        return record(campaign, input.code)
      })
    } catch (error) {
      if (isUniqueViolation(error)) return null
      throw error
    }
  }

  async update(
    id: string,
    input: CampaignInput,
    actor: string,
    expectedUpdatedAt: string,
  ): Promise<CampaignRecord | null> {
    return this.db.transaction(async (tx) => {
      const [previous] = await tx.select().from(campaigns).where(eq(campaigns.id, id)).for('update')
      if (!previous) return null
      if (previous.updatedAt.toISOString() !== expectedUpdatedAt) throw new CampaignConflictError()
      if (input.ambassadorId && requiresActiveCampaignAmbassador(input, previous)) {
        const [beneficiary] = await tx
          .select()
          .from(ambassadors)
          .where(eq(ambassadors.id, input.ambassadorId))
          .for('share')
        if (beneficiary?.status !== 'active')
          throw new CampaignValidationError('Escolha um embaixador ativo para a campanha.')
      }
      // Conferido de novo sob o lock: o serviço já recusou, mas a publicação pode ter
      // acontecido entre a leitura dele e esta transação.
      const audience = input.audience ?? previous.audience
      if (previous.status !== 'draft' && audience !== previous.audience)
        throw new CampaignAudienceLockedError()
      const [code] = await tx.select().from(codes).where(eq(codes.campaignId, id))
      if (!code) return null
      if (audience !== previous.audience) {
        // Rascunho que já foi publicado (active → draft) pode ter resgates: o público deles
        // não muda, então o da campanha também não.
        const [used] = await tx
          .select({ id: scholarshipRedemptions.id })
          .from(scholarshipRedemptions)
          .where(eq(scholarshipRedemptions.codeId, code.id))
          .limit(1)
        if (used) throw new CampaignAudienceLockedError()
      }
      const [updated] = await tx
        .update(campaigns)
        .set({
          ...values({ ...input, audience }),
          updatedAt: new Date(Math.max(Date.now(), previous.updatedAt.getTime() + 1)),
        })
        .where(eq(campaigns.id, id))
        .returning()
      if (!updated) return null
      await tx
        .update(codes)
        .set({ displayName: input.publicTitle, audience: updated.audience })
        .where(eq(codes.campaignId, id))
      const before = {
        ...record(previous, code.code),
        startsAt: previous.startsAt.toISOString(),
        endsAt: previous.endsAt.toISOString(),
      }
      const changes = Object.fromEntries(
        Object.entries(input).filter(
          ([key, value]) => before[key as keyof typeof before] !== value,
        ),
      ) as Partial<CampaignInput>
      await tx.insert(campaignHistory).values({ campaignId: id, actor, action: 'updated', changes })
      return record(updated, code.code)
    })
  }

  async findById(id: string): Promise<CampaignRecord | null> {
    const [row] = await this.db
      .select({ campaign: campaigns, code: codes.code })
      .from(campaigns)
      .innerJoin(codes, eq(codes.campaignId, campaigns.id))
      .where(eq(campaigns.id, id))
    return row ? record(row.campaign, row.code) : null
  }

  async list(opts: {
    q?: string
    audience?: GiftAudience
    ambassadorId?: string
    publishedOnly?: boolean
    limit: number
    offset: number
  }) {
    const pattern = opts.q?.trim() ? `%${escapeLike(opts.q.trim())}%` : null
    const search = pattern
      ? or(
          ilike(campaigns.name, pattern),
          ilike(campaigns.publicTitle, pattern),
          ilike(codes.code, pattern),
        )
      : undefined
    const filter = and(
      search,
      opts.audience ? eq(campaigns.audience, opts.audience) : undefined,
      opts.ambassadorId ? eq(campaigns.ambassadorId, opts.ambassadorId) : undefined,
      opts.publishedOnly ? ne(campaigns.status, 'draft') : undefined,
    )
    const [rows, totals] = await Promise.all([
      this.db
        .select({ campaign: campaigns, code: codes.code })
        .from(campaigns)
        .innerJoin(codes, eq(codes.campaignId, campaigns.id))
        .where(filter)
        .orderBy(desc(campaigns.createdAt), desc(campaigns.id))
        .limit(opts.limit)
        .offset(opts.offset),
      this.db
        .select({ n: count() })
        .from(campaigns)
        .innerJoin(codes, eq(codes.campaignId, campaigns.id))
        .where(filter),
    ])
    return {
      items: rows.map((row) => record(row.campaign, row.code)),
      total: Number(totals[0]?.n ?? 0),
    }
  }

  async stats(id: string): Promise<CampaignView['stats']> {
    const [row] = await this.db
      .select({
        redemptions: sql<number>`count(distinct ${scholarshipRedemptions.id}) filter (where ${scholarshipRedemptions.status} = 'completed')`,
        pending: sql<number>`count(distinct ${scholarshipRedemptions.id}) filter (where ${scholarshipRedemptions.status} = 'pending')`,
        failed: sql<number>`count(distinct ${scholarshipRedemptions.id}) filter (where ${scholarshipRedemptions.status} = 'failed')`,
        conversions: sql<number>`count(distinct ${conversions.redemptionId}) filter (where ${conversions.status} not in ('canceled', 'superseded'))`,
      })
      .from(codes)
      .leftJoin(scholarshipRedemptions, eq(scholarshipRedemptions.codeId, codes.id))
      .leftJoin(conversions, eq(conversions.redemptionId, scholarshipRedemptions.id))
      .where(and(eq(codes.ownerKind, 'campaign'), eq(codes.campaignId, id)))
    return {
      redemptions: Number(row?.redemptions ?? 0),
      pending: Number(row?.pending ?? 0),
      failed: Number(row?.failed ?? 0),
      conversions: Number(row?.conversions ?? 0),
    }
  }

  async history(id: string): Promise<CampaignAuditView[]> {
    const rows = await this.db
      .select()
      .from(campaignHistory)
      .where(eq(campaignHistory.campaignId, id))
      .orderBy(desc(campaignHistory.createdAt))
      .limit(100)
    return rows.map((row) => ({
      id: row.id,
      action: row.action as CampaignAuditView['action'],
      actor: row.actor,
      changes: row.changes,
      createdAt: row.createdAt.toISOString(),
    }))
  }
}
