import { type PensaMissionHandoff, PensaMissionHandoffSchema } from '@sistemazero/core/pensa'
import { progressRefusal } from './pensa-guide-errors'

export async function linkStudioMission(input: {
  fetch(url: string, init: RequestInit): Promise<Response>
  handoff: PensaMissionHandoff
  viewerId: string
}): Promise<PensaMissionHandoff> {
  const { handoff } = input
  if (handoff.progress.status !== 'planned' || !handoff.availability.available) return handoff
  const response = await input.fetch(
    `/api/pensa/missions/${encodeURIComponent(handoff.mission.id)}/start`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-sz-viewer': input.viewerId },
      body: JSON.stringify({
        requestId: crypto.randomUUID(),
        baseRevisionId: handoff.projectRevisionId,
        contentRevision: handoff.mission.contentRevision,
        expectedProgressRevision: handoff.progress.progressRevision,
      }),
    },
  )
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) throw progressRefusal(response.status, body)
  return PensaMissionHandoffSchema.parse(body)
}

export function editorExitPath(input: {
  missionId: string | null
  handoffProjectId: string | null
  openingPlanId: string | null
  initialProjectId: string | null
  openProjectId: string | null
}): string | null {
  if (input.missionId)
    return input.handoffProjectId
      ? `/pensa?plano=${encodeURIComponent(input.handoffProjectId)}`
      : '/pensa'
  if (input.openingPlanId && input.openProjectId === input.initialProjectId)
    return `/pensa?plano=${encodeURIComponent(input.openingPlanId)}`
  return null
}
