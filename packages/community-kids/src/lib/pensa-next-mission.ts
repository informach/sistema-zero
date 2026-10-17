import { type PensaDestination, PensaProjectViewSchema } from '@sistemazero/core/pensa'
import { sessionFetch } from '@sistemazero/member-shell/lib/session-fetch'
import { pensaStudioProjectId } from './pensa-studio-link'

export type PensaNextDestination = PensaDestination | null
export interface PensaNextMission {
  path: string
  destination: PensaNextDestination
  backToPlan?: true
}

/** The server chooses the next action. The browser only builds its route. */
export async function resolveNextPensaMission(
  projectId: string,
  viewerId: string,
): Promise<PensaNextMission> {
  const response = await sessionFetch(`/api/pensa/projects/${encodeURIComponent(projectId)}`, {
    cache: 'no-store',
    headers: { 'x-sz-viewer': viewerId },
  })
  if (!response.ok) throw new Error('Não consegui abrir seu caminho. Tente novamente.')
  const view = PensaProjectViewSchema.parse(await response.json())
  if (view.team.viewerProfileId !== viewerId)
    throw new Error('O perfil mudou. Abra seu plano novamente.')
  const action = view.nextAction
  if (action.type !== 'mission')
    return {
      path: `/pensa?plano=${encodeURIComponent(projectId)}`,
      destination: null,
      backToPlan: true,
    }
  return {
    path: pensaMissionPath({
      missionId: action.missionId,
      destination: action.destination,
      studioProjectId: pensaStudioProjectId(projectId),
      studioAuthoring: view.studioAuthoring,
    }),
    destination: action.destination,
  }
}

export function pensaMissionPath(input: {
  missionId: string
  destination: PensaDestination
  studioProjectId: string
  studioAuthoring: 'blocks' | 'code'
}) {
  const route =
    input.destination === 'studio'
      ? input.studioAuthoring === 'code'
        ? `/estudio/pro/${encodeURIComponent(input.studioProjectId)}`
        : '/estudio'
      : `/${input.destination}`
  return `${route}?missao=${encodeURIComponent(input.missionId)}`
}
export function navigatePensaMission(path: string, navigate: (path: string) => void) {
  if (path.startsWith('/estudio/pro/') && path.split('?')[0] !== window.location.pathname)
    window.location.assign(path)
  else navigate(path)
}
