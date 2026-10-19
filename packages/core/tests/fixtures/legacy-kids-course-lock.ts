/** Pre-canonical Kids course-lock oracle for migration parity only. Never imported by production. */
import {
  type CourseJourneyRole,
  CREATOR_JOURNEY_LEVELS,
  computeJourneyLevelSlug,
  creatorJourneyLevel,
  JOURNEY_COURSE_TIERS,
  type JourneyCourseLock,
  type JourneyCourseTier,
  type QualifiedJourneySlots,
} from '../../src/journey/catalog'

function slotSet(slots: QualifiedJourneySlots, tier: JourneyCourseTier): ReadonlySet<number> {
  return new Set(slots[tier] ?? [])
}

/**
 * Política de acesso aos cursos da jornada.
 *
 * Cursos com POSIÇÃO seguem a trilha: etapa futura trava (`future-tier`) e, na
 * etapa atual, o curso-base (posição 1) destrava os demais (`foundation-first`).
 * Cursos BÔNUS (`careerSlot=null`) são RECOMPENSA da etapa (`tier-reward`,
 * decisão 24/07): abrem quando a etapa correspondente COMPLETA — todos os slots
 * dela qualificados, que é exatamente o momento do level-up.
 *
 * `foundationAvailable` diz se existe um curso-base (`careerSlot=1`) PUBLICADO na
 * etapa. Sem ele NÃO há como destravar (concluir+publicar os obrigatórios é a
 * única chave), então tanto `foundation-first` quanto `tier-reward` falhariam a
 * etapa — e a jornada — para sempre. Nesse caso a política falha ABERTA: a trava
 * pedagógica só vale quando existe base alcançável. (No bônus isso também protege
 * o ROLLOUT: um catálogo sem etapas montadas nasce todo-bônus e nada trava.)
 * Default `true` para compatibilidade.
 */
export function resolveJourneyCourseLock(
  qualified: QualifiedJourneySlots,
  courseTier: JourneyCourseTier,
  careerSlot: number | null,
  foundationAvailable = true,
  journeyRole: CourseJourneyRole = careerSlot === null ? 'reward' : 'positioned',
): JourneyCourseLock {
  // Curso extra continua exigindo matrícula; apenas não depende do progresso da jornada.
  if (journeyRole === 'extra') return { locked: false }
  const level = creatorJourneyLevel(computeJourneyLevelSlug(qualified))
  if (level.learningTier === null) return { locked: false }

  const learningIndex = JOURNEY_COURSE_TIERS.indexOf(level.learningTier)
  const courseIndex = JOURNEY_COURSE_TIERS.indexOf(courseTier)
  // Etapa já COMPLETADA: posição vira revisão; bônus é recompensa GANHA.
  if (courseIndex < learningIndex) return { locked: false }

  if (careerSlot === null) {
    if (!foundationAvailable) return { locked: false }
    // O nível-alvo é o que o aluno VIRA ao completar esta etapa: o 1º nível cuja
    // régua cumulativa já exige TODOS os slots dela.
    const fullSlots = CREATOR_JOURNEY_LEVELS.at(-1)?.requiredSlots[courseTier] ?? []
    const requiredLevel = CREATOR_JOURNEY_LEVELS.find(
      (candidate) => (candidate.requiredSlots[courseTier]?.length ?? 0) >= fullSlots.length,
    )?.slug
    return {
      locked: true,
      reason: 'tier-reward',
      requiredLevel,
      requiredTier: courseTier,
    }
  }

  if (courseIndex > learningIndex) {
    // O nível-alvo é o PRIMEIRO que passa a estudar esta etapa (só faz sentido
    // no future-tier; noob e coder compartilham o learningTier inicial).
    const requiredLevel = CREATOR_JOURNEY_LEVELS.find(
      (candidate) => candidate.learningTier === courseTier,
    )?.slug
    return {
      locked: true,
      reason: 'future-tier',
      requiredLevel,
      requiredTier: courseTier,
    }
  }

  if (careerSlot === 1 || slotSet(qualified, courseTier).has(1)) return { locked: false }
  // Sem curso-base publicado na etapa, travar as demais posições prenderia o aluno
  // para sempre (nada a concluir para liberar). Fail-open.
  if (!foundationAvailable) return { locked: false }
  // Sem `requiredLevel` aqui: a chave do foundation-first é o CURSO-BASE, não um
  // nível — o aluno já está na etapa certa.
  return {
    locked: true,
    reason: 'foundation-first',
    requiredTier: courseTier,
  }
}
