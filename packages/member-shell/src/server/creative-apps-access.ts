import 'server-only'
import { careerLevelAtLeast } from '@sistemazero/core/career'
import {
  AI_APPS_MIN_LEVEL,
  FREE_CREATION_MIN_LEVEL,
  isPrivilegedRole,
  THREE_D_CREATION_MIN_LEVEL,
} from '../lib/studio-tier'
import type { MembersClient } from './clients'

export { AI_APPS_MIN_LEVEL, FREE_CREATION_MIN_LEVEL, THREE_D_CREATION_MIN_LEVEL }

/**
 * São TRÊS portões, não um.
 *
 * O que chama IA (Pensa, Zappy) abre no Inventor(a) porque cada uso tem custo e a criança
 * precisa de repertório antes de perguntar. O que é criação livre (Estúdio Completo, Pinta)
 * abre no Construtor(a), assim que ela publica o primeiro projeto. Até 14/08 os dois
 * andavam numa constante só e o Pinta ficava preso junto com a IA. A oficina 3D (Molda)
 * abre no Explorador(a) de Mundos, onde o kit Jogo 3D (consumidor do modelo) é recompensa.
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

/** Decisão síncrona para a oficina 3D (Molda): abre onde a trilha 3D começa. */
export function meetsThreeDCreationLevel(
  levelSlug: string | null | undefined,
  role: string | undefined,
): boolean {
  if (isPrivilegedRole(role)) return true
  return careerLevelAtLeast(levelSlug, THREE_D_CREATION_MIN_LEVEL)
}
