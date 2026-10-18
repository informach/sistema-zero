import type { PythonSourceEdit } from './sourceEdits'
import type { PythonNode, PythonParsedDocument, PythonToken, PythonValue } from './types'

/** Rename only the grammar-owned identifier, preserving the surrounding header/body. */
export function planPythonIdentifierEdit(
  document: PythonParsedDocument,
  before: PythonNode,
  field: string,
  value: PythonValue,
): PythonSourceEdit | undefined {
  const original = before.fields[field]
  if (!before.range || typeof original !== 'string' || typeof value !== 'string' || !value) return
  const header =
    field === 'name' && ['FunctionDef', 'AsyncFunctionDef', 'ClassDef'].includes(before.kind)
  const first =
    (field === 'arg' && ['arg', 'keyword'].includes(before.kind)) ||
    (field === 'id' && before.kind === 'Name')
  const last = field === 'attr' && before.kind === 'Attribute'
  if (!header && !first && !last) return
  let low = 0,
    high = document.tokens.length
  const boundary = last ? before.range.end : before.range.start
  while (low < high) {
    const middle = (low + high) >>> 1
    if (document.tokens[middle]!.range.start < boundary) low = middle + 1
    else high = middle
  }
  let index = last ? low - 1 : low
  const next = (): PythonToken | undefined => {
    const token = document.tokens[index++]
    return token && token.range.start >= before.range!.start && token.range.end <= before.range!.end
      ? token
      : undefined
  }
  let token = next()
  if (header) {
    if (before.kind === 'AsyncFunctionDef') {
      if (token?.kind !== 'NAME' || token.text !== 'async') return
      token = next()
    }
    if (token?.kind !== 'NAME' || token.text !== (before.kind === 'ClassDef' ? 'class' : 'def'))
      return
    token = next()
  }
  // CPython normalizes identifier spelling (e.g. K → K); preserve all untouched text.
  if (token?.kind !== 'NAME' || token.text.normalize('NFKC') !== original) return
  return { range: token.range, expected: token.text, replacement: value }
}
