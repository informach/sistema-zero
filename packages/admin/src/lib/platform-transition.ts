import type { Platform } from './platform'

/** Estado canônico que não pode atravessar uma troca Kids ↔ Adultos. */
export function platformTransition(platform: Platform) {
  return {
    teaching: { audience: platform, courseId: '' as const },
    moderation: { audience: platform, spaceId: '' as const, offset: 0 },
    analytics: { selectedCourseId: null },
    activity: { learnerId: null, offset: 0 },
  }
}

/** Contexto inicial do dialog de curso novo; edição continua usando a entidade real. */
export function courseCreationPrefill(platform: Platform): { audience: Platform } {
  return { audience: platform }
}
