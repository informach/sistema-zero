import { canExecutePensaMission } from './capabilities'
import { PENSA_GAME_RUNTIME_EXTENSION_IDS, PENSA_LIMITS, pensaRuntimeDimension } from './limits'
import type {
  PensaCapabilities,
  PensaGameDefinition,
  PensaMission,
  PensaPlan,
  PensaTeamView,
  PensaTechnicalPlan,
} from './model'
import { PensaGameDefinitionSchema, PensaPlanSchema, PensaTechnicalPlanSchema } from './schemas'

export interface PensaPlanIssue {
  code: string
  path: string
  message: string
  missionId?: string
}
export interface PensaPlanInput {
  definition: PensaGameDefinition
  plan: PensaPlan
  technical: PensaTechnicalPlan
  capabilities?: PensaCapabilities
  team?: PensaTeamView
  accepted?: boolean
}

export function pensaDependencyClosure(
  missionIds: readonly string[],
  missions: readonly PensaMission[],
): Set<string> {
  const byId = new Map(missions.map((mission) => [mission.id, mission]))
  const result = new Set<string>()
  const pending = [...missionIds]
  while (pending.length) {
    const id = pending.pop()
    if (!id || result.has(id)) continue
    result.add(id)
    pending.push(...(byId.get(id)?.dependencyIds ?? []))
  }
  return result
}

export function validatePensaPlan(input: PensaPlanInput): {
  ok: boolean
  issues: PensaPlanIssue[]
} {
  const issues: PensaPlanIssue[] = []
  const add = (code: string, path: string, message: string, missionId?: string) => {
    issues.push({ code, path, message, ...(missionId ? { missionId } : {}) })
  }
  for (const [key, schema] of [
    ['definition', PensaGameDefinitionSchema],
    ['plan', PensaPlanSchema],
    ['technical', PensaTechnicalPlanSchema],
  ] as const) {
    const parsed = schema.safeParse(input[key])
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        add('schema', `${key}.${issue.path.join('.')}`, issue.message)
    }
  }
  if (issues.length) return { ok: false, issues }
  if (
    new TextEncoder().encode(
      JSON.stringify({
        definition: input.definition,
        plan: input.plan,
        technical: input.technical,
      }),
    ).length > PENSA_LIMITS.snapshotBytes
  ) {
    add('size', '', 'O plano ultrapassa o tamanho permitido.')
  }
  const { definition, plan, technical, capabilities } = input
  if (
    input.accepted &&
    (definition.requirements.some((item) => item.origin === 'suggestion') ||
      definition.adaptations.some((item) => !item.acceptedAt || !item.acceptedByProfileId))
  ) {
    add(
      'unaccepted_suggestion',
      'definition',
      'A revisão aceita precisa registrar a escolha da criança.',
    )
  }
  for (const adaptation of definition.adaptations) {
    if (Boolean(adaptation.acceptedAt) !== Boolean(adaptation.acceptedByProfileId))
      add(
        'adaptation_receipt',
        'definition.adaptations',
        'O aceite precisa registrar pessoa e data juntos.',
      )
  }
  const unique = (values: readonly string[], path: string) => {
    if (new Set(values).size !== values.length)
      add('duplicate', path, 'Cada item precisa ter uma identidade única.')
  }
  unique(
    definition.requirements.map((item) => item.id),
    'definition.requirements',
  )
  unique(
    definition.assetSlots.map((item) => item.id),
    'definition.assetSlots',
  )
  unique(
    plan.stages.map((item) => item.id),
    'plan.stages',
  )
  unique(
    plan.stages.map((item) => String(item.position)),
    'plan.stages.position',
  )
  unique(
    plan.missions.map((item) => item.id),
    'plan.missions',
  )
  unique(
    plan.missions.map((item) => String(item.position)),
    'plan.missions.position',
  )
  unique(
    technical.missionResources.map((item) => item.missionId),
    'technical.missionResources',
  )
  unique(
    technical.extensions.map((item) => item.id),
    'technical.extensions',
  )
  const missionById = new Map(plan.missions.map((item) => [item.id, item]))
  const stageById = new Map(plan.stages.map((item) => [item.id, item]))
  const requirementIds = new Set(definition.requirements.map((item) => item.id))
  const slots = new Map(definition.assetSlots.map((item) => [item.id, item]))
  const covered = new Set(
    plan.missions
      .filter((item) => ['feature', 'asset', 'integration'].includes(item.kind))
      .flatMap((item) => item.requirementIds),
  )
  for (const id of requirementIds)
    if (!covered.has(id))
      add('uncovered_requirement', 'plan', 'Um requisito combinado ficou sem missão.')
  if (!plan.missions.some((item) => item.kind === 'feature' || item.kind === 'integration')) {
    add(
      'missing_construction',
      'plan.missions',
      'O plano precisa construir as funcionalidades do jogo.',
    )
  }
  const finalTests = plan.missions.filter(
    (item) => item.kind === 'playtest' && item.scope === 'project',
  )
  if (finalTests.length !== 1)
    add('final_test', 'plan.missions', 'O jogo precisa de uma missão final para testar tudo.')
  const finalTest = finalTests[0]
  if (finalTest) {
    const closure = pensaDependencyClosure(finalTest.dependencyIds, plan.missions)
    for (const mission of plan.missions) {
      if (mission.id !== finalTest.id && !closure.has(mission.id)) {
        add(
          'final_test_coverage',
          'plan.missions',
          'O teste final precisa esperar todas as partes do jogo ficarem prontas.',
          finalTest.id,
        )
      }
    }
  }
  const setups = plan.missions.filter((item) => item.kind === 'setup')
  if (setups.length > 1)
    add('multiple_setup', 'plan.missions', 'Use uma única configuração inicial do jogo.')
  if (technical.authoring === 'code' && (setups.length || technical.runtimeExtensionId)) {
    add('code_setup', 'technical', 'O Estúdio Pro não instala extensões de blocos.')
  }
  if (technical.authoring === 'blocks') {
    if (
      technical.extensions.filter((item) => PENSA_GAME_RUNTIME_EXTENSION_IDS.includes(item.id))
        .length !== 1
    ) {
      add('runtime_count', 'technical.extensions', 'Use uma única extensão principal de jogo.')
    }
    if (
      !technical.runtimeExtensionId ||
      !PENSA_GAME_RUNTIME_EXTENSION_IDS.includes(technical.runtimeExtensionId)
    ) {
      add('runtime', 'technical.runtimeExtensionId', 'Selecione uma extensão oficial para o jogo.')
    }
    if (setups.length !== 1)
      add(
        'missing_setup',
        'plan.missions',
        'Inclua a configuração inicial da extensão recomendada.',
      )
    if (
      technical.runtimeExtensionId &&
      pensaRuntimeDimension(technical.runtimeExtensionId) !== definition.dimension
    )
      add(
        'runtime_dimension',
        'technical.runtimeExtensionId',
        'A extensão precisa corresponder ao formato do jogo escolhido.',
      )
    const setup = setups[0]
    if (setup?.kind === 'setup') {
      const prepared = new Set([
        setup.setup.runtimeExtensionId,
        ...setup.setup.requiredAuxiliaryExtensionIds,
      ])
      const required = technical.missionResources
        .filter((resource) => missionById.get(resource.missionId)?.destination === 'studio')
        .flatMap((resource) => resource.extensionIds)
      if (
        required.some((id) => !prepared.has(id)) ||
        [...prepared].some((id) => !technical.extensions.some((extension) => extension.id === id))
      )
        add(
          'setup_extensions',
          'plan.missions',
          'A preparação precisa incluir as extensões necessárias para o jogo.',
          setup.id,
        )
      for (const mission of plan.missions) {
        if (
          mission.destination === 'studio' &&
          mission.id !== setup.id &&
          !pensaDependencyClosure(mission.dependencyIds, plan.missions).has(setup.id)
        )
          add(
            'setup_dependency',
            `plan.missions.${mission.id}`,
            'Prepare o Estúdio antes de programar e experimentar o jogo.',
            mission.id,
          )
      }
    }
  }
  for (const mission of plan.missions) {
    const path = `plan.missions.${mission.id}`
    if (
      ['feature', 'asset', 'integration'].includes(mission.kind) &&
      !mission.requirementIds.length
    ) {
      add(
        'unjustified_mission',
        path,
        'Esta criação precisa fazer parte do jogo escolhido.',
        mission.id,
      )
    }
    unique(mission.dependencyIds, `${path}.dependencyIds`)
    unique(mission.requirementIds, `${path}.requirementIds`)
    unique(
      mission.rules.map((item) => item.id),
      `${path}.rules`,
    )
    unique(
      mission.checks.map((item) => item.id),
      `${path}.checks`,
    )
    const stage = stageById.get(mission.stageId)
    if (!stage)
      add('unknown_stage', path, 'A missão precisa estar em uma parte do caminho.', mission.id)
    for (const id of mission.requirementIds)
      if (!requirementIds.has(id))
        add('unknown_requirement', path, 'A missão cita um requisito inexistente.', mission.id)
    for (const id of mission.dependencyIds) {
      const dependency = missionById.get(id)
      if (!dependency || dependency.position >= mission.position || dependency.id === mission.id) {
        add(
          'dependency_order',
          path,
          'A dependência precisa existir antes desta missão.',
          mission.id,
        )
      } else if (stage && (stageById.get(dependency.stageId)?.position ?? 0) > stage.position) {
        add(
          'stage_order',
          path,
          'A ordem do caminho precisa respeitar o que deve ficar pronto antes.',
          mission.id,
        )
      }
    }
    if (
      new TextEncoder().encode(
        JSON.stringify({
          title: mission.title,
          objective: mission.objective,
          rules: mission.rules,
          checks: mission.checks,
        }),
      ).length > PENSA_LIMITS.missionProseBytes
    ) {
      add('mission_size', path, 'Simplifique o texto desta missão.', mission.id)
    }
    if (
      mission.kind === 'setup' &&
      (mission.setup.runtimeExtensionId !== technical.runtimeExtensionId ||
        !technical.extensions.some((item) => item.id === mission.setup.runtimeExtensionId))
    ) {
      add(
        'setup_runtime',
        path,
        'A recomendação precisa corresponder à extensão escolhida.',
        mission.id,
      )
    }
    if (mission.kind === 'asset' || mission.kind === 'integration') {
      unique(mission.assetSlotIds, `${path}.assetSlotIds`)
      if (!mission.assetSlotIds.length)
        add('asset_slot', path, 'Indique os elementos desta missão.', mission.id)
      for (const slotId of mission.assetSlotIds) {
        const slot = slots.get(slotId)
        if (!slot) {
          add('unknown_asset', path, 'O elemento da missão não existe.', mission.id)
          continue
        }
        if (mission.kind === 'asset') {
          const tool = ['model', 'texture', 'sky'].includes(slot.kind) ? 'molda' : 'pinta'
          if (slot.source !== 'create' || mission.destination !== tool)
            add('asset_tool', path, 'Crie o elemento na ferramenta adequada.', mission.id)
        } else if (slot.source === 'create') {
          const creators = plan.missions.filter(
            (item) => item.kind === 'asset' && item.assetSlotIds.includes(slotId),
          )
          const dependencies = pensaDependencyClosure(mission.dependencyIds, plan.missions)
          if (!creators.length || creators.some((creator) => !dependencies.has(creator.id)))
            add(
              'asset_dependency',
              path,
              'A integração precisa esperar a criação do elemento.',
              mission.id,
            )
        }
      }
    }
    const resource = technical.missionResources.find((item) => item.missionId === mission.id)
    if (!resource)
      add('missing_resources', path, 'A missão precisa ter os recursos verificados.', mission.id)
    if (resource) {
      for (const extensionId of resource.extensionIds)
        if (!technical.extensions.some((item) => item.id === extensionId))
          add(
            'unknown_extension',
            path,
            'A extensão não faz parte dos recursos verificados.',
            mission.id,
          )
      if (mission.kind === 'setup' && resource.blockIds.length)
        add(
          'setup_blocks',
          path,
          'A configuração inicial não precisa de blocos de programação.',
          mission.id,
        )
    }
    if (capabilities) {
      const candidates = capabilities.participants.filter((person) =>
        mission.destination === 'studio'
          ? person.profileId === capabilities.programmerProfileId
          : !input.team || input.team.artistProfileIds.includes(person.profileId),
      )
      if (
        !candidates.some((person) =>
          canExecutePensaMission(mission, person, technical, capabilities),
        )
      )
        add(
          'unavailable_resources',
          path,
          'Nenhum responsável tem os recursos necessários para esta missão.',
          mission.id,
        )
    }
  }
  for (const resource of technical.missionResources)
    if (!missionById.has(resource.missionId))
      add(
        'unknown_resource_mission',
        'technical.missionResources',
        'Os recursos citam uma missão inexistente.',
      )
  for (const slot of definition.assetSlots) {
    const tool = ['model', 'texture', 'sky'].includes(slot.kind) ? 'molda' : 'pinta'
    if (slot.existing && slot.existing.tool !== tool)
      add(
        'existing_asset_tool',
        'definition.assetSlots',
        'A criação existente precisa ser da ferramenta adequada ao elemento.',
      )
    if (slot.source === 'existing' && !slot.existing)
      add(
        'missing_creation',
        'definition.assetSlots',
        'O elemento existente precisa de uma criação salva.',
      )
    if (slot.source !== 'existing' && slot.existing)
      add(
        'unexpected_creation',
        'definition.assetSlots',
        'A origem do elemento não corresponde à criação.',
      )
    if (
      slot.source === 'create' &&
      !plan.missions.some((item) => item.kind === 'asset' && item.assetSlotIds.includes(slot.id))
    )
      add('missing_asset_mission', 'plan', 'Um elemento a criar ficou sem missão.')
    if (
      !plan.missions.some(
        (item) => item.kind === 'integration' && item.assetSlotIds.includes(slot.id),
      )
    )
      add('missing_integration', 'plan', 'Um elemento ficou sem integração no jogo.')
  }
  if (capabilities) {
    const programmer = capabilities.participants.find(
      (person) => person.profileId === capabilities.programmerProfileId,
    )
    if (!programmer?.studio || !programmer.dimensions.includes(definition.dimension))
      add(
        'dimension_access',
        'definition.dimension',
        'A dimensão do jogo não está liberada para quem vai programar.',
      )
    if (
      technical.authoring !== (capabilities.observedGame?.authoring ?? programmer?.studioAuthoring)
    )
      add(
        'authoring_access',
        'technical.authoring',
        'O plano precisa usar a programação disponível para quem vai construir o jogo.',
      )
    if (
      technical.capabilitiesFingerprint !== capabilities.fingerprint ||
      technical.catalogVersion !== capabilities.catalogVersion
    )
      add(
        'stale_capabilities',
        'technical',
        'Os recursos mudaram. Revise o plano com os acessos atuais.',
      )
  }
  return { ok: issues.length === 0, issues }
}
