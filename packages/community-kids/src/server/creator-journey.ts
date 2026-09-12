import 'server-only'
import {
  CREATIVE_TOOL_LEVELS,
  type CreativeToolId,
  creativeToolAvailability,
  type ToolAvailability,
} from '@sistemazero/core/career'
import { isPrivilegedRole } from '@sistemazero/member-shell/lib/studio-tier'
import { cache } from 'react'
import { checkCreativeToolsAccessReadonly, getGamificationReadonly, listMyCourses } from './members'
import { getSession } from './session'

export interface CreativeTool {
  id: CreativeToolId
  requiredLevel: string
  owned: boolean | null
  state: ToolAvailability
}

/**
 * Posse + posto das quatro ferramentas, sem os CURSOS. É o pedaço que o MENU precisa em
 * toda página (para não oferecer ferramenta travada), e por isso mora sozinho: o
 * `listMyCourses` do `getCreatorJourney` usa `gatewayFetch` (com refresh de cookie) e
 * seria caro em cada navegação.
 *
 * Per-request and profile scoped: unavailable data must never become a purchase/level lock.
 */
export const getCreativeTools = cache(
  async (): Promise<{ level: string | null; tools: CreativeTool[] }> => {
    const [access, gamification, session] = await Promise.all([
      checkCreativeToolsAccessReadonly().catch(() => null),
      getGamificationReadonly({ withRanking: true }).catch(() => null),
      getSession(),
    ])
    const level = gamification?.status === 200 ? (gamification.body?.level?.slug ?? null) : null
    const toolIds: CreativeToolId[] = ['estudio-completo', 'pinta', 'pensa', 'molda']
    const tools = toolIds.map((tool) => {
      const value = access?.body?.access?.[tool]
      const owned = access?.status === 200 && typeof value === 'boolean' ? value : null
      return {
        id: tool,
        requiredLevel: CREATIVE_TOOL_LEVELS[tool],
        owned,
        state: creativeToolAvailability({
          tool,
          owned,
          level,
          privileged: isPrivilegedRole(session?.role),
        }),
      }
    })
    return { level, tools }
  },
)

/** O que a página /criar precisa: as ferramentas MAIS os cursos da criança. */
export const getCreatorJourney = cache(async () => {
  const [{ level, tools }, courses] = await Promise.all([
    getCreativeTools(),
    listMyCourses().catch(() => null),
  ])
  return { level, tools, courses: courses?.status === 200 ? (courses.body?.courses ?? null) : null }
})
