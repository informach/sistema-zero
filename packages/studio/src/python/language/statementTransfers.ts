import { isNode, node, nodes } from '../blocks/nodes'
import type { PythonSourceFragment } from './sourceFragments'
import { editPythonSourceFragment } from './sourceFragments'
import { indexPythonSourceLines, type PythonSourceLines } from './sourceLines'
import { pythonStatementLines } from './statementMoves'
import type {
  PythonNode,
  PythonParsedDocument,
  PythonSourceRange,
  PythonToken,
  PythonValue,
} from './types'

interface Location {
  node: PythonNode
  parent: PythonNode
  field: string
  siblings: PythonNode[]
  index: number
}

function statementLocations(tree: PythonNode) {
  const result = new Map<string, Location[]>()
  const visit = (parent: PythonNode) => {
    for (const [field, value] of Object.entries(parent.fields)) {
      if (nodes(value)) {
        if (['body', 'orelse', 'finalbody'].includes(field))
          value.forEach((node, index) => {
            if (!node.id) return
            const previous = result.get(node.id) ?? []
            previous.push({ node, parent, field, siblings: value, index })
            result.set(node.id, previous)
          })
        for (const child of value) visit(child)
      } else if (isNode(value)) visit(value)
    }
  }
  visit(tree)
  return result
}

export function planPythonStatementTransfers(
  document: PythonParsedDocument,
  after: PythonNode,
  lines: PythonSourceLines,
) {
  const originals = statementLocations(document.tree!)
  const destinations = statementLocations(after)
  const transfers = new Map<
    string,
    { before: PythonNode; range: PythonSourceRange; indent: string; elif?: PythonSourceRange }
  >()
  for (const [id, places] of destinations) {
    const previous = originals.get(id)
    // Copying a visual block does not transfer its original annotation twice.
    if (places.length !== 1 || previous?.length !== 1) continue
    const old = previous[0]!,
      next = places[0]!
    const sameParent =
      old.parent.kind === 'Module'
        ? next.parent.kind === 'Module'
        : old.parent.id !== undefined && old.parent.id === next.parent.id
    if (sameParent && old.field === next.field) continue
    const own = pythonStatementLines(document, old.node, lines)
    if (!own) continue
    const preceding = old.index
      ? pythonStatementLines(document, old.siblings[old.index - 1]!, lines)
      : undefined
    if (old.index && (!preceding || preceding.end > own.start)) continue
    const range = { start: preceding?.end ?? own.start, end: own.end }
    const indent = /^[\t ]*/.exec(document.source.slice(own.start))![0]
    let header: PythonToken | undefined
    if (old.node.kind === 'If' && old.node.range) {
      let low = 0,
        high = document.tokens.length
      while (low < high) {
        const middle = (low + high) >>> 1
        if (document.tokens[middle]!.range.start < old.node.range.start) low = middle + 1
        else high = middle
      }
      while (document.tokens[low]?.range.start === old.node.range.start) {
        const token = document.tokens[low++]!
        if (token.kind === 'NAME') {
          header = token
          break
        }
      }
    }
    transfers.set(id, {
      before: old.node,
      range,
      indent,
      ...(header?.kind === 'NAME' && header.text === 'elif' ? { elif: header.range } : {}),
    })
  }
  const ranges = [...transfers.values()]
    .map((value) => value.range)
    .sort((a, b) => a.start - b.start)
  const comments = new Set<number>()
  let index = 0,
    furthestEnd = -1
  for (const token of document.tokens) {
    while (index < ranges.length && ranges[index]!.start <= token.range.start)
      furthestEnd = Math.max(furthestEnd, ranges[index++]!.end)
    if (token.kind === 'COMMENT' && token.range.end <= furthestEnd) comments.add(token.range.start)
  }
  return { transfers, comments }
}

/** Render new ancestors with ordinary Pass nodes, then fill their parsed statement ranges. */
export function pythonTransferTemplate(tree: PythonNode, transfers: ReadonlyMap<string, unknown>) {
  const slots: { path: (string | number)[]; value: PythonNode }[] = []
  const visit = (value: PythonValue, path: (string | number)[]): PythonValue => {
    if (isNode(value)) {
      if (value.id && transfers.has(value.id)) {
        slots.push({ path, value })
        return node('Pass')
      }
      return {
        ...value,
        fields: Object.fromEntries(
          Object.entries(value.fields).map(([key, child]) => [key, visit(child, [...path, key])]),
        ),
      }
    }
    return Array.isArray(value)
      ? value.map((child, index) => visit(child, [...path, index]))
      : value
  }
  return { tree: visit(tree, []) as PythonNode, slots }
}

export function pythonNodeAtTemplatePath(tree: PythonNode, path: readonly (string | number)[]) {
  let value: PythonValue = tree
  for (const part of path) {
    const child: PythonValue | undefined =
      typeof part === 'number'
        ? Array.isArray(value)
          ? value[part]
          : undefined
        : isNode(value)
          ? value.fields[part]
          : undefined
    if (child === undefined) throw new Error('A estrutura do comando Python gerado mudou.')
    value = child
  }
  if (!isNode(value)) throw new Error('O comando Python gerado não possui uma posição válida.')
  return value
}

/** Reindent syntax only; bytes within multiline string tokens stay literal. */
export function reindentPythonTransferredFragment(
  original: string,
  fragment: PythonSourceFragment,
  tokens: readonly PythonToken[],
  prefixLength: number,
  before: string,
  after: string,
): PythonSourceFragment {
  if (before === after) return fragment
  const literals = tokens.filter((token) =>
    ['STRING', 'FSTRING_MIDDLE', 'TSTRING_MIDDLE'].includes(token.kind),
  )
  let literal = 0,
    start = 0,
    tokenIndex = 0,
    continued = false
  const changes: { range: PythonSourceRange; replacement: string }[] = []
  const lines = indexPythonSourceLines(fragment.text)
  while (start < fragment.text.length) {
    const offset = start + prefixLength
    while (tokenIndex < tokens.length && tokens[tokenIndex]!.range.start < offset) {
      const token = tokens[tokenIndex++]!
      if (token.kind === 'NEWLINE') continued = false
      else if (!['NL', 'COMMENT', 'INDENT', 'DEDENT', 'ENCODING', 'ENDMARKER'].includes(token.kind))
        continued = true
    }
    while (literal < literals.length && literals[literal]!.range.end <= offset) literal++
    const inside =
      literal < literals.length &&
      literals[literal]!.range.start < offset &&
      literals[literal]!.range.end > offset
    const line = lines.lineAt(start)
    if (!inside) {
      const text = fragment.text.slice(start, line.end)
      const indent = /^[\t ]*/.exec(text)![0]
      if (text.length > indent.length) {
        if (indent.startsWith(before))
          changes.push({ range: { start, end: start + before.length }, replacement: after })
        else if (text[indent.length] === '#')
          changes.push({ range: { start, end: start + indent.length }, replacement: after })
        // Implicit parentheses and explicit backslashes permit a smaller prefix.
        // Their whitespace has no suite meaning and can remain byte-identical.
        else if (!continued)
          throw new Error('A indentação deste comando precisa ser ajustada no modo fonte.')
      }
    }
    start = line.next
  }
  return editPythonSourceFragment(original, fragment, changes)
}
