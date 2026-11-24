import { PYTHON_AREA_MARKERS } from '../blocks/areas'
import { type PythonSourceLines, pythonModuleHeaderEnd } from './sourceLines'
import { pythonStatementLines } from './statementMoves'
import type { PythonNode, PythonParsedDocument } from './types'

export interface PythonStatementInsertion {
  offset: number
  nodes: PythonNode[]
  leadingNewline: boolean
  /** Uma linha em branco depois (a linha nova entra logo acima de um comentário de área). */
  trailingBlankLine?: boolean
  indent: string
  header?: { keyword: 'else' | 'finally'; indent: string }
}

/**
 * Onde entra uma linha nova de uma área anterior à da PRIMEIRA linha do arquivo: logo acima do
 * comentário de área dela, se ele está no bloco de comentários colado a ela (o que vem acima dele,
 * o título do arquivo, fica no topo); sem comentário de área, acima do bloco colado (os comentários
 * da linha ficam com ela) e abaixo do que estiver separado por linha em branco.
 */
function firstLineOffset(document: PythonParsedDocument, lines: PythonSourceLines, start: number) {
  const header = pythonModuleHeaderEnd(document.source, lines)
  let offset = start
  let marker: number | undefined
  while (offset > header) {
    const above = lines.lineAt(offset - 1)
    const text = document.source.slice(above.start, above.end)
    if (!text.startsWith('#')) break
    offset = above.start
    if (PYTHON_AREA_MARKERS.has(text.trimEnd())) marker = above.start
  }
  return marker !== undefined && marker >= header
    ? { offset: marker, beforeMarker: true }
    : { offset: Math.max(offset, header), beforeMarker: false }
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
        let beforeMarker = false
        if (boundary(pending, value)) {
          const previous = index >= 2 ? originals[index - 2] : undefined
          const above = previous && pythonStatementLines(document, previous, lines)
          if (previous && !above) return
          if (above) offset = above.end
          else ({ offset, beforeMarker } = firstLineOffset(document, lines, range.start))
        }
        insertions.push({
          offset,
          nodes: pending,
          leadingNewline: offset > 0 && !/[\r\n]/.test(document.source[offset - 1]!),
          ...(beforeMarker ? { trailingBlankLine: true } : {}),
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
