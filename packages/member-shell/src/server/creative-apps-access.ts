import 'server-only'
import { careerLevelAtLeast } from '@sistemazero/core/career'
import { AI_APPS_MIN_LEVEL, FREE_CREATION_MIN_LEVEL, isPrivilegedRole } from '../lib/studio-tier'
import type { MembersClient } from './clients'

export { AI_APPS_MIN_LEVEL, FREE_CREATION_MIN_LEVEL }

/**
 * São DOIS portões, não um.
 *
 * O que chama IA (Pensa, Zappy) abre no Inventor(a) porque cada uso tem custo e a criança
 * precisa de repertório antes de perguntar. O que é criação livre (Estúdio Completo, Pinta)
 * abre no Construtor(a), assim que ela publica o primeiro projeto. Até 14/08 os dois
 * andavam numa constante só e o Pinta ficava preso junto com a IA.
 */

/** Decisão síncrona para páginas que já carregaram a gamificação. */
export function meetsAiAppsLevel(
  levelSlug: string | null | undefined,
  role: string | undefined,
): boolean {
  if (isPrivilegedRole(role)) return true
  return careerLevelAtLeast(levelSlug, AI_APPS_MIN_LEVEL)
}

/** Decisão autoritativa para handlers do BFF. Falhas recusam acesso. */
export async function hasAiAppsLevel(
  members: MembersClient,
  role: string | undefined,
): Promise<boolean> {
  if (isPrivilegedRole(role)) return true
  try {
    const result = await members.getGamification()
    if (result.status !== 200) return false
    return careerLevelAtLeast(result.body?.level?.slug, AI_APPS_MIN_LEVEL)
  } catch {
    return false
  }
}

/** Decisão síncrona para as páginas de criação livre (hoje o Pinta). */
export function meetsFreeCreationLevel(
  levelSlug: string | null | undefined,
  role: string | undefined,
): boolean {
  if (isPrivilegedRole(role)) return true
  return careerLevelAtLeast(levelSlug, FREE_CREATION_MIN_LEVEL)
}
