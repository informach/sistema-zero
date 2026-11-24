import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'

/**
 * Prova de reversão do armazenamento v4 (lote 1.1, 19/11/2026): o cliente v3 da staging
 * imediatamente anterior à ativação (`f9ddd5e1`) e o cliente atual, na MESMA origem, cada um com
 * o seu próprio `persistence.ts`. O checkout antigo é instalado à parte: resolver o código antigo
 * com o `node_modules` de hoje provaria uma compatibilidade que não existe.
 *
 *   git worktree add --detach ../reader-v3 f9ddd5e164daed9ac9c7ce2b6fcf76daf07e97a0
 *   (cd ../reader-v3 && bun install --frozen-lockfile)
 *   STORAGE_DOWNGRADE_BASELINE=../reader-v3 bunx playwright test --config playwright.storage-downgrade.config.ts
 */
const root = resolve(import.meta.dir, '../../..')
const REVISION = 'f9ddd5e164daed9ac9c7ce2b6fcf76daf07e97a0'
const baseline = resolve(
  process.env.STORAGE_DOWNGRADE_BASELINE ?? join(root, '../sistema-zero-reader-v3'),
)
if (
  execFileSync('git', ['rev-parse', 'HEAD'], { cwd: baseline, encoding: 'utf8' }).trim() !==
  REVISION
)
  throw new Error(`A prova exige o checkout congelado ${REVISION} (último v3 da staging).`)
if (
  execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], {
    cwd: baseline,
    encoding: 'utf8',
  }).trim()
)
  throw new Error('O checkout congelado tem alterações rastreadas.')
const port = Number(process.env.STORAGE_DOWNGRADE_PORT ?? 5406)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Porta inválida')

await mkdir(join(root, 'packages/studio/.cache'), { recursive: true })
const temporary = await mkdtemp(join(root, 'packages/studio/.cache/storage-downgrade-'))
for (const [name, checkout] of [
  ['current', root],
  ['old', baseline],
] as const) {
  const source = join(checkout, 'packages/studio/src')
  const modulePath = (file: string) => JSON.stringify(join(source, file).replaceAll('\\', '/'))
  const entry = join(temporary, `${name}.ts`)
  const backups =
    name === 'current'
      ? `import * as backups from ${modulePath('project-migrations/localBackups.ts')};`
      : 'const backups = {};'
  await writeFile(
    entry,
    `import * as persistence from ${modulePath('state/persistence.ts')};
import { PROJECT_STORAGE_VERSION } from ${modulePath('state/projectStorageKeys.ts')};
import { prepareEditableStudioProject } from ${modulePath('state/editableProjectValidation.ts')};
import { advanceLocalRevision } from ${modulePath('state/projectStorageRevision.ts')};
import { createEmptyProject } from ${modulePath('core/project.ts')};
import { encodeProjectJsonGraph } from ${modulePath('state/projectJsonGraph.ts')};
${backups}
Object.assign(window, { storageProof: { ...persistence, ...backups, PROJECT_STORAGE_VERSION, prepareEditableStudioProject, advanceLocalRevision, createEmptyProject, encodeProjectJsonGraph } });`,
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
    `<html lang="pt-BR"><title>Estúdio ${name}</title><body>Prova de reversão do armazenamento<script type="module" src="/${name}.js"></script></body></html>`,
  )
}
Bun.serve({
  hostname: '127.0.0.1',
  port,
  async fetch(request) {
    const path = decodeURIComponent(new URL(request.url).pathname)
    const target = resolve(temporary, `.${path}`)
    if (!target.startsWith(temporary + sep)) return new Response('Forbidden', { status: 403 })
    const file = Bun.file(target)
    return (await file.exists()) ? new Response(file) : new Response('Not found', { status: 404 })
  },
})
console.log(`Prova de reversão do armazenamento: http://127.0.0.1:${port}`)
