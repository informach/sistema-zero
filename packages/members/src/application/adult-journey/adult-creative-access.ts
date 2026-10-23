import { creativeToolAccessRef } from '@sistemazero/core/creations'
import { AccessDeniedError } from '../../domain/entitlement/entitlement.errors'
import type { AccessCheckService } from '../access-check/access-check.service'
import type { AdultJourneyService } from './adult-journey.service'
export async function assertAdultCreativeAccess(
  deps: { adultJourney?: AdultJourneyService; accessCheck: AccessCheckService },
  actor: { userId: string; accountId: string; privileged: boolean },
  tool: 'studio' | 'pensa',
  advanced = true,
  pro = false,
) {
  if (actor.userId !== actor.accountId || !deps.adultJourney)
    throw new AccessDeniedError('Use sua conta adulta.')
  await deps.adultJourney.assert(actor.userId, tool, actor.privileged)
  if (advanced) await deps.adultJourney.assert(actor.userId, 'ai', actor.privileged)
  if (pro) await deps.adultJourney.assert(actor.userId, 'pro', actor.privileged)
  if (actor.privileged) return
  const ref = creativeToolAccessRef(tool === 'studio' ? 'estudio-completo' : tool, 'adult')
  const access = await deps.accessCheck.execute(actor.accountId, [ref])
  if (!access.grants.includes(ref) && !access.communities.includes(ref))
    throw new AccessDeniedError('Este recurso não está liberado para sua conta.')
}
