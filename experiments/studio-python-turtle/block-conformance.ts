import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { PYTHON_PROGRAMMING_CODECS } from '../../packages/studio/src/python/blocks/catalog'
import {
  moduleNode,
  name,
  node,
  pass,
  pythonSemanticTree,
} from '../../packages/studio/src/python/blocks/nodes'
import {
  type PythonVisualNode,
  pythonASTToVisual,
  pythonVisualToAST,
} from '../../packages/studio/src/python/blocks/projection'
import { PYTHON_TURTLE_CODECS } from '../../packages/studio/src/python/extensions/turtle/catalog'
import type { PythonNode } from '../../packages/studio/src/python/language/types'
import { PYTHON_BLOCK_FIXTURES } from './blockFixtures'
import { TURTLE_BLOCK_FIXTURES } from './turtleBlockFixtures'

const root = resolve(import.meta.dir, '../..')
const python = resolve(root, '.cache/studio-python-l0/cpython-3.14.2/python.exe')
const proof = resolve(import.meta.dir, 'block-language-proof.py')
async function native(operation: string, items: unknown[]) {
  const process = Bun.spawn([python, '-I', '-X', 'utf8', proof], {
    cwd: root,
    stdin: new Blob([JSON.stringify({ operation, items })]),
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [stdout, stderr, status] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ])
  assert.equal(status, 0, stderr)
  return JSON.parse(stdout) as { id: string; tree?: PythonNode; source?: string; output?: string }[]
}
function functionNode(
  body: PythonNode[],
  args = node('arguments', {
    posonlyargs: [],
    args: [],
    vararg: null,
    kwonlyargs: [],
    kw_defaults: [],
    kwarg: null,
    defaults: [],
  }),
) {
  return node('FunctionDef', {
    name: 'fixture',
    args,
    body,
    decorator_list: [],
    returns: null,
    type_comment: null,
    type_params: [],
  })
}
function wrap(value: PythonNode, role: string) {
  if (role === 'value') return moduleNode([node('Expr', { value })])
  if (role === 'parameters') return moduleNode([functionNode([pass()], value)])
  if (role === 'parameter')
    return moduleNode([
      functionNode(
        [pass()],
        node('arguments', {
          posonlyargs: [],
          args: [value],
          vararg: null,
          kwonlyargs: [],
          kw_defaults: [],
          kwarg: null,
          defaults: [],
        }),
      ),
    ])
  if (role === 'keyword')
    return moduleNode([
      node('Expr', { value: node('Call', { func: name('f'), args: [], keywords: [value] }) }),
    ])
  if (role === 'handler')
    return moduleNode([
      node('Try', { body: [pass()], handlers: [value], orelse: [], finalbody: [] }),
    ])
  if (role === 'alias') return moduleNode([node('Import', { names: [value] })])
  if (role === 'format')
    return moduleNode([node('Expr', { value: node('JoinedStr', { values: [value] }) })])
  if (value.kind === 'Return') return moduleNode([functionNode([value])])
  if (['Break', 'Continue'].includes(value.kind))
    return moduleNode([node('While', { test: name('condition'), body: [value], orelse: [] })])
  return moduleNode([value])
}

const codecs = [...PYTHON_TURTLE_CODECS, ...PYTHON_PROGRAMMING_CODECS]
const fixtures = [...PYTHON_BLOCK_FIXTURES, ...TURTLE_BLOCK_FIXTURES]
const originals = await native('parse', fixtures)
const checks: unknown[] = []
let opaqueCount = 0
function walk(value: PythonVisualNode, visitor: (value: PythonVisualNode) => void) {
  visitor(value)
  if (value.kind === 'block')
    for (const input of value.inputs) for (const child of input.nodes) walk(child, visitor)
}
for (const original of originals) {
  const fixture = fixtures.find((item) => item.id === original.id)!
  const projection = pythonASTToVisual(original.tree!, {
    codecs,
    officialModules: new Set(['math', 'random', 'turtle']),
  })
  let opaque = 0
  projection.body.forEach((value) => {
    walk(value, (child) => {
      if (child.kind === 'source') opaque++
    })
  })
  if (
    ![
      'opaque',
      'starred',
      'shadow_match',
      'shadow_walrus',
      'shadow_global',
      'shadow_nonlocal',
    ].includes(fixture.id)
  )
    assert.equal(opaque, 0, `Unexpected opaque blocks in ${fixture.id}`)
  if (['shadowed', 'shadow_match', 'shadow_walrus', 'shadow_global'].includes(fixture.id))
    projection.body.forEach((value) => {
      walk(value, (child) => {
        if (child.kind === 'block') assert.notEqual(child.codecId, 'sz_py_print')
      })
    })
  const forbidden =
    fixture.id === 'shadow_methods'
      ? ['sz_py_list_append', 'sz_py_text_upper']
      : fixture.id.startsWith('shadow_')
        ? ['sz_py_math_sqrt']
        : []
  for (const value of projection.body)
    walk(value, (child) => {
      if (child.kind === 'block') assert.ok(!forbidden.includes(child.codecId), fixture.id)
    })
  opaqueCount += opaque
  const turtleFixture = TURTLE_BLOCK_FIXTURES.find((fixture) => fixture.id === original.id)
  if (turtleFixture) {
    const ids: string[] = []
    for (const value of projection.body)
      walk(value, (child) => {
        if (child.kind === 'block') ids.push(child.codecId)
      })
    for (const expected of turtleFixture.expected)
      assert.ok(ids.includes(expected), `${original.id}: ${expected}`)
    for (const excluded of turtleFixture.excluded ?? [])
      assert.ok(!ids.includes(excluded), `${original.id}: ${excluded}`)
  }
  const restored = pythonVisualToAST(projection, codecs)
  assert.deepEqual(pythonSemanticTree(restored), pythonSemanticTree(original.tree!), fixture.id)
  checks.push({
    id: fixture.id,
    original: fixture.source,
    node: restored,
    execute: fixture.execute,
  })
}
for (const codec of codecs) {
  const original = codec.defaultNode(),
    shape = codec.decode(original)
  assert.ok(shape, codec.id)
  const restored = codec.encode(shape)
  assert.deepEqual(pythonSemanticTree(restored), pythonSemanticTree(original), codec.id)
  checks.push({ id: codec.id, node: wrap(restored, codec.role) })
}
const rendered = await native('render', checks)
const report = {
  status: 'passed',
  codecs: codecs.length,
  turtleCodecs: PYTHON_TURTLE_CODECS.length,
  programs: originals.length,
  generatedAndCompiled: rendered.length,
  executedPairs: fixtures.filter((fixture) => fixture.execute).length,
  preservedOpaqueNodes: opaqueCount,
  output: rendered
    .filter((item) => item.output !== undefined)
    .map(({ id, output }) => ({ id, output })),
}
await Bun.write(
  resolve(root, '.cache/studio-python-l0/l4-block-conformance.json'),
  `${JSON.stringify(report, null, 2)}\n`,
)
console.log(JSON.stringify(report))
