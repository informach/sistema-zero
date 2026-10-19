import type { LessonOutlineView, ModuleOutlineView } from './types'

/**
 * A leitura do índice de um curso para as páginas adultas (direção de arte de 18/10/2026): o número
 * de cada aula, a aula de "continuar" e o módulo em que ela está. Puro, sem React.
 */

/** Número da aula no curso inteiro, de 1 em diante, na ordem do índice. */
export function lessonNumbers(modules: readonly ModuleOutlineView[]): Map<string, number> {
  const numbers = new Map<string, number>()
  for (const lesson of modules.flatMap((module) => module.lessons))
    numbers.set(lesson.id, numbers.size + 1)
  return numbers
}

/** "01", "02"…: o número do módulo no cabeçalho do cartão. */
export function moduleNumber(index: number): string {
  return String(index + 1).padStart(2, '0')
}

export interface NextLesson {
  lesson: LessonOutlineView
  module: ModuleOutlineView
  /** Posição do módulo no curso, de 0 em diante. */
  moduleIndex: number
  /** Número da aula no curso, de 1 em diante. */
  number: number
}

/**
 * A aula de "continuar": a do servidor (`continueLessonId`: última acessada, ou a próxima liberada),
 * senão a primeira não concluída e liberada, senão a primeira.
 */
export function nextLessonOf(course: {
  continueLessonId: string | null
  modules: readonly ModuleOutlineView[]
}): NextLesson | null {
  const numbers = lessonNumbers(course.modules)
  const entries = course.modules.flatMap((module, moduleIndex) =>
    module.lessons.map((lesson) => ({ lesson, module, moduleIndex })),
  )
  const found =
    (course.continueLessonId
      ? entries.find((entry) => entry.lesson.id === course.continueLessonId)
      : undefined) ??
    entries.find((entry) => !entry.lesson.completed && !entry.lesson.locked) ??
    entries[0]
  if (!found) return null
  return { ...found, number: numbers.get(found.lesson.id) ?? 1 }
}

/** Aulas concluídas do módulo. */
export function moduleDoneCount(module: ModuleOutlineView): number {
  return module.lessons.filter((lesson) => lesson.completed).length
}

/** "1 aula", "10 aulas". */
export function lessonCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'aula' : 'aulas'}`
}
