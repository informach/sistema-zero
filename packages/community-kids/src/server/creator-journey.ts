import 'server-only'
import {
  CREATIVE_TOOL_LEVELS,
  type CreativeToolId,
  creativeToolAvailability,
} from '@sistemazero/core/career'
import { isPrivilegedRole } from '@sistemazero/member-shell/lib/studio-tier'
import { cache } from 'react'
import { checkCreativeToolsAccessReadonly, getGamificationReadonly, listMyCourses } from './members'
import { getSession } from './session'

/** Per-request and profile scoped: unavailable data must never become a purchase/level lock. */
export const getCreatorJourney = cache(async () => {
  const [access, gamification, courses, session] = await Promise.all([
    checkCreativeToolsAccessReadonly().catch(() => null),
    getGamificationReadonly({ withRanking: true }).catch(() => null),
    listMyCourses().catch(() => null),
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
  return { level, tools, courses: courses?.status === 200 ? (courses.body?.courses ?? null) : null }
})
