import type { CampaignAuditView, CampaignInput, CampaignView } from '@sistemazero/core/referrals'
import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { CampaignConflictError, type CampaignRecord } from '../../../domain/campaign'
import type { CampaignRepository } from '../../../domain/ports/campaign-repository.port'
import type { Database } from './db'
import { escapeLike, isUniqueViolation } from './pg-errors'
import { campaignHistory, campaigns, codes, conversions, scholarshipRedemptions } from './schema'

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
        const [campaign] = await tx.insert(campaigns).values(values(input)).returning()
        if (!campaign) throw new Error('Campanha não criada')
        await tx.insert(codes).values({
          code: input.code,
          ownerKind: 'campaign',
          campaignId: campaign.id,
          displayName: input.publicTitle,
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
      const [code] = await tx.select().from(codes).where(eq(codes.campaignId, id))
      if (!code) return null
      const [updated] = await tx
        .update(campaigns)
        .set({
          ...values(input),
          updatedAt: new Date(Math.max(Date.now(), previous.updatedAt.getTime() + 1)),
        })
        .where(eq(campaigns.id, id))
        .returning()
      if (!updated) return null
      await tx.update(codes).set({ displayName: input.publicTitle }).where(eq(codes.campaignId, id))
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

  async list(opts: { q?: string; limit: number; offset: number }) {
    const pattern = opts.q?.trim() ? `%${escapeLike(opts.q.trim())}%` : null
    const filter = pattern
      ? or(
          ilike(campaigns.name, pattern),
          ilike(campaigns.publicTitle, pattern),
          ilike(codes.code, pattern),
        )
      : undefined
    const [rows, totals] = await Promise.all([
      this.db
        .select({ campaign: campaigns, code: codes.code })
        .from(campaigns)
        .innerJoin(codes, eq(codes.campaignId, campaigns.id))
        .where(filter)
        .orderBy(desc(campaigns.createdAt))
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
        conversions: sql<number>`count(distinct ${conversions.redemptionId}) filter (where ${conversions.status} = 'unrewarded')`,
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
