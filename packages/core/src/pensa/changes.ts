import type {
  PensaChangeImpact,
  PensaGameDefinition,
  PensaMission,
  PensaMissionProgress,
  PensaPlan,
  PensaProjectRevision,
  PensaTechnicalPlan,
} from './model'

/** Deterministic comparisons ignore object insertion order, but preserve meaningful array order. */
export function pensaCanonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(pensaCanonicalJson).join(',')}]`
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${pensaCanonicalJson(item)}`)
      .join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

export function pensaDependentClosure(
  ids: readonly string[],
  missions: readonly PensaMission[],
): Set<string> {
  const affected = new Set(ids)
  let changed = true
  while (changed) {
    changed = false
    for (const mission of missions) {
      if (!affected.has(mission.id) && mission.dependencyIds.some((id) => affected.has(id))) {
        affected.add(mission.id)
        changed = true
      }
    }
  }
  return affected
}

/** Existing artwork and newly delivered artwork lose the same team authorization. */
export function pensaAssetDependentsForProfiles(
  revision: PensaProjectRevision | null,
  progress: readonly PensaMissionProgress[],
  profileIds: readonly string[],
): Set<string> {
  if (!revision) return new Set()
  const removed = new Set(profileIds)
  const slots = new Set(
    revision.definition.assetSlots
      .filter((slot) => slot.existing && removed.has(slot.existing.profileId))
      .map((slot) => slot.id),
  )
  const seeds = revision.plan.missions
    .filter(
      (mission) =>
        (mission.kind === 'asset' || mission.kind === 'integration') &&
        (mission.assetSlotIds.some((id) => slots.has(id)) ||
          progress.some(
            (item) =>
              item.missionId === mission.id &&
              item.deliveries.some(
                (delivery) =>
                  delivery.creation.tool !== 'studio' && removed.has(delivery.creation.profileId),
              ),
          )),
    )
    .map((mission) => mission.id)
  return pensaDependentClosure(seeds, revision.plan.missions)
}

/** The server assigns content revisions; a proposed plan cannot reset them. */
export function reconcilePensaMissionVersions(
  previous: PensaProjectRevision | null,
  next: PensaPlan,
): PensaPlan {
  const oldMissions = new Map(previous?.plan.missions.map((mission) => [mission.id, mission]) ?? [])
  const content = (mission: PensaMission) => {
    const { contentRevision: _revision, position: _position, stageId: _stage, ...rest } = mission
    return rest
  }
  return {
    ...next,
    stages: [...next.stages].sort((a, b) => a.position - b.position),
    missions: [...next.missions]
      .sort((a, b) => a.position - b.position)
      .map((mission) => {
        const old = oldMissions.get(mission.id)
        const changed =
          old && pensaCanonicalJson(content(old)) !== pensaCanonicalJson(content(mission))
        return { ...mission, contentRevision: old ? old.contentRevision + (changed ? 1 : 0) : 1 }
      }),
  }
}

export function analyzePensaChange(
  previous: PensaProjectRevision | null,
  next: { definition: PensaGameDefinition; plan: PensaPlan; technical: PensaTechnicalPlan },
): PensaChangeImpact {
  const oldMissions = new Map(previous?.plan.missions.map((item) => [item.id, item]) ?? [])
  const nextMissions = new Map(next.plan.missions.map((item) => [item.id, item]))
  const addedMissionIds = [...nextMissions.keys()].filter((id) => !oldMissions.has(id))
  const removedMissionIds = [...oldMissions.keys()].filter((id) => !nextMissions.has(id))
  const changedMissionIds: string[] = []
  const editorialMissionIds: string[] = []
  const reorderedMissionIds: string[] = []
  const oldRequirements = new Map(
    previous?.definition.requirements.map((item) => [item.id, item]) ?? [],
  )
  const newRequirements = new Map(next.definition.requirements.map((item) => [item.id, item]))
  const affectedRequirementIds = [
    ...new Set([...oldRequirements.keys(), ...newRequirements.keys()]),
  ].filter(
    (id) =>
      pensaCanonicalJson(oldRequirements.get(id)) !== pensaCanonicalJson(newRequirements.get(id)),
  )
  const changedSlots = new Set<string>()
  for (const slot of [...(previous?.definition.assetSlots ?? []), ...next.definition.assetSlots]) {
    if (
      pensaCanonicalJson(previous?.definition.assetSlots.find((item) => item.id === slot.id)) !==
      pensaCanonicalJson(next.definition.assetSlots.find((item) => item.id === slot.id))
    )
      changedSlots.add(slot.id)
  }
  const meaning = (mission: PensaMission) => {
    const {
      title: _title,
      position: _position,
      stageId: _stage,
      contentRevision: _revision,
      ...behavior
    } = mission
    return behavior
  }
  for (const mission of next.plan.missions) {
    const old = oldMissions.get(mission.id)
    if (!old) continue
    const oldResources = previous?.technical.missionResources.find(
      (item) => item.missionId === mission.id,
    )
    const nextResources = next.technical.missionResources.find(
      (item) => item.missionId === mission.id,
    )
    const resourcesChanged = pensaCanonicalJson(oldResources) !== pensaCanonicalJson(nextResources)
    const runtimeChanged =
      mission.destination === 'studio' &&
      (previous?.technical.authoring !== next.technical.authoring ||
        previous?.technical.runtimeExtensionId !== next.technical.runtimeExtensionId ||
        previous?.definition.dimension !== next.definition.dimension)
    const requirementsChanged = [...old.requirementIds, ...mission.requirementIds].some((id) =>
      affectedRequirementIds.includes(id),
    )
    const slotsChanged =
      'assetSlotIds' in mission && mission.assetSlotIds.some((id) => changedSlots.has(id))
    if (
      pensaCanonicalJson(meaning(old)) !== pensaCanonicalJson(meaning(mission)) ||
      resourcesChanged ||
      runtimeChanged ||
      requirementsChanged ||
      slotsChanged
    )
      changedMissionIds.push(mission.id)
    else if (old.title !== mission.title) editorialMissionIds.push(mission.id)
    if (old.position !== mission.position || old.stageId !== mission.stageId)
      reorderedMissionIds.push(mission.id)
  }
  const affected = pensaDependentClosure(
    [...changedMissionIds, ...removedMissionIds],
    [...(previous?.plan.missions ?? []), ...next.plan.missions],
  )
  const reviewMissionIds = [...affected].filter((id) => nextMissions.has(id) && oldMissions.has(id))
  return {
    addedMissionIds,
    removedMissionIds,
    changedMissionIds,
    editorialMissionIds,
    reorderedMissionIds,
    reviewMissionIds,
    affectedRequirementIds,
  }
}

/** Reopening keeps deliveries and history; only performed work needs reconfirmation. */
export function invalidatePensaProgress(
  progress: readonly PensaMissionProgress[],
  missionIds: readonly string[],
): PensaMissionProgress[] {
  const affected = new Set(missionIds)
  return progress.map((item) =>
    affected.has(item.missionId) && item.status !== 'planned' && item.validity !== 'needs_review'
      ? { ...item, validity: 'needs_review', progressRevision: item.progressRevision + 1 }
      : item,
  )
}
