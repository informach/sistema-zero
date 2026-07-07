import type { CourseAudience } from '../../domain/course/course'
import { AccessDeniedError } from '../../domain/entitlement/entitlement.errors'
import { ESTUDIO_ACCESS_REF } from '../../domain/gamification/missions'
import type { HubGateway } from '../../domain/ports/hub-gateway.port'
import type { AccessCheckService } from '../access-check/access-check.service'
import type { AwardGamificationService } from './award-gamification.service'

export type RecordStudioRemixResult =
  | { recorded: true }
  // `SELF_REMIX` é INERTE (200 — remixar o próprio jogo não conta, não é erro);
  // `PLAY_NOT_FOUND` = playId inexistente/oculto no Mural (404); `HUB_UNAVAILABLE`/
  // `AWARD_FAILED` = falha transitória (o cliente é best-effort e ignora).
  | {
      recorded: false
      reason: 'SELF_REMIX' | 'PLAY_NOT_FOUND' | 'HUB_UNAVAILABLE' | 'AWARD_FAILED'
    }

/**
 * Registra o MARCO `studio_remix` quando a criança faz "Fazer a minha versão" de um
 * jogo do Mural (retenção pós-cursos, 07/2026). A rota é alcançável na borda por
 * qualquer sessão ativa, então o service é o portão anti-farm: (1) exige posse do
 * Estúdio Completo pela CONTA (o remix só existe p/ quem tem o produto; equipe
 * libera); (2) VALIDA o playId no hub (S2S) — sem isso um POST direto com uuids
 * aleatórios farmaria a missão semanal; (3) recusa SELF-remix (remixar o próprio
 * jogo não conta). O marco é amount 0 e idempotente pelo playId do jogo ORIGINAL
 * (re-remixar o mesmo jogo é inerte) — o prêmio vem do claim da missão.
 */
export class RecordStudioRemixService {
  constructor(
    private readonly accessCheck: AccessCheckService,
    private readonly hub: HubGateway,
    private readonly award: AwardGamificationService,
  ) {}

  async execute(input: {
    userId: string
    accountId: string
    audience: CourseAudience
    playId: string
    privileged: boolean
  }): Promise<RecordStudioRemixResult> {
    if (!input.privileged) {
      const result = await this.accessCheck.execute(input.accountId, [ESTUDIO_ACCESS_REF])
      const allowed =
        result.grants.includes(ESTUDIO_ACCESS_REF) ||
        result.communities.includes(ESTUDIO_ACCESS_REF)
      if (!allowed) throw new AccessDeniedError('Você não tem acesso ao Estúdio Completo')
    }

    const play = await this.hub.checkPlay(input.playId)
    // Hub fora → NÃO grava (fail-closed do anti-farm: melhor perder um marco de
    // missão que aceitar um id não-verificado). O cliente é best-effort.
    if (!play) return { recorded: false, reason: 'HUB_UNAVAILABLE' }
    if (!play.visible) return { recorded: false, reason: 'PLAY_NOT_FOUND' }
    if (play.authorId === input.userId) return { recorded: false, reason: 'SELF_REMIX' }

    const awarded = await this.award.awardStudioRemix({
      userId: input.userId,
      accountId: input.accountId,
      audience: input.audience,
      playId: input.playId,
      privileged: input.privileged,
    })
    if (!awarded) return { recorded: false, reason: 'AWARD_FAILED' }
    return { recorded: true }
  }
}
