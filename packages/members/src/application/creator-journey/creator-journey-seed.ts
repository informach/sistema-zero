import { createHash } from 'node:crypto'
import {
  CREATOR_POST_LEVELS,
  type CreatorJourneyCurriculum,
  CreatorJourneyCurriculumSchema,
  type CreatorMasteryId,
  type CreatorPostLevel,
} from '@sistemazero/core/journey'
import type { Course, CourseAudience, CourseLevel } from '../../domain/course/course'

/** Editorial source is a checked-in document, never a claim that teaching content is published. */
export interface CreatorEditorialSpec {
  version: string
  stages: {
    id: string
    name: string
    n: number
    genre: string
    promise: string
    rationale: string
    concepts: string[]
    math: string
    courses: {
      title: string
      dimension: string
      environment: string
      origin: string
      lessons: string[]
    }[]
    mission: {
      authoredSource?: { courseSlug: string; directory: string; lessons: string[]; note: string }
      title: string
      lessons: number
      brief: string
      same: string
      prepared: string
      two: string[]
      three: string[]
      checks: string[]
      variant: string
      not_new: string
    }
    required: number
    powers: {
      title: string
      addition: string
      prerequisite: string
      application: string
      check: string
      lessons: number
    }[]
    extras: {
      title: string
      purpose: string
      origin: string
      authoredSource?: { courseSlug: string; directory: string; lessons: string[]; note: string }
    }[]
  }[]
  masteries: {
    id: string
    name: string
    focus: string
    tools: string
    boundary: string
    levels: {
      title: string
      anchor: string
      steps: string[]
      workshops: [string, string][]
      project: string
      checks: string[]
      credit: string
    }[]
  }[]
}

export interface CreatorSeedCourse {
  key: string
  slug: string
  title: string
  description: string
  audience: CourseAudience
  level: CourseLevel
  track: '2d' | '3d'
  outline: string[]
  id: string
  action: 'reuse' | 'create'
  version: number | null
}
export interface CreatorJourneySeedPlan {
  version: string
  courses: CreatorSeedCourse[]
  curricula: Record<CourseAudience, CreatorJourneyCurriculum>
  /** Existing course rows are bound by UUID and never retagged or re-created. */
  preservedCourseIds: string[]
}

function stableId(key: string): string {
  const hex = createHash('sha256').update(`sistema-zero:creator-journey:${key}`).digest('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}
export function creatorSeedOutlineHash(outline: readonly string[]): string {
  return createHash('sha256').update(JSON.stringify(outline)).digest('hex')
}
const EXISTING_BASES: Record<number, string> = {
  0: 'desafio-primeiro-jogo',
  1: 'nave-contra-asteroides',
  2: 'corre-dino',
}
const EXISTING_EXTRAS: Record<string, string> = {
  'Cadê Todo Mundo?': 'cade-todo-mundo',
  'O Jogo do Meu Jeito': 'o-jogo-do-meu-jeito',
  'O jogo do meu jeito': 'o-jogo-do-meu-jeito',
}
const masteryEntry: Record<CreatorMasteryId, CreatorPostLevel> = {
  python2d: 'explorer',
  python3d: 'explorer',
  javascript2d: 'coder',
  javascript3d: 'hacker',
  arte2d: 'coder',
  modelagem3d: 'hacker',
}

/** Pure planning: stable slugs for new drafts and strict exact-slug identity for the existing catalog. */
export function buildCreatorJourneySeed(
  spec: CreatorEditorialSpec,
  catalog: readonly Course[],
): CreatorJourneySeedPlan {
  if (spec.stages.length !== 7 || spec.masteries.length !== 6)
    throw new Error('O currículo editorial precisa conter sete postos e seis Maestrias.')
  const courses: CreatorSeedCourse[] = []
  const curricula = {} as Record<CourseAudience, CreatorJourneyCurriculum>
  const bySlug = new Map<string, Course>()
  for (const course of catalog) {
    if (bySlug.has(course.slug)) throw new Error(`Identidade de curso ambígua: ${course.slug}`)
    bySlug.set(course.slug, course)
  }
  for (const audience of ['kids', 'adult'] as const) {
    const add = (input: {
      key: string
      title: string
      description: string
      outline: string[]
      level: CourseLevel
      track: '2d' | '3d'
      existingSlug?: string
    }): string => {
      const slug = `${input.existingSlug ?? `jornada-${input.key}`}${audience === 'adult' ? '-adulto' : ''}`
      const existing = bySlug.get(slug)
      if (existing && (existing.audience !== audience || existing.modality !== 'recorded'))
        throw new Error(`O slug ${slug} pertence a outro público ou modalidade.`)
      const source = existing?.metadata?.creatorSeed
      if (source && typeof source === 'object' && !Array.isArray(source)) {
        const marker = source as { key?: unknown; outlineHash?: unknown }
        if (
          marker.key !== input.key ||
          marker.outlineHash !== creatorSeedOutlineHash(input.outline)
        )
          throw new Error(
            `O planejamento editorial de ${slug} mudou. Revise a equivalência antes de reutilizar o curso e seu progresso.`,
          )
      }
      const id = existing?.id ?? stableId(`${audience}:${input.key}`)
      courses.push({
        ...input,
        audience,
        slug,
        id,
        action: existing ? 'reuse' : 'create',
        version: existing?.version ?? null,
      })
      return id
    }
    const stages = spec.stages.map((stage, index) => {
      const post = CREATOR_POST_LEVELS[index]!
      const level: CourseLevel =
        index === 0
          ? 'primeiros-passos'
          : index < 3
            ? 'iniciante'
            : index < 5
              ? 'intermediario'
              : 'avancado'
      const baseIds = stage.courses.map((course, dimension) =>
        add({
          key: `${stage.id}-base-${dimension === 0 ? '2d' : '3d'}`,
          title: course.title,
          level: index === 0 && dimension === 1 ? 'iniciante' : level,
          track: dimension === 0 ? '2d' : '3d',
          description: `${stage.promise}\n\n${stage.rationale}\n\n${course.environment}\n${course.origin}\n\nConceitos: ${stage.concepts.join('; ')}.\n${stage.math}`,
          outline: course.lessons,
          existingSlug: dimension === 0 ? EXISTING_BASES[index] : undefined,
        }),
      )
      if (baseIds.length !== 2) throw new Error(`Par incompleto: ${stage.name}`)
      const mission = stage.mission
      const missionCourseId = add({
        key: `${stage.id}-missao`,
        title: mission.title,
        level,
        track: '2d',
        description: `${mission.brief}\n\nMesma lógica: ${mission.same}\nBase preparada: ${mission.prepared}\n\nCritérios: ${mission.checks.join('\n')}\nVariação: ${mission.variant}\nEscopo: ${mission.not_new}`,
        outline: [
          `Aplicação em 2D — ${mission.two.join(' ')}`,
          `Aplicação em 3D — ${mission.three.join(' ')}`,
          ...(mission.lessons > 2
            ? [`Testar e explicar a transferência — ${mission.checks.join(' ')}`]
            : []),
        ],
      })
      const powers = stage.powers.map((power, powerIndex) => ({
        mechanicId: `${stage.id}-poder-${powerIndex + 1}`,
        title: power.title,
        courseIds: [
          add({
            key: `${stage.id}-poder-${powerIndex + 1}`,
            title: power.title,
            level,
            track: '2d',
            description: `Mecânica: ${power.addition}\nPré-requisito: ${power.prerequisite}\nAplicação no jogo-base: ${power.application}\nCritério: ${power.check}\n\nEnsinar os blocos e o código correspondente antes da aplicação. O mesmo Poder aplicado em 2D e 3D conta uma vez.`,
            outline: Array.from({ length: power.lessons }, (_, lesson) =>
              lesson === 0
                ? `Entender, experimentar e aplicar — ${power.addition} ${power.lessons === 1 ? `${power.application} Critério: ${power.check}` : ''}`
                : lesson === power.lessons - 1
                  ? `Integrar e verificar — ${power.application} ${power.check}`
                  : `Construir e testar — ${power.application}`,
            ),
          }),
        ],
      }))
      const extras = stage.extras.map((extra, extraIndex) => ({
        title: extra.title,
        courseId: add({
          key: `${stage.id}-extra-${extraIndex + 1}`,
          title: extra.title,
          level,
          track: '2d',
          description: `${extra.purpose}\n\n${extra.origin}\n\nExtra opcional, sem requisito de promoção.`,
          outline: [`Explorar e aplicar — ${extra.purpose}`],
          existingSlug: EXISTING_EXTRAS[extra.title],
        }),
      }))
      const grants: CreatorJourneyCurriculum['stages'][number]['grants'] =
        index === 0
          ? [
              { after: 'base2d', capabilities: ['studio', 'pinta'] },
              { after: 'base3d', capabilities: ['molda'] },
            ]
          : index === 1
            ? [{ after: 'pair', capabilities: ['ai', 'pensa', 'bridge'] }]
            : index === 3
              ? [{ after: 'base2d', capabilities: ['pro'] }]
              : []
      return {
        level: post,
        title: stage.name,
        genre: stage.genre,
        goal: stage.promise,
        base2dCourseId: baseIds[0]!,
        base3dCourseId: baseIds[1]!,
        missionCourseId,
        powers,
        minimumPowers: stage.required as 1 | 2,
        extras,
        grants,
      }
    })
    const masteries = spec.masteries.map((mastery) => {
      const id = (mastery.id === 'arte3d' ? 'modelagem3d' : mastery.id) as CreatorMasteryId
      if (!(id in masteryEntry)) throw new Error(`Maestria desconhecida: ${mastery.id}`)
      const track = id.endsWith('3d') ? ('3d' as const) : ('2d' as const)
      return {
        id,
        title: mastery.name,
        opensAfterPair: masteryEntry[id],
        levels: mastery.levels.map((entry, index) => ({
          level: (index + 1) as 1 | 2 | 3,
          title: entry.title,
          ...(id === 'modelagem3d'
            ? { grants: [['molda'], ['molda-intermediate'], ['molda-professional']][index] }
            : {}),
          nucleusCourseIds: [
            add({
              key: `maestria-${id}-${index + 1}-nucleo`,
              title: `${mastery.name} · ${entry.title}`,
              level: 'lenda',
              track,
              description: `${mastery.focus}\n${mastery.tools}\n${mastery.boundary}\n\n${entry.anchor}\n\nProjeto: ${entry.project}\nCritérios: ${entry.checks.join('\n')}\nCrédito anterior: ${entry.credit}`,
              outline: entry.steps,
            }),
          ],
          workshops: entry.workshops.map(([title, objective], workshopIndex) => ({
            id: `${id}-${index + 1}-oficina-${workshopIndex + 1}`,
            title,
            courseIds: [
              add({
                key: `maestria-${id}-${index + 1}-oficina-${workshopIndex + 1}`,
                title,
                level: 'lenda',
                track,
                description: `${objective}\n\nAplicar ao jogo do nível; duas oficinas distintas são necessárias.`,
                outline: [
                  `Compreender em blocos e código — ${objective}`,
                  `Aplicar, testar e registrar — ${objective}`,
                ],
              }),
            ],
          })),
          rubric: {
            version: 1,
            criteria: entry.checks.map((title, criterion) => ({
              id: `${id}-${index + 1}-criterio-${criterion + 1}`,
              title,
            })),
          },
        })),
      }
    })
    curricula[audience] = CreatorJourneyCurriculumSchema.parse({
      schemaVersion: 1,
      stages,
      masteries,
    })
  }
  if (new Set(courses.map((course) => course.slug)).size !== courses.length)
    throw new Error('O manifesto editorial vinculou um mesmo slug mais de uma vez.')
  return {
    version: spec.version,
    courses,
    curricula,
    preservedCourseIds: courses
      .filter((course) => course.action === 'reuse')
      .map((course) => course.id),
  }
}
