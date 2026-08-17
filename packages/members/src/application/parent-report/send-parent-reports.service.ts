import type { Logger } from '@sistemazero/core/logging'
import { localDateSaoPaulo } from '../../domain/gamification/gamification'
import { weekBoundsUtc, weeklyPeriodKey } from '../../domain/gamification/missions'
import type { AuthGateway } from '../../domain/ports/auth-gateway.port'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'
import type { MessagingGateway } from '../../domain/ports/messaging-gateway.port'
import type { ParentReportRepository } from '../../domain/ports/parent-report-repository.port'
import type { StudioSubmissionRepository } from '../../domain/ports/studio-submission-repository.port'
import type {
  ChildStatsView,
  GetChildrenStatsService,
} from '../children-stats/get-children-stats.service'

export interface ParentReportOptions {
  /** Dia da semana do gatilho (0=domingo … 6=sábado; default 5 = sexta). */
  dow: number
  /** Hora local SP do gatilho (default 17). */
  hour: number
  /** Teto de contas processadas por CICLO (o próximo ciclo continua o resto). */
  batchLimit?: number
  /** URL pública do app kids (CTA do e-mail — Área dos pais). */
  kidsUrl?: string
}

const DEFAULT_BATCH_LIMIT = 200

/** `DD/MM` a partir de `YYYY-MM-DD`. */
function ddmm(dayKey: string): string {
  return `${dayKey.slice(8, 10)}/${dayKey.slice(5, 7)}`
}

/** Linhas do resumo de UM filho (texto puro; o template preserva as quebras). */
function childSummary(name: string, stats: ChildStatsView): string {
  const w = stats.week
  const lines: string[] = [`⭐ ${name}`]
  if (w.xpEarned > 0) lines.push(`   • ${w.xpEarned} XP conquistados`)
  if (w.lessonsCompleted > 0) {
    lines.push(
      `   • ${w.lessonsCompleted} ${w.lessonsCompleted === 1 ? 'aula concluída' : 'aulas concluídas'}`,
    )
  }
  if (w.quizzesPassed > 0) {
    lines.push(
      `   • ${w.quizzesPassed} ${w.quizzesPassed === 1 ? 'quiz aprovado' : 'quizzes aprovados'}`,
    )
  }
  if (w.submissionsSubmitted > 0) {
    lines.push(
      `   • ${w.submissionsSubmitted} ${w.submissionsSubmitted === 1 ? 'entrega enviada' : 'entregas enviadas'}`,
    )
  }
  if (w.badgesUnlocked > 0) {
    lines.push(
      `   • ${w.badgesUnlocked} ${w.badgesUnlocked === 1 ? 'conquista nova' : 'conquistas novas'}`,
    )
  }
  for (const game of stats.games ?? []) {
    lines.push(`   • 🎮 Publicou o jogo "${game.title}" no Mural!`)
  }
  if (lines.length === 1) lines.push('   • Semana tranquila, sem atividade registrada.')
  return lines.join('\n')
}

/**
 * REPORT SEMANAL dos pais (Fase 5, 07/2026): toda sexta 17h SP (envs
 * PARENT_REPORT_DOW/HOUR), um e-mail por CONTA com o resumo da SEMANA CORRENTE
 * parcial (seg→agora) de cada filho + jogos publicados no Mural. Roda num ciclo
 * HORÁRIO (composition-root, advisory lock — 1 réplica): a condição é "o report
 * da semana X ainda não saiu E o gatilho já passou" — CATCH-UP natural se o
 * serviço estava fora na sexta (sábado/domingo ainda envia; segunda vira a
 * semana nova e a antiga fica para trás, decisão do plano).
 *
 * Crash-safety: marca o envio APÓS o e-mail sair; um crash entre enviar e marcar
 * re-tenta no próximo ciclo e o DEDUPE do messaging (idempotencyKey
 * `weekly-report:<conta>:<semana>`) absorve o duplo envio.
 */
export class SendParentReportsService {
  constructor(
    private readonly gamification: GamificationRepository,
    private readonly studio: StudioSubmissionRepository,
    private readonly childrenStats: GetChildrenStatsService,
    private readonly reports: ParentReportRepository,
    private readonly auth: AuthGateway,
    private readonly messaging: MessagingGateway,
    private readonly clock: () => Date,
    private readonly logger: Logger,
    private readonly opts: ParentReportOptions,
  ) {}

  /** O gatilho da semana corrente já passou? (dia/hora civis de SP — UTC-3 fixo). */
  isDue(now: Date): boolean {
    const dayKey = localDateSaoPaulo(now)
    // Índice SEGUNDA-based (seg=0 … dom=6): a semana `w:` começa na segunda, então
    // o DOMINGO é o último dia — vem DEPOIS do gatilho de sexta (com JS dom=0 a
    // comparação crua falharia).
    const mondayBased = (d: number) => (d + 6) % 7
    const dowSp = mondayBased(new Date(`${dayKey}T00:00:00Z`).getUTCDay())
    const trigger = mondayBased(this.opts.dow)
    const hourSp = (now.getUTCHours() - 3 + 24) % 24
    return dowSp > trigger || (dowSp === trigger && hourSp >= this.opts.hour)
  }

  async runCycle(): Promise<{ sent: number; skipped: number; failed: number }> {
    const now = this.clock()
    if (!this.isDue(now)) return { sent: 0, skipped: 0, failed: 0 }

    const today = localDateSaoPaulo(now)
    const weekKey = weeklyPeriodKey(today)
    const { from: weekFrom } = weekBoundsUtc(weekKey)
    const weekLabel = `${ddmm(weekKey.replace(/^w:/, ''))} a ${ddmm(today)}`

    // Enumeração: contas com XP na semana ∪ contas com ENTREGA de atividade na
    // semana (fecha o buraco da atividade sem XP novo). Distinct, kids-only.
    const [xpAccounts, studioAccounts] = await Promise.all([
      this.gamification.listActiveAccountsInPeriod('kids', weekFrom, now),
      this.studio.listAccountsSubmittedInPeriod('kids', weekFrom, now),
    ])
    const candidates = [...new Set([...xpAccounts, ...studioAccounts])]
    if (candidates.length === 0) return { sent: 0, skipped: 0, failed: 0 }

    const [sentSet, disabledSet] = await Promise.all([
      this.reports.listSentAccounts(weekKey, candidates),
      this.reports.listDisabledAccounts(candidates),
    ])
    const pending = candidates
      .filter((id) => !sentSet.has(id) && !disabledSet.has(id))
      .slice(0, this.opts.batchLimit ?? DEFAULT_BATCH_LIMIT)

    let sent = 0
    let skipped = candidates.length - pending.length
    let failed = 0

    for (const accountId of pending) {
      try {
        const profileIds = await this.gamification.listProfileIdsByAccount(accountId, 'kids')
        const stats = profileIds.length
          ? await this.childrenStats.execute(accountId, profileIds, { audience: 'kids' })
          : []
        // Sem perfil/atividade legível → marca como enviado (nada a reportar; sem
        // isso a conta re-entraria em TODO ciclo até a semana virar).
        if (stats.length === 0) {
          await this.reports.markSent(accountId, weekKey, this.clock())
          skipped++
          continue
        }

        const [identities, names] = await Promise.all([
          this.auth.getAccountIdentities([accountId]),
          this.auth.getProfileNames(stats.map((s) => s.profileId)),
        ])
        const parent = identities[0]
        // Conta sem e-mail (excluída/anonimizada) → marca e segue (nunca entrega).
        if (!parent) {
          await this.reports.markSent(accountId, weekKey, this.clock())
          skipped++
          continue
        }

        const childName = (s: ChildStatsView, index: number) =>
          names.get(s.profileId) ?? `Criança ${index + 1}`
        const resumo = stats.map((s, i) => childSummary(childName(s, i), s)).join('\n\n')
        const criancas = stats.map((s, i) => childName(s, i)).join(', ')

        await this.messaging.sendEmail({
          templateKey: 'weekly-report',
          recipient: { name: parent.firstName || 'Responsável', email: parent.email },
          variables: {
            nome: parent.firstName || 'Responsável',
            criancas,
            semana: weekLabel,
            resumo,
            link: `${this.opts.kidsUrl ?? ''}/perfis`,
          },
          // Dedupe do messaging: retry pós-crash entre enviar e marcar não duplica.
          idempotencyKey: `weekly-report:${accountId}:${weekKey}`,
        })
        // Mark-AFTER-send (crash-safety — ver doc da classe).
        await this.reports.markSent(accountId, weekKey, this.clock())
        sent++
      } catch (error) {
        // Falha por conta NÃO derruba o ciclo: loga e re-tenta no próximo (nada marcado).
        failed++
        this.logger.warn('parent_report.account_failed', {
          accountId,
          weekKey,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    if (sent > 0 || failed > 0) {
      this.logger.info('parent_report.cycle', { weekKey, sent, skipped, failed })
    }
    return { sent, skipped, failed }
  }
}
