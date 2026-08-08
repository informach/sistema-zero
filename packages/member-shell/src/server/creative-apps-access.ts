import 'server-only'
import { careerLevelAtLeast } from '@sistemazero/core/career'
import { CREATIVE_APPS_MIN_LEVEL, isPrivilegedRole } from '../lib/studio-tier'
import type { MembersClient } from './clients'

export { CREATIVE_APPS_MIN_LEVEL }

/** Decisão síncrona para páginas que já carregaram a gamificação. */
export function meetsCreativeAppsLevel(
  levelSlug: string | null | undefined,
  role: string | undefined,
): boolean {
  if (isPrivilegedRole(role)) return true
  return careerLevelAtLeast(levelSlug, CREATIVE_APPS_MIN_LEVEL)
}

/** Decisão autoritativa para handlers do BFF. Falhas recusam acesso. */
export async function hasCreativeAppsLevel(
  members: MembersClient,
  role: string | undefined,
): Promise<boolean> {
  if (isPrivilegedRole(role)) return true
  try {
    const result = await members.getGamification()
    if (result.status !== 200) return false
    return careerLevelAtLeast(result.body?.level?.slug, CREATIVE_APPS_MIN_LEVEL)
  } catch {
    return false
  }
}
