import { type PythonSourceCopy, validatePythonSourceCopies } from './sourceCopies'
import { type PythonSourceEdit, validatePythonSourceEdits } from './sourceEdits'
import type { PythonSourceRange } from './types'

/** Apply child edits inside their owning copy, including insertions at either boundary. */
export function composePythonCopiedEdit(
  source: string,
  parent: PythonSourceEdit,
  children: readonly { copy: PythonSourceCopy; edits: readonly PythonSourceEdit[] }[],
  insertions: readonly {
    before?: PythonSourceCopy
    text: string
    copies?: readonly PythonSourceCopy[]
  }[] = [],
  copyScope?: PythonSourceRange,
): PythonSourceEdit {
  validatePythonSourceEdits(source, [parent], copyScope)
  const owners = new Set(parent.copies)
  const changes = new Map<PythonSourceCopy, PythonSourceEdit[]>()
  const prefixes = new Map<PythonSourceCopy | undefined, (typeof insertions)[number][]>()
  for (const insertion of insertions) {
    if (insertion.before && !owners.has(insertion.before))
      throw new Error('O comando novo precisa de uma posição válida na lista Python.')
    const texts = prefixes.get(insertion.before) ?? []
    texts.push(insertion)
    prefixes.set(insertion.before, texts)
  }
  for (const child of children) {
    if (!owners.has(child.copy) || changes.has(child.copy))
      throw new Error('A edição interna precisa pertencer a um único comando reaproveitado.')
    const edits = validatePythonSourceEdits(source, child.edits, copyScope)
    if (
      edits.some(
        (edit) =>
          edit.range.start < child.copy.source.start || edit.range.end > child.copy.source.end,
      )
    )
      throw new Error('A edição interna ultrapassa o comando reaproveitado.')
    changes.set(child.copy, edits)
  }
  const fragments: string[] = []
  const copies: PythonSourceCopy[] = []
  let length = 0,
    cursor = 0
  const append = (text: string) => {
    fragments.push(text)
    length += text.length
  }
  const literal = (start: number, end: number) => {
    if (start === end) return
    copies.push({ source: { start, end }, target: length })
    append(source.slice(start, end))
  }
  const additions = (before?: PythonSourceCopy) => {
    for (const insertion of prefixes.get(before) ?? []) {
      for (const copy of insertion.copies ?? [])
        copies.push({ source: copy.source, target: length + copy.target })
      append(insertion.text)
    }
  }
  for (const copy of [...owners].sort((a, b) => a.target - b.target)) {
    append(parent.replacement.slice(cursor, copy.target))
    additions(copy)
    let position = copy.source.start
    for (const edit of changes.get(copy) ?? []) {
      literal(position, edit.range.start)
      for (const inner of edit.copies ?? [])
        copies.push({ source: inner.source, target: length + inner.target })
      append(edit.replacement)
      position = edit.range.end
    }
    literal(position, copy.source.end)
    cursor = copy.target + copy.source.end - copy.source.start
  }
  append(parent.replacement.slice(cursor))
  additions()
  const result = { ...parent, replacement: fragments.join(''), copies }
  validatePythonSourceCopies(source, copyScope ? { ...result, range: copyScope } : result)
  return result
}
