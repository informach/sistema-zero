import type { AdultCreatorCapability, AdultJourneyPolicy } from '@sistemazero/core/journey'
import type { Course } from '../../domain/course/course'
import { type CourseTier, courseTier } from '../../domain/gamification/levels'

/**
 * O desenho inicial da jornada adulta (decisão da dona, 19/10/2026): as mesmas etapas do Kids,
 * cada uma com a trilha de um nível, na mesma ordem. Quem conclui as sete chega à última posição,
 * a "Lenda", que a interface mostra sem etapa por trás.
 *
 * O que cada etapa libera ao terminar segue o Kids, com UMA diferença deliberada: IA e Pensa só
 * depois de um curso avançado, porque a autoria adulta recusa liberá-los antes
 * (`AdultJourneyService.configure`). No Kids o Pensa abre na 2ª etapa; aqui, na 6ª, junto da Ponte.
 * Outra que vem do produto e não do seed: o Molda adulto abre inteiro, sem as três faixas do Kids.
 */
export const ADULT_JOURNEY_TEMPLATE: readonly {
  id: string
  title: string
  tier: CourseTier
  capabilities: readonly AdultCreatorCapability[]
}[] = [
  {
    id: 'aprendiz',
    title: 'Aprendiz',
    tier: 'primeiros-passos-2d',
    capabilities: ['studio', 'pinta'],
  },
  { id: 'construtor', title: 'Construtor(a)', tier: 'iniciante-2d', capabilities: [] },
  { id: 'inventor', title: 'Inventor(a)', tier: 'iniciante-3d', capabilities: ['molda'] },
  {
    id: 'explorador-de-mundos',
    title: 'Explorador(a) de Mundos',
    tier: 'intermediario-2d',
    capabilities: [],
  },
  { id: 'mestre-dos-jogos', title: 'Mestre dos Jogos', tier: 'intermediario-3d', capabilities: [] },
  {
    id: 'arquiteto-de-mundos',
    title: 'Arquiteto(a) de Mundos',
    tier: 'avancado-2d',
    capabilities: ['bridge', 'ai', 'pensa'],
  },
  { id: 'genio-da-criacao', title: 'Gênio da Criação', tier: 'avancado-3d', capabilities: ['pro'] },
]

/**
 * Cursos vendidos como PRODUTO AVULSO que nunca entram na jornada adulta pelo seed, mesmo que
 * tenham o nível e a trilha de uma etapa. Quem compra só o curso não pode ficar com a etapa
 * travada esperando outro produto, e quem assina a Comunidade não pode depender de um curso que a
 * assinatura não inclui. `no-comando-da-ia` foi retirado em 23/10/2026 e permanece excluído
 * caso um catálogo histórico seja apresentado ao planejador; o seed não o recria.
 */
export const ADULT_JOURNEY_STANDALONE_COURSE_SLUGS: readonly string[] = ['no-comando-da-ia']

type AdultSeedMilestone = 'complete' | 'showcase'

/**
 * `auto` (padrão) é a régua do Kids: terminar E publicar no Mural, no curso que tem a atividade de
 * publicar (bloco do Estúdio com vitrine); no curso sem ela, só terminar, senão ninguém concluiria a
 * etapa (a armadilha do curso-base sem vitrine). `complete`/`showcase` forçam a mesma régua em todos.
 */
export interface AdultJourneySeedOptions {
  milestone?: 'auto' | AdultSeedMilestone
  /** Cursos com a atividade de publicar no Mural (`listCourseIdsWithShowcaseBlock`). */
  showcaseCourseIds?: ReadonlySet<string>
}

export type SeedCourse = Pick<
  Course,
  'id' | 'slug' | 'title' | 'status' | 'audience' | 'modality' | 'level' | 'track'
>

export interface AdultJourneySeedPlan {
  policy: AdultJourneyPolicy
  /** Cada etapa criada, com os cursos (para o relatório do script). */
  stages: {
    id: string
    title: string
    tier: CourseTier
    courses: { slug: string; title: string; milestone: AdultSeedMilestone }[]
  }[]
  /** Etapas pré-carregadas sem cursos: ficam bloqueadas até o vínculo pelo Admin. */
  pendingStages: { id: string; title: string; tier: CourseTier }[]
  /** Cursos publicados deixados de fora por serem produto avulso (`ADULT_JOURNEY_STANDALONE_COURSE_SLUGS`). */
  excluded: { slug: string; title: string }[]
}

/**
 * Monta todas as etapas, vinculando cursos ADULTOS, GRAVADOS e PUBLICADOS por nível. Etapas sem
 * curso continuam planejadas e bloqueadas, sem pular níveis ou conceder ferramentas. Rascunho não entra
 * (ninguém conclui um curso que não está no ar) e os cursos `lenda` ficam fora da jornada, como no
 * Kids. Produto avulso (`ADULT_JOURNEY_STANDALONE_COURSE_SLUGS`) também fica fora e sai em `excluded`.
 */
export function buildAdultJourneySeed(
  courses: readonly SeedCourse[],
  { milestone = 'auto', showcaseCourseIds = new Set() }: AdultJourneySeedOptions = {},
): AdultJourneySeedPlan {
  const milestoneOf = (course: SeedCourse): AdultSeedMilestone =>
    milestone !== 'auto' ? milestone : showcaseCourseIds.has(course.id) ? 'showcase' : 'complete'
  const byTier = new Map<CourseTier, SeedCourse[]>()
  const excluded: AdultJourneySeedPlan['excluded'] = []
  const standalone = new Set(ADULT_JOURNEY_STANDALONE_COURSE_SLUGS)
  for (const course of courses) {
    if (course.audience !== 'adult' || course.modality !== 'recorded') continue
    if (course.status !== 'published') continue
    if (standalone.has(course.slug)) {
      excluded.push({ slug: course.slug, title: course.title })
      continue
    }
    if (course.level === 'lenda') continue
    const tier = courseTier(course.level, course.track)
    if (!tier) continue
    byTier.set(tier, [...(byTier.get(tier) ?? []), course])
  }
  const stages: AdultJourneySeedPlan['stages'] = []
  const pendingStages: AdultJourneySeedPlan['pendingStages'] = []
  const policyStages: AdultJourneyPolicy['stages'] = []
  for (const template of ADULT_JOURNEY_TEMPLATE) {
    const tierCourses = (byTier.get(template.tier) ?? [])
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
    if (tierCourses.length === 0)
      pendingStages.push({ id: template.id, title: template.title, tier: template.tier })
    policyStages.push({
      id: template.id,
      title: template.title,
      requirements: tierCourses.map((course) => ({
        courseId: course.id,
        milestone: milestoneOf(course),
      })),
      capabilities: [...template.capabilities],
    })
    stages.push({
      id: template.id,
      title: template.title,
      tier: template.tier,
      courses: tierCourses.map((course) => ({
        slug: course.slug,
        title: course.title,
        milestone: milestoneOf(course),
      })),
    })
  }
  return { policy: { schemaVersion: 1, stages: policyStages }, stages, pendingStages, excluded }
}
