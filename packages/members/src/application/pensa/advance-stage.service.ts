import type { CourseAudience } from '../../domain/course/course'
import { evaluateAdvanceGate, PENSA_NEXT_STAGE } from '../../domain/pensa/advance'
import type { PensaWorkStage } from '../../domain/pensa/pensa'
import {
  PensaGateNotReadyError,
  PensaNotFoundError,
  PensaStageMismatchError,
} from '../../domain/pensa/pensa.errors'
import { taskPlanArtifactMatchesTasks, validateTaskPlan } from '../../domain/pensa/task-plan'
import type { PensaRepository } from '../../domain/ports/pensa-repository.port'
import type { AwardGamificationService } from '../gamification/award-gamification.service'
import { type PensaCycleView, toPensaCycleView } from '../mappers/pensa-views'
import type { GamificationDeltaView } from '../mappers/views'

/** Resposta do advance: ciclo atualizado + delta de gamificação (aditivo, fail-open). */
export interface PensaAdvanceView {
  cycle: PensaCycleView
  /** `null` = award falhou (fail-open) — o avanço NUNCA é derrubado pela gamificação. */
  gamification: GamificationDeltaView | null
}

/**
 * Avança a etapa do ciclo (z→e→r→o→done) com os GATES do contrato (server-side):
 * `from` ≠ stage atual → 409 PENSA_STAGE_MISMATCH; gate reprovado → 409
 * PENSA_GATE_NOT_READY (details.gate + details.missing). Sucesso grava
 * `<from>_completed_at = now`, credita a gamificação (padrão award-dentro-da-ação:
 * etapa = XP 15 + 5 coins; ciclo o→done = XP 30 + 15 coins, SEM acumular com o de
 * etapa — o fechamento vale o prêmio maior) e devolve `{ cycle, gamification }`.
 * O award é FAIL-OPEN (o `AwardGamificationService` loga e devolve `null`).
 */
export class AdvancePensaStageService {
  constructor(
    private readonly repo: PensaRepository,
    private readonly gamification: AwardGamificationService,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    audience: CourseAudience,
    cycleId: string,
    from: PensaWorkStage,
    privileged = false,
    accountId?: string,
  ): Promise<PensaAdvanceView> {
    const found = await this.repo.findCycleWithProject(cycleId, userId, audience)
    if (!found) throw new PensaNotFoundError()
    if (found.cycle.stage !== from) throw new PensaStageMismatchError()

    const latestArtifacts = await this.repo.listLatestArtifacts(cycleId)
    const tasks = from === 'r' ? await this.repo.listTasks(cycleId) : []
    const taskPlan = latestArtifacts.find((artifact) => artifact.type === 'task_plan')
    const gate = evaluateAdvanceGate(from, {
      latestArtifacts,
      taskCount: tasks.length,
      taskPlanValid:
        from !== 'r' ||
        (validateTaskPlan(tasks).ok && taskPlanArtifactMatchesTasks(taskPlan?.content, tasks)),
    })
    if (!gate.ok) throw new PensaGateNotReadyError(from, gate.missing)

    const updated = await this.repo.advanceCycle(
      found.project.id,
      cycleId,
      from,
      PENSA_NEXT_STAGE[from],
      this.clock(),
    )

    // Award DEPOIS do avanço persistido, na audiência do PROJETO. O advance é
    // irrepetível pela máquina (from ≠ stage → 409), mas o ledger idempotente
    // (sourceId determinístico por etapa; cycleId no ciclo) cobre qualquer replay.
    const gamification = await this.gamification.awardPensaAdvance({
      userId,
      accountId: accountId ?? userId,
      cycleId,
      from,
      audience: found.project.audience,
      privileged,
    })

    return { cycle: toPensaCycleView(updated), gamification }
  }
}
