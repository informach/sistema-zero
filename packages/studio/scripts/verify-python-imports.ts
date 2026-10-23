import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import type { ProjectTree } from '../src/core/proProject'
import { planPythonFileImports } from '../src/python/language/fileImports'
import { movedPythonPath } from '../src/python/language/modulePaths'
import { readPythonAnalysisResult } from '../src/python/language/readResult'
import { assertPythonRenameIdentifier } from '../src/python/language/renameIdentifier'
import type { PythonParsedDocument } from '../src/python/language/types'
import { renameProNode } from '../src/state/proTree'
import { normalizePythonProjectPath } from '../src/state/pythonProjectLayout'

const pythonArgument = process.argv[2]
if (!pythonArgument)
  throw new Error('Usage: bun scripts/verify-python-imports.ts <CPython 3.14 executable>')
const python = resolve(pythonArgument)
const root = resolve(import.meta.dirname, '../../..')
const parser = `import sys,json,pathlib
assert sys.version_info[:2] == (3,14), 'CPython 3.14 required'
namespace={}
exec(compile(pathlib.Path(sys.argv[1]).read_text(encoding='utf-8'),sys.argv[1],'exec'),namespace)
service=namespace['PythonLanguageService'](pathlib.Path(sys.argv[2]).read_text(encoding='utf-8'))
request=json.loads(sys.stdin.read())
print(json.dumps({path:service.parse(source,path,request['compilable']) for path,source in request['files'].items()}))`
function documents(files: Record<string, string>, compilable = false) {
  const result = spawnSync(
    python,
    [
      '-I',
      '-B',
      '-X',
      'utf8',
      '-c',
      parser,
      resolve(root, 'packages/studio/src/python/language/analyzer.py'),
      resolve(root, 'packages/studio/src/python/language/limits.json'),
    ],
    {
      input: JSON.stringify({ files, compilable }),
      encoding: 'utf8',
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
    },
  )
  assert.ifError(result.error)
  assert.equal(result.status, 0, result.stderr)
  const payloads = JSON.parse(result.stdout)
  return Object.fromEntries(
    Object.entries(files).map(([path, source]) => {
      const parsed = readPythonAnalysisResult(JSON.stringify(payloads[path]), source.length)
      assert.ok(parsed.ok && 'tree' in parsed)
      if (compilable && parsed.tree) assert.equal(parsed.compilable, true)
      const document: PythonParsedDocument = {
        version: 1,
        language: 'python',
        source,
        identity: {
          projectId: 'imports-proof',
          instanceId: 'native',
          generation: 1,
          path,
          revision: 'a'.repeat(64),
        },
        tree: parsed.tree,
        tokens: parsed.tokens,
        diagnostics: parsed.diagnostics,
      }
      return [path, document]
    }),
  )
}
function tree(files: Record<string, string>): ProjectTree {
  const result: ProjectTree = {}
  for (const [path, content] of Object.entries(files)) {
    const parts = path.split('/')
    for (let length = 1; length < parts.length; length++)
      result[parts.slice(0, length).join('/')] = { kind: 'dir' }
    result[path] = { kind: 'file', content }
  }
  return result
}
interface Fixture {
  name: string
  files: Record<string, string>
  entrypoint?: string
  from: string
  to: string
  refusal?: RegExp
  expected?: string
  references?: string[]
}
const fixtures: Fixture[] = [
  {
    name: 'wildcard package export is refused',
    files: {
      'main.py': 'from pkg import *\nprint(helper.valor)\n',
      'pkg/__init__.py': '__all__ = ["helper"]\n',
      'pkg/helper.py': 'valor=1\n',
    },
    from: 'pkg/helper.py',
    to: 'pkg/tools.py',
    refusal: /import \*/,
    references: ['main.py'],
  },
  {
    name: 'standalone type module follows imports',
    files: {
      'main.py':
        'from typing import TYPE_CHECKING\nif TYPE_CHECKING:\n    import helper\nprint(1)\n',
      'helper.pyi': 'valor: int\n',
    },
    from: 'helper.pyi',
    to: 'tools.pyi',
    expected:
      'from typing import TYPE_CHECKING\nif TYPE_CHECKING:\n    import tools as helper\nprint(1)\n',
    references: ['main.py'],
  },
  {
    name: 'source and typing pair cannot diverge',
    files: {
      'main.py': 'import helper\nprint(helper.valor)\n',
      'helper.pyi': 'valor: int\n',
      'helper.py': 'valor=1\n',
    },
    from: 'helper.pyi',
    to: 'tools.pyi',
    refusal: /tipagem/,
    references: ['main.py'],
  },
  {
    name: 'builtin shadow is refused',
    files: { 'main.py': 'import sys\nprint(sys.maxsize > 0)\n', 'sys.py': 'maxsize=0\n' },
    from: 'sys.py',
    to: 'tools.py',
    refusal: /coincide/,
  },
  {
    name: 'package attribute moved to another package is refused',
    files: {
      'main.py': 'from pkg import helper\nprint(helper)\n',
      'pkg/__init__.py': 'helper=7\n',
      'pkg/helper.py': 'valor=1\n',
    },
    from: 'pkg/helper.py',
    to: 'other/helper.py',
    refusal: /atributos/,
  },
  {
    name: 'dynamic package attribute is refused',
    files: {
      'main.py': 'from pkg import helper\nprint(helper)\n',
      'pkg/__init__.py': 'def __getattr__(name):\n    return {"helper": 7, "tools": 8}[name]\n',
      'pkg/helper.py': 'valor=1\n',
    },
    from: 'pkg/helper.py',
    to: 'pkg/tools.py',
    refusal: /atributos/,
  },
  {
    name: 'plain module keeps binding',
    files: { 'main.py': 'import helper\nprint(helper.valor)\n', 'helper.py': 'valor=41\n' },
    from: 'helper.py',
    to: 'tools.py',
    expected: 'import tools as helper\nprint(helper.valor)\n',
  },
  {
    name: 'from preserves comments and mixed EOL',
    files: {
      'main.py': '# início\r\nfrom helper import valor as placar  # preservar\nprint(placar)\r\n',
      'helper.py': 'valor=42\n',
    },
    from: 'helper.py',
    to: 'tools.py',
    expected: '# início\r\nfrom tools import valor as placar  # preservar\nprint(placar)\r\n',
  },
  {
    name: 'package move with alias',
    files: {
      'main.py': 'import pkg.helper as h\nprint(h.valor)\n',
      'pkg/__init__.py': '',
      'pkg/helper.py': 'valor=43\n',
    },
    from: 'pkg',
    to: 'tools',
    expected: 'import tools.helper as h\nprint(h.valor)\n',
  },
  {
    name: 'from package child keeps binding',
    files: {
      'main.py': 'from pkg import helper\nprint(helper.valor)\n',
      'pkg/__init__.py': '',
      'pkg/helper.py': 'valor=44\n',
    },
    from: 'pkg/helper.py',
    to: 'pkg/tools.py',
    expected: 'from pkg import tools as helper\nprint(helper.valor)\n',
  },
  {
    name: 'relative module import',
    files: {
      'main.py': 'from pkg.game import jogar\nprint(jogar())\n',
      'pkg/__init__.py': '',
      'pkg/game.py': 'from .helper import valor\ndef jogar(): return valor\n',
      'pkg/helper.py': 'valor=45\n',
    },
    from: 'pkg/helper.py',
    to: 'pkg/tools.py',
  },
  {
    name: 'relative import follows moved caller',
    files: {
      'main.py': 'from pkg.game import jogar\nprint(jogar())\n',
      'pkg/__init__.py': '',
      'pkg/game.py': 'from .helper import valor\ndef jogar(): return valor\n',
      'pkg/helper.py': 'valor=46\n',
    },
    from: 'pkg/game.py',
    to: 'pkg/sub/game.py',
  },
  {
    name: 'moved entry directory keeps root-relative imports',
    entrypoint: 'src/main.py',
    files: {
      'src/main.py': 'from helper import valor\nprint(valor)\n',
      'src/helper.py': 'valor=47\n',
    },
    from: 'src',
    to: 'code',
  },
  {
    name: 'ambiguous dotted binding is refused',
    files: {
      'main.py': 'import pkg.helper\nprint(pkg.helper.valor)\n',
      'pkg/__init__.py': '',
      'pkg/helper.py': 'valor=1\n',
    },
    from: 'pkg/helper.py',
    to: 'pkg/tools.py',
    refusal: /apelido/,
  },
  {
    name: 'shadowed package export is refused',
    files: {
      'main.py': 'from pkg import helper\nprint(helper)\n',
      'pkg/__init__.py': 'helper=7\n',
      'pkg/helper.py': 'valor=1\n',
    },
    from: 'pkg/helper.py',
    to: 'pkg/tools.py',
    refusal: /atributo/,
  },
]
const directory = resolve(root, '.cache/studio-python-imports', crypto.randomUUID())
function execute(files: ProjectTree, entrypoint: string, label: string) {
  const folder = resolve(directory, label)
  for (const [path, file] of Object.entries(files)) {
    if (file.kind !== 'file') continue
    const target = resolve(folder, path)
    assert.ok(target.startsWith(`${folder}\\`) || target.startsWith(`${folder}/`))
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, file.content, 'utf8')
  }
  const entry = resolve(folder, entrypoint)
  const run = spawnSync(
    python,
    [
      '-I',
      '-B',
      '-X',
      'utf8',
      '-c',
      'import sys,runpy;sys.path.insert(0,sys.argv[1]);runpy.run_path(sys.argv[2],run_name="__main__")',
      dirname(entry),
      entry,
    ],
    { cwd: folder, encoding: 'utf8', windowsHide: true, timeout: 5000 },
  )
  assert.ifError(run.error)
  assert.equal(run.status, 0, run.stderr)
  return run.stdout
}
for (const [index, fixture] of fixtures.entries()) {
  const files = fixture.files,
    original = tree(files),
    entrypoint = fixture.entrypoint ?? 'main.py'
  const request = {
    tree: original,
    documents: documents(files),
    entrypoint,
    from: fixture.from,
    to: fixture.to,
  }
  if (fixture.references)
    assert.deepEqual(
      planPythonFileImports({ ...request, to: undefined }).references.sort(),
      fixture.references,
    )
  if (fixture.refusal) {
    assert.throws(() => planPythonFileImports(request), fixture.refusal)
    console.log(`PASS ${fixture.name}`)
    continue
  }
  const plan = planPythonFileImports(request),
    edited = { ...original }
  for (const path of new Set(plan.edits.map((edit) => edit.path))) {
    const original = files[path]!
    let result = original
    for (const edit of plan.edits
      .filter((edit) => edit.path === path)
      .sort((a, b) => b.start - a.start))
      result = result.slice(0, edit.start) + edit.text + result.slice(edit.start + edit.length)
    edited[path] = { kind: 'file', content: result }
  }
  if (fixture.expected)
    assert.deepEqual(edited['main.py'], { kind: 'file', content: fixture.expected })
  const moved = renameProNode(edited, fixture.from, fixture.to, normalizePythonProjectPath)
  assert.ok(moved.tree)
  assert.equal(
    execute(moved.tree, movedPythonPath(entrypoint, fixture.from, fixture.to), `${index}-after`),
    execute(original, entrypoint, `${index}-before`),
  )
  assert.deepEqual(original, tree(files))
  console.log(`PASS ${fixture.name}`)
}
const initialization = tree({
  'main.py': 'import pkg.child\nprint(pkg.marker)\n',
  'pkg/__init__.py': 'marker=42\n',
  'pkg/child.py': 'pass\n',
})
const initializationSources = Object.fromEntries(
  Object.entries(initialization).flatMap(([path, node]) =>
    node.kind === 'file' ? [[path, node.content]] : [],
  ),
)
assert.deepEqual(
  planPythonFileImports({
    tree: initialization,
    documents: documents(initializationSources),
    entrypoint: 'main.py',
    from: 'pkg/__init__.py',
  }).references,
  ['main.py'],
)
console.log('PASS deletion accounts for ancestor package initialization')
console.log(`PASS ${fixtures.length} native CPython import/refactoring cases`)

const identifiers = [
  ['pontos', true],
  ['pontuação', true],
  ['_valor2', true],
  ['match', true],
  ['case', true],
  ['type', true],
  ['K', true],
  ['変数', true],
  ['for', false],
  ['None', false],
  ['await', false],
  ['__debug__', false],
  ['a.b', false],
  ['a,b', false],
  ['a = b', false],
  [' a', false],
  ['a ', false],
  ['a\npass\nb', false],
  ['a # comentário\nb', false],
  ['1nome', false],
  ['😀', false],
] as const
const identifierDocuments = documents(
  Object.fromEntries(
    identifiers.map(([name], index) => [`identifier_${index}.py`, `${name} = None\n`]),
  ),
)
for (const [index, [name, valid]] of identifiers.entries()) {
  const document = identifierDocuments[`identifier_${index}.py`]!
  const check = () => assertPythonRenameIdentifier(document, name)
  if (valid) assert.doesNotThrow(check, name)
  else assert.throws(check, /nome Python válido/, name)
}
console.log(`PASS ${identifiers.length} CPython identifier cases, including Unicode and injection`)

const invalidPrograms = {
  'duplicate.py': 'def f(a, a):\n    return a\n',
  'global.py': 'def f(y):\n    global y\n',
  'nonlocal.py': 'def outer():\n    y=1\n    def f(y):\n        nonlocal y\n',
}
const editable = documents(invalidPrograms)
const checked = documents(invalidPrograms, true)
for (const path of Object.keys(invalidPrograms)) {
  assert.ok(editable[path]!.tree, `Editing must keep the AST: ${path}`)
  assert.equal(checked[path]!.tree, null, `Refactoring must reject invalid compilation: ${path}`)
  assert.equal(checked[path]!.diagnostics.length, 1)
}
assert.ok(
  documents({ 'never-execute.py': 'raise RuntimeError("must not execute")\n' }, true)[
    'never-execute.py'
  ]!.tree,
)
console.log(
  'PASS compile-only validation rejects invalid symbols without executing code or blocking AST editing',
)
