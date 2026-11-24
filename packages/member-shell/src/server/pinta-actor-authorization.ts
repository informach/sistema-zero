import 'server-only'
import { isReadonlyImpersonation } from '../lib/act'
import { learnerIdentity } from '../lib/learner-identity'
import { isPrivilegedRole } from '../lib/studio-tier'
import type { GatewayModule } from './gateway'
import { type PintaCausalActor, PintaCausalActorSchema } from './pinta-causal-protocol'
import type { SessionModule } from './session'

export interface PintaActorAuthorization {
  gateway: Pick<GatewayModule, 'refreshSession'>
  session: Pick<
    SessionModule,
    'getAccessToken' | 'getRefreshToken' | 'verifyAccessToken' | 'audience'
  >
}

export async function authorizePintaActor(
  req: Request,
  write: boolean,
  { gateway, session }: PintaActorAuthorization,
): Promise<{ status: number; reason: string } | { actor: PintaCausalActor; readOnly: boolean }> {
  const denied = (status: number, reason: string) => ({ status, reason })
  // HMAC authenticates Member Shell, so the user token needs strict verification here.
  const [access, refresh] = await Promise.all([session.getAccessToken(), session.getRefreshToken()])
  if (!access || !refresh) return denied(401, 'unauthenticated')
  let verified = await session.verifyAccessToken(access)
  if (!verified.ok && verified.expired) {
    const renewed = await gateway.refreshSession()
    if (renewed.state === 'unavailable') return denied(503, 'unavailable')
    if (renewed.state === 'renewed') verified = await session.verifyAccessToken(renewed.accessToken)
  }
  if (!verified.ok)
    return verified.unavailable ? denied(503, 'unavailable') : denied(401, 'unauthenticated')
  const user = verified.user
  // Sem lista de perfis (23/11/2026), a mesma regra do escopo da página (`pintaAccountViewer`): só o
  // aluno ativo da sessão, com a conta dele. Pais, conta inativa, perfil kids sem conta responsável
  // e adulto com perfil ativo (a conta de outra pessoa) ficam de fora antes de qualquer chamada.
  const identity = learnerIdentity(user, session.audience)
  if (!identity) return denied(403, 'forbidden')
  const actor = PintaCausalActorSchema.safeParse({
    userId: identity.learnerId,
    accountId: identity.accountId,
    audience: identity.audience,
    ...(isPrivilegedRole(user.role) ? { privileged: true } : {}),
  })
  if (!actor.success) return denied(401, 'unauthenticated')
  const claimed = req.headers.get('x-sz-viewer')
  const claimedAudience = req.headers.get('x-sz-viewer-audience')
  if ((claimed && claimed !== user.id) || (claimedAudience && claimedAudience !== session.audience))
    return denied(409, 'viewer-mismatch')
  const documentSession = req.headers.get('x-sz-session')
  if (
    user.kids &&
    ((documentSession && documentSession !== user.kids.sessionId) ||
      (write && documentSession !== user.kids.sessionId))
  )
    return denied(409, 'viewer-mismatch')
  const readOnly = isReadonlyImpersonation(user)
  if (write && readOnly) return denied(403, 'impersonation-readonly')
  return { actor: actor.data, readOnly }
}
