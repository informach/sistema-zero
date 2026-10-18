import type { ProjectTree } from '../core/proProject'
import type { ProTextEdit } from '../monaco/pro/languageService'

/** All offsets address the captured text; edits are never applied by regex. */
export function applyProTextEdits(tree: ProjectTree, edits: readonly ProTextEdit[]): ProjectTree {
  const next = { ...tree }
  const byFile = new Map<string, ProTextEdit[]>()
  for (const edit of edits) {
    if (tree[edit.path]?.kind !== 'file' || edit.path.startsWith('node_modules/'))
      throw new Error('Esta mudança alcança um arquivo fora do projeto editável.')
    const list = byFile.get(edit.path) ?? []
    list.push(edit)
    byFile.set(edit.path, list)
  }
  for (const [path, changes] of byFile) {
    const node = tree[path]!
    if (node.kind !== 'file') throw new Error('Arquivo não encontrado.')
    let text = node.content
    let end = text.length
    for (const edit of changes.sort((a, b) => b.start - a.start)) {
      if (
        !Number.isSafeInteger(edit.start) ||
        !Number.isSafeInteger(edit.length) ||
        edit.start < 0 ||
        edit.length < 0 ||
        edit.start + edit.length > end
      )
        throw new Error('As posições desta mudança não correspondem ao arquivo.')
      text = text.slice(0, edit.start) + edit.text + text.slice(edit.start + edit.length)
      end = edit.start
    }
    next[path] = { kind: 'file', content: text }
  }
  return next
}
