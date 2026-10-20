import { z } from 'zod'

export const ADULT_CREATOR_CAPABILITIES = [
  'studio',
  'pinta',
  'molda',
  'bridge',
  'pro',
  'ai',
  'pensa',
] as const
export type AdultCreatorCapability = (typeof ADULT_CREATOR_CAPABILITIES)[number]

const Requirement = z.strictObject({
  courseId: z.uuid(),
  milestone: z.enum(['complete', 'showcase']),
})
const Stage = z.strictObject({
  id: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(64),
  title: z.string().trim().min(1).max(120),
  requirements: z.array(Requirement).min(1).max(200),
  capabilities: z.array(z.enum(ADULT_CREATOR_CAPABILITIES)).max(7),
})

/** Configuração adulta independente do catálogo de posições Kids. */
export const AdultJourneyPolicySchema = z
  .strictObject({ schemaVersion: z.literal(1), stages: z.array(Stage).max(500) })
  .superRefine((policy, ctx) => {
    const ids = new Set<string>()
    for (const [index, stage] of policy.stages.entries()) {
      if (ids.has(stage.id))
        ctx.addIssue({ code: 'custom', path: ['stages', index, 'id'], message: 'Etapa repetida.' })
      ids.add(stage.id)
      const courses = new Set<string>()
      for (const requirement of stage.requirements) {
        if (courses.has(requirement.courseId))
          ctx.addIssue({
            code: 'custom',
            path: ['stages', index, 'requirements'],
            message: 'Curso repetido na etapa.',
          })
        courses.add(requirement.courseId)
      }
      if (new Set(stage.capabilities).size !== stage.capabilities.length)
        ctx.addIssue({
          code: 'custom',
          path: ['stages', index, 'capabilities'],
          message: 'Capacidade repetida.',
        })
    }
  })
export type AdultJourneyPolicy = z.infer<typeof AdultJourneyPolicySchema>
export const EMPTY_ADULT_JOURNEY_POLICY: AdultJourneyPolicy = { schemaVersion: 1, stages: [] }

export interface AdultCourseMilestone {
  courseId: string
  completed: boolean
  showcased: boolean
}
export interface AdultJourneyView {
  audience: 'adult'
  policyVersion: number
  configured: boolean
  capabilities: AdultCreatorCapability[]
  stages: {
    id: string
    title: string
    completed: boolean
    available: boolean
    /** Todos os cursos que a etapa pede (a página da etapa lista os feitos e os que faltam). */
    requirements: { courseId: string; milestone: 'complete' | 'showcase' }[]
    missing: { courseId: string; milestone: 'complete' | 'showcase' }[]
    /** O que a etapa libera quando termina. */
    capabilities: AdultCreatorCapability[]
  }[]
}

/**
 * Onde a pessoa está na jornada adulta: a primeira etapa ainda não concluída. Quem concluiu todas
 * fica numa posição a mais, `stages.length + 1` (sem etapa, `stageId`/`title` nulos), que é o
 * "jornada completa" da apresentação. A cor e o nome dessa última posição são da interface.
 */
export interface AdultJourneyPosition {
  /** 1-based. */
  position: number
  /** Etapas configuradas + a posição de quem terminou tudo. */
  total: number
  stageId: string | null
  title: string | null
}

export function adultJourneyPosition(
  view: Pick<AdultJourneyView, 'configured' | 'stages'> | null | undefined,
): AdultJourneyPosition | null {
  if (!view?.configured || view.stages.length === 0) return null
  const total = view.stages.length + 1
  const index = view.stages.findIndex((stage) => !stage.completed)
  if (index === -1) return { position: total, total, stageId: null, title: null }
  const stage = view.stages[index]
  return { position: index + 1, total, stageId: stage?.id ?? null, title: stage?.title ?? null }
}

/**
 * A posição mais alta que a pessoa já alcançou é um PISO: nunca volta, mesmo que a política mude
 * depois (curso novo numa etapa já concluída, etapa nova no começo). Entra só um inteiro válido
 * (>= 1); qualquer outra coisa é "sem piso".
 */
export function normalizeAdultJourneyFloor(reached: number | null | undefined): number {
  return typeof reached === 'number' && Number.isInteger(reached) && reached > 1 ? reached : 1
}

/**
 * Exige as etapas anteriores e os marcos reais; XP e licença não substituem conclusão.
 *
 * `reachedPosition` é o piso gravado (a posição mais alta já alcançada). As etapas ABAIXO dele
 * aparecem concluídas (sem `missing`) e contam como anteriores concluídas para a seguinte; a posição
 * resultante é `max(calculada, piso)`, limitada a `stages.length + 1`. O piso NÃO concede
 * capacidade: elas vêm só da conclusão real e do que já foi congelado (`frozen`), para que uma etapa
 * nova inserida abaixo do piso nunca libere ferramenta (por exemplo IA sem curso avançado).
 */
export function projectAdultJourney(
  policy: AdultJourneyPolicy,
  version: number,
  milestones: readonly AdultCourseMilestone[],
  frozen: readonly AdultCreatorCapability[] = [],
  reachedPosition: number | null = null,
): AdultJourneyView {
  const byCourse = new Map(milestones.map((milestone) => [milestone.courseId, milestone]))
  const earned = new Set(frozen)
  const floor = normalizeAdultJourneyFloor(reachedPosition)
  let previousComplete = true
  const stages = policy.stages.map((stage, index) => {
    const belowFloor = index + 1 < floor
    const realMissing = stage.requirements
      .filter((requirement) => {
        const milestone = byCourse.get(requirement.courseId)
        return (
          !milestone?.completed || (requirement.milestone === 'showcase' && !milestone.showcased)
        )
      })
      .map((requirement) => ({ ...requirement }))
    const available = belowFloor || previousComplete
    const reallyCompleted = available && realMissing.length === 0
    if (reallyCompleted) for (const capability of stage.capabilities) earned.add(capability)
    const completed = belowFloor || reallyCompleted
    previousComplete = completed
    return {
      id: stage.id,
      title: stage.title,
      completed,
      available,
      requirements: stage.requirements.map((requirement) => ({ ...requirement })),
      missing: belowFloor ? [] : realMissing,
      capabilities: [...stage.capabilities],
    }
  })
  return {
    audience: 'adult',
    policyVersion: version,
    configured: policy.stages.length > 0,
    capabilities: ADULT_CREATOR_CAPABILITIES.filter((capability) => earned.has(capability)),
    stages,
  }
}
