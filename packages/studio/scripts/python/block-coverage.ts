/**
 * Block coverage report (developer tool, not a qualification): parses Python files with the
 * pinned CPython/WASM analyzer and projects them into the current block catalogs.
 *
 *   bun scripts/python/block-coverage.ts --node <node24> --distribution <dir>
 *     --distribution-sha256 <sha> [--extension python-turtle|python-pgzero] <file.py>...
 *
 * Prints, per file, the source fragments that stay opaque (no block) and whether the
 * visual projection encodes back to the same syntax tree.
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { canonicalJson } from '@sistemazero/core/creations'
import { PYTHON_PROGRAMMING_CODECS } from '../../src/python/blocks/catalog'
import type { PythonBlockCodec } from '../../src/python/blocks/contract'
import { pythonSemanticTree } from '../../src/python/blocks/nodes'
import {
  type PythonVisualNode,
  pythonASTToVisual,
  pythonVisualToAST,
} from '../../src/python/blocks/projection'
import { attachPythonResolverOptions } from '../../src/python/blocks/resolverOptions'
import type { PythonResolverOptions } from '../../src/python/blocks/scope'
import type { PythonNode } from '../../src/python/language/types'
import { startVisualExampleAnalysis } from './visual-example-qualification'

const args = process.argv.slice(2)
const option = (name: string) => {
  const index = args.indexOf(`--${name}`)
  if (index < 0) return undefined
  const value = args[index + 1]
  args.splice(index, 2)
  return value
}
const node = option('node') ?? 'node'
const distribution = option('distribution')
const sha = option('distribution-sha256')
const extension = option('extension')
assert.ok(distribution && sha, 'Use --distribution and --distribution-sha256')

let codecs: readonly PythonBlockCodec[] = PYTHON_PROGRAMMING_CODECS
let resolver: PythonResolverOptions = {}
const official = new Set(['math', 'random', 'time', 'sz_audio'])
if (extension === 'python-turtle') {
  const { PYTHON_TURTLE_CODECS, TURTLE_STAR_EXPORTS } = await import(
    '../../src/python/extensions/turtle/catalog'
  )
  codecs = [...PYTHON_TURTLE_CODECS, ...PYTHON_PROGRAMMING_CODECS]
  resolver = { starExports: new Map([['turtle', TURTLE_STAR_EXPORTS]]) }
  official.add('turtle')
} else if (extension === 'python-pgzero') {
  const catalog = await import('../../src/python/extensions/pgzero/catalog')
  codecs = [...catalog.PYTHON_PGZERO_CODECS, ...PYTHON_PROGRAMMING_CODECS]
  resolver = catalog.PGZERO_RESOLVER_OPTIONS
  official.add('pgzero')
  official.add('pgzrun')
}
codecs = attachPythonResolverOptions([...codecs], resolver)

const analysis = await startVisualExampleAnalysis({
  nodeExecutable: node,
  distribution,
  distributionSha256: sha,
})
let failures = 0
const GENERIC = new Set(['sz_py_run', 'sz_py_run_value', 'sz_py_method', 'sz_py_method_value'])
const genericNames = new Map<string, number>()
try {
  for (const file of args) {
    const source = await readFile(file, 'utf8')
    const result = await analysis.request({ operation: 'parse', source, path: 'main.py' })
    if (!('tree' in result) || !result.tree) {
      console.log(`✗ ${file}: syntax error`)
      failures++
      continue
    }
    const tree = result.tree as PythonNode
    const projection = pythonASTToVisual(tree, { codecs, officialModules: official })
    const opaque: string[] = []
    const used = new Map<string, number>()
    const walk = (values: PythonVisualNode[]) => {
      for (const value of values) {
        if (value.kind === 'source') {
          const range = value.node.range
          opaque.push(
            `${value.node.kind}: ${range ? source.slice(range.start, Math.min(range.end, range.start + 70)).replace(/\s+/g, ' ') : ''}`,
          )
          continue
        }
        used.set(value.codecId, (used.get(value.codecId) ?? 0) + 1)
        if (GENERIC.has(value.codecId)) {
          const label = `${value.codecId.replace('sz_py_', '')}:${value.fields[0]?.value ?? '?'}`
          genericNames.set(label, (genericNames.get(label) ?? 0) + 1)
        }
        for (const input of value.inputs) walk(input.nodes)
      }
    }
    walk(projection.body)
    const same =
      canonicalJson(pythonSemanticTree(pythonVisualToAST(projection, codecs))) ===
      canonicalJson(pythonSemanticTree(tree))
    const generic = [
      'sz_py_run',
      'sz_py_run_value',
      'sz_py_method',
      'sz_py_method_value',
      'sz_py_call',
    ]
      .map((id) => [id, used.get(id) ?? 0] as const)
      .filter(([, count]) => count)
    console.log(
      `${opaque.length || !same ? '✗' : '✓'} ${file}: ${opaque.length} sem bloco, ida e volta ${same ? 'ok' : 'DIFERENTE'}${
        generic.length
          ? `; genéricos ${generic.map(([id, count]) => `${id}×${count}`).join(' ')}`
          : ''
      }`,
    )
    for (const item of opaque.slice(0, 12)) console.log(`    · ${item}`)
    if (process.env.SZ_COVERAGE_IDS)
      console.log(
        `    blocos: ${[...used]
          .sort((a, b) => b[1] - a[1])
          .map(([id, count]) => `${id.replace('sz_py_', '')}×${count}`)
          .join(' ')}`,
      )
    if (opaque.length || !same) failures++
  }
} finally {
  await analysis.close()
}
if (args.length > 1)
  console.log(
    `
Chamadas que caíram no bloco genérico (nome × vezes):
${[...genericNames]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 60)
  .map(([label, count]) => `${label}×${count}`)
  .join('  ')}`,
  )
process.exitCode = failures ? 1 : 0
