import type { Logger } from '@sistemazero/core/logging'
import type { GiftAudience } from '@sistemazero/core/referrals'
import { normalizeEmail } from '../../domain/codes'
import { scholarshipShareUrl } from '../../domain/links'
import { splitName } from '../../domain/names'
import type { ReferralsGateway } from '../../domain/ports/gateway.port'
import type { CodeRecord, ReferralRepository } from '../../domain/ports/referral-repository.port'
import { ensureAmbassadorShareCode } from '../ambassadors/ambassador-codes'

export interface CreateInviteInput {
  pageToken: string
  name: string
  email: string
  /** Público do presente convidado; ausente = `kids`. */
  audience?: GiftAudience
}

/** Template do convite por público (contrato com o seed do Messaging). */
const INVITE_TEMPLATE: Record<GiftAudience, string> = {
  kids: 'referrals-scholarship-invite',
  adult: 'referrals-scholarship-invite-adult',
}

export type CreateInviteResult =
  | { kind: 'sent' }
  | { kind: 'ambassador_not_found' }
  | { kind: 'already_invited' }
  | { kind: 'already_redeemed' }
  | { kind: 'daily_limit' }
  /** O presente do público não está configurado (adulto sem `COMMUNITY_URL`). */
  | { kind: 'gift_unavailable' }
  | { kind: 'upstream_error' }

export interface CreateInviteOptions {
  funnelPublicUrl: string
  dailyLimit: number
  /**
   * O presente adulto está configurado (`COMMUNITY_URL` presente)? Sem ele, convite adulto é
   * recusado ANTES de criar código ou enviar e-mail (fail-closed, como o resgate).
   */
  adultGiftEnabled: boolean
}

/**
 * Convite por e-mail em nome do embaixador. LGPD por desenho: dados MÍNIMOS
 * (nome + e-mail), envio ÚNICO por (embaixador, e-mail) — UNIQUE no banco —
 * e re-envio apenas de convite que FALHOU. Cap diário anti-abuso.
 */
export class CreateInviteService {
  constructor(
    private readonly repo: ReferralRepository,
    private readonly gateway: ReferralsGateway,
    private readonly opts: CreateInviteOptions,
    private readonly logger: Logger,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: CreateInviteInput): Promise<CreateInviteResult> {
    const audience = input.audience ?? 'kids'
    if (audience === 'adult' && !this.opts.adultGiftEnabled) return { kind: 'gift_unavailable' }
    const ambassador = await this.repo.findAmbassadorByToken(input.pageToken)
    if (ambassador?.status !== 'active' || !ambassador.code) {
      return { kind: 'ambassador_not_found' }
    }
    // Kids: o código de sempre. Adulto: o código adulto, criado aqui se o painel ainda não o
    // criou (idempotente).
    const codeRecord: CodeRecord | null =
      audience === 'kids'
        ? await this.repo.findCodeByCode(ambassador.code)
        : await ensureAmbassadorShareCode(this.repo, ambassador, 'adult')
    if (codeRecord?.status !== 'active') return { kind: 'ambassador_not_found' }

    const email = normalizeEmail(input.email)
    const name = input.name.trim().slice(0, 120)

    // Cap diário = janela móvel de 24h (simples e sem fuso).
    const since = new Date(this.now().getTime() - 24 * 3600_000)
    const [existingRedemption, sentToday] = await Promise.all([
      this.repo.findRedemptionByEmail(email, audience),
      this.repo.countInvitesSince(ambassador.id, since),
    ])
    // Só bolsa CONCLUÍDA barra o convite — pending/failed é resgate que não
    // aconteceu (upstream fora, desistiu no meio): o e-mail com o link é
    // justamente o empurrão pra retomada.
    if (existingRedemption?.status === 'completed') return { kind: 'already_redeemed' }
    if (sentToday >= this.opts.dailyLimit) return { kind: 'daily_limit' }

    const { created, invite } = await this.repo.insertInvite({
      ambassadorId: ambassador.id,
      codeId: codeRecord.id,
      inviteeName: name,
      inviteeEmail: email,
    })
    // Convite existente: re-envio SÓ se falhou/nunca saiu (envio único é regra LGPD).
    if (!created && invite.status === 'sent') return { kind: 'already_invited' }

    const seq = await this.repo.bumpInviteSend(invite.id)
    const res = await this.gateway.sendEmail(
      {
        templateKey: INVITE_TEMPLATE[audience],
        recipient: { name: splitName(name).firstName, email },
        variables: {
          nome: splitName(name).firstName,
          indicador: ambassador.name,
          link: scholarshipShareUrl(this.opts.funnelPublicUrl, codeRecord.code),
        },
      },
      `ambassador-invite:${invite.id}:${seq}`,
    )
    if (res.status === 202 || res.status === 200) {
      await this.repo.markInviteSent(invite.id, this.now())
      return { kind: 'sent' }
    }
    await this.repo.markInviteFailed(invite.id)
    this.logger.warn('referrals.invite_send_failed', { inviteId: invite.id, status: res.status })
    return { kind: 'upstream_error' }
  }
}
