import type { Logger } from '@sistemazero/core/logging'
import { generateAmbassadorCode, generatePageToken, normalizeEmail } from '../../domain/codes'
import { splitName } from '../../domain/names'
import type { ReferralsGateway } from '../../domain/ports/gateway.port'
import type {
  AmbassadorListItem,
  AmbassadorRecord,
  RedemptionRecord,
  ReferralRepository,
} from '../../domain/ports/referral-repository.port'

export interface AmbassadorAdminOptions {
  funnelPublicUrl: string
}

export interface AmbassadorView {
  id: string
  name: string
  email: string
  code: string | null
  status: string
  pageUrl: string | null
  shareUrl: string | null
  linkEmailSentAt: string | null
  createdAt: string
}

export type CreateAmbassadorResult =
  | { kind: 'created'; ambassador: AmbassadorView; emailSent: boolean }
  | { kind: 'email_exists' }

const CODE_RETRIES = 5

/** Casos de uso do admin de embaixadores (criar/listar/detalhar/reenviar/editar). */
export class AmbassadorAdminService {
  constructor(
    private readonly repo: ReferralRepository,
    private readonly gateway: ReferralsGateway,
    private readonly opts: AmbassadorAdminOptions,
    private readonly logger: Logger,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private base(): string {
    return this.opts.funnelPublicUrl.replace(/\/$/, '')
  }

  private toView(a: AmbassadorRecord & { code: string | null }): AmbassadorView {
    return {
      id: a.id,
      name: a.name,
      email: a.email,
      code: a.code,
      status: a.status,
      pageUrl: `${this.base()}/embaixador/${a.pageToken}`,
      shareUrl: a.code ? `${this.base()}/bolsa/${a.code}` : null,
      linkEmailSentAt: a.linkEmailSentAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
    }
  }

  async create(input: { name: string; email: string }): Promise<CreateAmbassadorResult> {
    const email = normalizeEmail(input.email)
    const name = input.name.trim().slice(0, 120)

    for (let attempt = 0; attempt < CODE_RETRIES; attempt++) {
      const result = await this.repo.createAmbassadorWithCode({
        name,
        email,
        pageToken: generatePageToken(),
        code: generateAmbassadorCode(name),
      })
      if (result.kind === 'email_exists') return { kind: 'email_exists' }
      if (result.kind === 'code_collision') continue
      const view = this.toView({ ...result.ambassador, code: result.code.code })
      // E-mail do magic-link é best-effort — a resposta traz o link p/ o admin
      // copiar e mandar por qualquer canal.
      const emailSent = await this.sendLinkEmail(result.ambassador)
      return { kind: 'created', ambassador: view, emailSent }
    }
    // 5 colisões seguidas com 4 chars de entropia ≈ impossível — sinal de bug.
    throw new Error('esgotadas as tentativas de gerar código único')
  }

  /** Reenvia o e-mail do magic-link (não rotaciona o token). */
  async resendLink(id: string): Promise<{ kind: 'sent' | 'failed' } | null> {
    const ambassador = await this.repo.findAmbassadorById(id)
    if (!ambassador) return null
    const sent = await this.sendLinkEmail(ambassador)
    return { kind: sent ? 'sent' : 'failed' }
  }

  private async sendLinkEmail(ambassador: AmbassadorRecord): Promise<boolean> {
    try {
      const seq = await this.repo.bumpLinkEmail(ambassador.id)
      const res = await this.gateway.sendEmail(
        {
          templateKey: 'referrals-ambassador-link',
          recipient: { name: splitName(ambassador.name).firstName, email: ambassador.email },
          variables: {
            nome: splitName(ambassador.name).firstName,
            link: `${this.base()}/embaixador/${ambassador.pageToken}`,
          },
        },
        `ambassador-link:${ambassador.id}:${seq}`,
      )
      if (res.status === 202 || res.status === 200) {
        await this.repo.markLinkEmailSent(ambassador.id, this.now())
        return true
      }
      this.logger.warn('referrals.ambassador_link_send_failed', {
        ambassadorId: ambassador.id,
        status: res.status,
      })
      return false
    } catch (error) {
      this.logger.warn('referrals.ambassador_link_send_error', {
        ambassadorId: ambassador.id,
        error: error instanceof Error ? error.message : String(error),
      })
      return false
    }
  }

  async list(opts: {
    q?: string
    limit: number
    offset: number
  }): Promise<{ items: AmbassadorListItem[]; total: number }> {
    return this.repo.listAmbassadors(opts)
  }

  async detail(
    id: string,
  ): Promise<{ ambassador: AmbassadorView; redemptions: RedemptionRecord[] } | null> {
    const ambassador = await this.repo.findAmbassadorById(id)
    if (!ambassador) return null
    let redemptions: RedemptionRecord[] = []
    if (ambassador.code) {
      const code = await this.repo.findCodeByCode(ambassador.code)
      if (code) redemptions = await this.repo.listRedemptionsByCode(code.id, 200)
    }
    return { ambassador: this.toView(ambassador), redemptions }
  }

  async patch(
    id: string,
    input: { status?: 'active' | 'disabled'; rotateToken?: boolean },
  ): Promise<AmbassadorView | null> {
    const existing = await this.repo.findAmbassadorById(id)
    if (!existing) return null
    if (input.status && input.status !== existing.status) {
      await this.repo.setAmbassadorStatus(id, input.status)
      // O código acompanha o embaixador (desativado = landing 404 uniforme).
      await this.repo.setAmbassadorCodeStatus(id, input.status)
    }
    if (input.rotateToken) {
      await this.repo.rotatePageToken(id, generatePageToken())
    }
    const updated = await this.repo.findAmbassadorById(id)
    return updated ? this.toView(updated) : null
  }
}
