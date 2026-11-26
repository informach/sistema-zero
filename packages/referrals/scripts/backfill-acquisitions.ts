/**
 * Backfill da origem por aquisição (0013, 25/11/2026). Modos: `plan` (padrão, só conta) e
 * `apply` (grava). Idempotente: cada passo só toca o que ainda falta.
 *
 * 1. Conversões antigas ganham `subscriber_email` (o e-mail de QUEM PAGOU, lido no payments, a
 *    mesma régua das conversões novas; sem o pagamento, o e-mail do resgate) + `audience` (do
 *    resgate), a vaga "uma primeira assinatura por pessoa e público". Conflito com outra
 *    conversão ativa da mesma pessoa fica de fora (relatado) em vez de derrubar o lote.
 * 2. Presentes concluídos viram aquisição `gift` (o mesmo reparo do sweep; acordo sem prazo).
 * 3. Conversões viram aquisição `subscription` (a primeira assinatura de quem veio do
 *    presente), com a origem do código.
 * 4. As listas dos embaixadores nascem com o presente padrão de cada público (o Cadê), para os
 *    links que já circulam continuarem iguais.
 *
 * O relatório JSON traz só contagens (nenhum dado pessoal).
 *
 *   bun run acquisitions:backfill           # plan
 *   bun run acquisitions:backfill apply     # grava
 */
import { createLogger } from '@sistemazero/core/logging'
import { and, count, eq, isNull, notInArray, sql } from 'drizzle-orm'
import { AcquisitionMaintenanceService } from '../src/application/acquisitions/acquisition-maintenance.service'
import { originFromCode } from '../src/domain/acquisition'
import { DEFAULT_GIFT_OFFER_SLUGS } from '../src/domain/gift-policy'
import { loadEnv } from '../src/infrastructure/config/env'
import { CatalogHttpClient } from '../src/infrastructure/gateways/catalog-http.client'
import { GiftOfferCatalogHttpClient } from '../src/infrastructure/gateways/gift-offer-catalog.client'
import { PaymentsHttpClient } from '../src/infrastructure/gateways/payments-http.client'
import { DrizzleAcquisitionRepository } from '../src/infrastructure/persistence/drizzle/acquisition.repository'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { isUniqueViolation } from '../src/infrastructure/persistence/drizzle/pg-errors'
import { toCode } from '../src/infrastructure/persistence/drizzle/referral.repository'
import {
  acquisitions,
  ambassadorOffers,
  codes,
  conversions,
  scholarshipRedemptions,
} from '../src/infrastructure/persistence/drizzle/schema'

const args = process.argv.slice(2)
const mode = args[0] ?? 'plan'
if (args.length > 1 || (mode !== 'plan' && mode !== 'apply'))
  throw new Error('Modo desconhecido. Use plan (padrão) ou apply.')
const apply = mode === 'apply'
const env = loadEnv()
const logger = createLogger({ level: 'info' })
const connection = createDbConnection(env.DATABASE_URL, { max: 1 })
const db = connection.db
const report: Record<string, number | string> = { mode }
const payments = new PaymentsHttpClient({
  baseUrl: env.PAYMENTS_BASE_URL,
  internalToken: env.PAYMENTS_INTERNAL_TOKEN,
  timeoutMs: env.S2S_TIMEOUT_MS,
})
const payerEmails = new Map<string, string | null>()
let payerFallbacks = 0

/** O e-mail de quem pagou (lower/trim); sem o pagamento ou sem e-mail, o do resgate. */
async function payerEmail(paymentId: string, fallback: string): Promise<string> {
  if (!payerEmails.has(paymentId)) {
    const snapshot = await payments.getPayment(paymentId)
    const email = snapshot?.customer?.email?.trim().toLowerCase() ?? ''
    payerEmails.set(paymentId, email || null)
  }
  const email = payerEmails.get(paymentId)
  if (email) return email
  payerFallbacks++
  return fallback
}

try {
  // 1) A vaga por pessoa e público nas conversões antigas.
  const pendingEmails = await db
    .select({
      id: conversions.id,
      paymentId: conversions.paymentId,
      email: scholarshipRedemptions.email,
      audience: scholarshipRedemptions.audience,
    })
    .from(conversions)
    .innerJoin(scholarshipRedemptions, eq(scholarshipRedemptions.id, conversions.redemptionId))
    .where(isNull(conversions.subscriberEmail))
  report.conversionsWithoutSubscriber = pendingEmails.length
  let filled = 0
  let skipped = 0
  if (apply)
    for (const row of pendingEmails) {
      try {
        await db
          .update(conversions)
          .set({
            subscriberEmail: await payerEmail(row.paymentId, row.email),
            audience: row.audience,
          })
          .where(and(eq(conversions.id, row.id), isNull(conversions.subscriberEmail)))
        filled++
      } catch (error) {
        if (!isUniqueViolation(error)) throw error
        skipped++
      }
    }
  report.conversionsSubscriberFilled = filled
  report.conversionsSubscriberConflicts = skipped

  // 2) Presentes concluídos → aquisição `gift`.
  const acquisitionRepo = new DrizzleAcquisitionRepository(db)
  const catalog = new CatalogHttpClient({
    baseUrl: env.CATALOG_BASE_URL,
    timeoutMs: env.S2S_TIMEOUT_MS,
  })
  const maintenance = new AcquisitionMaintenanceService(
    acquisitionRepo,
    catalog,
    {
      defaults: {
        amounts: { monthly: env.BONUS_AMOUNT_CENTS, annual: env.BONUS_ANNUAL_AMOUNT_CENTS },
        legacyCents: env.BONUS_AMOUNT_CENTS,
        windowDays: env.BONUS_WINDOW_DAYS,
      },
      repairWindowDays: 3650,
      legacyBefore: env.ORIGIN_LEGACY_BEFORE ? new Date(env.ORIGIN_LEGACY_BEFORE) : null,
      batchSize: 500,
      conversionOfferSlugs: env.CONVERSION_OFFER_SLUGS,
    },
    logger,
  )
  const [giftsPending] = await db
    .select({ n: count() })
    .from(scholarshipRedemptions)
    .leftJoin(acquisitions, eq(acquisitions.redemptionId, scholarshipRedemptions.id))
    .where(and(eq(scholarshipRedemptions.status, 'completed'), isNull(acquisitions.id)))
  report.giftsWithoutAcquisition = Number(giftsPending?.n ?? 0)
  let giftsCreated = 0
  if (apply)
    for (;;) {
      const created = await maintenance.repairGifts(500)
      giftsCreated += created
      if (created === 0) break
    }
  report.giftAcquisitionsCreated = giftsCreated

  // 3) Conversões → aquisição `subscription` (a primeira assinatura de quem veio do presente).
  const withPayment = db
    .select({ paymentId: acquisitions.paymentId })
    .from(acquisitions)
    .where(sql`${acquisitions.paymentId} is not null`)
  const pendingSubs = await db
    .select({ conversion: conversions, redemption: scholarshipRedemptions, code: codes })
    .from(conversions)
    .innerJoin(scholarshipRedemptions, eq(scholarshipRedemptions.id, conversions.redemptionId))
    .innerJoin(codes, eq(codes.id, conversions.codeId))
    .where(notInArray(conversions.paymentId, withPayment))
  report.conversionsWithoutAcquisition = pendingSubs.length
  let subsCreated = 0
  if (apply)
    for (const row of pendingSubs) {
      const code = toCode(row.code)
      const result = await acquisitionRepo.insert({
        email: await payerEmail(row.conversion.paymentId, row.redemption.email),
        accountUserId: row.redemption.userId,
        audience: row.redemption.audience,
        kind: 'subscription',
        offerId: null,
        offerSlug: row.conversion.offerSlug,
        amountCents: row.conversion.amountCents,
        paymentId: row.conversion.paymentId,
        subscriptionId: row.conversion.subscriptionId,
        redemptionId: null,
        acquiredAt: row.conversion.paidAt,
        // A compra veio pelo mesmo caminho do presente (a origem do código do resgate).
        ...originFromCode(code, {
          campaignAmbassadorId: row.redemption.campaignReferral?.ambassadorId ?? null,
        }),
        // A conversão já existe: o acordo não precisa ser recalculado.
        bonusTerms: null,
      })
      if (result.created) subsCreated++
      // Conversão estornada (garantia): a venda não conta; a aquisição nasce estornada.
      if (row.conversion.status === 'canceled')
        await acquisitionRepo.markRefundedByPayment(row.conversion.paymentId)
    }
  report.subscriptionAcquisitionsCreated = subsCreated
  report.payerEmailFallbacks = payerFallbacks

  // 4) O presente padrão nas listas dos embaixadores.
  const giftCatalog = new GiftOfferCatalogHttpClient({
    baseUrl: env.CATALOG_BASE_URL,
    internalToken: env.CATALOG_INTERNAL_TOKEN,
    timeoutMs: env.S2S_TIMEOUT_MS,
  })
  for (const audience of ['kids', 'adult'] as const) {
    const [existing] = await db
      .select({ n: count() })
      .from(ambassadorOffers)
      .where(and(eq(ambassadorOffers.audience, audience), eq(ambassadorOffers.kind, 'gift')))
    if (Number(existing?.n ?? 0) > 0) {
      report[`offersSeed_${audience}`] = 'já tem lista'
      continue
    }
    const offer = await giftCatalog.resolve(DEFAULT_GIFT_OFFER_SLUGS[audience])
    if (!offer) {
      report[`offersSeed_${audience}`] = 'oferta padrão não encontrada'
      continue
    }
    if (apply)
      await db
        .insert(ambassadorOffers)
        .values({ audience, kind: 'gift', offerId: offer.offerId, position: 0, enabled: true })
        .onConflictDoNothing()
    report[`offersSeed_${audience}`] = apply ? 'semeada' : 'a semear'
  }

  console.log(JSON.stringify(report, null, 2))
} finally {
  await connection.close()
}
