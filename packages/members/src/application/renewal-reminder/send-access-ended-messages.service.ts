import { createHash } from 'node:crypto'
import type { Logger } from '@sistemazero/core/logging'
import { ADULT_MURAL_FULL_REF, MURAL_FULL_REF } from '../../domain/entitlement/mural-visitor'
import type { AuthGateway } from '../../domain/ports/auth-gateway.port'
import type { MessagingGateway } from '../../domain/ports/messaging-gateway.port'
import {
  type AccessEndedKind,
  type AccessEndedMessagesRepository,
  BONUS_DAYS_KIND,
  type BonusDaysEntitlement,
  type EndedSubscriptionEntitlement,
  expiresOnKey,
  type GiftLifecycleEntitlement,
} from '../../domain/ports/renewal-reminder-repository.port'

export interface AccessEndedMessagesOptions {
  /** URL pública do FUNIL (base das páginas de continuidade Kids e adulta). */
  funnelUrl: string
  /** Só avisa o que venceu nesta janela (default `ACCESS_ENDED_WINDOW_MS`, 72 h). */
  windowMs?: number
  /** Teto de grupos por tipo e por ciclo (o próximo ciclo continua). */
  batchLimit?: number
  /** Base do app Kids (o responsável entra para a criança continuar). Sem ela, a continuidade. */
  kidsAppUrl?: string
  /** Base do app adulto (`/cursos`). Sem ela, a continuidade adulta. */
  adultAppUrl?: string
}

/**
 * Quanto o aviso de "terminou" olha para trás. 72 h cobrem ciclos perdidos (o ciclo roda no boot
 * e a cada 6 h, e um período de deploys frequentes ou fora do ar não pode pular o e-mail) sem
 * avisar vencimentos antigos quando o job estreia. Reenvio é impossível: o dedupe é por
 * matrícula + data + tipo (`entitlement_lifecycle_messages_sent`) e o idempotency key do
 * Messaging absorve o crash entre envio e marcação.
 */
export const ACCESS_ENDED_WINDOW_MS = 72 * 60 * 60 * 1000
const DEFAULT_BATCH_LIMIT = 200

const KIDS_CONTINUITY_PATH = '/kids/comunidade-dos-criadores/oferta/continuar'
const ADULT_CONTINUITY_PATH = '/pro/comunidade-dos-criadores/oferta/continuar'

/** O link da página de continuidade com as UTMs do e-mail. */
export function accessEndedLink(
  funnelUrl: string,
  audience: 'kids' | 'adult',
  campaign: 'fim-do-presente' | 'assinatura-encerrada' | 'desafio-concluido' | 'desafio-encerrado',
  content?: '2-dias' | 'no-dia',
): string {
  const url = new URL(
    `${funnelUrl.replace(/\/+$/, '')}${audience === 'adult' ? ADULT_CONTINUITY_PATH : KIDS_CONTINUITY_PATH}`,
  )
  url.searchParams.set('utm_source', 'email')
  url.searchParams.set('utm_medium', 'email')
  url.searchParams.set('utm_campaign', campaign)
  if (content) url.searchParams.set('utm_content', content)
  return url.toString()
}

/** `dd/mm/aaaa` no calendário de São Paulo (igual aos avisos do Desafio). */
function ddmmyyyySaoPaulo(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

/** Matrículas do Mural COMPLETO (Kids e adulto): o presente que as inclui ganha a frase do Mural. */
const FULL_MURAL_REFS: ReadonlySet<string> = new Set([MURAL_FULL_REF, ADULT_MURAL_FULL_REF])

/** Curso sem título conhecido (presente sem curso, ou curso removido). */
const UNKNOWN_GIFT_COURSE = 'do presente'

/**
 * A frase do Mural nos avisos de fim (o Messaging não tem condicional: vai pronta, ou vazia
 * quando o presente não incluía o Mural).
 */
const GIFT_MURAL_TEXT = {
  kids: {
    gift_expiry_2d:
      'Até lá, a criança também pode publicar o jogo no Mural dos Criadores e mandar o link para a família.',
    gift_expired: 'A conta continua podendo ver e jogar no Mural dos Criadores.',
  },
  adult: {
    gift_expiry_2d:
      'Até lá, você também publica o jogo no Mural adulto e manda o link para quem quiser.',
    gift_expired: 'A sua conta continua podendo ver e jogar no Mural adulto.',
  },
} as const

function idempotencyKey(templateKey: string, parts: readonly string[]): string {
  const hash = createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 32)
  return `${templateKey}:${hash}`
}

function groupBy<T>(rows: readonly T[], key: (row: T) => string): T[][] {
  const groups = new Map<string, T[]>()
  for (const row of rows) {
    const list = groups.get(key(row))
    if (list) list.push(row)
    else groups.set(key(row), [row])
  }
  return [...groups.values()]
}

/**
 * Avisos de FIM DO ACESSO (20/10/2026), e-mail ao responsável/titular da conta:
 *
 * - Presente com prazo (resgate `scholarship:`): `gift-expiry-2d` dois dias antes e
 *   `gift-expired` no dia em que termina. Um e-mail por presente (curso + Mural temporário do
 *   mesmo resgate são um grupo). Presente adulto: `gift-expiry-2d-adult`/`gift-expired-adult`,
 *   mesmas variáveis, link da continuidade adulta. Desde 15/11/2026 levam `curso` (título do
 *   curso presenteado) e `mural` (frase pronta, vazia sem o Mural): o presente é uma oferta.
 * - Assinatura da Comunidade que venceu: `subscription-ended-kids` ou `-adult`, um e-mail por
 *   conta + assinatura (o combo cria várias matrículas). Só se não houver outro acesso ativo à
 *   Comunidade da mesma audiência (o repositório decide).
 *
 * Mark-after-send, como o lembrete anual: o idempotency key do Messaging absorve o retry.
 */
export class SendAccessEndedMessagesService {
  constructor(
    private readonly repository: AccessEndedMessagesRepository,
    private readonly auth: AuthGateway,
    private readonly messaging: MessagingGateway,
    private readonly clock: () => Date,
    private readonly logger: Logger,
    private readonly opts: AccessEndedMessagesOptions,
  ) {}

  async runCycle(): Promise<{ sent: number; skipped: number; failed: number }> {
    const now = this.clock()
    const windowMs = this.opts.windowMs ?? ACCESS_ENDED_WINDOW_MS
    const limit = this.opts.batchLimit ?? DEFAULT_BATCH_LIMIT
    const totals = { sent: 0, skipped: 0, failed: 0 }

    const gifts = await this.repository.listGiftLifecycleEntitlements(now, windowMs, limit)
    for (const group of groupBy(
      gifts,
      (row) => `${row.userId}|${row.sourceId}|${row.expiresAt.toISOString()}|${row.messageKind}`,
    ))
      this.count(totals, await this.sendGift(group))

    // Dias de surpresa (25/11/2026): no fim do prazo divulgado, ainda com acesso.
    const bonus = await this.repository.listBonusDaysEntitlements(now, windowMs, limit)
    for (const group of groupBy(
      bonus,
      (row) => `${row.userId}|${row.sourceId}|${row.expiresAt.toISOString()}`,
    ))
      this.count(totals, await this.sendBonusDays(group))

    const ended = await this.repository.listEndedCommunitySubscriptions(now, windowMs, limit)
    for (const group of groupBy(
      ended,
      (row) => `${row.userId}|${row.subscriptionId}|${row.audience}`,
    ))
      this.count(totals, await this.sendSubscriptionEnded(group))

    if (totals.sent > 0 || totals.failed > 0)
      this.logger.info('access_ended_messages.cycle', totals)
    return totals
  }

  private count(
    totals: { sent: number; skipped: number; failed: number },
    outcome: 'sent' | 'skipped' | 'failed',
  ) {
    totals[outcome]++
  }

  private async sendGift(group: GiftLifecycleEntitlement[]) {
    const first = group[0]
    if (!first) return 'skipped' as const
    const expired = first.messageKind === 'gift_expired'
    // Presente adulto (20/10/2026): templates `-adult` com as MESMAS variáveis e a continuidade
    // adulta. O Kids continua com as chaves e o link de sempre.
    const adult = first.audience === 'adult'
    const baseKey = expired ? 'gift-expired' : 'gift-expiry-2d'
    const templateKey = adult ? `${baseKey}-adult` : baseKey
    const link = accessEndedLink(
      this.opts.funnelUrl,
      adult ? 'adult' : 'kids',
      'fim-do-presente',
      expired ? 'no-dia' : '2-dias',
    )
    // Curso e Mural do PRÓPRIO presente (15/11/2026, presente por oferta): o e-mail não fixa
    // mais o Cadê Todo Mundo nem os sete dias.
    const curso = group.find((row) => row.courseTitle)?.courseTitle ?? UNKNOWN_GIFT_COURSE
    const mural = group.some((row) => row.courseRef && FULL_MURAL_REFS.has(row.courseRef))
      ? GIFT_MURAL_TEXT[adult ? 'adult' : 'kids'][first.messageKind]
      : ''
    return this.deliver({
      userId: first.userId,
      templateKey,
      fallbackName: adult ? 'Aluno(a)' : 'Responsável',
      variables: (nome): Record<string, string> =>
        expired
          ? { nome, curso, mural, link }
          : { nome, curso, mural, data: ddmmyyyySaoPaulo(first.expiresAt), link },
      idempotency: [first.userId, first.sourceId, expiresOnKey(first.expiresAt)],
      marks: group.map((row) => ({
        id: row.id,
        expiresOn: expiresOnKey(row.expiresAt),
        kind: row.messageKind,
      })),
      logContext: { entitlementId: first.id, messageKind: first.messageKind },
    })
  }

  /**
   * `gift-bonus-days` (Kids, ao responsável) ou `gift-bonus-days-adult`: "você ganhou mais N dias".
   * `data` é o fim REAL; o link leva ao app (Kids: entrada do responsável; adulto: `/cursos`).
   */
  private async sendBonusDays(group: BonusDaysEntitlement[]) {
    const first = group[0]
    if (!first || first.extraDays < 1) return 'skipped' as const
    const adult = first.audience === 'adult'
    const templateKey = adult ? 'gift-bonus-days-adult' : 'gift-bonus-days'
    const appBase = (adult ? this.opts.adultAppUrl : this.opts.kidsAppUrl)?.replace(/\/+$/, '')
    const link = appBase
      ? `${appBase}${adult ? '/cursos' : '/login/responsavel'}`
      : accessEndedLink(this.opts.funnelUrl, adult ? 'adult' : 'kids', 'fim-do-presente')
    const curso = first.courseTitle ?? UNKNOWN_GIFT_COURSE
    const dias = first.extraDays === 1 ? '1 dia' : `${first.extraDays} dias`
    return this.deliver({
      userId: first.userId,
      templateKey,
      fallbackName: adult ? 'Aluno(a)' : 'Responsável',
      variables: (nome) => ({ nome, curso, dias, data: ddmmyyyySaoPaulo(first.expiresAt), link }),
      idempotency: [first.userId, first.sourceId, expiresOnKey(first.expiresAt), BONUS_DAYS_KIND],
      marks: group.map((row) => ({
        id: row.id,
        expiresOn: expiresOnKey(row.expiresAt),
        kind: BONUS_DAYS_KIND,
      })),
      logContext: { entitlementId: first.id, messageKind: BONUS_DAYS_KIND },
    })
  }

  private async sendSubscriptionEnded(group: EndedSubscriptionEntitlement[]) {
    const first = group[0]
    if (!first) return 'skipped' as const
    const templateKey =
      first.audience === 'adult' ? 'subscription-ended-adult' : 'subscription-ended-kids'
    const link = accessEndedLink(this.opts.funnelUrl, first.audience, 'assinatura-encerrada')
    return this.deliver({
      userId: first.userId,
      templateKey,
      fallbackName: first.audience === 'adult' ? 'Aluno(a)' : 'Responsável',
      variables: (nome) => ({ nome, link }),
      idempotency: [first.userId, first.subscriptionId, expiresOnKey(first.endedAt)],
      marks: group.map((row) => ({
        id: row.id,
        expiresOn: expiresOnKey(row.endedAt),
        kind: 'subscription_ended' as const,
      })),
      logContext: { entitlementId: first.id, messageKind: 'subscription_ended' },
    })
  }

  private async deliver(input: {
    userId: string
    templateKey: string
    fallbackName: string
    variables: (nome: string) => Record<string, string>
    idempotency: readonly string[]
    marks: { id: string; expiresOn: string; kind: AccessEndedKind }[]
    logContext: Record<string, unknown>
  }): Promise<'sent' | 'skipped' | 'failed'> {
    const mark = async () => {
      for (const item of input.marks)
        await this.repository.markAccessEndedMessageSent(
          item.id,
          item.expiresOn,
          item.kind,
          this.clock(),
        )
    }
    try {
      const [identity] = await this.auth.getAccountIdentities([input.userId])
      // Conta sem e-mail (excluída/anonimizada): marca e segue, nunca entrega.
      if (!identity) {
        await mark()
        return 'skipped'
      }
      const nome = identity.firstName || input.fallbackName
      await this.messaging.sendEmail({
        templateKey: input.templateKey,
        recipient: { name: nome, email: identity.email },
        variables: input.variables(nome),
        idempotencyKey: idempotencyKey(input.templateKey, input.idempotency),
      })
      await mark()
      return 'sent'
    } catch (error) {
      this.logger.warn('access_ended_messages.group_failed', {
        ...input.logContext,
        templateKey: input.templateKey,
        error: error instanceof Error ? error.message : String(error),
      })
      return 'failed'
    }
  }
}
