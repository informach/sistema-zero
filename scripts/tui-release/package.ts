import { cp, mkdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { windowsHelper } from '../../packages/agent-runtime/src/process/windows'
import { manifest, verify } from './manifest'

const root = resolve(import.meta.dir, '../..')
if (process.platform !== 'win32' || process.arch !== 'x64')
  throw new Error(
    'This release target is Windows x64; other platforms require their own certification',
  )
const final = resolve(root, 'packages/tui/dist')
const destination = resolve(root, 'packages/tui/.dist-preparing-' + crypto.randomUUID())
await mkdir(destination, { recursive: true })
const result = await Bun.build({
  entrypoints: [
    join(root, 'packages/tui/src/cli.ts'),
    join(root, 'packages/agent-runtime/src/main.ts'),
    join(root, 'packages/agent-runtime/src/store/worker.ts'),
    join(root, 'packages/agent-runtime/src/context/typescript-worker.ts'),
    join(root, 'packages/agent-integrations/src/mcp/schema-worker.ts'),
    join(root, 'scripts/tui-release/smoke.ts'),
    join(root, 'scripts/tui-release/install.ts'),
  ],
  outdir: destination,
  target: 'bun',
  splitting: true,
  naming: { entry: '[name].js', chunk: 'chunk-[hash].js', asset: '[name]-[hash].[ext]' },
  external: [
    '@opentui/core',
    '@opentui/react',
    'react',
    'typescript',
    '@anthropic-ai/claude-agent-sdk',
    'playwright-core',
  ],
  define: {
    ZERO_RUNTIME_ENTRY: JSON.stringify('./main.js'),
    ZERO_STORE_WORKER: JSON.stringify('./worker.js'),
    ZERO_JOB_HELPER: JSON.stringify('./windows-job.ps1'),
    ZERO_JOB_BINARY: JSON.stringify('./windows-job.exe'),
    ZERO_SECURITY_HELPER: JSON.stringify('./windows-security.ps1'),
    ZERO_TYPESCRIPT_WORKER: JSON.stringify('./typescript-worker.js'),
    ZERO_MCP_SCHEMA_WORKER: JSON.stringify('./schema-worker.js'),
    ZERO_BROWSER_WORKER: JSON.stringify('./browser-worker.mjs'),
  },
})
if (!result.success) throw new AggregateError(result.logs, 'TUI build failed')
const browser = await Bun.build({
  entrypoints: [join(root, 'packages/agent-integrations/src/browser/browser-worker.ts')],
  outdir: destination,
  target: 'node',
  format: 'esm',
  naming: '[name].mjs',
  external: ['playwright-core'],
})
if (!browser.success) throw new AggregateError(browser.logs, 'Browser worker build failed')
const launcher = await Bun.build({
  entrypoints: [join(root, 'scripts/tui-release/launcher.ts')],
  outdir: destination,
  target: 'bun',
  splitting: false,
  naming: '[name].js',
})
if (!launcher.success) throw new AggregateError(launcher.logs, 'Launcher build failed')
await cp(
  join(root, 'packages/agent-runtime/src/process/windows-job.ps1'),
  join(destination, 'windows-job.ps1'),
)
await cp(
  join(root, 'packages/agent-runtime/src/process/windows-security.ps1'),
  join(destination, 'windows-security.ps1'),
)
// Compile the exact shipped source once at build time, instead of on every new profile.
const jobBinary = await windowsHelper(destination)
await cp(jobBinary, join(destination, 'windows-job.exe'))
const generatedBin = resolve(destination, 'bin')
if (dirname(generatedBin) !== destination || dirname(destination) !== resolve(root, 'packages/tui'))
  throw new Error('Unexpected generated helper directory')
await rm(generatedBin, { recursive: true })
await writeFile(
  join(destination, 'package.json'),
  JSON.stringify(
    {
      name: '@sistemazero/tui',
      version: '0.1.0',
      type: 'module',
      bin: { sistemazero: './cli.js' },
      engines: { bun: '>=1.3.11' },
      dependencies: {
        '@opentui/core': '0.3.0',
        '@opentui/react': '0.3.0',
        react: '19.2.6',
        typescript: '5.9.3',
        '@anthropic-ai/claude-agent-sdk': '0.3.299',
        'playwright-core': '1.62.1',
      },
    },
    null,
    2,
  ),
)
const lock = Bun.spawn([process.execPath, 'install', '--lockfile-only', '--ignore-scripts'], {
  cwd: destination,
  stdout: 'pipe',
  stderr: 'pipe',
})
const [lockOutput, lockErrors, lockCode] = await Promise.all([
  new Response(lock.stdout).text(),
  new Response(lock.stderr).text(),
  lock.exited,
])
if (lockCode !== 0)
  throw new Error('Release lockfile generation failed: ' + lockOutput + lockErrors)
await writeFile(
  join(destination, 'manifest.json'),
  JSON.stringify(await manifest(destination), null, 2),
)
await verify(destination)
const previous = resolve(root, 'packages/tui/.dist-previous-' + crypto.randomUUID())
const existed = await stat(final).then(
  () => true,
  (error) => {
    if (error.code === 'ENOENT') return false
    throw error
  },
)
if (existed) await rename(final, previous)
try {
  await rename(destination, final)
} catch (error) {
  if (existed) await rename(previous, final)
  throw error
}
if (
  existed &&
  dirname(previous) === resolve(root, 'packages/tui') &&
  previous.includes('.dist-previous-')
)
  await rm(previous, { recursive: true })
console.log(`Built ${result.outputs.length} modules in ${final}`)
