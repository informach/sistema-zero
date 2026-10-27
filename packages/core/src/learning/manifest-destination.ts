import type { LearningManifest } from './index'

/** Oferta e progresso continuam separados; a autoria do conteúdo é única. */
export const COMMON_COURSE_SLUGS = [
  'cade-todo-mundo',
  'desafio-primeiro-jogo',
  'nave-contra-asteroides',
  'corre-dino',
  'o-jogo-do-meu-jeito',
  'jornada-faisca-base-3d',
] as const

export interface DestinoManifesto {
  courseSlug: string
  lessonSlug: string
}

export function cursoEditorialComum(slug: string): string | undefined {
  const base = slug.endsWith('-adulto') ? slug.slice(0, -'-adulto'.length) : slug
  return COMMON_COURSE_SLUGS.find((curso) => curso === base)
}

/** Troca só o vínculo da oferta; IDs, anexos, projetos e regras não são recriados. */
export function manifestoParaDestino(
  origem: LearningManifest,
  destino: DestinoManifesto,
): LearningManifest {
  const curso = cursoEditorialComum(origem.courseSlug)
  if (!curso || cursoEditorialComum(destino.courseSlug) !== curso) {
    throw new Error('O destino precisa ser uma oferta do mesmo curso editorial.')
  }
  if (origem.lessonSlug !== destino.lessonSlug) {
    throw new Error('A aula de destino precisa manter o mesmo identificador da aula original.')
  }
  return structuredClone({ ...origem, courseSlug: destino.courseSlug })
}
