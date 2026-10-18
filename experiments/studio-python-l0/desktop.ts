import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const directory = resolve(import.meta.dirname, '../../.cache/studio-python-l0')
const python = resolve(directory, 'cpython-3.14.2/python.exe')
const createdAt = new Date().toISOString()
const results: Record<string, unknown>[] = []
const executableHash = createHash('sha256')
  .update(await readFile(python))
  .digest('hex')
const metadata = spawnSync(
  python,
  [
    '-I',
    '-c',
    'import json, sys, tkinter; root = tkinter.Tk(); root.withdraw(); print(json.dumps({"python": sys.version, "tcl": root.tk.call("info", "patchlevel"), "tk": root.tk.call("package", "provide", "Tk")})); root.destroy()',
  ],
  { encoding: 'utf8', timeout: 10000, windowsHide: true },
)
assert.equal(metadata.status, 0, metadata.stderr)
const reference = JSON.parse(metadata.stdout)
assert.ok(reference.python.startsWith('3.14.2 '))
assert.equal(reference.tk, '8.6.15')

for (const [name, expected, input] of [
  ['geometry', ['{"closed": true, "heading": 0.0}'], ''],
  ['events', ['["before-update", "timer", "after-update"]'], ''],
  ['timers', ['[1, 2, 3]'], ''],
  ['sleep', ['["before-sleep", "after-sleep", "timer", "after-update"]'], ''],
  ['input', ['ready-for-input', '{"name": "João", "count": 3}'], 'João\n3\n'],
  ['timer-motion', ['["before", "timer", "after"]'], ''],
  ['callback-reentrant', ['["before", "first", "second", "first-after-update", "after"]'], ''],
  ['callback-error', ['["before", "broken", "survived", "after"]'], ''],
] as const) {
  const path = resolve(import.meta.dirname, `fixtures/${name}.py`)
  const source = await readFile(path)
  // Only window visibility is controlled by the harness. Fixture source and the
  // CPython Turtle implementation are unmodified. Run each in a fresh process.
  const setup =
    name === 'input'
      ? ''
      : 'import turtle; turtle.Screen().getcanvas().winfo_toplevel().withdraw(); '
  const began = performance.now()
  const result = spawnSync(
    python,
    [
      '-I',
      '-X',
      'utf8',
      '-c',
      `import runpy, sys; ${setup}runpy.run_path(sys.argv[1], run_name="__main__")`,
      path,
    ],
    { encoding: 'utf8', timeout: 10000, windowsHide: true, input },
  )
  const record: Record<string, unknown> = {
    name,
    fixtureSha256: createHash('sha256').update(source).digest('hex'),
    elapsedMs: performance.now() - began,
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    error: result.error?.message,
  }
  results.push(record)
  try {
    assert.equal(result.error, undefined)
    assert.equal(result.status, 0, result.stderr)
    if (name === 'callback-error') {
      assert.match(result.stderr, /Exception in Tkinter callback/)
      assert.match(result.stderr, /ValueError: callback-canary/)
    } else assert.equal(result.stderr, '')
    assert.deepEqual(result.stdout.trimEnd().split(/\r?\n/), expected)
    record.qualification = 'passed'
  } catch (error) {
    record.qualification = 'failed'
    record.failure = String(error)
  }
}
await mkdir(directory, { recursive: true })
const output = resolve(directory, `desktop-${createdAt.replaceAll(':', '-')}-${randomUUID()}.json`)
await writeFile(
  output,
  `${JSON.stringify({ createdAt, reference, executableHash, windowWithdrawn: true, results }, null, 2)}\n`,
)
console.log(
  JSON.stringify({
    reference,
    results: results.map(({ name, qualification, failure }) => ({ name, qualification, failure })),
    output,
  }),
)
if (results.some((result) => result.qualification !== 'passed')) process.exitCode = 1
