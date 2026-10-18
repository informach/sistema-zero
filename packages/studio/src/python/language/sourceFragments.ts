import { type PythonSourceCopy, validatePythonSourceCopies } from './sourceCopies'
import { type PythonSourceEdit, validatePythonSourceEdits } from './sourceEdits'
import type { PythonSourceRange } from './types'

export interface PythonSourceFragment {
  text: string
  copies: PythonSourceCopy[]
}

/** Intermediate fragments may refer to another edited suite; the final edit proves uniqueness. */
export function validatePythonSourceFragment(source: string, fragment: PythonSourceFragment) {
  validatePythonSourceCopies(source, {
    range: { start: 0, end: source.length },
    expected: source,
    replacement: fragment.text,
    copies: fragment.copies,
  })
}

export function joinPythonSourceFragments(
  fragments: readonly PythonSourceFragment[],
): PythonSourceFragment {
  const copies: PythonSourceCopy[] = []
  let length = 0
  const pieces = fragments.map((fragment) => {
    for (const copy of fragment.copies)
      copies.push({ source: copy.source, target: length + copy.target })
    length += fragment.text.length
    return fragment.text
  })
  return { text: pieces.join(''), copies }
}

/** Replace local syntax (such as indentation), splitting literal proofs at each boundary. */
export function editPythonSourceFragment(
  original: string,
  fragment: PythonSourceFragment,
  changes: readonly { range: PythonSourceRange; replacement: string }[],
): PythonSourceFragment {
  validatePythonSourceFragment(original, fragment)
  const edits = validatePythonSourceEdits(
    fragment.text,
    changes.map((change) => ({
      ...change,
      expected: fragment.text.slice(change.range.start, change.range.end),
    })),
  )
  const ordered = [...fragment.copies].sort((a, b) => a.target - b.target)
  const pieces: string[] = []
  const copies: PythonSourceCopy[] = []
  let length = 0,
    position = 0,
    index = 0
  const appendSlice = (start: number, end: number) => {
    if (start === end) return
    while (index < ordered.length) {
      const copy = ordered[index]!
      const targetEnd = copy.target + copy.source.end - copy.source.start
      if (copy.target >= end) break
      if (targetEnd > start) {
        const left = Math.max(start, copy.target),
          right = Math.min(end, targetEnd)
        copies.push({
          source: {
            start: copy.source.start + left - copy.target,
            end: copy.source.start + right - copy.target,
          },
          target: length + left - start,
        })
      }
      if (targetEnd > end) break
      index++
    }
    pieces.push(fragment.text.slice(start, end))
    length += end - start
  }
  for (const edit of edits) {
    appendSlice(position, edit.range.start)
    pieces.push(edit.replacement)
    length += edit.replacement.length
    position = edit.range.end
  }
  appendSlice(position, fragment.text.length)
  const result = { text: pieces.join(''), copies }
  validatePythonSourceFragment(original, result)
  return result
}

/** Prove all source/destination changes as one atomic edit, including untouched gaps. */
export function consolidatePythonTransferredEdits(
  source: string,
  changes: readonly PythonSourceEdit[],
): PythonSourceEdit {
  const edits = validatePythonSourceEdits(source, changes, { start: 0, end: source.length })
  const fragments: PythonSourceFragment[] = []
  let position = 0
  const literal = (end: number) => {
    if (end > position)
      fragments.push({
        text: source.slice(position, end),
        copies: [{ source: { start: position, end }, target: 0 }],
      })
  }
  for (const edit of edits) {
    literal(edit.range.start)
    fragments.push({ text: edit.replacement, copies: [...(edit.copies ?? [])] })
    position = edit.range.end
  }
  literal(source.length)
  const fragment = joinPythonSourceFragments(fragments)
  const result = {
    range: { start: 0, end: source.length },
    expected: source,
    replacement: fragment.text,
    copies: fragment.copies,
  }
  validatePythonSourceEdits(source, [result])
  return result
}
