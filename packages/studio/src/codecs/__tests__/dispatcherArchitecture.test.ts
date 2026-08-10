import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'

const MAX_DISPATCHER_LINES = 3_000
const DISPATCHER_FILES = [
  '../../blockly/buildIR.ts',
  '../../blockly/workspaceState.ts',
  '../../generators/js.ts',
  '../../parsers/js.ts',
] as const

test('nenhum dispatcher concentra mais de 3.000 linhas próprias fora dos subdispatchers', () => {
  const oversized: string[] = []
  for (const relativePath of DISPATCHER_FILES) {
    const path = join(import.meta.dir, relativePath)
    const source = readFileSync(path, 'utf8')
    const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
    const visit = (node: ts.Node) => {
      if (
        (ts.isFunctionDeclaration(node) ||
          ts.isFunctionExpression(node) ||
          ts.isArrowFunction(node)) &&
        node.body
      ) {
        const start = file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1
        const end = file.getLineAndCharacterOfPosition(node.end).line + 1
        const nestedRanges: number[] = []
        const collectNestedFunctions = (child: ts.Node) => {
          if (
            child !== node &&
            (ts.isFunctionDeclaration(child) ||
              ts.isFunctionExpression(child) ||
              ts.isArrowFunction(child))
          ) {
            const nestedStart = file.getLineAndCharacterOfPosition(child.getStart(file)).line + 1
            const nestedEnd = file.getLineAndCharacterOfPosition(child.end).line + 1
            nestedRanges.push(nestedEnd - nestedStart + 1)
            return
          }
          ts.forEachChild(child, collectNestedFunctions)
        }
        ts.forEachChild(node.body, collectNestedFunctions)
        const lines = end - start + 1 - nestedRanges.reduce((total, size) => total + size, 0)
        if (lines > MAX_DISPATCHER_LINES) {
          const name = 'name' in node && node.name ? node.name.getText(file) : '<anônima>'
          oversized.push(`${relativePath}:${start} ${name} (${lines})`)
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(file)
  }

  expect(oversized).toEqual([])
})
