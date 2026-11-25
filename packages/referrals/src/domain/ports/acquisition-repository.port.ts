import type { GiftAudience } from '@sistemazero/core/referrals'
import type { AcquisitionRecord, NewAcquisition } from '../acquisition'
import type { CodeRecord, RedemptionRecord } from './referral-repository.port'

export interface AcquisitionRepository {
  /**
   * Idempotente: o UNIQUE parcial por `payment_id` e por `redemption_id` decide; `created:false`
   * devolve a aquisição que já existia (re-entrega do webhook, retomada do resgate).
   */
  insert(input: NewAcquisition): Promise<{ created: boolean; acquisition: AcquisitionRecord }>
  findByPayment(paymentId: string): Promise<AcquisitionRecord | null>
  /** Já existe a aquisição desta assinatura (a primeira cobrança já entrou)? */
  hasSubscription(subscriptionId: string): Promise<boolean>
  /** Estorno: a aquisição do pagamento deixa de contar (resultados, entrada, bônus). */
  markRefundedByPayment(paymentId: string): Promise<AcquisitionRecord | null>
  /**
   * As aquisições ATIVAS da pessoa no público, da mais antiga para a mais nova. A pessoa é o
   * e-mail OU a conta (compra de dentro da plataforma pode vir com e-mail de cobrança diferente).
   */
  listActiveForPerson(input: {
    email: string
    accountUserId?: string | null
    audience: GiftAudience
  }): Promise<AcquisitionRecord[]>
  /** Reparo: presentes concluídos que ainda não viraram aquisição (falha no registro). */
  listCompletedRedemptionsWithoutAcquisition(
    limit: number,
  ): Promise<{ redemption: RedemptionRecord; code: CodeRecord }[]>
  /** Compras gravadas sem o slug da oferta (o catálogo estava fora). */
  listMissingOfferSlug(limit: number): Promise<{ id: string; offerId: string }[]>
  /**
   * Grava o slug (só se faltava). `asSubscription`: a oferta é da Comunidade (o anual à vista
   * no Pix chega sem `subscriptionId` e entra como `one_time`; aqui vira `subscription`).
   */
  setOfferSlug(id: string, offerSlug: string, asSubscription?: boolean): Promise<void>

  // ── Leituras dos relatórios (Admin) ───────────────────────────────────────
  /** Teto de linhas de uma leitura de relatório (o relatório agrega em memória). */
  listByCampaigns(campaignIds: string[]): Promise<AcquisitionRecord[]>
  /** As do embaixador: link pessoal e campanhas ligadas a ele. */
  listByAmbassadors(ambassadorIds: string[]): Promise<AcquisitionRecord[]>
  listInPeriod(input: {
    audience?: GiftAudience
    from: Date
    to: Date
  }): Promise<AcquisitionRecord[]>
  /** Todas as aquisições destas pessoas (e-mail) no público, da mais antiga para a mais nova. */
  listForEmails(audience: GiftAudience, emails: string[]): Promise<AcquisitionRecord[]>
  /** A ficha da conta: todas as aquisições do e-mail, nos dois públicos. */
  listByEmail(email: string): Promise<AcquisitionRecord[]>
}

/** Uma leitura de relatório nunca traz mais que isto (o painel mostra o período, não a base). */
export const REPORT_ROW_LIMIT = 20_000
