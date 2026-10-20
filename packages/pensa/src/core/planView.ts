import type {
  PensaGameDefinition,
  PensaMission,
  PensaPlan,
  PensaTechnicalPlan,
} from '@sistemazero/core/pensa'

/** Leitura do plano para a tela: só ordena e agrupa o que o servidor mandou. */
export function orderedMissions(plan: PensaPlan): PensaMission[] {
  return [...plan.missions].sort((a, b) => a.position - b.position)
}

export function stagesWithMissions(plan: PensaPlan) {
  const missions = orderedMissions(plan)
  return [...plan.stages]
    .sort((a, b) => a.position - b.position)
    .map((stage, index) => ({
      stage,
      tone: STAGE_TONES[index % STAGE_TONES.length]!,
      missions: missions.filter((mission) => mission.stageId === stage.id),
    }))
    .filter((group) => group.missions.length > 0)
}

/** As cores das etapas no mapa, na ordem do Canvas (preparar, jogar, finalizar, conferir). */
const STAGE_TONES = ['yellow', 'action', 'mint', 'pink'] as const
export type StageTone = (typeof STAGE_TONES)[number]

export function missionNumber(plan: PensaPlan, missionId: string): number {
  return orderedMissions(plan).findIndex((mission) => mission.id === missionId) + 1
}

export function stageTitle(plan: PensaPlan, mission: PensaMission): string | null {
  return plan.stages.find((stage) => stage.id === mission.stageId)?.title ?? null
}

/** O nome da extensão recomendada pela preparação, do contexto técnico do plano. */
export function extensionNameFor(
  technical: PensaTechnicalPlan | null | undefined,
  mission: PensaMission,
): string | null {
  if (mission.kind !== 'setup' || !technical) return null
  return (
    technical.extensions.find((item) => item.id === mission.setup.runtimeExtensionId)?.name ?? null
  )
}

export function isFinalTest(mission: PensaMission): boolean {
  return mission.kind === 'playtest' && mission.scope === 'project'
}

/**
 * Onde cada elemento do jogo é criado: a missão de arte que o usa diz a oficina. Sem missão de
 * arte, o elemento é preparado no Estúdio (`editor`) ou já existe.
 */
export function slotDestination(
  definition: PensaGameDefinition,
  plan: PensaPlan,
  slotId: string,
): 'pinta' | 'molda' | 'studio' | null {
  const slot = definition.assetSlots.find((item) => item.id === slotId)
  if (!slot) return null
  const art = plan.missions.find(
    (mission) => mission.kind === 'asset' && mission.assetSlotIds.includes(slotId),
  )
  if (art && art.kind === 'asset') return art.destination
  if (slot.source === 'editor') return 'studio'
  return null
}
