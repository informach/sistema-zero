import 'server-only'
import { getEnv } from '../lib/env'
import { isPrivilegedRole } from '../lib/studio-tier'

interface ZappyPilotSession {
  id: string
  role: string
  activeProfile?: { accountId: string }
}

interface ZappyPilotPolicy {
  enabled: boolean
  accountIds: readonly string[]
}

function policyFromEnv(): ZappyPilotPolicy {
  const env = getEnv()
  return {
    enabled: env.ZAPPY_ENABLED,
    accountIds: env.ZAPPY_PILOT_ACCOUNT_IDS.split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  }
}

/** Mesma política autoritativa usada pelo BFF e pelas páginas que ofertam o tutor. */
export function isStudioZappyPilotAllowed(
  session: ZappyPilotSession | null | undefined,
  policy?: ZappyPilotPolicy,
): boolean {
  if (!session) return false
  if (isPrivilegedRole(session.role)) return true
  const effectivePolicy = policy ?? policyFromEnv()
  if (!effectivePolicy.enabled) return false
  const accountId = session.activeProfile?.accountId ?? session.id
  return new Set(effectivePolicy.accountIds).has(accountId)
}
