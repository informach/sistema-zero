import { isNode, nodes } from '../blocks/nodes'
import type { PythonParsedDocument } from './types'

/** CPython decides the grammar and Unicode identifiers; ranges exclude injected trivia/code. */
export function assertPythonRenameIdentifier(document: PythonParsedDocument, name: string) {
  const body = document.tree?.fields.body
  const statement = nodes(body) && body.length === 1 ? body[0] : undefined
  const targets = statement?.fields.targets
  const target = nodes(targets) && targets.length === 1 ? targets[0] : undefined
  const value = statement?.fields.value
  if (
    document.source !== `${name} = None\n` ||
    document.diagnostics.length ||
    document.tree?.kind !== 'Module' ||
    statement?.kind !== 'Assign' ||
    target?.kind !== 'Name' ||
    target.fields.id !== name.normalize('NFKC') ||
    target.fields.id === '__debug__' ||
    target.range?.start !== 0 ||
    target.range.end !== name.length ||
    !isNode(value) ||
    value.kind !== 'Constant' ||
    value.fields.value !== null
  )
    throw new Error('Escolha um nome Python válido, sem espaços nem palavras reservadas.')
}
