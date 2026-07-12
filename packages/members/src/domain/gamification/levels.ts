/**
 * NÍVEL DO ALUNO (rank de longo prazo, fatia 06/2026). Catálogo EM CÓDIGO (mesma
 * decisão das badges/missões: o preDeploy de prod roda só `db:migrate`, e o catálogo
 * muda JUNTO com o código que o deriva — sem drift). O nível é DERIVADO na leitura
 * a partir do ledger (`xp_events`) + `courses.level`, sem coluna nem backfill.
 *
 * Um curso "qualificado" = concluído (`course_complete`) E publicado no Mural dos
 * Criadores (`course_showcased`). O aluno sobe conforme acumula cursos qualificados
 * por dificuldade. Persiste-se só o SLUG; rótulo/cor/ícone são apresentação e vivem
 * no app (community-kids), igual às badges.
 */
export const STUDENT_LEVEL_SLUGS = ['noob', 'coder', 'hacker', 'elite', 'god'] as const
export type StudentLevelSlug = (typeof STUDENT_LEVEL_SLUGS)[number]

/** Cursos qualificados (concluídos + publicados) por dificuldade. */
export interface QualifyingByLevel {
  iniciante: number
  intermediario: number
  avancado: number
}

/**
 * Requisito CUMULATIVO de cada nível. `any` = total mínimo de cursos qualificados
 * (qualquer dificuldade); os demais são pisos por dificuldade. Os requisitos são
 * MONOTÔNICOS (cada nível pede ≥ que o anterior) — por isso o nível do aluno é o
 * último da escada cujos requisitos ele cumpre. Os números são ajustáveis aqui.
 */
interface LevelRequirement {
  slug: StudentLevelSlug
  any: number
  iniciante: number
  intermediario: number
  avancado: number
}

const NOOB: LevelRequirement = { slug: 'noob', any: 0, iniciante: 0, intermediario: 0, avancado: 0 }

export const STUDENT_LEVELS: readonly LevelRequirement[] = [
  NOOB,
  // "Fez o 1º curso e publicou no Mural" → deixa de ser Noob.
  { slug: 'coder', any: 1, iniciante: 0, intermediario: 0, avancado: 0 },
  { slug: 'hacker', any: 0, iniciante: 6, intermediario: 0, avancado: 0 },
  { slug: 'elite', any: 0, iniciante: 6, intermediario: 5, avancado: 0 },
  { slug: 'god', any: 0, iniciante: 6, intermediario: 5, avancado: 5 },
] as const

/** O que falta p/ o PRÓXIMO nível, por dimensão (0 = já satisfeito). */
export interface LevelRemaining {
  any: number
  iniciante: number
  intermediario: number
  avancado: number
}

export interface StudentLevel {
  slug: StudentLevelSlug
  /** Próximo nível da escada — `null` no topo (`god`). */
  next: StudentLevelSlug | null
  /** Quanto falta p/ o próximo (por dimensão); `null` no topo. */
  remaining: LevelRemaining | null
}

function total(q: QualifyingByLevel): number {
  return q.iniciante + q.intermediario + q.avancado
}

function meets(q: QualifyingByLevel, req: LevelRequirement): boolean {
  return (
    total(q) >= req.any &&
    q.iniciante >= req.iniciante &&
    q.intermediario >= req.intermediario &&
    q.avancado >= req.avancado
  )
}

function remainingFor(q: QualifyingByLevel, req: LevelRequirement): LevelRemaining {
  return {
    any: Math.max(0, req.any - total(q)),
    iniciante: Math.max(0, req.iniciante - q.iniciante),
    intermediario: Math.max(0, req.intermediario - q.intermediario),
    avancado: Math.max(0, req.avancado - q.avancado),
  }
}

/**
 * Nível do aluno a partir dos cursos qualificados por dificuldade. Como os
 * requisitos são monotônicos, o nível é o último da escada que ele cumpre (para no
 * 1º que falha). Inclui o próximo nível e o que falta p/ alcançá-lo (p/ a UI).
 */
export function computeStudentLevel(q: QualifyingByLevel): StudentLevel {
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
