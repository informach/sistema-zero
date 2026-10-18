import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { type Browser, chromium } from '@playwright/test'
import { assertRun, deadline, finalizeEvidence } from './checks.ts'
import type {} from './probe.ts'
import { hashSources } from './source-hashes.ts'

const cache = resolve(import.meta.dirname, '../../.cache/studio-python-l0')
const folder = resolve(cache, `entrypoint-${randomUUID()}`)
const project = resolve(folder, 'portable-project')
await mkdir(project, { recursive: true })
const fixture = JSON.parse(
  await readFile(resolve(import.meta.dirname, 'fixtures/portable-entry.json'), 'utf8'),
)
assert.equal(fixture.entrypoint, 'app/main.py')
const files: Record<string, string> = {}
for (const [path, source] of Object.entries(fixture.files)) {
  assert.ok(
    /^[a-zA-Z0-9_./-]+$/.test(path) &&
      path.split('/').every((part) => part && part !== '.' && part !== '..'),
  )
  assert.ok(typeof source === 'string')
  const file = resolve(project, path)
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, source)
  files[path] = source
}
const sources = await hashSources()
const evidence: Record<string, unknown> = {
  createdAt: new Date().toISOString(),
  sources,
  scope:
    'Unchanged multi-file script semantics and assets in browser/desktop; product ZIP builder remains L7',
}
const server = spawn('bun', ['server.ts'], {
  cwd: import.meta.dirname,
  env: { ...process.env, L0_PROTECTED_WORKERS: '1' },
  stdio: ['ignore', 'pipe', 'inherit'],
  windowsHide: true,
})
const lines = createInterface({ input: server.stdout })
let browser: Browser | undefined
try {
  const desktop = spawnSync(
    resolve(cache, 'cpython-3.14.2/python.exe'),
    ['-E', '-s', '-X', 'utf8', fixture.entrypoint],
    { cwd: project, windowsHide: true, timeout: 10000, encoding: 'utf8' },
  )
  evidence.desktop = {
    status: desktop.status,
    stdout: desktop.stdout,
    stderr: desktop.stderr,
    error: desktop.error?.message,
  }
  assert.equal(desktop.status, 0)
  assert.equal(desktop.stderr, '')
  const expected = desktop.stdout.trimEnd().split(/\r?\n/)
  assert.deepEqual(expected, fixture.expected)
  const url = await deadline(
    new Promise<string>((done, reject) => {
      server.once('error', reject)
      server.once('exit', (code) => reject(new Error(`Server exit ${code}`)))
      lines.once('line', (line) => {
        try {
          done(JSON.parse(line).url)
        } catch (error) {
          reject(error)
        }
      })
    }),
    10000,
    'Entrypoint server',
  )
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  evidence.browserVersion = browser.version()
  const page = await browser.newPage()
  await page.goto(`${url}/?mode=blob-classic`)
  const frame = page.frames().find((item) => item.url().includes('/frame?'))
  assert.ok(frame)
  await frame.waitForFunction(() => globalThis.l0?.state.status === 'ready', undefined, {
    timeout: 30000,
  })
  const bootstrap = `
import os, sys, json, types
from pathlib import Path
from importlib.machinery import SourceFileLoader
root = Path('/portable-project')
root.mkdir()
os.chdir(root)
for path, source in json.loads(${JSON.stringify(JSON.stringify(files))}).items():
    file = root / path
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(source, encoding='utf-8')
entry = 'app/main.py'
absolute = str(root / entry)
main = types.ModuleType('__main__')
main.__file__ = absolute
main.__package__ = None
main.__spec__ = None
main.__loader__ = SourceFileLoader('__main__', absolute)
sys.modules['__main__'] = main
sys.argv = [entry]
sys.path[0] = str((root / entry).parent)
exec(compile(Path(entry).read_bytes(), absolute, 'exec'), main.__dict__)
`
  const result = await deadline(
    frame.evaluate(
      async (code) => ({
        result: await globalThis.l0.run(code),
        output: [...globalThis.l0.state.events],
      }),
      bootstrap,
    ),
    10000,
    'Portable entrypoint',
  )
  evidence.browser = result
  assertRun(result, expected)
  evidence.qualification = 'entrypoint-portability-slice-passed'
} catch (error) {
  evidence.failure = String(error)
  process.exitCode = 1
} finally {
  if (browser) {
    try {
      await deadline(browser.close(), 5000, 'Entrypoint browser cleanup')
    } catch (error) {
      evidence.cleanupFailure = String(error)
      process.exitCode = 1
    }
  }
  lines.close()
  server.kill()
  if (JSON.stringify(sources) !== JSON.stringify(await hashSources())) {
    evidence.failure = 'Sources changed'
    process.exitCode = 1
  }
  finalizeEvidence(evidence)
  await writeFile(resolve(folder, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`)
  console.log(
    JSON.stringify({ folder, qualification: evidence.qualification, failure: evidence.failure }),
  )
}
