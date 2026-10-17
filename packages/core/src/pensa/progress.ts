import { canExecutePensaMission } from './capabilities'
import type {
  PensaCapabilities,
  PensaMissionAvailability,
  PensaMissionProgress,
  PensaNextAction,
  PensaPlanDraft,
  PensaProjectMetadata,
  PensaProjectRevision,
  PensaTeamView,
  PensaZeroStage,
} from './model'

export function createPensaMissionProgress(missionId: string): PensaMissionProgress {
  return {
    missionId,
    progressRevision: 0,
    status: 'planned',
    validity: 'current',
    assigneeProfileId: null,
    completedByProfileId: null,
    deliveries: [],
    verification: null,
    resumeNote: null,
    startedAt: null,
    completedAt: null,
  }
}

export interface PensaAvailabilityInput {
  revision: PensaProjectRevision | null
  progress: readonly PensaMissionProgress[]
  capabilities: PensaCapabilities
  team: PensaTeamView
  viewerProfileId: string
  project?: Pick<PensaProjectMetadata, 'status' | 'paused'>
}

export function resolvePensaAvailability(
  input: PensaAvailabilityInput,
): PensaMissionAvailability[] {
  const { revision, progress, capabilities, team, viewerProfileId, project } = input
  if (!revision) return []
  const byId = new Map(progress.map((item) => [item.missionId, item]))
  const people = new Set(team.people.map((person) => person.profileId))
  const authoring =
    capabilities.observedGame?.authoring ??
    capabilities.participants.find((person) => person.profileId === team.programmerProfileId)
      ?.studioAuthoring
  const skipped = new Set(
    revision.plan.missions
      .filter((item) => item.kind === 'setup' && authoring === 'code')
      .map((item) => item.id),
  )
  return revision.plan.missions.map((mission) => {
    const current = byId.get(mission.id)
    const mode = current?.validity === 'needs_review' ? 'reconfirm' : 'build'
    const roles =
      mission.destination === 'studio' ? [team.programmerProfileId] : team.artistProfileIds
    const eligibleProfileIds = capabilities.participants
      .filter(
        (person) =>
          people.has(person.profileId) &&
          roles.includes(person.profileId) &&
          (mission.destination !== 'studio' ||
            person.dimensions.includes(revision.definition.dimension)) &&
          canExecutePensaMission(mission, person, revision.technical, capabilities),
      )
      .map((person) => person.profileId)
    const unavailable = (
      reason: NonNullable<PensaMissionAvailability['reason']>,
      message: string,
    ): PensaMissionAvailability => ({
      missionId: mission.id,
      available: false,
      mode,
      reason,
      message,
      eligibleProfileIds,
    })
    if (project?.status === 'archived')
      return unavailable('archived', 'Este projeto está guardado. Reabra para continuar.')
    if (project?.paused) return unavailable('paused', 'Retome o projeto para continuar as missões.')
    if (skipped.has(mission.id))
      return unavailable(
        'not_applicable',
        'O Estúdio Pro usa programação em código e dispensa esta extensão.',
      )
    if (current?.status === 'completed' && current.validity === 'current')
      return unavailable('completed', 'Você já conferiu esta missão.')
    if (
      mission.dependencyIds.some((id) => {
        const dependency = byId.get(id)
        return (
          !skipped.has(id) &&
          (dependency?.status !== 'completed' || dependency.validity !== 'current')
        )
      })
    )
      return unavailable(
        'dependency_pending',
        'Conclua as missões anteriores que esta missão precisa.',
      )
    if (!eligibleProfileIds.length)
      return unavailable(
        'resources_unavailable',
        'Os responsáveis precisam de outros recursos para esta missão. Converse com o Zappy para adaptar o plano.',
      )
    if (!eligibleProfileIds.includes(viewerProfileId))
      return unavailable('not_your_mission', 'Esta missão está com outra pessoa da equipe.')
    if (
      current?.assigneeProfileId &&
      current.assigneeProfileId !== viewerProfileId &&
      current.status === 'in_progress'
    )
      return unavailable('claimed', 'Outra pessoa já começou esta missão.')
    return {
      missionId: mission.id,
      available: true,
      mode,
      reason: null,
      message: null,
      eligibleProfileIds,
    }
  })
}

export function nextPensaMissionFor(input: {
  revision: PensaProjectRevision | null
  progress: readonly PensaMissionProgress[]
  availability: readonly PensaMissionAvailability[]
  draft?: PensaPlanDraft | null
}): PensaNextAction {
  if (input.draft?.status === 'ready') return { type: 'accept_draft', draftId: input.draft.id }
  if (!input.revision) return { type: 'define' }
  const byId = new Map(input.progress.map((item) => [item.missionId, item]))
  const access = new Map(input.availability.map((item) => [item.missionId, item]))
  const missions = [...input.revision.plan.missions].sort((a, b) => a.position - b.position)
  const ready = missions.filter((mission) => access.get(mission.id)?.available)
  const next = ready.find((mission) => byId.get(mission.id)?.status === 'in_progress') ?? ready[0]
  if (next)
    return {
      type: 'mission',
      missionId: next.id,
      mode: access.get(next.id)?.mode ?? 'build',
      destination: next.destination,
    }
  if (
    missions.every((mission) =>
      ['completed', 'not_applicable'].includes(access.get(mission.id)?.reason ?? ''),
    )
  )
    return { type: 'completed' }
  const blocked = missions.find(
    (mission) => !['completed', 'not_applicable'].includes(access.get(mission.id)?.reason ?? ''),
  )
  return {
    type: 'waiting',
    missionId: blocked?.id ?? null,
    reason:
      (blocked && access.get(blocked.id)?.message) || 'Espere a equipe preparar a próxima criação.',
  }
}

export function pensaZeroPresentation(input: {
  revision: PensaProjectRevision | null
  draft?: PensaPlanDraft | null
  progress: readonly PensaMissionProgress[]
  availability?: readonly PensaMissionAvailability[]
}): PensaZeroStage {
  if (!input.revision) return input.draft?.status === 'ready' ? 'e' : 'z'
  const finalTest = input.revision.plan.missions.find(
    (item) => item.kind === 'playtest' && item.scope === 'project',
  )
  const remaining = input.revision.plan.missions
    .filter((mission) => mission.id !== finalTest?.id)
    .some(
      (mission) =>
        !input.availability?.some(
          (item) => item.missionId === mission.id && item.reason === 'not_applicable',
        ) &&
        !input.progress.some(
          (item) =>
            item.missionId === mission.id &&
            item.status === 'completed' &&
            item.validity === 'current',
        ),
    )
  return remaining ? 'r' : 'o'
}
