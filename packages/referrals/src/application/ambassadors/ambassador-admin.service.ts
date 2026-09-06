import type { Logger } from '@sistemazero/core/logging'
import { generateAmbassadorCode, generatePageToken, normalizeEmail } from '../../domain/codes'
import { ambassadorPageUrl, scholarshipShareUrl } from '../../domain/links'
import { splitName } from '../../domain/names'
import type { ReferralsGateway } from '../../domain/ports/gateway.port'
import type {
  AmbassadorListItem,
  AmbassadorRecord,
  ConversionRecord,
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
  /** Corrida de auto-cadastro: a UNIQUE parcial da conta venceu antes (quem chamou re-busca). */
  | { kind: 'account_exists' }

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

  /** View com os links do funil — TAMBÉM usada pelas rotas "me" (fonte única). */
  viewOf(a: AmbassadorRecord & { code: string | null }): AmbassadorView {
    return {
      id: a.id,
      name: a.name,
      email: a.email,
      code: a.code,
      status: a.status,
      pageUrl: ambassadorPageUrl(this.opts.funnelPublicUrl, a.pageToken),
      shareUrl: a.code ? scholarshipShareUrl(this.opts.funnelPublicUrl, a.code) : null,
      linkEmailSentAt: a.linkEmailSentAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
    }
  }

  private toView(a: AmbassadorRecord & { code: string | null }): AmbassadorView {
    return this.viewOf(a)
  }

  async create(input: {
    name: string
    email: string
    accountUserId?: string | null
  }): Promise<CreateAmbassadorResult> {
    const email = normalizeEmail(input.email)
    const name = input.name.trim().slice(0, 120)

    for (let attempt = 0; attempt < CODE_RETRIES; attempt++) {
      const result = await this.repo.createAmbassadorWithCode({
        name,
        email,
        pageToken: generatePageToken(),
        code: generateAmbassadorCode(name),
        accountUserId: input.accountUserId ?? null,
      })
      if (result.kind === 'email_exists') return { kind: 'email_exists' }
      if (result.kind === 'account_exists') return { kind: 'account_exists' }
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

  /**
   * Auto-cadastro do pai/responsável (área dos pais): get-or-create pela CONTA.
   * E-mail que já é embaixador externo (cadastro admin) é VINCULADO em vez de
   * duplicado; e-mail preso a OUTRA conta → conflito (aflora ao suporte).
   */
  async selfEnroll(input: {
    accountUserId: string
    email: string
    name: string
  }): Promise<
    { kind: 'ok'; ambassador: AmbassadorView; created: boolean } | { kind: 'email_conflict' }
  > {
    const email = normalizeEmail(input.email)
    const byAccount = await this.repo.findAmbassadorByAccount(input.accountUserId)
    if (byAccount) return { kind: 'ok', ambassador: this.toView(byAccount), created: false }

    const linked = await this.repo.linkAmbassadorAccount(email, input.accountUserId)
    if (linked) return { kind: 'ok', ambassador: this.toView(linked), created: false }

    const created = await this.create({
      name: input.name,
      email,
      accountUserId: input.accountUserId,
    })
    if (created.kind === 'created') {
      return { kind: 'ok', ambassador: created.ambassador, created: true }
    }
    if (created.kind === 'account_exists') {
      // Corrida de dois selfEnroll da MESMA conta: o outro request venceu a
      // UNIQUE parcial — re-buscar pela conta devolve o registro dele.
      const raced = await this.repo.findAmbassadorByAccount(input.accountUserId)
      if (raced) return { kind: 'ok', ambassador: this.toView(raced), created: false }
      return { kind: 'email_conflict' }
    }
    // email_exists: corrida com outro request (mesma conta) OU e-mail de outra
    // conta — o retry do link resolve a corrida; o resto é conflito real.
    const retry = await this.repo.linkAmbassadorAccount(email, input.accountUserId)
    if (retry) return { kind: 'ok', ambassador: this.toView(retry), created: false }
    return { kind: 'email_conflict' }
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
            link: ambassadorPageUrl(this.opts.funnelPublicUrl, ambassador.pageToken),
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

  async detail(id: string): Promise<{
    ambassador: AmbassadorView
    redemptions: RedemptionRecord[]
    /** Jornada: resgate → assinou a Comunidade (conversão) — chave = redemptionId. */
    conversionByRedemption: Map<string, ConversionRecord>
  } | null> {
    const ambassador = await this.repo.findAmbassadorById(id)
    if (!ambassador) return null
    let redemptions: RedemptionRecord[] = []
    const conversionByRedemption = new Map<string, ConversionRecord>()
    if (ambassador.code) {
      const code = await this.repo.findCodeByCode(ambassador.code)
      if (code) {
        const [reds, convs] = await Promise.all([
          this.repo.listRedemptionsByCode(code.id, 200),
          this.repo.listConversionsByCode(code.id, 200),
        ])
        redemptions = reds
        for (const c of convs) conversionByRedemption.set(c.redemptionId, c)
      }
    }
    return { ambassador: this.toView(ambassador), redemptions, conversionByRedemption }
  }

  async patch(
    id: string,
    input: { status?: 'active' | 'disabled'; rotateToken?: boolean },
  ): Promise<AmbassadorView | null> {
    const patch: { status?: 'active' | 'disabled'; pageToken?: string } = {}
    if (input.status) patch.status = input.status
    if (input.rotateToken) patch.pageToken = generatePageToken()
    if (patch.status === undefined && patch.pageToken === undefined) {
      const existing = await this.repo.findAmbassadorById(id)
      return existing ? this.toView(existing) : null
    }
    // Embaixador + código na MESMA transação (desativado = landing 404
    // uniforme) — sem janela "embaixador off, código ainda on".
    const updated = await this.repo.updateAmbassador(id, patch)
    return updated ? this.toView(updated) : null
  }
}
