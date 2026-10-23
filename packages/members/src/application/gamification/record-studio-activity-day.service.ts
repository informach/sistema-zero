import { creativeToolAccessRef } from '@sistemazero/core/creations'
import type { CourseAudience } from '../../domain/course/course'
import { AccessDeniedError } from '../../domain/entitlement/entitlement.errors'
import { ESTUDIO_ACCESS_REF } from '../../domain/gamification/missions'
import type { AccessCheckService } from '../access-check/access-check.service'
import type { AdultJourneyService } from '../adult-journey/adult-journey.service'
import type { AwardGamificationService } from './award-gamification.service'

export type RecordStudioActivityDayResult =
  | { recorded: true }
  // Falha transitória do award (o cliente é best-effort e ignora).
  | { recorded: false; reason: 'AWARD_FAILED' }

/**
 * Registra o XP DIÁRIO `studio_activity_day` quando a criança CRIA/edita no Estúdio
 * Completo (retenção pós-cursos, 07/2026 — segura o foguinho de quem já terminou os
 * cursos e só CRIA, sem precisar publicar). A rota é alcançável na borda por qualquer
 * sessão ativa, então o service é o portão anti-farm: exige POSSE do Estúdio pela CONTA
 * (equipe/privileged libera). As garantias 1×/dia + move-streak saem do award (sourceId
 * determinístico do dia civil SP + `amount > 0`) — o cliente pode disparar à vontade no
 * autosave que só o 1º evento do dia rende XP. Espelha o `RecordStudioRemixService`, sem
 * o playId/hub (não há jogo específico — é só "criou hoje").
 */
export class RecordStudioActivityDayService {
  constructor(
    private readonly accessCheck: AccessCheckService,
    private readonly award: AwardGamificationService,
    private readonly adultJourney?: AdultJourneyService,
  ) {}

  async execute(input: {
    userId: string
    accountId: string
    audience: CourseAudience
    privileged: boolean
  }): Promise<RecordStudioActivityDayResult> {
    if (input.audience === 'adult') {
      if (input.userId !== input.accountId || !this.adultJourney)
        throw new AccessDeniedError('Conta adulta inválida')
      await this.adultJourney.assert(input.userId, 'studio', input.privileged)
    }
    const accessRef = creativeToolAccessRef(ESTUDIO_ACCESS_REF, input.audience)
    if (!input.privileged) {
      const result = await this.accessCheck.execute(input.accountId, [accessRef])
      const allowed = result.grants.includes(accessRef) || result.communities.includes(accessRef)
      if (!allowed) throw new AccessDeniedError('Você não tem acesso ao Estúdio Completo')
    }

    const awarded = await this.award.awardStudioActivityDay({
      userId: input.userId,
      accountId: input.accountId,
      audience: input.audience,
      privileged: input.privileged,
    })
    if (!awarded) return { recorded: false, reason: 'AWARD_FAILED' }
    return { recorded: true }
  }
}
