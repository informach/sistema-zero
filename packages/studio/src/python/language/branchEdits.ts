import { nodes } from '../blocks/nodes'
import type { PythonSourceCopy } from './sourceCopies'
import type { PythonSourceEdit } from './sourceEdits'
import type { PythonSourceLines } from './sourceLines'
import type { PythonStatementInsertion } from './statementInsertions'
import type { PythonNode, PythonParsedDocument } from './types'

function branchKind(parent: PythonNode, field: string) {
  if (
    field === 'orelse' &&
    ['If', 'For', 'AsyncFor', 'While', 'Try', 'TryStar'].includes(parent.kind)
  )
    return 'else'
  if (field === 'finalbody' && ['Try', 'TryStar'].includes(parent.kind)) return 'finally'
}

function precedingNodes(parent: PythonNode, field: string) {
  return ['body', 'handlers', ...(field === 'finalbody' ? ['orelse'] : [])].flatMap((key) => {
    const value = parent.fields[key]
    return nodes(value) ? value : []
  })
}

/** Add a missing optional suite after the preceding body/handlers, before a following finally. */
export function planPythonBranchInsertion(
  document: PythonParsedDocument,
  parent: PythonNode,
  field: string,
  after: readonly PythonNode[],
  lines: PythonSourceLines,
): PythonStatementInsertion | undefined {
  const keyword = branchKind(parent, field)
  const original = parent.fields[field]
  if (!keyword || !after.length || !nodes(original) || original.length || !parent.range) return
  if (lines.source !== document.source) throw new Error('O índice pertence a outra fonte Python.')
  const indent = document.source.slice(lines.lineAt(parent.range.start).start, parent.range.start)
  if (!/^[\t ]*$/.test(indent)) return
  const previous = precedingNodes(parent, field)
  if (!previous.length || previous.some((value) => !value.range)) return
  const precedingEnd = previous.reduce((end, value) => Math.max(end, value.range!.end), 0)
  const tail = lines.lineAt(precedingEnd)
  if (!/^[\t \f]*(?:#[^\r\n]*)?$/.test(document.source.slice(precedingEnd, tail.end))) return
  const firstBody = nodes(parent.fields.body) ? parent.fields.body[0]?.range : undefined
  const bodyPrefix = firstBody
    ? document.source.slice(lines.lineAt(firstBody.start).start, firstBody.start)
    : ''
  const bodyIndent =
    /^[\t ]+$/.test(bodyPrefix) && bodyPrefix.length > indent.length ? bodyPrefix : `${indent}    `
  return {
    offset: tail.next,
    nodes: [...after],
    indent: bodyIndent,
    leadingNewline: tail.next > 0 && !/[\r\n]/.test(document.source[tail.next - 1]!),
    header: { keyword, indent },
  }
}

/** Removing an optional suite also removes its header, retaining every annotation. */
export function planPythonBranchRemoval(
  document: PythonParsedDocument,
  parent: PythonNode,
  field: string,
  after: readonly PythonNode[],
  lines: PythonSourceLines,
  transferredComments?: ReadonlySet<number>,
): PythonSourceEdit | undefined {
  const original = parent.fields[field]
  const keyword = branchKind(parent, field)
  if (
    !keyword ||
    after.length ||
    !nodes(original) ||
    !original.length ||
    !parent.range ||
    original.some((value) => !value.range)
  )
    return
  if (lines.source !== document.source) throw new Error('O índice pertence a outra fonte Python.')
  const indent = document.source.slice(lines.lineAt(parent.range.start).start, parent.range.start)
  if (!/^[\t ]*$/.test(indent)) return
  const previous = precedingNodes(parent, field)
  if (!previous.length || previous.some((value) => !value.range)) return
  const precedingEnd = previous.reduce((end, value) => Math.max(end, value.range!.end), 0)
  const first = original[0]!.range!
  const last = original.at(-1)!.range!
  const tail = lines.lineAt(last.end)
  if (!/^[\t \f]*(?:#[^\r\n]*)?$/.test(document.source.slice(last.end, tail.end))) return
  let low = 0,
    high = document.tokens.length
  while (low < high) {
    const middle = (low + high) >>> 1
    if (document.tokens[middle]!.range.start < precedingEnd) low = middle + 1
    else high = middle
  }
  let start: number | undefined
  let headerIndex = low
  for (; headerIndex < document.tokens.length; headerIndex++) {
    const token = document.tokens[headerIndex]!
    if (token.range.start > first.start) break
    if (
      token.kind !== 'NAME' ||
      !(keyword === 'finally'
        ? token.text === 'finally'
        : token.text === 'else' || (parent.kind === 'If' && token.text === 'elif'))
    )
      continue
    const line = lines.lineAt(token.range.start).start
    if (document.source.slice(line, token.range.start) !== indent) continue
    start = line
    break
  }
  if (start === undefined) return
  const newline = /\r\n|\r|\n/.exec(document.source)?.[0] ?? '\n'
  const pieces: string[] = []
  const copies: PythonSourceCopy[] = []
  let length = 0
  for (let index = headerIndex; index < document.tokens.length; index++) {
    const token = document.tokens[index]!
    if (token.range.start >= tail.next) break
    if (token.kind !== 'COMMENT' || token.range.end > tail.next) continue
    if (transferredComments?.has(token.range.start)) continue
    pieces.push(indent, token.text, newline)
    copies.push({ source: token.range, target: length + indent.length })
    length += indent.length + token.text.length + newline.length
  }
  const range = { start, end: tail.next }
  return {
    range,
    expected: document.source.slice(range.start, range.end),
    replacement: pieces.join(''),
    copies,
  }
}
