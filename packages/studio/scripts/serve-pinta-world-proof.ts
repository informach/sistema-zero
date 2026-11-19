import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'

// A separately installed, frozen checkout is essential: resolving its core against today's
// node_modules would falsely prove that an old client understands a new nested contract.
const root = resolve(import.meta.dir, '../../..')
const baseline = resolve(
  process.env.PINTA_STUDIO_BASELINE ?? join(root, '../sistema-zero-pinta-reader-a'),
)
const revision =
  process.env.PINTA_STUDIO_BASELINE_REVISION ?? '0218a11a330e8da93e70786afb3b0fe48370a562'
if (
  ![
    '0218a11a330e8da93e70786afb3b0fe48370a562',
    'f44648d9b2c63509f882ef8cb1ce8c66ee554c7d',
  ].includes(revision)
)
  throw new Error('Escolha um dos dois baselines históricos da prova.')
if (
  execFileSync('git', ['rev-parse', 'HEAD'], { cwd: baseline, encoding: 'utf8' }).trim() !==
  revision
)
  throw new Error(`A prova exige o checkout congelado ${revision}.`)
const changed = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], {
  cwd: baseline,
  encoding: 'utf8',
})
if (changed.trim()) throw new Error('O checkout congelado tem alterações rastreadas.')
const port = Number(process.env.PINTA_WORLD_PROOF_PORT ?? 5405)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Porta inválida')
const fixtures = join(root, '.tmp/pinta-python-world-e2e')
execFileSync('bun', [join(root, 'packages/pinta/scripts/homologacao/pythonWorld.ts'), fixtures], {
  cwd: root,
  stdio: 'inherit',
})
await mkdir(join(root, 'packages/studio/.cache'), { recursive: true })
const temporary = await mkdtemp(join(root, 'packages/studio/.cache/world-proof-'))
for (const [name, checkout] of [
  ['current', root],
  ['old', baseline],
]) {
  const source = join(checkout!, 'packages/studio/src')
  const modulePath = (file: string) => JSON.stringify(join(source, file).replaceAll('\\', '/'))
  const entry = join(temporary, `${name}.ts`)
  const pinta = join(root, 'packages/pinta')
  const pintaPath = (file: string) => JSON.stringify(join(pinta, file).replaceAll('\\', '/'))
  const native =
    name === 'current'
      ? `
import { createPintaPersistence } from ${pintaPath('src/state/persistence.ts')};
import { exportImageAndSourceForStudio, inspectImageForStudio } from ${pintaPath('src/export/studioLibrary.ts')};
import { vilaEFloresta } from ${pintaPath('scripts/homologacao/fixture.ts')};
Object.assign(window, { pintaWorldProof: { createPintaPersistence, exportImageAndSourceForStudio, inspectImageForStudio, vilaEFloresta } });`
      : ''
  await writeFile(
    entry,
    `import * as persistence from ${modulePath('state/persistence.ts')};
import { prepareEditableStudioProject } from ${modulePath('state/editableProjectValidation.ts')};
import { advanceLocalRevision } from ${modulePath('state/projectStorageRevision.ts')};
import { documentFixture } from ${modulePath('state/fixtures/projectDocuments.ts')};
import { preparePythonExecutionSnapshot } from ${modulePath('runtime/python/snapshot.ts')};
import { buildPythonSourceFiles } from ${modulePath('export/pythonSource.ts')};
Object.assign(window, { worldProof: { ...persistence, prepareEditableStudioProject, advanceLocalRevision, documentFixture, preparePythonExecutionSnapshot, buildPythonSourceFiles } });${native}`,
  )
  const built = await Bun.build({
    entrypoints: [entry],
    target: 'browser',
    outdir: temporary,
    naming: '[name].js',
  })
  if (!built.success) throw new AggregateError(built.logs, 'A prova não compilou')
  await writeFile(
    join(temporary, `${name}.html`),
    `<html lang="pt-BR"><title>Estúdio ${name}</title><body>Prova de armazenamento local<script type="module" src="/${name}.js"></script></body></html>`,
  )
}
Bun.serve({
  hostname: '127.0.0.1',
  port,
  async fetch(request) {
    const path = decodeURIComponent(new URL(request.url).pathname)
    const fixture = path.startsWith('/fixtures/')
    const base = fixture ? fixtures : temporary
    const target = resolve(base, `.${fixture ? path.slice('/fixtures'.length) : path}`)
    if (!target.startsWith(base + sep)) return new Response('Forbidden', { status: 403 })
    const file = Bun.file(target)
    return (await file.exists()) ? new Response(file) : new Response('Not found', { status: 404 })
  },
})
console.log(`Prova Estúdio/Pinta: http://127.0.0.1:${port}`)
