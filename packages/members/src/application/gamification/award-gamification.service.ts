import type { Logger } from '@sistemazero/core/logging'
import type { CourseAudience } from '../../domain/course/course'
import { CHALLENGE_ENTRY_XP, challengeSourceId } from '../../domain/gamification/challenges'
import { COIN_VALUES, quizPassedCoins } from '../../domain/gamification/coins'
import { localDateSaoPaulo, quizPassedXp, XP_VALUES } from '../../domain/gamification/gamification'
import { pensaStageSourceId } from '../../domain/pensa/gamification'
import type { PensaWorkStage } from '../../domain/pensa/pensa'
import type {
  GamificationRepository,
  XpEventInput,
} from '../../domain/ports/gamification-repository.port'
import { type GamificationDeltaView, toGamificationDeltaView } from '../mappers/views'

/**
 * Concede XP/streak/badges pelas ações existentes (complete da aula, quiz
 * aprovado). FAIL-OPEN por design: a gamificação NUNCA pode derrubar o
 * complete/quiz (o community adulto usa as mesmas rotas — um bug aqui viraria
 * outage de progresso). Em erro, loga `gamification.award_failed` (→ Sentry
 * via espelho) e devolve `null`; o ledger idempotente se auto-cura na próxima
 * chamada do mesmo source. `privileged` (equipe: superadmin/admin/staff) é
 * gravado no perfil — rankings contam SÓ clientes.
 */
export class AwardGamificationService {
  constructor(
    private readonly repo: GamificationRepository,
    private readonly clock: () => Date,
    private readonly logger: Logger,
  ) {}

  async awardLessonCompletion(input: {
    userId: string
    /** CONTA do responsável (sessão de perfil). Default → userId no caller. */
    accountId: string
    lessonId: string
    moduleId: string
    courseId: string
    /** Vitrine do CURSO — TODA a gamificação é segregada por audiência. */
    audience: CourseAudience
    unitCompleted: boolean
    courseCompleted: boolean
    privileged: boolean
  }): Promise<GamificationDeltaView | null> {
    const events: XpEventInput[] = [
      {
        sourceType: 'lesson_complete',
        sourceId: input.lessonId,
        amount: XP_VALUES.LESSON_COMPLETE,
        coins: COIN_VALUES.LESSON_COMPLETE,
      },
    ]
    if (input.unitCompleted) {
      events.push({
        sourceType: 'unit_complete',
        sourceId: input.moduleId,
        amount: XP_VALUES.UNIT_COMPLETE,
        coins: COIN_VALUES.UNIT_COMPLETE,
      })
    }
    // Curso 100% → MARCO no ledger (amount 0): conta cursos concluídos p/ as
    // badges course-complete/-2/-3 (derivadas no repositório, dedupe por curso).
    if (input.courseCompleted) {
      events.push({ sourceType: 'course_complete', sourceId: input.courseId, amount: 0 })
    }
    return this.award(input.userId, input.accountId, input.audience, events, input.privileged)
  }

  async awardQuizPassed(input: {
    userId: string
    /** CONTA do responsável (sessão de perfil). Default → userId no caller. */
    accountId: string
    blockId: string
    score: number
    /** Vitrine do CURSO — TODA a gamificação é segregada por audiência. */
    audience: CourseAudience
    privileged: boolean
  }): Promise<GamificationDeltaView | null> {
    const events: XpEventInput[] = [
      {
        sourceType: 'quiz_passed',
        sourceId: input.blockId,
        amount: quizPassedXp(input.score),
        coins: quizPassedCoins(input.score),
      },
    ]
    // Nota 100 → MARCO no ledger (amount 0, dedupe por bloco): conta as notas
    // mil p/ quiz-perfect/-10/-30 — destrava também num re-pass com 100.
    if (input.score === 100) {
      events.push({ sourceType: 'quiz_perfect', sourceId: input.blockId, amount: 0 })
    }
    return this.award(input.userId, input.accountId, input.audience, events, input.privileged)
  }

  async awardStudioPassed(input: {
    userId: string
    /** CONTA do responsável (sessão de perfil). Default → userId no caller. */
    accountId: string
    blockId: string
    score: number
    /** Vitrine do CURSO — TODA a gamificação é segregada por audiência. */
    audience: CourseAudience
    privileged: boolean
  }): Promise<GamificationDeltaView | null> {
    // Mesma régua do quiz aprovado (base + bônus por nota); fonte distinta no
    // ledger (`studio_passed`) → idempotente por bloco, independente do quiz.
    const events: XpEventInput[] = [
      {
        sourceType: 'studio_passed',
        sourceId: input.blockId,
        amount: quizPassedXp(input.score),
        coins: quizPassedCoins(input.score),
      },
    ]
    return this.award(input.userId, input.accountId, input.audience, events, input.privileged)
  }

  /**
   * Advance do Pensa bem-sucedido: fechar uma ETAPA (z→e/e→r/r→o) credita
   * `pensa_stage_complete`; fechar o CICLO (o→done) credita SÓ o
   * `pensa_cycle_complete` — o lançamento vale o prêmio MAIOR, sem acumular
   * com o de etapa (decisão do plano). Idempotência pelo ledger: a etapa usa
   * um uuid DETERMINÍSTICO de (cycleId, stage) — `pensaStageSourceId` — e o
   * ciclo usa o próprio cycleId; um replay do award nunca duplica.
   */
  async awardPensaAdvance(input: {
    userId: string
    /** CONTA do responsável (sessão de perfil). Default → userId no caller. */
    accountId: string
    cycleId: string
    /** Etapa que FECHOU (o `from` do advance). */
    from: PensaWorkStage
    /** Audiência do PROJETO Pensa — TODA a gamificação é segregada por vitrine. */
    audience: CourseAudience
    privileged: boolean
  }): Promise<GamificationDeltaView | null> {
    const events: XpEventInput[] =
      input.from === 'o'
        ? [
            {
              sourceType: 'pensa_cycle_complete',
              sourceId: input.cycleId,
              amount: XP_VALUES.PENSA_CYCLE_COMPLETE,
              coins: COIN_VALUES.PENSA_CYCLE_COMPLETE,
            },
          ]
        : [
            {
              sourceType: 'pensa_stage_complete',
              sourceId: pensaStageSourceId(input.cycleId, input.from),
              amount: XP_VALUES.PENSA_STAGE_COMPLETE,
              coins: COIN_VALUES.PENSA_STAGE_COMPLETE,
            },
          ]
    return this.award(input.userId, input.accountId, input.audience, events, input.privileged)
  }

  /**
   * DESAFIO do mês (game jam, 07/2026): publicou no Mural com a tag do mês →
   * XP real (move streak) + badge `challenge-first`. Idempotente pelo sourceId
   * DETERMINÍSTICO do monthKey (`challengeSourceId` — 1 marco/mês, mesmo com 2
   * jogos publicados). Disparado pelo webhook hub→members; fail-open.
   * ⚠️ Risco aceito v1: o webhook não carrega role → `privileged: false` (equipe
   * testando o desafio entra no ranking kids — o hub não conhece roles).
   */
  async awardChallengeEntry(input: {
    userId: string
    accountId: string
    audience: CourseAudience
    monthKey: string
  }): Promise<GamificationDeltaView | null> {
    return this.award(
      input.userId,
      input.accountId,
      input.audience,
      [
        {
          sourceType: 'challenge_entry',
          sourceId: challengeSourceId(input.monthKey),
          amount: CHALLENGE_ENTRY_XP,
        },
      ],
      false,
    )
  }

  /**
   * MARCO `course_showcased` (amount 0): o aluno publicou o projeto do curso no
   * Mural dos Criadores. Idempotente por (user, course). NÃO move XP/streak nem
   * concede badge — só registra o marco que, junto de `course_complete`, qualifica
   * o curso p/ o nível do aluno. Por ser amount 0, NÃO toca o perfil
   * (`gamification_profiles`): `privileged`/`accountId` ficam intactos (o award só
   * grava o perfil no ramo de `amount > 0`); por isso `privileged` aqui é irrelevante.
   * Disparado pelo webhook hub→members — fail-open como o resto da gamificação.
   */
  async awardCourseShowcased(input: {
    userId: string
    /**
     * CONTA dona do perfil (do hub). Na prática NÃO é usada: como o marco é amount 0,
     * o `award` nunca entra no ramo que cria/atualiza o perfil — `accountId` só seria
     * gravado lá. Mantida na assinatura por simetria com os demais awards.
     */
    accountId: string
    courseId: string
    audience: CourseAudience
  }): Promise<GamificationDeltaView | null> {
    return this.award(
      input.userId,
      input.accountId,
      input.audience,
      [{ sourceType: 'course_showcased', sourceId: input.courseId, amount: 0 }],
      false,
    )
  }

  private async award(
    userId: string,
    accountId: string,
    audience: CourseAudience,
    events: XpEventInput[],
    privileged: boolean,
  ): Promise<GamificationDeltaView | null> {
    const now = this.clock()
    try {
      const result = await this.repo.award({
        userId,
        accountId,
        audience,
        events,
        today: localDateSaoPaulo(now),
        now,
        privileged,
      })
      return toGamificationDeltaView(result)
    } catch (error) {
      this.logger.error('gamification.award_failed', {
        userId,
        sourceTypes: events.map((e) => e.sourceType),
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }
}
