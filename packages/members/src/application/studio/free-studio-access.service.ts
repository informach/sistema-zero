import { creativeToolAccessRef } from '@sistemazero/core/creations'
import { SERVER_BLOCK_CATALOG } from '@sistemazero/studio/server-catalog'
import { AccessDeniedError } from '../../domain/entitlement/entitlement.errors'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'
import type { StudioUnlockRepository } from '../../domain/ports/studio-unlock-repository.port'
import type { AccessCheckService } from '../access-check/access-check.service'
import type { AdultJourneyService } from '../adult-journey/adult-journey.service'
import type { KidsJourneyQueryService } from '../kids-journey/kids-journey-query.service'

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
      'listStudioUnlocksByCourse'
    >,
    private readonly unlocks: Pick<StudioUnlockRepository, 'listGrants'>,
    private readonly kidsJourney: Pick<KidsJourneyQueryService, 'get' | 'staffPreview'>,
    private readonly adultJourney?: Pick<AdultJourneyService, 'get'>,
  ) {}

  async execute(inputActor: FreeStudioActor, purpose: 'creation' | 'existing-pro' = 'creation') {
    const actor = { ...inputActor }
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
    if (actor.privileged) {
      if (actor.userId !== actor.accountId)
        throw new AccessDeniedError('Use a conta da equipe, sem perfil de aluno.')
      const preview = await this.kidsJourney.staffPreview()
      return {
        pro: preview.capabilities.includes('pro'),
        modes: preview.capabilities.includes('bridge')
          ? ['blocks' as const, 'bridge' as const]
          : ['blocks' as const],
      }
    }
    const owned = await this.access.execute(actor.accountId, ['estudio-completo'])
    if (
      !owned.grants.includes('estudio-completo') &&
      !owned.communities.includes('estudio-completo')
    )
      throw new AccessDeniedError('Você não tem acesso ao Estúdio Completo.')
    const journey = await this.kidsJourney.get({ userId: actor.userId, accountId: actor.accountId })
    const capabilities = journey.earned.capabilities
    const reward = {
      pro: capabilities.includes('pro'),
      modes: capabilities.includes('bridge')
        ? ['blocks' as const, 'bridge' as const]
        : ['blocks' as const],
    }
    if (!capabilities.includes('studio'))
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
