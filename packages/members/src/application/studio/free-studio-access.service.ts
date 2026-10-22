import { creativeToolAccessRef } from '@sistemazero/core/creations'
import { isPythonCourseBlock } from '@sistemazero/studio/python-course-unlocks'
import { SERVER_BLOCK_CATALOG } from '@sistemazero/studio/server-catalog'
import { AccessDeniedError } from '../../domain/entitlement/entitlement.errors'
import type { AccessCheckService } from '../access-check/access-check.service'
import type { AdultJourneyService } from '../adult-journey/adult-journey.service'
import type { KidsJourneyQueryService } from '../kids-journey/kids-journey-query.service'
import type { GetStudioUnlocksService } from '../studio-unlocks/get-studio-unlocks.service'

const knownJavaScriptBlocks = new Set(SERVER_BLOCK_CATALOG.map(({ type }) => type))
export interface FreeStudioActor {
  audience: 'kids' | 'adult'
  userId: string
  accountId: string
  privileged: boolean
  readOnly: boolean
}

/** Product/mode rights and the same durable course union exposed by the unlocks endpoint. */
export class FreeStudioAccessService {
  constructor(
    private readonly access: Pick<AccessCheckService, 'execute'>,
    private readonly unlocks: Pick<GetStudioUnlocksService, 'execute'>,
    private readonly kidsJourney: Pick<KidsJourneyQueryService, 'get' | 'staffPreview'>,
    private readonly adultJourney?: Pick<AdultJourneyService, 'get'>,
  ) {}

  async execute(
    inputActor: FreeStudioActor,
    purpose: 'creation' | 'existing-pro' = 'creation',
    programmingLanguage: 'javascript' | 'python' = 'javascript',
  ) {
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
      }
      const modes: ('blocks' | 'bridge')[] = ['blocks']
      if (journey.capabilities.includes('bridge')) modes.push('bridge')
      return { pro, modes, blocks: await this.palette(actor, purpose, programmingLanguage) }
    }
    if (actor.audience !== 'kids') throw new AccessDeniedError('Público inválido.')
    // Team preview admitted by `resolveStudioFreeActor` → `resolveKidsStaffPreviewActor`: the
    // staff account or a profile of its OWN account. Support sessions were refused above
    // (`readOnly`) and at the HTTP boundary, so they never reach the preview.
    if (actor.privileged) {
      const preview = await this.kidsJourney.staffPreview()
      return {
        blocks: null,
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
    // The Pro capability is independent of the curriculum; Python still needs its earned tools.
    if (purpose === 'existing-pro') {
      if (!reward.pro)
        throw new AccessDeniedError('Seu nível ainda não libera projetos Pro no Estúdio Completo.')
      return { ...reward, blocks: await this.palette(actor, purpose, programmingLanguage) }
    }
    return { ...reward, blocks: await this.palette(actor, purpose, programmingLanguage) }
  }

  private async palette(
    actor: FreeStudioActor,
    purpose: 'creation' | 'existing-pro',
    programmingLanguage: 'javascript' | 'python',
  ): Promise<readonly string[] | null> {
    if (actor.privileged) return null
    // Preserve the existing JavaScript Pro gate; Python explicitly requests its own curriculum.
    if (purpose === 'existing-pro' && programmingLanguage === 'javascript') return []
    const { blocks } = await this.unlocks.execute(actor.userId, actor.audience, actor.accountId)
    if (!blocks.some((id) => knownJavaScriptBlocks.has(id) || isPythonCourseBlock(id)))
      throw new AccessDeniedError('Conclua um curso para liberar a criação no Estúdio Completo.')
    return [...blocks]
  }
}
