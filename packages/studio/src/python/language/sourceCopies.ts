import type { PythonSourceEdit } from './sourceEdits'
import type { PythonParsedDocument, PythonSourceRange } from './types'

export interface PythonSourceCopy {
  source: PythonSourceRange
  /** UTF-16 offset inside the edit's replacement. */
  target: number
}

function boundary(source: string, offset: number) {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > source.length) return false
  const before = source.charCodeAt(offset - 1),
    after = source.charCodeAt(offset)
  return (
    !(before >= 0xd800 && before <= 0xdbff && after >= 0xdc00 && after <= 0xdfff) &&
    !(before === 13 && after === 10)
  )
}

/** A copy proof can only reuse disjoint, exact source inside the replaced interval. */
export function validatePythonSourceCopies(source: string, edit: PythonSourceEdit) {
  const copies = edit.copies ?? []
  if (copies.length > 20_000) throw new Error('Há trechos demais na alteração Python.')
  let previousEnd = edit.range.start
  for (const copy of [...copies].sort((a, b) => a.source.start - b.source.start)) {
    const { start, end } = copy.source
    const targetEnd = copy.target + end - start
    if (
      start < previousEnd ||
      end <= start ||
      end > edit.range.end ||
      !boundary(source, start) ||
      !boundary(source, end) ||
      !boundary(edit.replacement, copy.target) ||
      !boundary(edit.replacement, targetEnd) ||
      source.slice(start, end) !== edit.replacement.slice(copy.target, targetEnd)
    )
      throw new Error('O trecho reaproveitado não corresponde à fonte original.')
    previousEnd = end
  }
  previousEnd = 0
  for (const copy of [...copies].sort((a, b) => a.target - b.target)) {
    if (copy.target < previousEnd) throw new Error('Os trechos reaproveitados se sobrepõem.')
    previousEnd = copy.target + copy.source.end - copy.source.start
  }
}

/** Reusable index for comments/type-ignore relocation; source edits must be validated first. */
export function pythonSourceRangeMapper(edits: readonly PythonSourceEdit[]) {
  let delta = 0
  const index = [...edits]
    .sort((a, b) => a.range.start - b.range.start)
    .map((edit) => {
      const entry = {
        edit,
        delta,
        copies: [...(edit.copies ?? [])].sort((a, b) => a.source.start - b.source.start),
      }
      delta += edit.replacement.length - (edit.range.end - edit.range.start)
      return entry
    })
  return (range: PythonSourceRange): PythonSourceRange | undefined => {
    let low = 0,
      high = index.length
    while (low < high) {
      const middle = (low + high) >>> 1
      if (index[middle]!.edit.range.start <= range.start) low = middle + 1
      else high = middle
    }
    const entry = index[low - 1]
    if (!entry) return index[0] && range.end > index[0].edit.range.start ? undefined : range
    const { edit, delta, copies } = entry
    if (edit.range.end <= range.start) {
      const shift = delta + edit.replacement.length - (edit.range.end - edit.range.start)
      if (index[low] && range.end > index[low]!.edit.range.start) return
      return { start: range.start + shift, end: range.end + shift }
    }
    low = 0
    high = copies.length
    while (low < high) {
      const middle = (low + high) >>> 1
      if (copies[middle]!.source.start <= range.start) low = middle + 1
      else high = middle
    }
    const copy = copies[low - 1]
    if (!copy || range.end > copy.source.end) return
    const shift = edit.range.start + delta + copy.target - copy.source.start
    return { start: range.start + shift, end: range.end + shift }
  }
}

/** Literal preservation alone is insufficient: a comment must remain a comment token. */
export function assertPythonCommentsPreserved(
  before: PythonParsedDocument,
  after: PythonParsedDocument,
  edits: readonly PythonSourceEdit[],
) {
  if (pythonEncodingCookie(before.source) !== pythonEncodingCookie(after.source))
    throw new Error(
      'Mover este comentário alteraria a codificação do arquivo Python. Edite esse trecho no modo fonte.',
    )
  const map = pythonSourceRangeMapper(edits)
  const actual = new Map(
    after.tokens
      .filter((token) => token.kind === 'COMMENT')
      .map((token) => [token.range.start, token]),
  )
  for (const token of before.tokens) {
    if (token.kind !== 'COMMENT') continue
    const range = map(token.range)
    const match = range && actual.get(range.start)
    if (!match || match.range.end !== range!.end || match.text !== token.text)
      throw new Error('A alteração precisa manter cada comentário Python intacto.')
  }
}

/** Mirrors the two-line cookie placement rule of CPython tokenize.detect_encoding. */
function pythonEncodingCookie(source: string): string | undefined {
  const lines = source.split(/\r\n|\r|\n/, 2)
  const cookie = /^[\t \f]*#.*?coding[:=][\t ]*([-_.a-zA-Z0-9]+)/
  const first = cookie.exec(lines[0] ?? '')?.[1]
  if (first) return first
  if (!/^[\t \f]*(?:#|$)/.test(lines[0] ?? '')) return
  return cookie.exec(lines[1] ?? '')?.[1]
}
