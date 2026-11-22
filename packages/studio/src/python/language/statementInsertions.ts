import type { PythonSourceLines } from './sourceLines'
import { pythonStatementLines } from './statementMoves'
import type { PythonNode, PythonParsedDocument } from './types'

export interface PythonStatementInsertion {
  offset: number
  nodes: PythonNode[]
  leadingNewline: boolean
  indent: string
  header?: { keyword: 'else' | 'finally'; indent: string }
}

/** Inserts into existing multiline suites without replacing their headers or retained statements. */
export function planPythonStatementInsertions(
  document: PythonParsedDocument,
  originals: readonly PythonNode[],
  after: readonly PythonNode[],
  lines: PythonSourceLines,
  module: boolean,
  /**
   * Posição da área de cada linha nova/mantida (só no módulo). Uma linha nova de uma área anterior
   * entra logo depois da linha de cima, antes do comentário de área e dos comentários colados à
   * próxima linha: senão ela cairia, no código, dentro da próxima área.
   */
  areaIndexOf?: (value: PythonNode) => number | undefined,
):
  | {
      retained: { before: PythonNode; after: PythonNode }[]
      insertions: PythonStatementInsertion[]
    }
  | undefined {
  if (
    after.length <= originals.length ||
    (!module && !originals.length) ||
    originals.some((value) => !value.id || !value.range)
  )
    return
  const first = originals[0] && pythonStatementLines(document, originals[0], lines)
  if (!module && !first) return
  const indent = module ? '' : /^[\t ]*/.exec(document.source.slice(first!.start))![0]
  const known = new Set(originals.map((value) => value.id))
  const retained: { before: PythonNode; after: PythonNode }[] = []
  const insertions: PythonStatementInsertion[] = []
  let index = 0
  let pending: PythonNode[] = []
  const boundary = (group: readonly PythonNode[], next: PythonNode) => {
    if (!module || !areaIndexOf) return false
    const groupArea = areaIndexOf(group.at(-1)!)
    const nextArea = areaIndexOf(next)
    return groupArea !== undefined && nextArea !== undefined && groupArea < nextArea
  }
  for (const value of after) {
    if (value.id && known.has(value.id)) {
      const old = originals[index++]
      if (!old || old.id !== value.id) return
      if (pending.length) {
        const range = pythonStatementLines(document, old, lines)
        if (!range) return
        let offset = range.start
        if (boundary(pending, value)) {
          const previous = index >= 2 ? originals[index - 2] : undefined
          const above = previous && pythonStatementLines(document, previous, lines)
          if (previous && !above) return
          offset = above ? above.end : moduleHeaderEnd(document.source, lines)
        }
        insertions.push({
          offset,
          nodes: pending,
          leadingNewline: offset > 0 && !/[\r\n]/.test(document.source[offset - 1]!),
          indent,
        })
        pending = []
      }
      retained.push({ before: old, after: value })
    } else pending.push(value)
  }
  if (index !== originals.length) return
  if (pending.length) {
    const last = originals.at(-1)
    const offset = module
      ? document.source.length
      : last && pythonStatementLines(document, last, lines)?.end
    if (offset === undefined) return
    insertions.push({
      offset,
      nodes: pending,
      leadingNewline: offset > 0 && !/[\r\n]/.test(document.source[offset - 1]!),
      indent,
    })
  }
  return { retained, insertions }
}

/** Linhas 1 e 2 com shebang ou declaração de codificação ficam sempre no topo. */
function moduleHeaderEnd(source: string, lines: PythonSourceLines) {
  let offset = 0
  for (let line = 0; line < 2 && offset < source.length; line++) {
    const { end, next } = lines.lineAt(offset)
    if (!/^#!|^[\t \f]*#.*?coding[:=]/.test(source.slice(offset, end))) break
    offset = next
  }
  return offset
}
