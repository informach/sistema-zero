import { isNode, nodes, pythonSemanticTree } from '../blocks/nodes'
import { pythonSourceRangeMapper } from './sourceCopies'
import type { PythonSourceEdit } from './sourceEdits'
import { indexPythonSourceLines } from './sourceLines'
import type { PythonNode, PythonParsedDocument } from './types'

const newlines = (text: string) => text.match(/\r\n|\r|\n/g)?.length ?? 0

/** TypeIgnore.lineno is an AST field, but follows its preserved comment during edits. */
export function relocatePythonTypeIgnores(
  document: PythonParsedDocument,
  tree: PythonNode,
  edits: readonly PythonSourceEdit[],
  source: string,
): PythonNode {
  const before = document.tree?.fields.type_ignores
  const after = tree.fields.type_ignores
  if (!nodes(before) || !nodes(after) || !before.length) return tree
  if (JSON.stringify(pythonSemanticTree(before)) !== JSON.stringify(pythonSemanticTree(after)))
    throw new Error('Edite as instruções de verificação de tipos no modo fonte.')
  // Locate comments in one pass, including CRLF. Their contents can move only
  // through a validated literal copy in applyPythonSourceEdits.
  const comments = new Map<number, number>()
  let position = 0
  let line = 1
  for (const token of document.tokens) {
    if (token.kind !== 'COMMENT') continue
    line += newlines(document.source.slice(position, token.range.start))
    position = token.range.start
    comments.set(line, position)
  }
  const map = pythonSourceRangeMapper(edits)
  let previousLine = 0
  const positions = after
    .map((ignore) => {
      const value = ignore.fields.lineno
      if (
        ignore.kind !== 'TypeIgnore' ||
        !value ||
        typeof value !== 'object' ||
        Array.isArray(value) ||
        isNode(value) ||
        value.literal !== 'int'
      )
        throw new Error('Posição da instrução de tipos inválida.')
      const originalLine = Number(value.value)
      const offset = comments.get(originalLine)
      if (
        !Number.isSafeInteger(originalLine) ||
        originalLine <= previousLine ||
        offset === undefined
      )
        throw new Error('Não foi possível preservar a instrução de tipos.')
      previousLine = originalLine
      const mapped = map({ start: offset, end: offset + 1 })
      if (!mapped) throw new Error('Não foi possível preservar a instrução de tipos.')
      return { ignore, offset: mapped.start }
    })
    .sort((a, b) => a.offset - b.offset)
  position = 0
  line = 1
  const lines = indexPythonSourceLines(source)
  const relocated = positions.map(({ ignore, offset }) => {
    line += newlines(source.slice(position, offset))
    position = offset
    const tag = ignore.fields.tag
    if (typeof tag !== 'string') throw new Error('Instrução de tipos inválida.')
    // Pinned CPython 3.14.2 includes one synthetic LF in a standalone
    // TypeIgnore.tag, even at EOF. This is parser context, not comment text.
    const standalone = /^[\t \f]*$/.test(source.slice(lines.lineAt(offset).start, offset))
    const relocatedTag = tag.replace(/\n$/, '') + (standalone ? '\n' : '')
    return {
      ...ignore,
      fields: {
        ...ignore.fields,
        lineno: { literal: 'int' as const, value: String(line) },
        tag: relocatedTag,
      },
    }
  })
  return { ...tree, fields: { ...tree.fields, type_ignores: relocated } }
}
