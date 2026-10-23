import { PYTHON_PROGRAMMING_CODECS } from './blocks/catalog'
import { describePythonCatalog } from './blocks/selection'
import { PYTHON_TURTLE_CODECS } from './extensions/turtle/catalog'

/** Course metadata only. Release approval and each learner's grants remain separate gates. */
export const PYTHON_COURSE_BLOCKS = Object.freeze(
  describePythonCatalog([...PYTHON_TURTLE_CODECS, ...PYTHON_PROGRAMMING_CODECS]),
)
const blocks = new Map(PYTHON_COURSE_BLOCKS.map((entry) => [entry.id, entry]))

export function isPythonCourseBlock(id: string): boolean {
  return blocks.has(id)
}

/** An extension follows an earned block's declared owner, never its name or a JS equivalent. */
export function pythonCourseExtensionsForBlocks(ids: readonly string[]): string[] {
  const extensions = new Set<string>()
  for (const id of ids) {
    const block = blocks.get(id)
    if (block && block.owner !== 'programming') extensions.add(block.owner)
  }
  return [...extensions].sort()
}

/** Accepts a mixed course reward list; JavaScript keeps its existing validation contract. */
export function pythonCourseUnlockIssue(ids: readonly string[]): string | null {
  const python = ids.filter((id) => id.startsWith('sz_py_'))
  const selected = new Set(python)
  if (selected.size !== python.length) return 'Há blocos Python repetidos na recompensa do curso.'
  for (const id of python) {
    const block = blocks.get(id)
    if (!block) return `O bloco Python ${id} não pertence ao catálogo atual.`
    for (const dependency of block.dependencies) {
      if (!selected.has(dependency))
        return `Inclua ${blocks.get(dependency)?.title ?? dependency}, necessário para ${block.title}, na recompensa do curso.`
    }
  }
  return null
}

function requireBlock(id: string) {
  const block = blocks.get(id)
  if (!block) throw new Error(`O bloco Python ${id} não pertence ao catálogo atual.`)
  return block
}

/** Admin authoring helper: the returned companions must be shown and saved explicitly. */
export function pythonCourseBlockClosure(ids: readonly string[]): string[] {
  const selected = new Set<string>()
  function add(id: string) {
    if (selected.has(id)) return
    const block = requireBlock(id)
    selected.add(id)
    for (const dependency of block.dependencies) add(dependency)
  }
  for (const id of ids) add(id)
  return [...selected].sort()
}

/** Removing a companion also removes its consumers; unrelated selections stay untouched. */
export function removePythonCourseBlocks(
  ids: readonly string[],
  removedIds: readonly string[],
): string[] {
  const selected = new Set(ids)
  const removed = new Set(removedIds)
  for (const id of [...selected, ...removed]) requireBlock(id)
  let changed: boolean
  do {
    changed = false
    for (const id of selected) {
      if (
        removed.has(id) ||
        requireBlock(id).dependencies.some((dependency) => removed.has(dependency))
      ) {
        selected.delete(id)
        removed.add(id)
        changed = true
      }
    }
  } while (changed)
  return [...selected].sort()
}
