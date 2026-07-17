/**
 * NÍVEL DO ALUNO (rank de longo prazo; reforma 2D/3D 07/2026). Catálogo EM CÓDIGO
 * (mesma decisão das badges/missões: o preDeploy de prod roda só `db:migrate`, e o
 * catálogo muda JUNTO com o código que o deriva — sem drift). O nível é DERIVADO na
 * leitura a partir do ledger (`xp_events`) + `courses.level`/`courses.track`, sem
 * coluna nem backfill.
 *
 * Um curso "qualificado" = concluído (`course_complete`) E publicado no Mural dos
 * Criadores (`course_showcased`). O aluno sobe conforme acumula cursos qualificados
 * por DEGRAU (dificuldade × eixo 2D/3D — 6 baldes `CourseTier`). Persiste-se só o
 * SLUG; rótulo/cor/ícone são apresentação e vivem no app (community-kids), igual às
 * badges.
 */
import type { CourseLevel, CourseTrack } from '../course/course'

export const STUDENT_LEVEL_SLUGS = [
  'noob', // Faísca
  'coder', // Construtor(a)
  'hacker', // Inventor(a)
  'explorer', // Explorador(a) de Mundos
  'elite', // Mestre dos Jogos
  'architect', // Arquiteto(a) de Mundos
  'champion', // Gênio da Criação
  'god', // Lenda
] as const
export type StudentLevelSlug = (typeof STUDENT_LEVEL_SLUGS)[number]

/**
 * DEGRAU pedagógico do curso = dificuldade × eixo 2D/3D. A ORDEM do array é a
 * escada que a carreira sobe (2D antes de 3D em cada dificuldade) — a mesma ordem
 * do `BlockLevel` do @sistemazero/studio.
 */
export const COURSE_TIERS = [
  'iniciante-2d',
  'iniciante-3d',
  'intermediario-2d',
  'intermediario-3d',
  'avancado-2d',
  'avancado-3d',
] as const
export type CourseTier = (typeof COURSE_TIERS)[number]

/** Degrau do par (dificuldade, eixo) — ex.: ('iniciante', '3d') → 'iniciante-3d'. */
export function courseTier(level: CourseLevel, track: CourseTrack): CourseTier {
  return `${level}-${track}`
}

/** Cursos qualificados (concluídos + publicados no Mural) por degrau. */
export type QualifyingByTier = Record<CourseTier, number>

export function emptyQualifyingByTier(): QualifyingByTier {
  return {
    'iniciante-2d': 0,
    'iniciante-3d': 0,
    'intermediario-2d': 0,
    'intermediario-3d': 0,
    'avancado-2d': 0,
    'avancado-3d': 0,
  }
}

/**
 * Requisito CUMULATIVO de cada nível. `any` = total mínimo de cursos qualificados
 * (qualquer degrau); `tiers` são pisos por degrau. Os requisitos são MONOTÔNICOS
 * (cada nível pede ≥ que o anterior) — por isso o nível do aluno é o último da
 * escada cujos requisitos ele cumpre. Os números são ajustáveis aqui.
 */
interface LevelRequirement {
  slug: StudentLevelSlug
  any: number
  tiers: QualifyingByTier
}

const NOOB: LevelRequirement = { slug: 'noob', any: 0, tiers: emptyQualifyingByTier() }

function tiers(partial: Partial<QualifyingByTier>): QualifyingByTier {
  return { ...emptyQualifyingByTier(), ...partial }
}

export const STUDENT_LEVELS: readonly LevelRequirement[] = [
  NOOB,
  // "Fez o 1º curso e publicou no Mural" → deixa de ser Faísca.
  { slug: 'coder', any: 1, tiers: emptyQualifyingByTier() },
  { slug: 'hacker', any: 0, tiers: tiers({ 'iniciante-2d': 6 }) },
  { slug: 'explorer', any: 0, tiers: tiers({ 'iniciante-2d': 6, 'iniciante-3d': 5 }) },
  {
    slug: 'elite',
    any: 0,
    tiers: tiers({ 'iniciante-2d': 6, 'iniciante-3d': 5, 'intermediario-2d': 5 }),
  },
  {
    slug: 'architect',
    any: 0,
    tiers: tiers({
      'iniciante-2d': 6,
      'iniciante-3d': 5,
      'intermediario-2d': 5,
      'intermediario-3d': 5,
    }),
  },
  {
    slug: 'champion',
    any: 0,
    tiers: tiers({
      'iniciante-2d': 6,
      'iniciante-3d': 5,
      'intermediario-2d': 5,
      'intermediario-3d': 5,
      'avancado-2d': 5,
    }),
  },
  {
    slug: 'god',
    any: 0,
    tiers: tiers({
      'iniciante-2d': 6,
      'iniciante-3d': 5,
      'intermediario-2d': 5,
      'intermediario-3d': 5,
      'avancado-2d': 5,
      'avancado-3d': 5,
    }),
  },
] as const

/** O que falta p/ o PRÓXIMO nível, por dimensão (0 = já satisfeito). */
export type LevelRemaining = { any: number } & QualifyingByTier

export interface StudentLevel {
  slug: StudentLevelSlug
  /** Próximo nível da escada — `null` no topo (`god`). */
  next: StudentLevelSlug | null
  /** Quanto falta p/ o próximo (por dimensão); `null` no topo. */
  remaining: LevelRemaining | null
}

function total(q: QualifyingByTier): number {
  let sum = 0
  for (const tier of COURSE_TIERS) sum += q[tier]
  return sum
}

function meets(q: QualifyingByTier, req: LevelRequirement): boolean {
  if (total(q) < req.any) return false
  for (const tier of COURSE_TIERS) {
    if (q[tier] < req.tiers[tier]) return false
  }
  return true
}

function remainingFor(q: QualifyingByTier, req: LevelRequirement): LevelRemaining {
  const out = { any: Math.max(0, req.any - total(q)) } as LevelRemaining
  for (const tier of COURSE_TIERS) {
    out[tier] = Math.max(0, req.tiers[tier] - q[tier])
  }
  return out
}

/**
 * Nível do aluno a partir dos cursos qualificados por degrau. Como os requisitos
 * são monotônicos, o nível é o último da escada que ele cumpre (para no 1º que
 * falha). Inclui o próximo nível e o que falta p/ alcançá-lo (p/ a UI).
 */
export function computeStudentLevel(q: QualifyingByTier): StudentLevel {
  let current: LevelRequirement = NOOB
  let currentIndex = 0
  for (let i = 1; i < STUDENT_LEVELS.length; i++) {
    const req = STUDENT_LEVELS[i]
    if (req && meets(q, req)) {
      current = req
      currentIndex = i
    } else break
  }
  const next = STUDENT_LEVELS[currentIndex + 1] ?? null
  return {
    slug: current.slug,
    next: next?.slug ?? null,
    remaining: next ? remainingFor(q, next) : null,
  }
}
