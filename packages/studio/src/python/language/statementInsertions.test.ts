import { expect, test } from 'bun:test'
import { indexPythonSourceLines } from './sourceLines'
import { planPythonStatementInsertions } from './statementInsertions'
import type { PythonNode, PythonParsedDocument } from './types'

/** Uma linha de topo por linha de texto que não é comentário nem vazia. */
function document(source: string) {
  const body: PythonNode[] = []
  let offset = 0
  let id = 0
  for (const match of source.matchAll(/([^\r\n]*)(\r\n|\r|\n|$)/g)) {
    const [whole, text] = match
    if (!whole) break
    if (text!.trim() && !text!.startsWith('#'))
      body.push({
        kind: 'Expr',
        id: String(++id),
        range: { start: offset, end: offset + text!.length },
        fields: { value: null },
      })
    offset += whole.length
  }
  const parsed: PythonParsedDocument = {
    version: 1,
    language: 'python',
    source,
    identity: {
      projectId: 'p',
      instanceId: 'i',
      path: 'main.py',
      revision: 'a'.repeat(64),
      generation: 1,
    },
    tree: { kind: 'Module', fields: { body, type_ignores: [] } },
    tokens: [],
    diagnostics: [],
  }
  return { parsed, body }
}

test('linha nova de uma área anterior entra antes do comentário da próxima área', () => {
  const source = '# 📦 Bibliotecas\nimport a\n\n# ⚙️ Ao iniciar\nprint(1)\n'
  const { parsed, body } = document(source)
  const [library, start] = body
  const added: PythonNode = { kind: 'Import', fields: {} }
  const area = new Map<PythonNode, number>([
    [library!, 0],
    [added, 0],
    [start!, 3],
  ])
  const lines = indexPythonSourceLines(source)
  const after = [library!, added, start!]
  const withAreas = planPythonStatementInsertions(parsed, body, after, lines, true, (value) =>
    area.get(value),
  )
  expect(withAreas?.insertions.map((insertion) => insertion.offset)).toEqual([
    source.indexOf('\n\n') + 1,
  ])
  // Sem áreas, continua entrando logo acima da próxima linha (depois dos comentários dela).
  const plain = planPythonStatementInsertions(parsed, body, after, lines, true)
  expect(plain?.insertions.map((insertion) => insertion.offset)).toEqual([source.indexOf('print')])
})

test('linha nova da mesma área da próxima continua colada a ela', () => {
  const source = '# ⚙️ Ao iniciar\nx = 1\nprint(x)\n'
  const { parsed, body } = document(source)
  const added: PythonNode = { kind: 'Expr', fields: {} }
  const area = new Map<PythonNode, number>([
    [body[0]!, 3],
    [added, 3],
    [body[1]!, 3],
  ])
  const result = planPythonStatementInsertions(
    parsed,
    body,
    [body[0]!, added, body[1]!],
    indexPythonSourceLines(source),
    true,
    (value) => area.get(value),
  )
  expect(result?.insertions.map((insertion) => insertion.offset)).toEqual([source.indexOf('print')])
})
