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

/**
 * A Jornada da outra comunidade levando junto o endereço atual (`?preparacao=<id>`): trocar a
 * lente e voltar retoma a preparação que estava aberta, em vez de começar do zero.
 */
export function journeyLensHref(path: string, search: string): string {
  const query = search.startsWith('?') ? search.slice(1) : search
  return query ? `${path}?${query}` : path
}

/** Contexto inicial do dialog de curso novo; edição continua usando a entidade real. */
export function courseCreationPrefill(platform: Platform): { audience: Platform } {
  return { audience: platform }
}
