import type { Logger } from '@sistemazero/core/logging'
import { normalizeEmail } from '../../domain/codes'
import { splitName } from '../../domain/names'
import type { ReferralsGateway } from '../../domain/ports/gateway.port'
import type { ReferralRepository } from '../../domain/ports/referral-repository.port'

export interface CreateInviteInput {
  pageToken: string
  name: string
  email: string
}

export type CreateInviteResult =
  | { kind: 'sent' }
  | { kind: 'ambassador_not_found' }
  | { kind: 'already_invited' }
  | { kind: 'already_redeemed' }
  | { kind: 'daily_limit' }
  | { kind: 'upstream_error' }

export interface CreateInviteOptions {
  funnelPublicUrl: string
  dailyLimit: number
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
    const ambassador = await this.repo.findAmbassadorByToken(input.pageToken)
    if (ambassador?.status !== 'active' || !ambassador.code) {
      return { kind: 'ambassador_not_found' }
    }
    const codeRecord = await this.repo.findCodeByCode(ambassador.code)
    if (codeRecord?.status !== 'active') return { kind: 'ambassador_not_found' }

    const email = normalizeEmail(input.email)
    const name = input.name.trim().slice(0, 120)

    // Já resgatou (qualquer estado) → convidar de novo só confundiria.
    if (await this.repo.findRedemptionByEmail(email)) return { kind: 'already_redeemed' }

    // Cap diário (janela móvel de 24h — simples e sem fuso).
    const since = new Date(this.now().getTime() - 24 * 3600_000)
    const sentToday = await this.repo.countInvitesSince(ambassador.id, since)
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
    const base = this.opts.funnelPublicUrl.replace(/\/$/, '')
    const res = await this.gateway.sendEmail(
      {
        templateKey: 'referrals-scholarship-invite',
        recipient: { name: splitName(name).firstName, email },
        variables: {
          nome: splitName(name).firstName,
          indicador: ambassador.name,
          link: `${base}/bolsa/${codeRecord.code}`,
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
