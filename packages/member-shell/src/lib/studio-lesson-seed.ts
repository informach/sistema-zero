import type { Project } from '@sistemazero/studio'

interface StudioLessonSources {
  local: () => Promise<Project | null>
  submitted?: () => Promise<Project | null>
  carryover?: () => Promise<Project | null>
  initial: Project
}

/** Only an absent source permits moving to the next saved version. */
export async function resolveStudioLessonSeed(sources: StudioLessonSources): Promise<Project> {
  const local = await sources.local()
  if (local) return local
  const submitted = await sources.submitted?.()
  if (submitted) return submitted
  const carryover = await sources.carryover?.()
  return carryover ?? sources.initial
}
