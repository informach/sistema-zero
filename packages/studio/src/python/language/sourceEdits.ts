import {
  type PythonSourceCopy,
  pythonSourceRangeMapper,
  validatePythonSourceCopies,
} from './sourceCopies'
import {
  type PythonAnalysisIdentity,
  type PythonParsedDocument,
  type PythonSourceRange,
  samePythonAnalysisIdentity,
} from './types'

export interface PythonSourceEdit {
  range: PythonSourceRange
  /** Exact source interval captured with the block; never patch a stale buffer. */
  expected: string
  replacement: string
  copies?: readonly PythonSourceCopy[]
}

function isSourceBoundary(source: string, offset: number) {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > source.length) return false
  const before = source.charCodeAt(offset - 1)
  const after = source.charCodeAt(offset)
  return (
    !(before >= 0xd800 && before <= 0xdbff && after >= 0xdc00 && after <= 0xdfff) &&
    !(before === 13 && after === 10)
  )
}

/** Validate coordinates against the original buffer before applying or composing edits. */
export function validatePythonSourceEdits(
  source: string,
  changes: readonly PythonSourceEdit[],
  copyScope?: PythonSourceRange,
) {
  const edits = changes
    .map((edit) => ({ ...edit, range: { ...edit.range } }))
    .sort((a, b) => a.range.start - b.range.start || a.range.end - b.range.end)
  let previousEnd = -1
  let previousStart = -1
  for (const edit of edits) {
    const { start, end } = edit.range
    if (
      !isSourceBoundary(source, start) ||
      !isSourceBoundary(source, end) ||
      end < start ||
      start < previousEnd ||
      start === previousStart
    )
      throw new Error('As alterações de blocos têm intervalos conflitantes ou inválidos.')
    if (source.slice(start, end) !== edit.expected)
      throw new Error('O trecho de código já foi alterado.')
    validatePythonSourceCopies(source, copyScope ? { ...edit, range: copyScope } : edit)
    previousStart = start
    previousEnd = end
  }
  return edits
}

/** Returns a candidate buffer. Reparse it before committing the visual transaction. */
export function applyPythonSourceEdits(
  document: PythonParsedDocument,
  current: { identity: PythonAnalysisIdentity; source: string },
  changes: readonly PythonSourceEdit[],
): string {
  if (
    !samePythonAnalysisIdentity(document.identity, current.identity) ||
    document.source !== current.source
  )
    throw new Error('O código mudou. Atualize os blocos antes de aplicar esta edição.')
  if (!document.tree || document.diagnostics.length)
    throw new Error('Corrija a sintaxe antes de alterar os blocos.')
  const edits = validatePythonSourceEdits(current.source, changes)
  const map = pythonSourceRangeMapper(edits)
  for (const token of document.tokens)
    if (token.kind === 'COMMENT' && !map(token.range))
      throw new Error('Esta alteração precisa preservar os comentários do trecho.')
  let source = current.source
  for (const edit of edits.reverse())
    source = source.slice(0, edit.range.start) + edit.replacement + source.slice(edit.range.end)
  return source
}

export function pythonOffsetToPosition(source: string, offset: number) {
  if (!isSourceBoundary(source, offset)) throw new Error('Posição Python inválida.')
  let line = 1
  let lineStart = 0
  for (let index = 0; index < offset; index++) {
    if (source[index] === '\r') {
      if (source[index + 1] === '\n') index++
      line++
      lineStart = index + 1
    } else if (source[index] === '\n') {
      line++
      lineStart = index + 1
    }
  }
  return { line, column: offset - lineStart + 1 }
}

/** Monaco positions and Python analysis ranges both use UTF-16 character offsets. */
export function pythonPositionToOffset(source: string, line: number, column: number) {
  if (!Number.isSafeInteger(line) || !Number.isSafeInteger(column) || line < 1 || column < 1)
    throw new Error('Posição Python inválida.')
  let currentLine = 1,
    start = 0,
    end = 0
  while (currentLine < line) {
    end = start
    while (end < source.length && source[end] !== '\r' && source[end] !== '\n') end++
    if (end === source.length) throw new Error('Posição Python inválida.')
    start = end + (source[end] === '\r' && source[end + 1] === '\n' ? 2 : 1)
    currentLine++
  }
  end = start
  while (end < source.length && source[end] !== '\r' && source[end] !== '\n') end++
  const offset = start + column - 1
  if (offset > end || !isSourceBoundary(source, offset)) throw new Error('Posição Python inválida.')
  return offset
}

/** Monaco normalizes mixed line endings when loading a model, without editing the file. */
export function pythonModelPositionToOffset(
  source: string,
  modelSource: string,
  line: number,
  column: number,
): number | undefined {
  if (
    source !== modelSource &&
    source.replace(/\r\n|\r/g, '\n') !== modelSource.replace(/\r\n|\r/g, '\n')
  )
    return
  try {
    return pythonPositionToOffset(source, line, column)
  } catch {
    // A stale/programmatic cursor, including one inside a surrogate pair,
    // does not describe a valid Python source boundary.
    return
  }
}
