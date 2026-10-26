import {
  CREATOR_MASTERY_IDS,
  CREATOR_POST_LEVELS,
  type CreatorCoursePlacement,
  type CreatorCourseView,
  type CreatorJourneyView,
  type JourneyLevelSlug,
} from '@sistemazero/core/journey'
import type { CatalogCourseView, CourseTrack, MyCourseView } from './types'

export type CreatorJourneySkin = 'kids' | 'adult'
export type CreatorStageView = CreatorJourneyView['stages'][number]
export type CreatorMasteryView = CreatorJourneyView['masteries'][number]
export type CreatorMasteryLevelView = CreatorMasteryView['levels'][number]

export const CREATOR_POST_LABELS: Record<JourneyLevelSlug, string> = {
  noob: 'Faísca',
  coder: 'Construtor(a)',
  hacker: 'Inventor(a)',
  explorer: 'Explorador(a) de Mundos',
  elite: 'Mestre dos Jogos',
  architect: 'Arquiteto(a) de Mundos',
  champion: 'Gênio da Criação',
  god: 'Lenda',
}
/**
 * Os nomes de tela dos papéis. Uma língua só nas duas comunidades e no Admin (decisão dela,
 * 26/10/2026): os dois cursos 2D/3D de cada posto são os "cursos da trilha", nunca "base"
 * (o Kids proíbe o vocabulário de montagem na tela da criança).
 */
export const CURRICULUM_ROLE_LABELS: Record<string, string> = {
  base2d: 'Curso da trilha 2D',
  base3d: 'Curso da trilha 3D',
  'base-2d': 'Curso da trilha 2D',
  'base-3d': 'Curso da trilha 3D',
  mission: 'Missão da trilha',
  power: 'Poder',
  extra: 'Extra',
  nucleus: 'Núcleo da Maestria',
  workshop: 'Oficina da Maestria',
  project: 'Projeto da Maestria',
  'mastery-nucleus': 'Núcleo da Maestria',
  'mastery-workshop': 'Oficina da Maestria',
  'mastery-project': 'Projeto da Maestria',
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
      title: 'Continue sua Maestria',
      message: placement.masteryLevel
        ? `Este curso faz parte do nível ${placement.masteryLevel} desta Maestria. Veja na área o que falta para abrir este nível.`
        : 'Este curso faz parte desta Maestria. Veja na área os requisitos para continuar.',
      cta: 'Ver requisitos da Maestria',
    }
  return {
    href: placement?.level ? creatorPostHref(placement.level, skin) : '/cursos',
    title: 'Um passo antes deste curso',
    message:
      placement?.role === 'base3d'
        ? 'Conclua o curso 2D da trilha para começar a versão 3D.'
        : placement?.role === 'mission' ||
            placement?.role === 'power' ||
            placement?.role === 'extra'
          ? 'Conclua os cursos 2D e 3D da trilha para abrir a missão, os Poderes e os extras.'
          : 'Veja os próximos passos da sua jornada e os requisitos para abrir este curso.',
    cta: 'Ver o que falta na trilha',
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

/* ─────────────── O posto: o que conta para subir ─────────────── */

/**
 * Os três requisitos do posto, lidos da projeção do servidor. É a única conta que as telas
 * fazem: mapa, trilha, Início e Família mostram os MESMOS números.
 */
export interface CreatorStageChecklist {
  /** Os dois cursos da trilha (2D e 3D). */
  courses: { done: number; total: 2; complete: boolean }
  mission: { complete: boolean; available: boolean }
  /** `required` é o mínimo da política (1 na Faísca, 2 nos demais). */
  powers: { done: number; required: number; complete: boolean }
  /** Passos feitos e o total que conta para subir (3 + Poderes exigidos). */
  done: number
  total: number
  /** 0 a 100, inteiro. */
  percent: number
  complete: boolean
}

export function creatorStageChecklist(stage: CreatorStageView): CreatorStageChecklist {
  const coursesDone =
    Number(stage.base2d.state === 'completed') + Number(stage.base3d.state === 'completed')
  const missionDone = stage.mission.state === 'completed'
  const powersDone = Math.min(stage.powersCompleted, stage.minimumPowers)
  const done = coursesDone + Number(missionDone) + powersDone
  const total = 3 + stage.minimumPowers
  return {
    courses: { done: coursesDone, total: 2, complete: coursesDone === 2 },
    mission: { complete: missionDone, available: stage.mission.state !== 'locked' },
    powers: {
      done: stage.powersCompleted,
      required: stage.minimumPowers,
      complete: stage.powersCompleted >= stage.minimumPowers,
    },
    done,
    total,
    percent: Math.round((done / total) * 100),
    complete: done === total,
  }
}

const powerWord = (n: number) => (n === 1 ? 'Poder' : 'Poderes')

function joinPt(parts: readonly string[]): string {
  if (parts.length <= 1) return parts[0] ?? ''
  return `${parts.slice(0, -1).join(', ')} e ${parts.at(-1)}`
}

function missingCourse(stage: CreatorStageView): '2D' | '3D' | 'both' | null {
  const has2d = stage.base2d.state === 'completed'
  const has3d = stage.base3d.state === 'completed'
  if (has2d && has3d) return null
  if (!has2d && !has3d) return 'both'
  return has2d ? '3D' : '2D'
}

/**
 * O que falta para subir, como AÇÃO ("termine a missão e faça mais 2 Poderes"). `null` quando
 * os requisitos do posto já estão cumpridos.
 */
export function creatorStageTodo(stage: CreatorStageView, skin: CreatorJourneySkin): string | null {
  const course = missingCourse(stage)
  const finish = skin === 'kids' ? 'termine' : 'conclua'
  const parts: string[] = []
  if (course)
    parts.push(
      course === 'both' ? `${finish} os cursos da trilha` : `${finish} o curso ${course} da trilha`,
    )
  if (stage.mission.state !== 'completed') parts.push(`${finish} a missão`)
  const powers = stage.minimumPowers - Math.min(stage.powersCompleted, stage.minimumPowers)
  if (powers > 0) {
    const verb = skin === 'kids' ? 'faça' : 'aplique'
    parts.push(`${verb}${stage.powersCompleted > 0 ? ' mais' : ''} ${powers} ${powerWord(powers)}`)
  }
  return parts.length ? joinPt(parts) : null
}

/** O que falta, como NOME ("Falta a missão e 2 Poderes"). `null` com tudo cumprido. */
export function creatorStageMissing(stage: CreatorStageView): string | null {
  const course = missingCourse(stage)
  const parts: string[] = []
  if (course) parts.push(course === 'both' ? 'os cursos da trilha' : `o curso ${course} da trilha`)
  if (stage.mission.state !== 'completed') parts.push('a missão')
  const powers = stage.minimumPowers - Math.min(stage.powersCompleted, stage.minimumPowers)
  if (powers > 0) parts.push(`${powers} ${powerWord(powers)}`)
  if (!parts.length) return null
  return `${course === 'both' ? 'Faltam' : 'Falta'} ${joinPt(parts)}`
}

/** Presentation of the server's evaluated facts. This never grants access or advancement. */
export function creatorStageSummary(stage: CreatorStageView): string {
  if (
    stage.earned &&
    (!stage.pairCompleted ||
      stage.mission.state !== 'completed' ||
      stage.powersCompleted < stage.minimumPowers)
  )
    return 'Posto já conquistado. Seus acessos continuam guardados.'
  if (stage.completed) return 'Trilha concluída. Você pode continuar ampliando seus jogos.'
  const list = creatorStageChecklist(stage)
  return `${list.courses.done} de 2 cursos da trilha · missão ${list.mission.complete ? 'concluída' : 'por fazer'} · ${stage.powersCompleted} de ${stage.minimumPowers} ${powerWord(stage.minimumPowers)}`
}

/**
 * A trilha de um posto abre quando a pessoa já chegou a ele (o atual, um concluído ou conquistado)
 * ou quando o servidor já abriu um curso dela (compra avulsa, presente, acesso preservado). Fora
 * disso o posto fica cinza, com o cadeado, e a página da trilha não abre (a trava do mapa de antes,
 * pedido dela em 26/10/2026). Só lê os estados do servidor; nada aqui libera curso.
 */
export function creatorStageOpen(stage: CreatorStageView): boolean {
  if (stage.available || stage.earned || stage.completed) return true
  return [
    stage.base2d,
    stage.base3d,
    stage.mission,
    ...stage.powers.flatMap((power) => power.courses),
    ...stage.extras,
  ].some((entry) => entry.state === 'available' || entry.state === 'completed')
}

export function creatorCurrentStage(view: CreatorJourneyView): CreatorStageView | null {
  return view.stages.find((stage) => stage.level === view.level) ?? null
}

/** O nome do posto como a política o escreveu; o rótulo fixo é só a rede. */
export function creatorStageTitle(view: CreatorJourneyView, level: JourneyLevelSlug): string {
  return view.stages.find((stage) => stage.level === level)?.title ?? CREATOR_POST_LABELS[level]
}

export function creatorJourneyHint(view: CreatorJourneyView): string {
  if (view.paused)
    return 'A progressão está pausada. Seus cursos e conquistas continuam guardados; você pode continuar criando com os acessos já liberados.'
  const stage = creatorCurrentStage(view)
  if (!stage) return 'Sua jornada continua nas Maestrias. Escolha a área que quer aprofundar.'
  if (stage.base2d.state === 'unavailable' || stage.base3d.state === 'unavailable')
    return 'Os próximos cursos desta trilha estão em preparação. Seus cursos e conquistas continuam guardados.'
  if (!stage.pairCompleted)
    return 'Conclua os cursos 2D e 3D da trilha para abrir a missão, os Poderes e os extras.'
  return `Para avançar: missão concluída e ${stage.minimumPowers} ${stage.minimumPowers === 1 ? 'Poder aplicado' : 'Poderes diferentes aplicados'}. Você escolhe a ordem.`
}

export function curriculumRoleLabel(role: string): string {
  return CURRICULUM_ROLE_LABELS[role] ?? 'Curso da jornada'
}

export function creatorCourseAccessNote(reason: string | undefined): string | null {
  if (reason === 'direct-purchase')
    return 'Seu curso avulso está liberado. O progresso também conta na jornada.'
  if (reason === 'gift')
    return 'Este curso foi liberado como presente. O progresso também conta na jornada.'
  if (reason === 'retained') return 'Acesso já conquistado, guardado na nova jornada.'
  return null
}

/* ─────────────── Um curso da jornada no cartão ─────────────── */

/**
 * O estado de um curso da jornada no cartão:
 * - `done` concluído; `progress` com aula feita; `start` aberto e por começar;
 * - `locked` a jornada ainda não abriu; `no-access` fora do acesso da conta;
 * - `planned` em preparação (rascunho); `unknown` o catálogo não respondeu por ele.
 */
export type CreatorEntryStatus =
  | 'done'
  | 'progress'
  | 'start'
  | 'locked'
  | 'no-access'
  | 'planned'
  | 'unknown'

export interface CreatorEntryCardView {
  courseId: string
  title: string
  subtitle: string | null
  coverImageUrl: string | null
  track: CourseTrack | null
  status: CreatorEntryStatus
  /** A página do curso; só existe quando o servidor diz que a pessoa pode abri-lo. */
  href: string | null
  /** A aula para continuar (ou a página do curso). */
  continueHref: string | null
  /** Aulas feitas e total; `null` quando não se sabe (curso que a pessoa ainda não tem). */
  lessons: { done: number; total: number; percent: number } | null
}

type CreatorEntry = CreatorCourseView & { title?: string }

/**
 * Junta o FATO da jornada (o estado do curso na projeção) aos fatos do catálogo (acesso, capa)
 * e de "Meus cursos" (aulas feitas). O acesso continua sendo do servidor: um direito avulso
 * abre um curso que a jornada ainda não abriu, e nenhuma conta daqui o fecha.
 */
export function creatorEntryCard(
  entry: CreatorEntry,
  catalog: readonly CatalogCourseView[],
  mine: readonly MyCourseView[] = [],
): CreatorEntryCardView {
  const course = catalog.find((candidate) => candidate.courseId === entry.courseId)
  const own = mine.find((candidate) => candidate.courseId === entry.courseId)
  const source = course ?? own
  const opens = course
    ? course.hasAccess && course.careerLock?.locked !== true
    : own
      ? own.careerLock?.locked !== true
      : false
  const slug = source?.courseSlug
  const href = opens && slug ? `/cursos/${encodeURIComponent(slug)}` : null
  const progress = own?.progress
  const lessons =
    progress && progress.totalLessons > 0
      ? {
          done: progress.completedLessons,
          total: progress.totalLessons,
          percent: progress.percent,
        }
      : null
  const status: CreatorEntryStatus =
    entry.state === 'unavailable'
      ? 'planned'
      : !source
        ? 'unknown'
        : !opens
          ? course?.hasAccess === false && !own
            ? 'no-access'
            : 'locked'
          : entry.state === 'completed'
            ? 'done'
            : (progress?.completedLessons ?? 0) > 0
              ? 'progress'
              : 'start'
  return {
    courseId: entry.courseId,
    title: source?.title ?? entry.title ?? 'Curso da jornada',
    subtitle: source?.subtitle ?? null,
    coverImageUrl: source?.coverImageUrl ?? null,
    track: source?.track ?? null,
    status,
    href,
    continueHref:
      href && status === 'progress' && own?.continueLessonId && slug
        ? `/cursos/${encodeURIComponent(slug)}/aulas/${encodeURIComponent(own.continueLessonId)}`
        : href,
    lessons,
  }
}

/** O botão de cada estado que abre; os outros não têm botão. */
export function creatorEntryAction(status: CreatorEntryStatus): string | null {
  return status === 'done'
    ? 'Revisar curso'
    : status === 'progress'
      ? 'Continuar'
      : status === 'start'
        ? 'Começar'
        : null
}

/** A frase de quem não abre: o que a pessoa lê no lugar do botão. */
export function creatorEntryNote(
  status: CreatorEntryStatus,
  options: { role?: 'base3d' | 'after-pair'; futureStage?: string | null } = {},
): string | null {
  if (status === 'planned') return 'Curso em preparação'
  if (status === 'unknown') return 'Não foi possível consultar este curso agora.'
  if (status === 'no-access') return 'Este curso ainda não faz parte do seu acesso.'
  if (status !== 'locked') return null
  if (options.futureStage) return `Abre quando você chegar a ${options.futureStage}`
  if (options.role === 'base3d') return 'Abre depois do curso 2D da trilha'
  if (options.role === 'after-pair') return 'Abre depois dos cursos da trilha'
  return 'Veja na sua jornada o que falta para abrir este curso.'
}

/* ─────────────── O próximo passo ─────────────── */

export interface CreatorNextStep {
  stage: CreatorStageView
  role: 'base2d' | 'base3d' | 'mission' | 'power'
  card: CreatorEntryCardView
  /** Nome do Poder quando o passo é um Poder. */
  powerTitle: string | null
}

/**
 * O curso que a pessoa pode fazer agora no posto atual: o que já começou vem antes do que ainda
 * não começou; dentro de cada grupo, a ordem da trilha (2D, 3D, missão, Poderes). Só entra o
 * que abre de verdade (acesso do servidor), e Poderes só enquanto faltam Poderes.
 */
export function creatorNextStep(
  view: CreatorJourneyView,
  catalog: readonly CatalogCourseView[],
  mine: readonly MyCourseView[] = [],
): CreatorNextStep | null {
  const stage = creatorCurrentStage(view)
  if (!stage) return null
  const candidates: { role: CreatorNextStep['role']; entry: CreatorEntry; power?: string }[] = [
    { role: 'base2d', entry: stage.base2d },
    { role: 'base3d', entry: stage.base3d },
    { role: 'mission', entry: stage.mission },
    ...(stage.powersCompleted < stage.minimumPowers
      ? stage.powers
          .filter((power) => !power.completed)
          .flatMap((power) =>
            power.courses.map((entry) => ({
              role: 'power' as const,
              entry,
              power: power.title,
            })),
          )
      : []),
  ]
  const open = candidates
    .filter((item) => item.entry.state === 'available')
    .map((item) => ({ ...item, card: creatorEntryCard(item.entry, catalog, mine) }))
    .filter((item) => item.card.href)
  const pick = open.find((item) => item.card.status === 'progress') ?? open[0]
  return pick ? { stage, role: pick.role, card: pick.card, powerTitle: pick.power ?? null } : null
}

/* ─────────────── Maestrias ─────────────── */

export const CREATOR_MASTERY_RULE =
  'Cada nível pede o núcleo (ou um crédito validado), duas oficinas diferentes entre três e um projeto aprovado em todos os critérios essenciais.'

/** Como se cria na área: arte integra assets num jogo que já funciona; código usa os editores. */
export function creatorMasteryApproach(area: Pick<CreatorMasteryView, 'id'>): string {
  return area.id === 'arte2d' || area.id === 'modelagem3d'
    ? 'O jogo base já funciona com formas de protótipo. Você cria seus assets e aprende a integrá-los: tamanho, origem, animação, colisão e leitura durante a partida.'
    : 'Você pode usar blocos, Ponte e Pro. Um conceito novo começa com blocos e o código correspondente. Trocar de editor não concede um nível.'
}

export const CREATOR_MASTERY_ORDER =
  'O nível II pede o I desta área; o III pede o II. Nenhuma outra linguagem ou dimensão é obrigatória. Projetos anteriores podem ser apresentados para validação.'

export const ROMAN_LEVEL = { 1: 'I', 2: 'II', 3: 'III' } as const

const levelDone = (level: CreatorMasteryLevelView) => level.completed || level.earned
const levelStarted = (level: CreatorMasteryLevelView) =>
  level.nucleusCompleted || level.workshopsCompleted > 0 || level.approval !== 'pending'

export interface CreatorMasteryProgress {
  earned: number
  /** O nível em que a pessoa está (o primeiro aberto e ainda não conquistado). */
  current: CreatorMasteryLevelView | null
  status: 'complete' | 'active' | 'available' | 'locked'
  /** Texto do botão; `null` com a área fechada. */
  action: string | null
}

export function creatorMasteryProgress(area: CreatorMasteryView): CreatorMasteryProgress {
  const earned = area.levels.filter(levelDone).length
  const current = area.levels.find((level) => level.available && !levelDone(level)) ?? null
  if (earned === area.levels.length)
    return { earned, current: null, status: 'complete', action: 'Maestria completa' }
  if (!area.available && !current) return { earned, current, status: 'locked', action: null }
  const active = earned > 0 || (current ? levelStarted(current) : false)
  return {
    earned,
    current,
    status: active ? 'active' : 'available',
    action: active && current ? `Continuar: nível ${ROMAN_LEVEL[current.level]}` : 'Começar',
  }
}

/** Quando a área abre, nos nomes da tela. */
export function creatorMasteryEntryNote(
  area: Pick<CreatorMasteryView, 'opensAfterPair'>,
  view?: CreatorJourneyView,
): string {
  const post = view
    ? creatorStageTitle(view, area.opensAfterPair)
    : CREATOR_POST_LABELS[area.opensAfterPair]
  return `Abre depois dos cursos da trilha ${post}`
}

export function creatorMasteryLevelStatus(
  level: CreatorMasteryLevelView,
  area: CreatorMasteryView,
  view?: CreatorJourneyView,
): string {
  if (levelDone(level)) return 'Conquistado'
  if (level.available) return levelStarted(level) ? 'Em andamento' : 'Disponível'
  if (area.available && level.level > 1)
    return `Depois do nível ${ROMAN_LEVEL[(level.level - 1) as 1 | 2]}`
  return creatorMasteryEntryNote(area, view)
}

export function creatorMasteryApprovalLabel(level: CreatorMasteryLevelView): string {
  return level.approval === 'approved'
    ? 'Projeto aprovado'
    : level.approval === 'changes-requested'
      ? 'Ajustes pedidos no projeto'
      : 'Projeto por avaliar'
}

/** O título do nível sem o numeral da frente ("I · Movimento…" vira "Movimento…"). */
export function creatorMasteryLevelTitle(level: Pick<CreatorMasteryLevelView, 'title'>): string {
  return level.title.replace(/^(?:I{1,3})\s*[·.:-]\s*/, '')
}
