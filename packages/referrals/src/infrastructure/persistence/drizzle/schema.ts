import type {
  AcquisitionKind,
  AcquisitionOriginKind,
  AmbassadorOfferKind,
  CampaignInput,
  CampaignKind,
  CampaignLinkTarget,
  CourseBenefitContext,
  GiftAttribution,
  GiftAudience,
  GiftSource,
  ReferralBonusAmounts,
} from '@sistemazero/core/referrals'
import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import type { AcquisitionBonusTerms } from '../../../domain/acquisition'
import type { CampaignReferralSnapshot } from '../../../domain/campaign-referral'

/**
 * Schema `referrals` (Postgres compartilhado, 1 schema por bounded context).
 * Fase 1 (bolsa): embaixadores + códigos genéricos + resgates + convites.
 * A tabela `codes` já nasce GENÉRICA (owner ambassador OU account) — na fase 2
 * o mesmo código do membro serve à landing de bolsa e à atribuição `?ref`.
 */
export const referralsSchema = pgSchema('referrals')

export const courseBenefits = referralsSchema.table(
  'course_benefits',
  {
    id: uuid().primaryKey().defaultRandom(),
    name: varchar({ length: 160 }).notNull(),
    audience: varchar({ length: 16 }).$type<GiftAudience>().notNull(),
    courseSlug: varchar({ length: 140 }).notNull(),
    giftOfferId: uuid().notNull(),
    status: varchar({ length: 16 }).notNull().default('active'),
    /** Conversão explícita de um cadastro legado; nunca usada como calendário do benefício. */
    legacyCampaign: jsonb().$type<Record<string, unknown>>(),
    legacyHistory: jsonb().$type<unknown[]>(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('course_benefits_course_idx').on(t.audience, t.courseSlug),
    check('course_benefits_audience_check', sql`${t.audience} in ('kids','adult')`),
    check('course_benefits_status_check', sql`${t.status} in ('active','disabled')`),
  ],
)

export const campaigns = referralsSchema.table(
  'campaigns',
  {
    id: uuid().primaryKey().defaultRandom(),
    name: varchar({ length: 120 }).notNull(),
    publicTitle: varchar({ length: 160 }).notNull(),
    description: varchar({ length: 600 }).notNull().default(''),
    context: varchar({ length: 16 }).notNull(),
    status: varchar({ length: 16 }).notNull().default('draft'),
    startsAt: timestamp({ withTimezone: true }).notNull(),
    endsAt: timestamp({ withTimezone: true }).notNull(),
    channel: varchar({ length: 100 }).notNull().default(''),
    ambassadorId: uuid().references(() => ambassadors.id),
    commissionEnabled: boolean().notNull().default(false),
    commissionAmountCents: integer(),
    commissionAnnualAmountCents: integer(),
    commissionWindowDays: integer(),
    schedule: jsonb().$type<CampaignInput['schedule']>(),
    coupon: jsonb().$type<CampaignInput['coupon']>(),
    /** Público do presente (0005). Só muda em rascunho; depois, só duplicando. */
    audience: varchar({ length: 16 }).$type<GiftAudience>().notNull().default('kids'),
    /**
     * Oferta do catálogo dada de presente (0010, UUID sem FK: o catálogo é outro schema).
     * Nula só em campanhas antigas, que o `scripts/backfill-gift-offer.ts` liga à oferta padrão.
     */
    giftOfferId: uuid(),
    /** Tipo (0013): `gift` dá `gift_offer_id`; `sale` leva à venda de `sale_offer_id`. */
    kind: varchar({ length: 8 }).$type<CampaignKind>().notNull().default('gift'),
    saleOfferId: uuid(),
    /** Destino do link da campanha de venda (0013): a página da oferta ou o pagamento. */
    linkTarget: varchar({ length: 16 }).$type<CampaignLinkTarget>().notNull().default('page'),
    /** Endereço antigo do funil redirecionado para a campanha até `redirect_until` (0013). */
    redirectPath: varchar({ length: 120 }),
    redirectUntil: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('campaigns_ambassador_idx').on(t.ambassadorId),
    uniqueIndex('campaigns_redirect_path_uq')
      .on(t.redirectPath)
      .where(sql`redirect_path is not null`),
    check('campaigns_kind_check', sql`${t.kind} in ('gift','sale')`),
    check('campaigns_link_target_check', sql`${t.linkTarget} in ('page','checkout')`),
    check(
      'campaigns_kind_offer_check',
      sql`(${t.kind} = 'gift' and ${t.saleOfferId} is null) or (${t.kind} = 'sale' and ${t.saleOfferId} is not null and ${t.giftOfferId} is null)`,
    ),
    check(
      'campaigns_redirect_check',
      sql`(${t.redirectPath} is null) = (${t.redirectUntil} is null)`,
    ),
    check(
      'campaigns_annual_commission_check',
      sql`${t.commissionAnnualAmountCents} is null or (${t.commissionEnabled} = true and ${t.commissionAnnualAmountCents} between 1 and 100000000)`,
    ),
    check(
      'campaigns_commission_check',
      sql`(
      ${t.commissionEnabled} = false and ${t.commissionAmountCents} is null and ${t.commissionWindowDays} is null
    ) or (
      ${t.commissionEnabled} = true and ${t.ambassadorId} is not null
      and ${t.commissionAmountCents} is not null and ${t.commissionAmountCents} between 1 and 100000000
      and ${t.commissionWindowDays} is not null and ${t.commissionWindowDays} between 1 and 3650
    )`,
    ),
    check('campaigns_period_check', sql`${t.endsAt} > ${t.startsAt}`),
    check('campaigns_audience_check', sql`${t.audience} in ('kids','adult')`),
    check('campaigns_status_check', sql`${t.status} in ('draft','active','paused','ended')`),
    check('campaigns_context_check', sql`${t.context} in ('ad','event','other')`),
  ],
)

export const campaignHistory = referralsSchema.table(
  'campaign_history',
  {
    id: uuid().primaryKey().defaultRandom(),
    campaignId: uuid()
      .notNull()
      .references(() => campaigns.id),
    action: varchar({ length: 16 }).notNull(),
    actor: varchar({ length: 160 }).notNull(),
    changes: jsonb().$type<Partial<CampaignInput>>().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('campaign_history_campaign_idx').on(t.campaignId, t.createdAt)],
)

export const ambassadors = referralsSchema.table(
  'ambassadors',
  {
    id: uuid().primaryKey().defaultRandom(),
    name: varchar({ length: 120 }).notNull(),
    /** Normalizado (lower/trim) NA APLICAÇÃO antes de qualquer escrita. */
    email: text().notNull(),
    /** Capability do magic-link da página do embaixador (32 bytes base64url). */
    pageToken: text().notNull(),
    /** Conta do auth quando o embaixador é um pai/responsável (auto-cadastro) — snapshot SEM FK. */
    accountUserId: uuid(),
    /** Chave Pix p/ o bônus, cadastrada pelo PRÓPRIO embaixador na página dele. */
    pixKey: varchar({ length: 140 }),
    status: varchar({ length: 16 }).notNull().default('active'),
    /** Versiona a Idempotency-Key do (re)envio do e-mail do link. */
    linkEmailCount: integer().notNull().default(0),
    linkEmailSentAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('ambassadors_email_uq').on(t.email),
    uniqueIndex('ambassadors_page_token_uq').on(t.pageToken),
    uniqueIndex('ambassadors_account_uq')
      .on(t.accountUserId)
      .where(sql`account_user_id is not null`),
  ],
)

export const codes = referralsSchema.table(
  'codes',
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Slug `^[a-z0-9-]{4,32}$`, sempre lower. */
    code: varchar({ length: 32 }).notNull(),
    /** 'ambassador' | 'account' | 'campaign' — exatamente UM dos owners (CHECK). */
    ownerKind: varchar({ length: 16 }).notNull(),
    ambassadorId: uuid().references(() => ambassadors.id),
    campaignId: uuid().references(() => campaigns.id),
    benefitId: uuid().references(() => courseBenefits.id),
    /** Conta do auth (snapshot) — SEM FK cross-schema (regra do monorepo). */
    accountUserId: uuid(),
    /** O "quem indicou" exibido na landing (snapshot). */
    displayName: varchar({ length: 120 }).notNull(),
    /** E-mail do dono (lower) — base do anti-autoindicação da fase 3. */
    ownerEmail: text(),
    /** CPF do dono (opcional; checagem adicional de autoindicação quando presente). */
    ownerDocument: text(),
    /**
     * Público do presente que o código entrega (0005). A coluna física continua
     * `panel_audience` (criada na 0000 e nunca usada): renomear quebraria as
     * leituras do container antigo durante o deploy, porque o Drizzle lista as
     * colunas no SELECT. Embaixador tem um código por público; campanha espelha
     * o público da campanha.
     */
    audience: varchar('panel_audience', { length: 16 })
      .$type<GiftAudience>()
      .notNull()
      .default('kids'),
    status: varchar({ length: 16 }).notNull().default('active'),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('codes_code_uq').on(t.code),
    uniqueIndex('codes_ambassador_audience_uq')
      .on(t.ambassadorId, t.audience)
      .where(sql`ambassador_id is not null`),
    uniqueIndex('codes_account_uq').on(t.accountUserId).where(sql`account_user_id is not null`),
    uniqueIndex('codes_campaign_uq').on(t.campaignId).where(sql`campaign_id is not null`),
    uniqueIndex('codes_benefit_uq').on(t.benefitId).where(sql`benefit_id is not null`),
    check('codes_audience_check', sql`${t.audience} in ('kids','adult')`),
    check(
      'codes_owner_check',
      sql`(owner_kind = 'ambassador' and ambassador_id is not null and account_user_id is null and campaign_id is null and benefit_id is null) or (owner_kind = 'account' and account_user_id is not null and ambassador_id is null and campaign_id is null and benefit_id is null) or (owner_kind = 'campaign' and campaign_id is not null and ambassador_id is null and account_user_id is null and benefit_id is null) or (owner_kind = 'benefit' and benefit_id is not null and ambassador_id is null and account_user_id is null and campaign_id is null)`,
    ),
  ],
)

export const scholarshipRedemptions = referralsSchema.table(
  'scholarship_redemptions',
  {
    benefitContext: jsonb().$type<CourseBenefitContext>(),
    id: uuid().primaryKey().defaultRandom(),
    /** Código pelo qual a bolsa entrou — o 1º claim vence a atribuição. */
    codeId: uuid()
      .notNull()
      .references(() => codes.id),
    /** Normalizado (lower/trim). UNIQUE (email, audience) = 1 presente por e-mail e público. */
    email: text().notNull(),
    /** Público do presente resgatado (vem do código). Históricos são `kids`. */
    audience: varchar({ length: 16 }).$type<GiftAudience>().notNull().default('kids'),
    name: varchar({ length: 120 }).notNull(),
    phone: varchar({ length: 20 }),
    /** Termos da origem no instante da aceitação; não mudam ao editar a campanha. */
    sourceSnapshot: jsonb().$type<GiftSource>(),
    campaignReferral: jsonb().$type<CampaignReferralSnapshot>(),
    /** Acordo privado de indicações diretas; null preserva a política legada. */
    bonusAmounts: jsonb().$type<ReferralBonusAmounts>(),
    courseSlug: varchar({ length: 100 }),
    attribution: jsonb().$type<GiftAttribution>(),
    /** Aceitação pelo messaging; welcome_sent_at continua sendo o claim de emissão. */
    welcomeAcceptedAt: timestamp({ withTimezone: true }),
    /** Preenchido quando a etapa ensure-buyer concluiu. */
    userId: uuid(),
    /** `created` do ensure-buyer — ramifica o e-mail (welcome × new-access). */
    buyerCreated: boolean(),
    /** Preenchido quando o grant no members concluiu. */
    grantedAt: timestamp({ withTimezone: true }),
    /** Claim atômico do e-mail de boas-vindas (molde welcome do funil). */
    welcomeSentAt: timestamp({ withTimezone: true }),
    status: varchar({ length: 16 }).notNull().default('pending'),
    failedReason: varchar({ length: 64 }),
    lastError: text(),
    /** Lease anti-execução dupla (dupla submissão/refresh); expira e retoma. */
    processingUntil: timestamp({ withTimezone: true }),
    attemptCount: integer().notNull().default(0),
    completedAt: timestamp({ withTimezone: true }),
    /**
     * Dias do presente. Null nos resgates históricos sem prazo e nos resgates por oferta
     * vitalícia ou com prazo em meses (o fim sai da própria oferta, contado do resgate).
     */
    accessDurationDays: integer(),
    /**
     * Prazo DIVULGADO no resgate (25/11/2026): o que a pessoa vê e o members avisa; gravado no
     * claim (a oferta pode mudar depois). Null = sem divulgado (vê o real).
     */
    advertisedDays: integer(),
    /**
     * Null legado; visitor = só visita; trial = participação no prazo do curso + visita depois;
     * offer (0010) = o members concede a oferta `gift_offer_id` (curso, prazo e Mural dela).
     */
    muralVisitorPolicy: varchar({ length: 16 }),
    /** Oferta concedida pelo resgate `offer` (0010); null nos resgates anteriores. */
    giftOfferId: uuid(),
    /**
     * Vaga do presente (0011): `main` = o presente do público (um por e-mail e público);
     * `parents:<slug>` = curso para pais, que não ocupa a vaga do presente e vale um por curso.
     */
    giftSlot: varchar({ length: 160 }).notNull().default('main'),
    muralVisitorGrantedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('scholarship_redemptions_email_audience_slot_uq').on(
      t.email,
      t.audience,
      t.giftSlot,
    ),
    check(
      'scholarship_redemptions_gift_slot_check',
      sql`${t.giftSlot} = 'main' or ${t.giftSlot} like 'parents:%' or ${t.giftSlot} like 'course:%' or ${t.giftSlot} like 'offer:%'`,
    ),
    index('scholarship_redemptions_code_status_idx').on(t.codeId, t.status),
    index('scholarship_redemptions_user_audience_idx').on(t.userId, t.audience),
    check('scholarship_redemptions_audience_check', sql`${t.audience} in ('kids','adult')`),
  ],
)

export const invites = referralsSchema.table(
  'invites',
  {
    id: uuid().primaryKey().defaultRandom(),
    ambassadorId: uuid()
      .notNull()
      .references(() => ambassadors.id),
    codeId: uuid()
      .notNull()
      .references(() => codes.id),
    /** Dados MÍNIMOS do convidado (LGPD): só nome + e-mail (lower). */
    inviteeName: varchar({ length: 120 }).notNull(),
    inviteeEmail: text().notNull(),
    status: varchar({ length: 16 }).notNull().default('pending'),
    /** Versiona a Idempotency-Key do (re)envio (re-envio só de `failed`). */
    sendCount: integer().notNull().default(0),
    sentAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('invites_ambassador_invitee_uq').on(t.ambassadorId, t.inviteeEmail),
    index('invites_ambassador_created_idx').on(t.ambassadorId, t.createdAt),
  ],
)

/**
 * Conversões: bolsista que ASSINOU a Comunidade dos Criadores. 1 por resgate
 * (UNIQUE em redemption_id — "só a primeira cobrança paga bônus" por
 * construção: ciclos seguintes conflitam e viram no-op) e 1 por pagamento
 * (dedupe de re-entrega do consumer). O bônus NUNCA é saldo: `status` sinaliza
 * elegibilidade e o Pix é pago MANUALMENTE fora do sistema (admin marca pago).
 */
export const conversions = referralsSchema.table(
  'conversions',
  {
    id: uuid().primaryKey().defaultRandom(),
    /**
     * Resgate de onde veio o embaixador. Desde a 0013 é opcional: a venda pelo link (sem
     * presente) atribui pela AQUISIÇÃO (`acquisition_id`).
     */
    redemptionId: uuid().references(() => scholarshipRedemptions.id),
    /** Aquisição com a origem que ganhou o bônus (0013); nula nas conversões anteriores. */
    acquisitionId: uuid().references(() => acquisitions.id),
    /** Quem assinou (lower) e o público (0013): "uma primeira assinatura por pessoa e público". */
    subscriberEmail: text(),
    audience: varchar({ length: 16 }).$type<GiftAudience>(),
    codeId: uuid()
      .notNull()
      .references(() => codes.id),
    ambassadorId: uuid().references(() => ambassadors.id),
    /** Pagamento que disparou a conversão (snapshot do payments, sem FK). */
    paymentId: text().notNull(),
    subscriptionId: text(),
    offerSlug: varchar({ length: 80 }).notNull(),
    /** Valor PAGO pelo assinante (exibição no admin) — bigint como no payments. */
    amountCents: bigint({ mode: 'bigint' }).notNull(),
    /** Snapshot do bônus no momento (env BONUS_AMOUNT_CENTS; 0 em self_blocked). */
    bonusCents: integer().notNull(),
    /** pending | eligible | paid | canceled | self_blocked | unrewarded | superseded */
    status: varchar({ length: 16 }).notNull().default('pending'),
    /** paid_at do PAGAMENTO (âncora da maturação). */
    paidAt: timestamp({ withTimezone: true }).notNull(),
    /** paid_at + BONUS_MATURE_HOURS (garantia de 7d + buffer, régua da NFS-e). */
    maturesAt: timestamp({ withTimezone: true }).notNull(),
    eligibleAt: timestamp({ withTimezone: true }),
    /** Mark-after-send do e-mail `referrals-bonus-eligible`. */
    notifiedAt: timestamp({ withTimezone: true }),
    /** Controle do Pix MANUAL: quem marcou como pago e quando. */
    paidMarkedAt: timestamp({ withTimezone: true }),
    paidMarkedBy: varchar({ length: 120 }),
    note: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Estornos e compras substituídas ficam no histórico, sem ocupar a vaga.
    uniqueIndex('conversions_redemption_uq')
      .on(t.redemptionId)
      .where(sql`status not in ('canceled', 'superseded')`),
    uniqueIndex('conversions_payment_uq').on(t.paymentId),
    uniqueIndex('conversions_subscriber_uq')
      .on(t.subscriberEmail, t.audience)
      .where(sql`subscriber_email is not null and status not in ('canceled', 'superseded')`),
    index('conversions_status_matures_idx').on(t.status, t.maturesAt),
    index('conversions_ambassador_status_idx').on(t.ambassadorId, t.status),
    /** Etapas no detalhe do embaixador lista por código (FK não indexa sozinha). */
    index('conversions_code_idx').on(t.codeId),
  ],
)

/**
 * Ofertas que os embaixadores podem mandar (0013), por público e tipo. A lista vale para todos
 * os embaixadores do público; `position` é a ordem na página do embaixador. UUID sem FK: a
 * oferta é do catálogo (outro schema).
 */
export const ambassadorOffers = referralsSchema.table(
  'ambassador_offers',
  {
    id: uuid().primaryKey().defaultRandom(),
    audience: varchar({ length: 16 }).$type<GiftAudience>().notNull(),
    kind: varchar({ length: 16 }).$type<AmbassadorOfferKind>().notNull(),
    offerId: uuid().notNull(),
    position: integer().notNull(),
    enabled: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('ambassador_offers_offer_uq').on(t.audience, t.kind, t.offerId),
    check('ambassador_offers_audience_check', sql`${t.audience} in ('kids','adult')`),
    check('ambassador_offers_kind_check', sql`${t.kind} in ('gift','referral')`),
  ],
)

/**
 * Aquisições com origem (0013): cada presente resgatado, compra avulsa e PRIMEIRA cobrança de
 * assinatura, com de onde veio. "Por onde a pessoa entrou" é a mais antiga; o bônus olha as
 * aquisições com embaixador dentro do prazo. Renovação não entra. O valor é o pago de fato.
 */
export const acquisitions = referralsSchema.table(
  'acquisitions',
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Normalizado (lower/trim) na aplicação. */
    email: text().notNull(),
    accountUserId: uuid(),
    audience: varchar({ length: 16 }).$type<GiftAudience>().notNull(),
    kind: varchar({ length: 16 }).$type<AcquisitionKind>().notNull(),
    /** Oferta do catálogo; nula em presente histórico sem oferta gravada. */
    offerId: uuid(),
    /** Preenchido pelo catálogo quando disponível (exibição); nunca é chave. */
    offerSlug: varchar({ length: 80 }),
    amountCents: bigint({ mode: 'bigint' }).notNull().default(sql`0`),
    paymentId: text(),
    subscriptionId: text(),
    redemptionId: uuid().references(() => scholarshipRedemptions.id),
    originKind: varchar({ length: 16 }).$type<AcquisitionOriginKind>().notNull(),
    codeId: uuid().references(() => codes.id),
    campaignId: uuid().references(() => campaigns.id),
    ambassadorId: uuid().references(() => ambassadors.id),
    /** Etiqueta do botão da plataforma (`platform`). */
    place: varchar({ length: 48 }),
    utm: jsonb().$type<GiftAttribution>(),
    /**
     * Acordo do bônus capturado NA HORA da aquisição (embaixador, valores, prazo). Editar a
     * campanha ou o padrão depois não muda o que já foi aceito. Nulo sem embaixador.
     */
    bonusTerms: jsonb().$type<AcquisitionBonusTerms>(),
    /** active | refunded */
    status: varchar({ length: 16 }).notNull().default('active'),
    acquiredAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('acquisitions_payment_uq').on(t.paymentId).where(sql`payment_id is not null`),
    uniqueIndex('acquisitions_redemption_uq')
      .on(t.redemptionId)
      .where(sql`redemption_id is not null`),
    index('acquisitions_email_audience_idx').on(t.email, t.audience, t.acquiredAt),
    index('acquisitions_account_idx').on(t.accountUserId).where(sql`account_user_id is not null`),
    index('acquisitions_campaign_idx').on(t.campaignId),
    index('acquisitions_ambassador_idx').on(t.ambassadorId),
    index('acquisitions_acquired_idx').on(t.acquiredAt),
    check('acquisitions_audience_check', sql`${t.audience} in ('kids','adult')`),
    check('acquisitions_kind_check', sql`${t.kind} in ('gift','one_time','subscription')`),
    check(
      'acquisitions_origin_check',
      sql`${t.originKind} in ('ambassador','campaign','platform','course','ads','none')`,
    ),
    check('acquisitions_status_check', sql`${t.status} in ('active','refunded')`),
    check(
      'acquisitions_source_check',
      sql`(${t.kind} = 'gift' and ${t.redemptionId} is not null) or (${t.kind} <> 'gift' and ${t.paymentId} is not null)`,
    ),
  ],
)

/** Dedupe das entregas do payments (cópia do padrão fiscal: claim + lease + token). */
export const processedWebhooks = referralsSchema.table(
  'processed_webhooks',
  {
    deliveryId: text().primaryKey(),
    paymentId: text(),
    eventName: text(),
    /** Nulo enquanto reservada; preenchido SÓ após sucesso. */
    processedAt: timestamp({ withTimezone: true }),
    /** Lease curto da reserva; crash permite reentrega depois de expirar. */
    processingAt: timestamp({ withTimezone: true }),
    /** Identifica a tentativa dona do lease (não libera claim de outra réplica). */
    processingToken: text(),
  },
  (t) => [
    index('referrals_pw_processed_at_idx').on(t.processedAt),
    index('referrals_pw_processing_at_idx').on(t.processingAt).where(sql`processed_at is null`),
  ],
)

export const schema = {
  courseBenefits,
  campaigns,
  campaignHistory,
  ambassadors,
  codes,
  scholarshipRedemptions,
  invites,
  conversions,
  ambassadorOffers,
  acquisitions,
  processedWebhooks,
}
