import 'server-only'
import { isPrivilegedRole } from '../lib/studio-tier'
import type { MembersClient } from './clients'
import { hasAiAppsLevel, meetsAiAppsLevel } from './creative-apps-access'

interface ZappySession {
  role: string
}

/** Equipe sempre entra; alunos precisam de Inventor(a) ou acima. */
export function isStudioZappyAllowed(
  session: ZappySession | null | undefined,
  levelSlug: string | null | undefined,
): boolean {
  if (!session) return false
  if (isPrivilegedRole(session.role)) return true
  return meetsAiAppsLevel(levelSlug, session.role)
}

/** Mesma política para handlers que ainda precisam consultar o nível no members. */
export async function isStudioZappyAllowedForRequest(
  members: MembersClient,
  session: ZappySession | null | undefined,
): Promise<boolean> {
  if (!session) return false
  if (isPrivilegedRole(session.role)) return true
  return hasAiAppsLevel(members, session.role)
}
