import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { StudioPythonStructureFactsSchema } from '@sistemazero/core/studio/python-structure'
import { STUDIO_PYTHON_STRUCTURE_LIMITS } from '@sistemazero/core/studio/python-structure-limits'
import limits from '../src/python/language/limits.json'
import { readPythonAnalysisResult } from '../src/python/language/readResult'

const executable = process.argv[2]
if (!executable)
  throw new Error('Usage: bun scripts/verify-python-structure.ts <CPython 3.14.2 executable>')
const utf8 = (value: string) => Buffer.from(value, 'utf8').toString('base64')
const cases = [
  {
    id: 'type-parameters',
    bytesBase64: utf8(
      'type Alias[T] = list[T]\ndef generic[U, **P, *Ts](value: U): return value\n',
    ),
    expected: {
      assignedNames: ['Alias', 'P', 'T', 'Ts', 'U', 'generic', 'value'],
      definedFunctions: ['generic'],
    },
  },
  {
    id: 'empty',
    bytesBase64: utf8(''),
    expected: {
      assignedNames: [],
      definedFunctions: [],
      callTargets: [],
      usesLoop: false,
      usesConditional: false,
    },
  },
  {
    id: 'text',
    bytesBase64: utf8('# for x in y: turtle.forward(1)\ntext = "if x: fake()"\n'),
    expected: { assignedNames: ['text'], callTargets: [], usesLoop: false, usesConditional: false },
  },
  {
    id: 'bindings',
    bytesBase64: utf8(
      'a, (b, *c) = [1, [2, 3]]\na += 1\nif (d := 2): pass\nwith open("data") as stream: pass\ntry: pass\nexcept Exception as error: pass\n',
    ),
    expected: {
      assignedNames: ['a', 'b', 'c', 'd', 'error', 'stream'],
      usesConditional: true,
      callTargets: ['open'],
    },
  },
  {
    id: 'async',
    bytesBase64: utf8(
      'async def outer(argument, *, option=1):\n    async for item in argument: pass\n    def inner(): return 1\n    return [x for x in argument if x]\n',
    ),
    expected: {
      definedFunctions: ['inner', 'outer'],
      assignedNames: ['argument', 'inner', 'item', 'option', 'outer', 'x'],
      usesLoop: true,
      usesConditional: true,
    },
  },
  {
    id: 'calls',
    bytesBase64: utf8(
      'import turtle as t\nt.forward(1)\nfactory().method()\nobj.method()\nitems[0]()\n(lambda: 1)()\n',
    ),
    expected: {
      assignedNames: ['t'],
      definedFunctions: [],
      callTargets: ['factory', 'obj.method', 't.forward'],
    },
  },
  {
    id: 'imports',
    bytesBase64: utf8(
      'import package.child\nimport other.child as alias\nfrom source import imported as renamed\nfrom source import *\nclass Scene: pass\n',
    ),
    expected: { assignedNames: ['Scene', 'alias', 'package', 'renamed'], definedFunctions: [] },
  },
  {
    id: 'patterns',
    bytesBase64: utf8(
      'match value:\n    case {"x": x, **rest}: pass\n    case [first, *tail] as whole: pass\n',
    ),
    expected: { assignedNames: ['first', 'rest', 'tail', 'whole', 'x'], usesConditional: true },
  },
  {
    id: 'loop',
    bytesBase64: utf8('while False: pass\n'),
    expected: { usesLoop: true, usesConditional: false },
  },
  {
    id: 'conditional',
    bytesBase64: utf8('value = 1 if True else 2\n'),
    expected: { usesConditional: true, usesLoop: false },
  },
  {
    id: 'no-execution',
    bytesBase64: utf8(
      'import absent_student_package\nraise RuntimeError("must not execute")\nwhile True: pass\n',
    ),
    expected: {
      assignedNames: ['absent_student_package'],
      callTargets: ['RuntimeError'],
      usesLoop: true,
    },
  },
  { id: 'bom', bytesBase64: utf8('\uFEFFação = 1\n'), expected: { assignedNames: ['ação'] } },
  {
    id: 'pep263',
    bytesBase64: Buffer.from('# coding: latin-1\nação = "café"\n', 'latin1').toString('base64'),
    expected: { assignedNames: ['ação'] },
  },
  { id: 'parse-not-compile', bytesBase64: utf8('return 1\n'), diagnostic: true },
  { id: 'long-name', bytesBase64: utf8(`${'x'.repeat(257)} = 1\n`), failure: true },
  { id: 'nodes-limit', bytesBase64: utf8('x = 1\n'), overrides: { nodes: 2 }, failure: true },
  { id: 'depth-limit', bytesBase64: utf8('x = 1\n'), overrides: { depth: 2 }, failure: true },
  {
    id: 'category-limit',
    bytesBase64: utf8('x = y = 1\n'),
    overrides: { namesPerCategory: 1 },
    failure: true,
  },
  {
    id: 'total-limit',
    bytesBase64: utf8('def f(): pass\n'),
    overrides: { names: 1 },
    failure: true,
  },
  { id: 'bytes-limit', bytesBase64: utf8(''), overrides: { evidenceBytes: 32 }, failure: true },
]
const parser = [
  'import sys,json,pathlib',
  "assert sys.version_info[:3] == (3,14,2), 'CPython 3.14.2 required'",
  'namespace={}',
  "exec(compile(pathlib.Path(sys.argv[1]).read_text(encoding='utf-8'),sys.argv[1],'exec'),namespace)",
  'request=json.load(sys.stdin)',
  'results=[]',
  "for case in request['cases']:",
  "    configured=dict(request['limits'])",
  "    configured['structure']={**request['structure'], **case.get('overrides',{})}",
  "    service=namespace['PythonLanguageService'](json.dumps(configured))",
  "    result=json.loads(service.request(json.dumps({'operation':'structure','path':'main.py','bytesBase64':case['bytesBase64']})))",
  "    results.append({'id':case['id'],'result':result})",
  'print(json.dumps(results))',
].join('\n')
const result = spawnSync(
  path.resolve(executable),
  [
    '-I',
    '-B',
    '-X',
    'utf8',
    '-c',
    parser,
    path.resolve(import.meta.dirname, '../src/python/language/analyzer.py'),
  ],
  {
    input: JSON.stringify({ cases, limits, structure: STUDIO_PYTHON_STRUCTURE_LIMITS }),
    encoding: 'utf8',
    windowsHide: true,
    timeout: 10_000,
    maxBuffer: 2 * 1024 * 1024,
  },
)
assert.ifError(result.error)
assert.equal(result.status, 0, result.stderr)
const outcomes = JSON.parse(result.stdout) as {
  id: string
  result: {
    ok: boolean
    message?: string
    diagnostics?: unknown[]
    structure?: unknown
    compiledBytes?: boolean
  }
}[]
assert.equal(outcomes.length, cases.length)
for (const [index, fixture] of cases.entries()) {
  const outcome = outcomes[index]!
  assert.equal(outcome.id, fixture.id)
  readPythonAnalysisResult(JSON.stringify(outcome.result), 0)
  if (fixture.failure) {
    assert.equal(outcome.result.ok, false, fixture.id)
    assert.equal(outcome.result.structure, undefined, fixture.id)
    continue
  }
  assert.equal(outcome.result.ok, true, fixture.id)
  assert.equal(outcome.result.compiledBytes, true, fixture.id)
  if (fixture.diagnostic) {
    assert.equal(outcome.result.diagnostics?.length, 1, fixture.id)
    assert.equal(outcome.result.structure, undefined, fixture.id)
    continue
  }
  assert.deepEqual(outcome.result.diagnostics, [], fixture.id)
  const facts = StudioPythonStructureFactsSchema.parse(outcome.result.structure)
  for (const [key, expected] of Object.entries(fixture.expected!))
    assert.deepEqual(Reflect.get(facts, key), expected, `${fixture.id}:${key}`)
}
console.log(JSON.stringify({ verified: true, python: '3.14.2', cases: cases.length }))
