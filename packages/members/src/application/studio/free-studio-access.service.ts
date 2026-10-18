import { creativeToolAccessRef } from '@sistemazero/core/creations'
import { creatorJourneyLevel } from '@sistemazero/core/journey'
import { SERVER_BLOCK_CATALOG } from '@sistemazero/studio/server-catalog'
import { AccessDeniedError } from '../../domain/entitlement/entitlement.errors'
import { computeStudentLevel } from '../../domain/gamification/levels'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'
import type { StudioUnlockRepository } from '../../domain/ports/studio-unlock-repository.port'
import type { AccessCheckService } from '../access-check/access-check.service'
import type { AdultJourneyService } from '../adult-journey/adult-journey.service'

const knownJavaScriptBlocks = new Set(SERVER_BLOCK_CATALOG.map(({ type }) => type))
export interface FreeStudioActor {
  audience: 'kids' | 'adult'
  userId: string
  accountId: string
  privileged: boolean
  readOnly: boolean
}

/** The existing Complete Studio gate, read afresh without freezing grants or changing progress. */
export class FreeStudioAccessService {
  constructor(
    private readonly access: Pick<AccessCheckService, 'execute'>,
    private readonly gamification: Pick<
      GamificationRepository,
      'listQualifyingJourneySlots' | 'listStudioUnlocksByCourse'
    >,
    private readonly unlocks: Pick<StudioUnlockRepository, 'listGrants'>,
    private readonly adultJourney?: Pick<AdultJourneyService, 'get'>,
  ) {}

  async execute(actor: FreeStudioActor, purpose: 'creation' | 'existing-pro' = 'creation') {
    if (actor.readOnly)
      throw new AccessDeniedError('A sessão de suporte não pode executar projetos.')
    if (actor.audience === 'adult') {
      if (actor.userId !== actor.accountId || !this.adultJourney)
        throw new AccessDeniedError('Use sua conta adulta.')
      const journey = await this.adultJourney.get(actor.userId, actor.privileged)
      if (!journey.capabilities.includes('studio'))
        throw new AccessDeniedError('A jornada adulta ainda não libera o Estúdio Completo.')
      const pro = journey.capabilities.includes('pro')
      if (purpose === 'existing-pro' && !pro)
        throw new AccessDeniedError('A jornada adulta ainda não libera projetos Pro.')
      if (!actor.privileged) {
        const ref = creativeToolAccessRef('estudio-completo', 'adult')
        const owned = await this.access.execute(actor.accountId, [ref])
        if (!owned.grants.includes(ref) && !owned.communities.includes(ref))
          throw new AccessDeniedError('Você não tem acesso ao Estúdio Completo adulto.')
        if (purpose === 'creation') await this.assertPalette(actor, 'adult')
      }
      const modes: ('blocks' | 'bridge')[] = ['blocks']
      if (journey.capabilities.includes('bridge')) modes.push('bridge')
      return { pro, modes }
    }
    if (actor.audience !== 'kids') throw new AccessDeniedError('Público inválido.')
    if (actor.privileged) return creatorJourneyLevel('god').reward
    const owned = await this.access.execute(actor.accountId, ['estudio-completo'])
    if (
      !owned.grants.includes('estudio-completo') &&
      !owned.communities.includes('estudio-completo')
    )
      throw new AccessDeniedError('Você não tem acesso ao Estúdio Completo.')
    const qualifying = await this.gamification.listQualifyingJourneySlots(actor.userId, 'kids')
    const reward = creatorJourneyLevel(computeStudentLevel(qualifying).slug).reward
    if (!reward.freeStudio)
      throw new AccessDeniedError('Seu nível ainda não libera o Estúdio Completo.')
    // The existing Pro route is gated by product + Pro level, independently of the
    // curriculum palette required by the project-creation gallery.
    if (purpose === 'existing-pro') {
      if (!reward.pro)
        throw new AccessDeniedError('Seu nível ainda não libera projetos Pro no Estúdio Completo.')
      return reward
    }
    await this.assertPalette(actor, 'kids')
    return reward
  }

  private async assertPalette(actor: FreeStudioActor, audience: 'kids' | 'adult') {
    const [current, frozen] = await Promise.all([
      this.gamification.listStudioUnlocksByCourse(actor.userId, audience),
      this.unlocks.listGrants(actor.userId, audience),
    ])
    if (
      ![...current, ...frozen].some(({ blocks }) =>
        blocks.some((id) => knownJavaScriptBlocks.has(id)),
      )
    )
      throw new AccessDeniedError('Conclua um curso para liberar a criação no Estúdio Completo.')
  }
}
