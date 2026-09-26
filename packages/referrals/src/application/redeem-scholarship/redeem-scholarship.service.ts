import { randomBytes } from 'node:crypto'
import type { Logger } from '@sistemazero/core/logging'
import { isValidCode, normalizeCode, normalizeEmail } from '../../domain/codes'
import { scholarshipExpiresAt } from '../../domain/gift-policy'
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
  | { kind: 'gift_unavailable' }
  | { kind: 'failed'; reason: string }
  | { kind: 'upstream_error' }

export interface RedeemOptions {
  /** Curso kids concedido pela indicação, sem a assinatura da Comunidade. */
  courseSlug: string
  /** Base do app kids (a bolsa v1 é kids) p/ o link de senha/cursos. */
  kidsCommunityUrl: string
  leaseMs: number
}

/**
 * Resgate do curso-presente — disponibilidade → CONTA → GRANT → E-MAIL:
 * se o e-mail falhar, o acesso já existe; se o grant falhar, nenhum e-mail
 * mentiroso saiu. Retomável por etapas (colunas user_id/granted_at/
 * welcome_sent_at): falha transitória devolve 502, curso indisponível devolve 503,
 * e a PRÓXIMA submissão do
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

  async giftAvailability(): Promise<'available' | 'unavailable' | 'upstream_error'> {
    const res = await this.gateway.getGiftAvailability(this.opts.courseSlug)
    if (res.status !== 200) {
      this.logger.warn('referrals.gift_availability_failed', { status: res.status })
      return 'upstream_error'
    }
    const available = readBoolean(res.body, 'available')
    if (available === null) {
      this.logger.error('referrals.gift_availability_invalid_response', { status: res.status })
      return 'upstream_error'
    }
    return available ? 'available' : 'unavailable'
  }

  async execute(input: RedeemInput): Promise<RedeemResult> {
    const code = normalizeCode(input.code)
    if (!isValidCode(code)) return { kind: 'code_not_found' }
    const codeRecord = await this.repo.findCodeByCode(code)
    // 404 uniforme (inexistente OU desativado) — não vazar qual dos dois.
    if (codeRecord?.status !== 'active') return { kind: 'code_not_found' }

    const email = normalizeEmail(input.email)
    const name = input.name.trim().slice(0, 120)
    const phone = normalizePhone(input.phone)

    // Resgate novo só começa quando o curso está publicado. O 409 de um resgate
    // concluído continua reconhecível mesmo se o curso sair do catálogo depois.
    const existing = await this.repo.findRedemptionByEmail(email)
    if (existing?.status !== 'completed') {
      const availability = await this.giftAvailability()
      if (availability === 'unavailable') return { kind: 'gift_unavailable' }
      if (availability === 'upstream_error') return { kind: 'upstream_error' }
    }

    // Claim da bolsa: 1 por e-mail, GLOBAL. Conflito devolve a linha existente —
    // completed = 409; pending/failed = RETOMADA (o 1º claim vence o code_id).
    const { created, redemption } = await this.repo.insertRedemption({
      codeId: codeRecord.id,
      email,
      name,
      phone,
    })
    if (!created && redemption.status === 'completed') {
      // Grant já concluiu mas o welcome pode ter ficado pelo caminho (crash entre
      // o completed e o e-mail): retoma SÓ o e-mail. O claim atômico do welcome
      // já é o mutex desta etapa — dispensa o lease (que exclui completed).
      if (!redemption.welcomeSentAt) {
        await this.sendWelcome(redemption, redemption.buyerCreated === true, codeRecord.displayName)
      }
      return { kind: 'already_redeemed' }
    }

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
        await this.repo
          .recordRedemptionError(redemption.id, upstreamErrorSummary('ensure-buyer', res))
          .catch(() => {})
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

    // 2) Grant do curso indicado (dedupe do members por x-delivery-id ESTÁVEL +
    //    idempotência manual:userId:productId — replay é seguro).
    if (!redemption.grantedAt) {
      const expiresAt = scholarshipExpiresAt(redemption.createdAt, redemption.accessDurationDays)
      if (expiresAt && this.now().getTime() >= expiresAt.getTime()) {
        await this.repo.markRedemptionFailed(redemption.id, 'gift_window_elapsed', null)
        return { kind: 'failed', reason: 'gift_window_elapsed' }
      }
      const res = await this.gateway.grantManualCourse({
        userId,
        courseRef: this.opts.courseSlug,
        sourceId: `scholarship:${redemption.id}`,
        expiresAt: expiresAt?.toISOString() ?? null,
        // A versão do presente integra a chave: uma entrega antiga da OFERTA
        // não pode deduplicar o novo grant do CURSO no members.
        deliveryId: `scholarship:course:${this.opts.courseSlug}:${redemption.id}`,
      })
      if (res.status === 409) {
        // Terminal: matrícula manual revogada/expirada do mesmo produto exige
        // decisão humana (aflora no detalhe do embaixador no admin).
        await this.repo.markRedemptionFailed(redemption.id, 'grant_conflict', null)
        this.logger.warn('referrals.redeem_grant_conflict', { redemptionId: redemption.id })
        return { kind: 'failed', reason: 'grant_conflict' }
      }
      if (res.status === 503 && readErrorCode(res.body) === 'COURSE_UNAVAILABLE') {
        // Publicação mudou entre o preflight e o grant. A linha fica pendente
        // para retomar quando o curso voltar; jamais enviamos boas-vindas falsas.
        await this.repo
          .recordRedemptionError(redemption.id, upstreamErrorSummary('grant', res))
          .catch(() => {})
        return { kind: 'gift_unavailable' }
      }
      if (res.status < 200 || res.status >= 300) {
        // O pending fica retryável, mas o motivo aflora no admin (lastError) —
        // sem isso um contrato ou slug errado seria invisível até ler os logs.
        await this.repo
          .recordRedemptionError(redemption.id, upstreamErrorSummary('grant', res))
          .catch(() => {})
        this.logger.warn('referrals.redeem_grant_failed', {
          redemptionId: redemption.id,
          status: res.status,
          errorCode: readErrorCode(res.body),
        })
        return { kind: 'upstream_error' }
      }
      if (expiresAt && this.now().getTime() >= expiresAt.getTime()) {
        await this.repo.markRedemptionFailed(redemption.id, 'gift_window_elapsed', null)
        return { kind: 'failed', reason: 'gift_window_elapsed' }
      }
      await this.repo.markCourseGranted(redemption.id, this.now())
    }

    if (redemption.muralVisitorPolicy === 'visitor' && !redemption.muralVisitorGrantedAt) {
      const res = await this.gateway.grantMuralVisitor({
        userId,
        sourceId: `scholarship:${redemption.id}`,
        deliveryId: `scholarship:mural-visitor:${redemption.id}`,
      })
      if (res.status === 409) {
        await this.repo.markRedemptionFailed(redemption.id, 'mural_grant_conflict', null)
        this.logger.warn('referrals.redeem_mural_grant_conflict', { redemptionId: redemption.id })
        return { kind: 'failed', reason: 'mural_grant_conflict' }
      }
      if (res.status < 200 || res.status >= 300) {
        await this.repo
          .recordRedemptionError(redemption.id, upstreamErrorSummary('mural-grant', res))
          .catch(() => {})
        this.logger.warn('referrals.redeem_mural_grant_failed', {
          redemptionId: redemption.id,
          status: res.status,
          errorCode: readErrorCode(res.body),
        })
        return { kind: 'upstream_error' }
      }
      await this.repo.markMuralVisitorGranted(redemption.id, this.now())
    }

    const expiresAt = scholarshipExpiresAt(redemption.createdAt, redemption.accessDurationDays)
    if (expiresAt && this.now().getTime() >= expiresAt.getTime()) {
      await this.repo.markRedemptionFailed(redemption.id, 'gift_window_elapsed', null)
      return { kind: 'failed', reason: 'gift_window_elapsed' }
    }

    await this.repo.markRedemptionGranted(redemption.id, this.now())

    // 3) E-mail (best-effort — o ACESSO é o produto; fallback = "esqueci minha
    //    senha"). Claim atômico: só uma execução emite token/envia.
    await this.sendWelcome(redemption, buyerCreated === true, referrerName)

    return { kind: 'completed' }
  }

  private async sendWelcome(
    redemption: RedemptionRecord,
    buyerCreated: boolean,
    referrerName: string,
  ): Promise<void> {
    try {
      const expiresAt = scholarshipExpiresAt(redemption.createdAt, redemption.accessDurationDays)
      if (expiresAt && this.now().getTime() >= expiresAt.getTime()) {
        this.logger.warn('referrals.redeem_welcome_expired', { redemptionId: redemption.id })
        return
      }
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
            templateKey: expiresAt
              ? 'referrals-scholarship-welcome-7d'
              : 'referrals-scholarship-welcome',
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
        // compra/convite recente). A política do resgate escolhe o aviso correto.
        send = await this.gateway.sendEmail(
          {
            templateKey: expiresAt ? 'referrals-scholarship-existing-7d' : 'new-access',
            recipient: { name: firstName, email: redemption.email },
            variables: {
              nome: firstName,
              ...(expiresAt ? { indicador: referrerName } : {}),
              link: `${base}/cursos`,
            },
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

function readBoolean(body: unknown, key: string): boolean | null {
  if (!body || typeof body !== 'object' || !(key in body)) return null
  const value = (body as Record<string, unknown>)[key]
  return typeof value === 'boolean' ? value : null
}

/** Código de erro do envelope `{error: {code}}` (gateway/serviços) ou `{error: '<code>'}` (members). */
function readErrorCode(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const err = (body as { error?: unknown }).error
  if (typeof err === 'string' && err.length > 0) return err
  if (err && typeof err === 'object') {
    const code = (err as { code?: unknown }).code
    if (typeof code === 'string' && code.length > 0) return code
  }
  return null
}

/** Resumo compacto `etapa:status[:código]` gravado em `last_error` (diagnóstico do admin). */
function upstreamErrorSummary(step: string, res: GatewayResult): string {
  const code = readErrorCode(res.body)
  return (code ? `${step}:${res.status}:${code}` : `${step}:${res.status}`).slice(0, 300)
}
