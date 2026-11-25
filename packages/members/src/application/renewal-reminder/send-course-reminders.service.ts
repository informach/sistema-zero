import { createHash } from 'node:crypto'
import type { Logger } from '@sistemazero/core/logging'
import { dueCourseReminder, oneCandidatePerCourse } from '../../domain/entitlement/course-reminders'
import type { AuthGateway } from '../../domain/ports/auth-gateway.port'
import {
  type CourseReminderCandidate,
  type CourseReminderKind,
  type CourseRemindersRepository,
  courseReminderDedupeKey,
} from '../../domain/ports/course-reminders-repository.port'
import type { MessagingGateway } from '../../domain/ports/messaging-gateway.port'
import { ACCESS_ENDED_WINDOW_MS, accessEndedLink } from './send-access-ended-messages.service'

export interface CourseRemindersOptions {
  /** URL pública do FUNIL (a página de continuidade da Comunidade, no e-mail de conclusão). */
  funnelUrl: string
  /** Base do app Kids (`KIDS_COMMUNITY_URL`): entrada do responsável e área dos pais. */
  kidsAppUrl?: string
  /** Base do app adulto (`COMMUNITY_URL`): `/cursos`. */
  adultAppUrl?: string
  /** A janela de cada lembrete (padrão 72 h, a dos avisos de fim do acesso). */
  windowMs?: number
  /** Quantas matrículas o ciclo lê (as mais novas primeiro). */
  limit?: number
}

const DEFAULT_LIMIT = 1000

/** Os templates de cada lembrete por público (contrato com o seed do Messaging). */
const TEMPLATES: Record<CourseReminderKind, { kids: string; adult: string }> = {
  course_not_started: { kids: 'course-not-started', adult: 'course-not-started-adult' },
  course_stalled: { kids: 'course-stalled', adult: 'course-stalled-adult' },
  course_completed: { kids: 'course-completed', adult: 'course-completed-adult' },
}

/**
 * Cursos PARA PAIS (25/11/2026, decisão da dona): cada um tem os seus três e-mails, escritos para
 * o conteúdo dele. Curso para pais novo sem os próprios cai nos neutros `-pais` (nunca nos da
 * criança). Curso novo para pais: escrever os três no seed do Messaging e acrescentar aqui.
 */
const PARENTS_COURSE_TEMPLATES: Record<string, Record<CourseReminderKind, string>> = {
  'transformando-o-vilao-em-aliado': {
    course_not_started: 'course-not-started-vilao-em-aliado',
    course_stalled: 'course-stalled-vilao-em-aliado',
    course_completed: 'course-completed-vilao-em-aliado',
  },
}
const PARENTS_DEFAULT_TEMPLATES: Record<CourseReminderKind, string> = {
  course_not_started: 'course-not-started-pais',
  course_stalled: 'course-stalled-pais',
  course_completed: 'course-completed-pais',
}

/**
 * Lembretes do curso (25/11/2026), e-mail ao responsável (Kids) ou à própria pessoa (adulto):
 * `course-not-started` 2 dias depois do acesso sem nenhuma aula começada, `course-stalled` 7 dias
 * depois da última atividade num curso começado e não terminado (uma vez) e `course-completed`
 * quando o curso termina, apresentando a Comunidade dos Criadores. Um lembrete por conta e curso.
 * Mark-after-send, como os avisos de fim do acesso; roda no mesmo ciclo e trava.
 */
export class SendCourseRemindersService {
  constructor(
    private readonly repository: CourseRemindersRepository,
    private readonly auth: AuthGateway,
    private readonly messaging: MessagingGateway,
    private readonly clock: () => Date,
    private readonly logger: Logger,
    private readonly opts: CourseRemindersOptions,
  ) {}

  async runCycle(): Promise<{ sent: number; skipped: number; failed: number }> {
    const now = this.clock()
    const windowMs = this.opts.windowMs ?? ACCESS_ENDED_WINDOW_MS
    const totals = { sent: 0, skipped: 0, failed: 0 }
    const candidates = oneCandidatePerCourse(
      await this.repository.listCandidates(now, this.opts.limit ?? DEFAULT_LIMIT),
    )
    for (const candidate of candidates) {
      const kind = dueCourseReminder(candidate, now, windowMs)
      if (!kind) continue
      totals[await this.send(candidate, kind)]++
    }
    if (totals.sent > 0 || totals.failed > 0) this.logger.info('course_reminders.cycle', totals)
    return totals
  }

  /** Onde a pessoa continua: o app do público (o guia dos pais, na área dos pais). */
  private linkFor(candidate: CourseReminderCandidate): string {
    const adult = candidate.audience === 'adult'
    const base = (adult ? this.opts.adultAppUrl : this.opts.kidsAppUrl)?.replace(/\/+$/, '')
    if (!base) return accessEndedLink(this.opts.funnelUrl, candidate.audience, 'curso-concluido')
    if (adult) return `${base}/cursos`
    return candidate.learner === 'parents'
      ? `${base}/pais/cursos/${encodeURIComponent(candidate.courseRef)}`
      : `${base}/login/responsavel`
  }

  private async send(
    candidate: CourseReminderCandidate,
    kind: CourseReminderKind,
  ): Promise<'sent' | 'skipped' | 'failed'> {
    const adult = candidate.audience === 'adult'
    const templateKey =
      !adult && candidate.learner === 'parents'
        ? (PARENTS_COURSE_TEMPLATES[candidate.courseRef]?.[kind] ?? PARENTS_DEFAULT_TEMPLATES[kind])
        : TEMPLATES[kind][adult ? 'adult' : 'kids']
    const dedupeOn = courseReminderDedupeKey(candidate.grantedAt)
    const mark = () =>
      this.repository.markSent(candidate.entitlementId, dedupeOn, kind, this.clock())
    try {
      const [identity] = await this.auth.getAccountIdentities([candidate.accountId])
      // Conta sem e-mail (excluída/anonimizada): marca e segue, nunca entrega.
      if (!identity) {
        await mark()
        return 'skipped'
      }
      const nome = identity.firstName || (adult ? 'Aluno(a)' : 'Responsável')
      const variables: Record<string, string> = {
        nome,
        curso: candidate.courseTitle,
        link: this.linkFor(candidate),
      }
      // A conclusão apresenta a Comunidade dos Criadores (Kids: para a criança).
      if (kind === 'course_completed')
        variables.comunidade = accessEndedLink(
          this.opts.funnelUrl,
          candidate.audience,
          'curso-concluido',
        )
      await this.messaging.sendEmail({
        templateKey,
        recipient: { name: nome, email: identity.email },
        variables,
        idempotencyKey: `${templateKey}:${createHash('sha256')
          .update([candidate.accountId, candidate.entitlementId, dedupeOn, kind].join('\u0000'))
          .digest('hex')
          .slice(0, 32)}`,
      })
      await mark()
      return 'sent'
    } catch (error) {
      this.logger.warn('course_reminders.failed', {
        entitlementId: candidate.entitlementId,
        templateKey,
        error: error instanceof Error ? error.message : String(error),
      })
      return 'failed'
    }
  }
}
