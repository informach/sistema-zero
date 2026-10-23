import type { BlockCatalogEntry } from '@sistemazero/studio'
import {
  isPythonCourseBlock,
  pythonCourseBlockClosure,
  removePythonCourseBlocks,
} from '@sistemazero/studio/python-course-unlocks'

export type CourseBlockLanguage = 'javascript' | 'python'

/** The reserved prefix also keeps invalid Python IDs visible for correction, never authorized. */
export const isPythonRewardId = (id: string) => isPythonCourseBlock(id) || id.startsWith('sz_py_')

export function courseBlocksForLanguage(ids: readonly string[], language: CourseBlockLanguage) {
  return ids.filter((id) => isPythonRewardId(id) === (language === 'python'))
}

/** Editing one language never replaces the other language's saved course rewards. */
export function changeCourseBlocks(input: {
  current: readonly string[]
  next: readonly string[]
  language: CourseBlockLanguage
  catalog: readonly BlockCatalogEntry[]
  action: 'selection' | 'import'
}) {
  const { current, next, language, catalog, action } = input
  const approved = new Set(catalog.map((entry) => entry.type))
  if (next.some((id) => !approved.has(id)))
    throw new Error('A seleção contém blocos indisponíveis neste catálogo. A lista foi preservada.')
  const previous = courseBlocksForLanguage(current, language)
  let selected = [...next]
  if (language === 'python') {
    const removed = previous.filter((id) => isPythonCourseBlock(id) && !next.includes(id))
    if (action === 'selection') selected = removePythonCourseBlocks(selected, removed)
    selected = pythonCourseBlockClosure(selected)
    if (selected.some((id) => !approved.has(id)))
      throw new Error(
        'Um bloco auxiliar necessário não está aprovado neste ambiente. A lista foi preservada.',
      )
  }
  return {
    blocks: [...current.filter((id) => !previous.includes(id)), ...selected],
    added: selected.filter((id) => !next.includes(id)),
    removed: next.filter((id) => !selected.includes(id)),
  }
}
