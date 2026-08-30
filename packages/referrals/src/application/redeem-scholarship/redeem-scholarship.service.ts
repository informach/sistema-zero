import { randomBytes } from 'node:crypto'
import type { Logger } from '@sistemazero/core/logging'
import { isValidCode, normalizeCode, normalizeEmail } from '../../domain/codes'
import { normalizePhone, splitName } from '../../domain/names'
import type { GatewayResult, ReferralsGateway } from '../../domain/ports/gateway.port'
import type {
  RedemptionRecord,
  ReferralRepository,
} from '../../domain/ports/referral-repository.port'

export interface RedeemInput {
  code: string
  name: string
  email: string
  phone?: string
}

export type RedeemResult =
  | { kind: 'completed' }
  | { kind: 'processing' }
  | { kind: 'code_not_found' }
  | { kind: 'already_redeemed' }
  | { kind: 'failed'; reason: string }
  | { kind: 'upstream_error' }

export interface RedeemOptions {
  /** Oferta (catálogo) concedida — a MESMA do comprador (curso + bônus). */
  offerSlug: string
  /** Base do app kids (a bolsa v1 é kids) p/ o link de senha/cursos. */
  kidsCommunityUrl: string
  leaseMs: number
}

/**
 * Resgate da Bolsa do Primeiro Jogo — ordem deliberada CONTA → GRANT → E-MAIL:
 * se o e-mail falhar, o acesso já existe; se o grant falhar, nenhum e-mail
 * mentiroso saiu. Retomável por etapas (colunas user_id/granted_at/
 * welcome_sent_at): toda falha transitória devolve 502 e a PRÓXIMA submissão do
 * mesmo e-mail continua de onde parou. Anti-execução dupla = lease em coluna
 * (`processing_until`) — crash no meio expira sozinho.
 */
export class RedeemScholarshipService {
  constructor(
    private readonly repo: ReferralRepository,
    private readonly gateway: ReferralsGateway,
    private readonly opts: RedeemOptions,
    private readonly logger: Logger,
    private readonly now: () => Date = () => new Date(),
    /** Senha descartável do ensure-buyer (a real vem pelo link de definir senha). */
    private readonly genPassword: () => string = () => randomBytes(32).toString('base64url'),
  ) {}

  async execute(input: RedeemInput): Promise<RedeemResult> {
    const code = normalizeCode(input.code)
    if (!isValidCode(code)) return { kind: 'code_not_found' }
    const codeRecord = await this.repo.findCodeByCode(code)
    // 404 uniforme (inexistente OU desativado) — não vazar qual dos dois.
    if (codeRecord?.status !== 'active') return { kind: 'code_not_found' }

    const email = normalizeEmail(input.email)
    const name = input.name.trim().slice(0, 120)
    const phone = normalizePhone(input.phone)

    // Claim da bolsa: 1 por e-mail, GLOBAL. Conflito devolve a linha existente —
    // completed = 409; pending/failed = RETOMADA (o 1º claim vence o code_id).
    const { created, redemption } = await this.repo.insertRedemption({
      codeId: codeRecord.id,
      email,
      name,
      phone,
    })
    if (!created && redemption.status === 'completed') return { kind: 'already_redeemed' }

    const leaseUntil = new Date(this.now().getTime() + this.opts.leaseMs)
    const leased = await this.repo.acquireRedemptionLease(redemption.id, leaseUntil, this.now())
    if (!leased) return { kind: 'processing' }

    try {
      return await this.runSteps(leased, codeRecord.displayName)
    } catch (error) {
      this.logger.error('referrals.redeem_failed', {
        redemptionId: redemption.id,
        error: error instanceof Error ? error.message : String(error),
      })
      return { kind: 'upstream_error' }
    } finally {
      await this.repo.releaseRedemptionLease(redemption.id).catch(() => {})
    }
  }

  private async runSteps(
    redemption: RedemptionRecord,
    referrerName: string,
  ): Promise<RedeemResult> {
    let userId = redemption.userId
    let buyerCreated = redemption.buyerCreated

    // 1) Conta (idempotente por e-mail no auth; pulado na retomada).
    if (!userId) {
      const { firstName, lastName } = splitName(redemption.name)
      const res = await this.gateway.ensureBuyer({
        email: redemption.email,
        password: this.genPassword(),
        firstName,
        lastName,
        ...(redemption.phone ? { phone: redemption.phone } : {}),
        source: 'scholarship',
      })
      const resolvedUserId = readString(res.body, 'userId')
      if ((res.status !== 200 && res.status !== 201) || !resolvedUserId) {
        this.logger.warn('referrals.redeem_ensure_buyer_failed', {
          redemptionId: redemption.id,
          status: res.status,
        })
        return { kind: 'upstream_error' }
      }
      userId = resolvedUserId
      buyerCreated = res.status === 201 || readBool(res.body, 'created')
      await this.repo.setRedemptionBuyer(redemption.id, userId, buyerCreated)
    }

    // 2) Grant da oferta completa (dedupe do members por x-delivery-id ESTÁVEL +
    //    idempotência manual:userId:productId — replay é seguro).
    if (!redemption.grantedAt) {
      const res = await this.gateway.grantManualOffer({
        userId,
        offerRef: this.opts.offerSlug,
        sourceId: `scholarship:${redemption.id}`,
        expiresAt: null,
        deliveryId: `scholarship:${redemption.id}`,
      })
      if (res.status === 409) {
        // Terminal: matrícula manual revogada/expirada do mesmo produto exige
        // decisão humana (aflora no detalhe do embaixador no admin).
        await this.repo.markRedemptionFailed(redemption.id, 'grant_conflict', null)
        this.logger.warn('referrals.redeem_grant_conflict', { redemptionId: redemption.id })
        return { kind: 'failed', reason: 'grant_conflict' }
      }
      if (res.status < 200 || res.status >= 300) {
        this.logger.warn('referrals.redeem_grant_failed', {
          redemptionId: redemption.id,
          status: res.status,
        })
        return { kind: 'upstream_error' }
      }
      await this.repo.markRedemptionGranted(redemption.id, this.now())
    }

    // 3) E-mail (best-effort — o ACESSO é o produto; fallback = "esqueci minha
    //    senha"). Claim atômico: só uma execução emite token/envia.
    await this.sendWelcome(redemption, userId, buyerCreated === true, referrerName)

    return { kind: 'completed' }
  }

  private async sendWelcome(
    redemption: RedemptionRecord,
    _userId: string,
    buyerCreated: boolean,
    referrerName: string,
  ): Promise<void> {
    try {
      if (!(await this.repo.claimRedemptionWelcome(redemption.id, this.now()))) return
      const { firstName } = splitName(redemption.name)
      const base = this.opts.kidsCommunityUrl.replace(/\/$/, '')
      const idempotencyKey = `scholarship-welcome:${redemption.id}`

      let send: GatewayResult
      if (buyerCreated) {
        const tokenRes = await this.gateway.createPasswordToken(redemption.email)
        const token = readString(tokenRes.body, 'token')
        if (tokenRes.status !== 201 || !token) {
          // NADA foi emitido → libera o claim p/ uma retomada futura tentar.
          await this.repo.releaseRedemptionWelcome(redemption.id)
          this.logger.warn('referrals.redeem_token_failed', {
            redemptionId: redemption.id,
            status: tokenRes.status,
          })
          return
        }
        // Token EMITIDO: a partir daqui NUNCA liberar o claim — reemitir mataria
        // o link entregue (o auth consome tokens pendentes ao emitir um novo).
        send = await this.gateway.sendEmail(
          {
            templateKey: 'referrals-scholarship-welcome',
            recipient: { name: firstName, email: redemption.email },
            variables: {
              nome: firstName,
              indicador: referrerName,
              link: `${base}/redefinir-senha?token=${encodeURIComponent(token)}`,
            },
          },
          idempotencyKey,
        )
      } else {
        // Conta pré-existente: NÃO emite token (invalidaria um token vivo de
        // compra/convite recente) — aviso de novo acesso, template existente.
        send = await this.gateway.sendEmail(
          {
            templateKey: 'new-access',
            recipient: { name: firstName, email: redemption.email },
            variables: { nome: firstName, link: `${base}/cursos` },
          },
          idempotencyKey,
        )
      }
      if (send.status !== 202 && send.status !== 200) {
        this.logger.warn('referrals.redeem_welcome_send_failed', {
          redemptionId: redemption.id,
          status: send.status,
        })
      }
    } catch (error) {
      this.logger.warn('referrals.redeem_welcome_error', {
        redemptionId: redemption.id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

function readString(body: unknown, key: string): string | null {
  if (body && typeof body === 'object' && key in body) {
    const v = (body as Record<string, unknown>)[key]
    if (typeof v === 'string' && v.length > 0) return v
  }
  return null
}

function readBool(body: unknown, key: string): boolean {
  return Boolean(
    body && typeof body === 'object' && (body as Record<string, unknown>)[key] === true,
  )
}
