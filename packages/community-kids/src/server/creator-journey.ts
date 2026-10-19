import 'server-only'
import { type CreativeToolId, type JourneyLevelSlug, kidsCreativeToolAvailability, type ToolAvailability } from '@sistemazero/core/journey'
import { isKidsStaffPreview, kidsJourneyAccess } from '@sistemazero/member-shell/lib/kids-journey-access'
import { cache } from 'react'
import { studioGate } from './studio-gate'
import { checkCreativeToolsAccessReadonly, getGamificationReadonly, getStudioUnlocksReadonly, listMyCourses } from './members'

export interface CreativeTool {
  id: CreativeToolId
  requiredLevel: JourneyLevelSlug | null
  owned: boolean | null
  /** Global policy right; a curriculum pending state never removes this achievement. */
  state: ToolAvailability
  studioCurriculum?: 'ready' | 'empty' | 'unavailable'
}

/** Per-request identity-scoped policy and product reads. The child never acquires a virtual rank. */
export const getCreativeTools = cache(async () => {
  const [access, gamification] = await Promise.all([
    checkCreativeToolsAccessReadonly().catch(() => null),
    getGamificationReadonly({ withRanking: true }).catch(() => null),
  ])
  const journey = gamification?.status === 200 ? kidsJourneyAccess(gamification.body) : null
  const level = journey && !isKidsStaffPreview(journey) ? journey.earned.level : null
  const toolIds: CreativeToolId[] = ['estudio-completo', 'pinta', 'pensa', 'molda']
  const tools: CreativeTool[] = toolIds.map((tool) => {
    const value = access?.body?.access?.[tool]
    const owned = access?.status === 200 && typeof value === 'boolean' ? value : null
    return { id: tool, owned, ...kidsCreativeToolAvailability({ tool, owned, journey }) }
  })
  const studio = tools.find((tool) => tool.id === 'estudio-completo')!
  if (studio.state === 'available') {
    // Reuse the entry gate, including known-block filtering. Own-account team preview does not
    // read or reconcile a learner's curriculum. This does not freeze policy achievements.
    const unlocks = journey && isKidsStaffPreview(journey)
      ? null : await getStudioUnlocksReadonly().catch(() => null)
    const gate = studioGate(journey, unlocks)
    studio.studioCurriculum = gate.kind === 'open' ? 'ready'
      : gate.kind === 'unavailable' ? 'unavailable' : 'empty'
  }
  return { level, journey, tools }
})

/** Creation hub retains globally earned tools and existing works even while curriculum is pending. */
export const getCreatorJourney = cache(async () => {
  const [tools, courses] = await Promise.all([getCreativeTools(), listMyCourses().catch(() => null)])
  return { ...tools, courses: courses?.status === 200 ? (courses.body?.courses ?? null) : null }
})
