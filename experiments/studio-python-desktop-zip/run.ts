// R12 local: exporta projetos Python (Clássico e Pro) pelo exportador do produto, gera o ZIP,
// descompacta numa pasta nova e executa com o CPython nativo; depois muda uma regra no arquivo
// extraído e executa de novo. Uso, na raiz da worktree:
//   bun experiments/studio-python-desktop-zip/run.ts <python.exe>
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { buildPythonSourceFiles } from '../../packages/studio/src/export/pythonSource'
import { zipFiles } from '../../packages/studio/src/export/zip'
import { pythonEnvironmentFixture } from '../../packages/studio/src/state/fixtures/pythonEnvironment'

const { unzipSync }: typeof import('fflate') = createRequire(
  new URL('../../packages/studio/package.json', import.meta.url),
)('fflate')
const python = process.argv[2]
assert(python, 'Informe o python.exe nativo (CPython 3.14.2 com Tk)')

const main = (rulesImport: string) => `import turtle
${rulesImport}
nome = input()
pontos = int(input())
print(f"ola {nome}")
print("total", pontos * BONUS)
t = turtle.Turtle()
for _ in range(4):
    t.forward(50)
    t.left(90)
print("posicao", t.position())
turtle.ontimer(turtle.bye, 300)
turtle.done()
print("fim")
`
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

function run(directory: string) {
  // As a learner runs it: `python main.py` (no -I, which would drop the script folder from
  // sys.path and break the project's own imports); -B only avoids writing __pycache__.
  const child = spawnSync(python, ['-B', 'main.py'], {
    cwd: directory,
    input: 'Ana\n21\n',
    encoding: 'utf8',
    timeout: 30_000,
    windowsHide: true,
  })
  return {
    status: child.status,
    stdout: child.stdout.replaceAll('\r\n', '\n'),
    stderr: child.stderr,
  }
}

const report = []
for (const kind of ['classic', 'pro'] as const) {
  const { project, environment } = await pythonEnvironmentFixture(kind)
  project.installedExtensions = [{ id: 'python-turtle', version: '1.0.0', installedAt: 1 }]
  if (project.kind === 'pro') {
    project.tree['main.py'] = { kind: 'file', content: main('from regras import BONUS') }
    project.tree['regras.py'] = { kind: 'file', content: 'BONUS = 2\n' }
  } else project.files['main.py'] = main('BONUS = 2')

  // Same as the editor export: the host passes its runtime catalog.
  const exported = await buildPythonSourceFiles(project, environment.catalog)
  const zip = await zipFiles(exported.files)
  const directory = mkdtempSync(join(tmpdir(), `sz-python-desktop-${kind}-`))
  const entries = unzipSync(zip)
  for (const [path, bytes] of Object.entries(entries)) {
    if (path.endsWith('/')) continue
    mkdirSync(dirname(join(directory, path)), { recursive: true })
    writeFileSync(join(directory, path), bytes)
  }
  const first = run(directory)
  assert.equal(first.status, 0, first.stderr)
  // CPython's Turtle reports -0.00 after four 90° turns (float rounding); both zeros are exact.
  assert.match(first.stdout, /ola Ana\ntotal 42\nposicao \(-?0\.00,-?0\.00\)\nfim\n/)

  // Muda a regra no arquivo extraído, como faria quem abre o ZIP no VS Code.
  const rules = kind === 'pro' ? join(directory, 'regras.py') : join(directory, 'main.py')
  writeFileSync(rules, readFileSync(rules, 'utf8').replace('BONUS = 2', 'BONUS = 3'))
  const second = run(directory)
  assert.equal(second.status, 0, second.stderr)
  assert.match(second.stdout, /total 63\n/)

  report.push({
    kind,
    zipBytes: zip.length,
    zipSha256: sha(zip),
    files: Object.keys(entries)
      .filter((path) => !path.endsWith('/'))
      .sort(),
    warnings: exported.warnings,
    directory,
    firstRun: first.stdout.trim().split('\n'),
    secondRun: second.stdout.trim().split('\n'),
  })
}
console.log(JSON.stringify({ state: 'desktop-zip-passed', python, report }, null, 2))
