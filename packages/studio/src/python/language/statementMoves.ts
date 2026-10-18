import { nodes, pythonSemanticTree } from '../blocks/nodes'
import type { PythonSourceCopy } from './sourceCopies'
import type { PythonSourceEdit } from './sourceEdits'
import { indexPythonSourceLines, type PythonSourceLines } from './sourceLines'
import { samePythonSourceTree } from './sourceTree'
import type { PythonNode, PythonParsedDocument, PythonSourceRange } from './types'

/** Physical lines owned by a statement; inline suites/semicolon siblings need a token planner. */
export function pythonStatementLines(
  document: PythonParsedDocument,
  statement: PythonNode,
  lines: PythonSourceLines,
) {
  if (!statement.range || !statement.id) return
  let start = statement.range.start
  if (nodes(statement.fields.decorator_list) && statement.fields.decorator_list.length) {
    const first = statement.fields.decorator_list[0]!.range
    if (!first) return
    let at: number | undefined
    let low = 0,
      high = document.tokens.length
    while (low < high) {
      const middle = (low + high) >>> 1
      if (document.tokens[middle]!.range.end <= first.start) low = middle + 1
      else high = middle
    }
    for (let index = low - 1; index >= 0; index--) {
      const token = document.tokens[index]!
      if (token.range.end > first.start) continue
      if (token.kind === 'OP' && token.text === '@') {
        at = token.range.start
        break
      }
      if (!['NL', 'COMMENT'].includes(token.kind) && !(token.kind === 'OP' && token.text === '('))
        return
    }
    if (at === undefined) return
    start = at
  }
  const line = lines.lineAt(start).start
  if (!/^[\t ]*$/.test(document.source.slice(line, start))) return
  const { end, next } = lines.lineAt(statement.range.end)
  if (!/^[\t \f]*(?:#[^\r\n]*)?$/.test(document.source.slice(statement.range.end, end))) return
  return { start: line, end: next }
}

/** Move/delete unchanged module statements without regenerating their spelling or comments. */
export function planPythonModuleMoves(
  document: PythonParsedDocument,
  after: PythonNode,
  lines?: PythonSourceLines,
): PythonSourceEdit | undefined {
  const before = document.tree
  if (
    before?.kind !== 'Module' ||
    after.kind !== 'Module' ||
    !nodes(before.fields.body) ||
    !nodes(after.fields.body) ||
    !before.fields.body.length
  )
    return
  if (
    JSON.stringify(pythonSemanticTree(before.fields.type_ignores!)) !==
    JSON.stringify(pythonSemanticTree(after.fields.type_ignores!))
  )
    return
  const originals = before.fields.body
  const remaining = after.fields.body
  const plan = planPythonStatementMoves(document, originals, remaining, lines)
  return plan &&
    !plan.insertions.length &&
    plan.retained.every(({ before, after }) => samePythonSourceTree(before, after))
    ? plan.edit
    : undefined
}

export interface PythonStatementMove {
  edit: PythonSourceEdit
  retained: { before: PythonNode; after: PythonNode; copy: PythonSourceCopy }[]
  insertions: {
    before?: PythonSourceCopy
    nodes: PythonNode[]
    indent: string
    leadingNewline: boolean
  }[]
}

/** Existing sibling suites only; callers keep branch headers outside the edit. */
export function planPythonStatementMoves(
  document: PythonParsedDocument,
  originals: readonly PythonNode[],
  remaining: readonly PythonNode[],
  lines?: PythonSourceLines,
  transferredComments?: ReadonlySet<number>,
): PythonStatementMove | undefined {
  if (!originals.length) return
  if (
    remaining.length === originals.length &&
    remaining.every((item, index) => item.id === originals[index]!.id)
  )
    return
  const indexed = lines ?? indexPythonSourceLines(document.source)
  if (indexed.source !== document.source) throw new Error('O índice pertence a outra fonte Python.')
  const records = originals.map((value) => ({
    value,
    range: pythonStatementLines(document, value, indexed),
  }))
  if (records.some((record) => !record.range)) return
  for (let index = 1; index < records.length; index++)
    if (records[index]!.range!.start < records[index - 1]!.range!.end) return
  const ids = new Set<string>()
  const byId = new Map(records.map((record) => [record.value.id, record]))
  const ordered = remaining.filter((item) => byId.has(item.id))
  // The insertion-only planner preserves its existing module/footer placement.
  if (
    remaining.length > originals.length &&
    ordered.length === originals.length &&
    ordered.every((item, index) => item.id === originals[index]!.id)
  )
    return
  for (const item of remaining) {
    const old = byId.get(item.id)
    if (!old) continue
    if (!item.id || ids.has(item.id)) return
    ids.add(item.id)
  }
  const start = records[0]!.range!.start,
    end = records.at(-1)!.range!.end
  const newline = /\r\n|\r|\n/.exec(document.source)?.[0] ?? '\n'
  const indent = /^[\t ]*/.exec(document.source.slice(start))![0]
  const fragments: string[] = []
  let replacementLength = 0,
    lastCharacter = ''
  const copies: PythonSourceCopy[] = []
  const appendText = (text: string) => {
    if (!text) return
    fragments.push(text)
    replacementLength += text.length
    lastCharacter = text.at(-1)!
  }
  const append = (range: { start: number; end: number }) => {
    const copy = { source: range, target: replacementLength }
    copies.push(copy)
    appendText(document.source.slice(range.start, range.end))
    return copy
  }
  // Trivia between statements belongs to the following statement. File header
  // and footer stay outside this edit; annotations of deleted code remain visible.
  const segments = new Map(
    records.map((record, index) => [
      record.value.id,
      {
        start: index ? records[index - 1]!.range!.end : start,
        end: record.range!.end,
      },
    ]),
  )
  const annotations = new Map<string | undefined, PythonSourceRange[]>()
  let owner = 0
  let firstToken = 0,
    highToken = document.tokens.length
  while (firstToken < highToken) {
    const middle = (firstToken + highToken) >>> 1
    if (document.tokens[middle]!.range.start < start) firstToken = middle + 1
    else highToken = middle
  }
  for (let tokenIndex = firstToken; tokenIndex < document.tokens.length; tokenIndex++) {
    const token = document.tokens[tokenIndex]!
    if (token.range.start >= end) break
    if (token.kind !== 'COMMENT' || token.range.start < start || token.range.end > end) continue
    while (owner < records.length - 1 && token.range.start >= records[owner]!.range!.end) owner++
    const id = records[owner]!.value.id
    const ranges = annotations.get(id) ?? []
    ranges.push(token.range)
    annotations.set(id, ranges)
  }
  for (const record of records) {
    if (ids.has(record.value.id!)) continue
    for (const range of annotations.get(record.value.id) ?? []) {
      if (transferredComments?.has(range.start)) continue
      appendText(indent)
      append(range)
      appendText(newline)
    }
  }
  const retained: PythonStatementMove['retained'] = []
  const insertions: PythonStatementMove['insertions'] = []
  let pending: PythonNode[] = []
  for (const item of remaining) {
    const old = byId.get(item.id)
    if (!old) {
      pending.push(item)
      continue
    }
    if (replacementLength && lastCharacter !== '\r' && lastCharacter !== '\n') appendText(newline)
    const copy = append(segments.get(item.id)!)
    if (pending.length) {
      insertions.push({ before: copy, nodes: pending, indent, leadingNewline: false })
      pending = []
    }
    retained.push({
      before: old.value,
      after: item,
      copy,
    })
  }
  if (pending.length)
    insertions.push({
      nodes: pending,
      indent,
      leadingNewline: replacementLength > 0 && lastCharacter !== '\r' && lastCharacter !== '\n',
    })
  return {
    edit: {
      range: { start, end },
      expected: document.source.slice(start, end),
      replacement: fragments.join(''),
      copies,
    },
    retained,
    insertions,
  }
}
