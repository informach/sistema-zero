import 'server-only'
import { getEnv } from '../lib/env'
import { isPrivilegedRole } from '../lib/studio-tier'
import type { MembersClient } from './clients'
import { hasAiAppsLevel, meetsAiAppsLevel } from './creative-apps-access'

interface ZappySession {
  role: string
}

interface ZappyPolicy {
  enabled: boolean
}

function policyFromEnv(): ZappyPolicy {
  return { enabled: getEnv().ZAPPY_ENABLED }
}

/** Equipe sempre entra; alunos precisam da flag e de Inventor(a) ou acima. */
export function isStudioZappyAllowed(
  session: ZappySession | null | undefined,
  levelSlug: string | null | undefined,
  policy?: ZappyPolicy,
): boolean {
  if (!session) return false
  if (isPrivilegedRole(session.role)) return true
  if (!(policy ?? policyFromEnv()).enabled) return false
  return meetsAiAppsLevel(levelSlug, session.role)
}

/** Mesma política para handlers que ainda precisam consultar o nível no members. */
export async function isStudioZappyAllowedForRequest(
  members: MembersClient,
  session: ZappySession | null | undefined,
  policy?: ZappyPolicy,
): Promise<boolean> {
  if (!session) return false
  if (isPrivilegedRole(session.role)) return true
  if (!(policy ?? policyFromEnv()).enabled) return false
  return hasAiAppsLevel(members, session.role)
}
