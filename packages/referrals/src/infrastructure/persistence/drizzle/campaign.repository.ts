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
  CampaignGiftOfferLockedError,
  CampaignKindLockedError,
  type CampaignRecord,
  CampaignRedirectTakenError,
  CampaignValidationError,
} from '../../../domain/campaign'
import { requiresActiveCampaignAmbassador } from '../../../domain/campaign-referral'
import type { CampaignRepository } from '../../../domain/ports/campaign-repository.port'
import type { Database } from './db'
import { escapeLike, isUniqueViolation, uniqueConstraintName } from './pg-errors'
import {
  acquisitions,
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
    kind: row.kind as CampaignRecord['kind'],
    linkTarget: row.linkTarget as CampaignRecord['linkTarget'],
  }
}

/** O UNIQUE do endereço antigo vira mensagem própria (não "código já existe"). */
function redirectTaken(error: unknown): boolean {
  return uniqueConstraintName(error) === 'campaigns_redirect_path_uq'
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
    kind: input.kind ?? 'gift',
    // Venda não dá presente e presente não vende (CHECK `campaigns_kind_offer_check`).
    giftOfferId: (input.kind ?? 'gift') === 'sale' ? null : (input.giftOfferId ?? null),
    saleOfferId: input.kind === 'sale' ? (input.saleOfferId ?? null) : null,
    linkTarget: input.kind === 'sale' ? (input.linkTarget ?? 'page') : 'page',
    redirectPath: input.redirectPath ?? null,
    redirectUntil: input.redirectPath && input.redirectUntil ? new Date(input.redirectUntil) : null,
    ambassadorId: input.ambassadorId ?? null,
    commissionEnabled: input.commissionEnabled ?? false,
    commissionAmountCents: input.commissionEnabled ? input.commissionAmountCents : null,
    commissionAnnualAmountCents: input.commissionEnabled ? input.commissionAnnualAmountCents : null,
    commissionWindowDays: input.commissionEnabled ? input.commissionWindowDays : null,
  }
}

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0]

/**
 * Endereço antigo cujo prazo passou não segura mais o UNIQUE: é solto antes de gravar outra
 * campanha com o mesmo caminho (senão ficaria preso para sempre).
 */
async function releaseExpiredRedirect(tx: Tx, path: string | null, keepId: string | null) {
  if (!path) return
  await tx
    .update(campaigns)
    .set({ redirectPath: null, redirectUntil: null })
    .where(
      and(
        eq(campaigns.redirectPath, path),
        sql`${campaigns.redirectUntil} <= now()`,
        keepId ? ne(campaigns.id, keepId) : undefined,
      ),
    )
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
        await releaseExpiredRedirect(tx, input.redirectPath ?? null, null)
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
      if (redirectTaken(error)) throw new CampaignRedirectTakenError()
      if (isUniqueViolation(error)) return null
      throw error
    }
  }

  async hasAcquisitions(id: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: acquisitions.id })
      .from(acquisitions)
      .where(eq(acquisitions.campaignId, id))
      .limit(1)
    return Boolean(row)
  }

  async update(
    id: string,
    input: CampaignInput,
    actor: string,
    expectedUpdatedAt: string,
  ): Promise<CampaignRecord | null> {
    try {
      return await this.updateInTransaction(id, input, actor, expectedUpdatedAt)
    } catch (error) {
      if (redirectTaken(error)) throw new CampaignRedirectTakenError()
      throw error
    }
  }

  private updateInTransaction(
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
      // Oferta: omitida conserva a gravada; trocar uma oferta já ligada segue a régua do público.
      const giftOfferId = input.giftOfferId === undefined ? previous.giftOfferId : input.giftOfferId
      const giftOfferChanged = previous.giftOfferId !== null && giftOfferId !== previous.giftOfferId
      if (previous.status !== 'draft' && giftOfferChanged) throw new CampaignGiftOfferLockedError()
      const kind = input.kind ?? previous.kind
      const kindChanged = kind !== previous.kind
      if (previous.status !== 'draft' && kindChanged) throw new CampaignKindLockedError()
      const saleOfferId = input.saleOfferId === undefined ? previous.saleOfferId : input.saleOfferId
      const saleOfferChanged = previous.saleOfferId !== null && saleOfferId !== previous.saleOfferId
      if (previous.status !== 'draft' && saleOfferChanged) throw new CampaignGiftOfferLockedError()
      const [code] = await tx.select().from(codes).where(eq(codes.campaignId, id))
      if (!code) return null
      if (kindChanged || saleOfferChanged) {
        // Venda não tem resgate: quem já comprou pela campanha também trava tipo e oferta.
        const [bought] = await tx
          .select({ id: acquisitions.id })
          .from(acquisitions)
          .where(eq(acquisitions.campaignId, id))
          .limit(1)
        if (bought)
          throw kindChanged ? new CampaignKindLockedError() : new CampaignGiftOfferLockedError()
      }
      if (audience !== previous.audience || giftOfferChanged || kindChanged) {
        // Rascunho que já foi publicado (active → draft) pode ter resgates: o público e a oferta
        // deles não mudam, então os da campanha também não.
        const [used] = await tx
          .select({ id: scholarshipRedemptions.id })
          .from(scholarshipRedemptions)
          .where(eq(scholarshipRedemptions.codeId, code.id))
          .limit(1)
        if (used)
          throw audience !== previous.audience
            ? new CampaignAudienceLockedError()
            : kindChanged
              ? new CampaignKindLockedError()
              : new CampaignGiftOfferLockedError()
      }
      const redirectPath =
        input.redirectPath === undefined ? previous.redirectPath : input.redirectPath
      await releaseExpiredRedirect(tx, redirectPath, id)
      const [updated] = await tx
        .update(campaigns)
        .set({
          ...values({
            ...input,
            audience,
            giftOfferId,
            kind,
            saleOfferId,
            linkTarget: input.linkTarget ?? previous.linkTarget,
            redirectPath,
            redirectUntil:
              input.redirectUntil === undefined
                ? (previous.redirectUntil?.toISOString() ?? null)
                : input.redirectUntil,
          }),
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

  async findByRedirectPath(path: string): Promise<CampaignRecord | null> {
    const [row] = await this.db
      .select({ campaign: campaigns, code: codes.code })
      .from(campaigns)
      .innerJoin(codes, eq(codes.campaignId, campaigns.id))
      .where(eq(campaigns.redirectPath, path))
      .limit(1)
    return row ? record(row.campaign, row.code) : null
  }

  async listActiveRedirects(now: Date): Promise<CampaignRecord[]> {
    const rows = await this.db
      .select({ campaign: campaigns, code: codes.code })
      .from(campaigns)
      .innerJoin(codes, eq(codes.campaignId, campaigns.id))
      .where(
        and(
          sql`${campaigns.redirectPath} is not null`,
          sql`${campaigns.redirectUntil} > ${now.toISOString()}::timestamptz`,
          ne(campaigns.status, 'draft'),
        ),
      )
      .limit(500)
    return rows.map((row) => record(row.campaign, row.code))
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
        conversions: sql<number>`count(distinct ${conversions.id}) filter (where ${conversions.status} not in ('canceled', 'superseded'))`,
      })
      .from(codes)
      .leftJoin(scholarshipRedemptions, eq(scholarshipRedemptions.codeId, codes.id))
      // Pelo código, não pelo resgate: a venda direta pelo link (campanha de venda) gera
      // conversão sem resgate.
      .leftJoin(conversions, eq(conversions.codeId, codes.id))
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
