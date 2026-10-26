import {
  CREATOR_MASTERY_IDS,
  CREATOR_POST_LEVELS,
  type CreatorCoursePlacement,
  type CreatorJourneyView,
  type JourneyLevelSlug,
} from '@sistemazero/core/journey'

export type CreatorJourneySkin = 'kids' | 'adult'
export type CreatorStageView = CreatorJourneyView['stages'][number]
export type CreatorMasteryView = CreatorJourneyView['masteries'][number]

export const CREATOR_POST_LABELS: Record<JourneyLevelSlug, string> = {
  noob: 'Faísca',
  coder: 'Construtor(a)',
  hacker: 'Inventor(a)',
  explorer: 'Explorador(a)',
  elite: 'Mestre dos Jogos',
  architect: 'Arquiteto(a)',
  champion: 'Gênio da Criação',
  god: 'Lenda',
}
export const CURRICULUM_ROLE_LABELS: Record<string, string> = {
  base2d: 'Base 2D',
  base3d: 'Base 3D',
  'base-2d': 'Base 2D',
  'base-3d': 'Base 3D',
  mission: 'Missão do posto',
  power: 'Poder',
  extra: 'Extra',
  nucleus: 'Núcleo da maestria',
  workshop: 'Oficina da maestria',
  project: 'Projeto da maestria',
  'mastery-nucleus': 'Núcleo da maestria',
  'mastery-workshop': 'Oficina da maestria',
  'mastery-project': 'Projeto da maestria',
}

export function creatorPostHref(level: string, skin: CreatorJourneySkin): string {
  return skin === 'kids'
    ? `/cursos/trilha/${encodeURIComponent(level)}`
    : `/cursos/etapa/${encodeURIComponent(level)}`
}

/** Explains the placement accompanying a server lock; it does not calculate access. */
export function creatorCourseLockPresentation(
  placement: CreatorCoursePlacement | undefined,
  skin: CreatorJourneySkin,
) {
  if (placement?.masteryId)
    return {
      href: `/maestrias/${encodeURIComponent(placement.masteryId)}`,
      title: 'Continue sua maestria',
      message: placement.masteryLevel
        ? `Este curso faz parte do nível ${placement.masteryLevel} desta maestria. Veja na área o que falta para abrir este nível.`
        : 'Este curso faz parte desta maestria. Veja na área os requisitos para continuar.',
      cta: 'Ver requisitos da maestria',
    }
  return {
    href: placement?.level ? creatorPostHref(placement.level, skin) : '/cursos',
    title: 'Um passo antes deste curso',
    message:
      placement?.role === 'base3d'
        ? 'Conclua a base 2D deste posto para começar a versão 3D.'
        : placement?.role === 'mission' ||
            placement?.role === 'power' ||
            placement?.role === 'extra'
          ? 'Conclua as bases 2D e 3D deste posto para abrir a missão, os poderes e os extras.'
          : 'Veja os próximos passos da sua jornada e os requisitos para abrir este curso.',
    cta: 'Ver requisitos na jornada',
  }
}

/** Only reads the known visual fields of the Members 423 DTO. */
export function creatorCourseLockFromBody(body: unknown, skin: CreatorJourneySkin) {
  const placement = (body as { careerLock?: { curriculum?: unknown } } | null)?.careerLock
    ?.curriculum
  if (!placement || typeof placement !== 'object')
    return creatorCourseLockPresentation(undefined, skin)
  const value = placement as Record<string, unknown>
  const roles: readonly string[] = [
    'base2d',
    'base3d',
    'mission',
    'power',
    'extra',
    'mastery-nucleus',
    'mastery-workshop',
    'mastery-project',
  ]
  if (typeof value.role !== 'string' || !roles.includes(value.role))
    return creatorCourseLockPresentation(undefined, skin)
  const level = CREATOR_POST_LEVELS.find((level) => level === value.level) ?? null
  const masteryId = CREATOR_MASTERY_IDS.find((id) => id === value.masteryId)
  const masteryLevel =
    value.masteryLevel === 1 || value.masteryLevel === 2 || value.masteryLevel === 3
      ? value.masteryLevel
      : undefined
  return creatorCourseLockPresentation(
    { role: value.role as CreatorCoursePlacement['role'], level, masteryId, masteryLevel },
    skin,
  )
}

/** Presentation of the server's evaluated facts. This never grants access or advancement. */
export function creatorStageSummary(stage: CreatorStageView): string {
  if (
    stage.earned &&
    (!stage.pairCompleted ||
      stage.mission.state !== 'completed' ||
      stage.powersCompleted < stage.minimumPowers)
  )
    return 'Posto já conquistado. Seus acessos continuam preservados.'
  if (stage.completed) return 'Posto concluído. Você pode continuar ampliando seus jogos.'
  const bases =
    Number(stage.base2d.state === 'completed') + Number(stage.base3d.state === 'completed')
  return `${bases}/2 bases · missão ${stage.mission.state === 'completed' ? 'concluída' : 'por concluir'} · ${stage.powersCompleted}/${stage.minimumPowers} poderes aplicados`
}

export function creatorCurrentStage(view: CreatorJourneyView): CreatorStageView | null {
  return view.stages.find((stage) => stage.level === view.level) ?? null
}

export function creatorJourneyHint(view: CreatorJourneyView): string {
  if (view.paused)
    return 'A progressão está pausada. Seus cursos e conquistas continuam guardados; você pode continuar criando com os acessos já liberados.'
  const stage = creatorCurrentStage(view)
  if (!stage) return 'Sua jornada continua nas maestrias. Escolha a área que quer aprofundar.'
  if (stage.base2d.state === 'unavailable' || stage.base3d.state === 'unavailable')
    return 'Os próximos cursos deste posto estão em preparação. Seus cursos e conquistas continuam guardados.'
  if (!stage.pairCompleted)
    return 'Conclua as bases 2D e 3D para abrir a missão, os poderes e os extras deste posto.'
  return `Para avançar: missão concluída e ${stage.minimumPowers} ${stage.minimumPowers === 1 ? 'poder aplicado' : 'poderes distintos aplicados'}. Você escolhe a ordem.`
}

export function curriculumRoleLabel(role: string): string {
  return CURRICULUM_ROLE_LABELS[role] ?? 'Curso da jornada'
}

export function creatorCourseAccessNote(reason: string | undefined): string | null {
  if (reason === 'direct-purchase')
    return 'Seu curso avulso está liberado. O progresso também conta na jornada.'
  if (reason === 'gift')
    return 'Este curso foi liberado como presente. O progresso também conta na jornada.'
  if (reason === 'retained') return 'Acesso já conquistado, preservado na nova jornada.'
  return null
}
