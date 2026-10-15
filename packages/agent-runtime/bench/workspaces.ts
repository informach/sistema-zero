import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { runSchema } from '@sistemazero/agent-core'
import { ProjectIndex } from '../src/context/index'
import { Processes } from '../src/process/manager'
import { readTool } from '../src/tools/read'
import { searchTool } from '../src/tools/search'

const percentile = (values: number[], p: number) =>
  [...values].sort((a, b) => a - b)[Math.ceil(values.length * p) - 1]
async function sample(operation: () => Promise<unknown>) {
  for (let i = 0; i < 3; i++) await operation()
  const values = []
  for (let i = 0; i < 30; i++) {
    const start = performance.now()
    await operation()
    values.push(performance.now() - start)
  }
  return { p50: percentile(values, 0.5), p95: percentile(values, 0.95), milliseconds: values }
}
const reports = []
for (const [name, count, bytes] of [
  ['F1', 1000, 25 * 1024 ** 2],
  ['F2', 50000, 1024 ** 3],
] as const) {
  const reused = name === 'F2' ? process.env.ZERO_BENCH_REUSE_F2 : undefined
  if (
    reused &&
    !resolve(reused).startsWith(
      resolve(tmpdir()) + (process.platform === 'win32' ? '\\' : '/') + 'zero-F2-',
    )
  )
    throw new Error('Reuse requires an owned F2 temporary fixture')
  const directory = reused ?? (await mkdtemp(join(tmpdir(), `zero-${name}-`))),
    workspace = join(directory, 'ação 日本語'),
    profile = join(directory, 'profile')
  await mkdir(workspace, { recursive: true })
  await mkdir(profile, { recursive: true })
  const processes = new Processes(profile),
    index = new ProjectIndex(processes, profile)
  const now = new Date().toISOString()
  const context = {
    workspace,
    run: runSchema.parse({
      id: 'fixture',
      sessionId: 'fixture',
      input: 'benchmark',
      backend: 'openrouter',
      model: 'fixture',
      mode: 'plan',
      state: 'running',
      createdAt: now,
      updatedAt: now,
      maxCost: 1,
      maxSteps: 10,
    }),
    signal: AbortSignal.timeout(300000),
    ask: async () => '',
  }
  const digest = createHash('sha256'),
    start = performance.now()
  for (let folder = 0; !reused && folder < Math.ceil(count / 500); folder++) {
    const sub = join(workspace, 'src-' + folder)
    await mkdir(sub)
    for (let offset = 0; offset < 500; offset += 50)
      await Promise.all(
        Array.from({ length: Math.min(50, count - folder * 500 - offset) }, async (_, item) => {
          const i = folder * 500 + offset + item
          const header = `// SISTEMAZERO_FIXTURE_${i} ação 日本語\r\n`
          const size = Math.floor(bytes / count) + (i < bytes % count ? 1 : 0)
          const content = Buffer.alloc(size, 32)
          content.write(header)
          const path = `src-${folder}/file-${i}.ts`
          // Digest is reproducible from sorted file identities and deterministic content.
          await writeFile(join(workspace, path), content)
        }),
      )
    console.log(`${name}: ${Math.min(count, (folder + 1) * 500)}/${count} files`)
  }
  for (let i = 0; i < count; i++)
    digest.update(`${i}:${Math.floor(bytes / count) + (i < bytes % count ? 1 : 0)}\n`)
  if (!reused) {
    await writeFile(join(workspace, '.gitignore'), 'node_modules/\nignored/\n')
    await mkdir(join(workspace, 'ignored'))
    await writeFile(
      join(workspace, 'ignored', 'foreign.txt'),
      'SISTEMAZERO_FIXTURE_0 must be ignored',
    )
    await processes.run(
      { executable: 'git', args: ['init', '--quiet'], cwd: workspace },
      context.signal,
    )
  } else
    for (let i = 0; i < count; i += 500)
      if (
        (await stat(join(workspace, `src-${Math.floor(i / 500)}/file-${i}.ts`))).size !==
        Math.floor(bytes / count) + (i < bytes % count ? 1 : 0)
      )
        throw new Error('Reused fixture size mismatch')
  const generatedMs = performance.now() - start
  try {
    let invalidations = 0
    const initialStart = performance.now()
    const find = async () => {
      for (;;) {
        try {
          return await index.find(workspace, 'file-', context.signal)
        } catch (error) {
          if (
            !(error instanceof Error) ||
            error.message !== 'Project changed during indexing; retry' ||
            ++invalidations > 3
          )
            throw error
        }
      }
    }
    const initial = await find(),
      initialIndexMs = performance.now() - initialStart
    if (initial.total !== count) throw new Error('Index count mismatch ' + JSON.stringify(initial))
    const indexed = await sample(() => index.find(workspace, 'file-49', context.signal))
    const read = await sample(() =>
      readTool.execute({ path: 'src-0/file-0.ts', startLine: 1, lines: 1 }, context),
    )
    const search = await sample(() =>
      searchTool(processes).execute(
        { text: `SISTEMAZERO_FIXTURE_${count - 1} `, path: '.' },
        context,
      ),
    )
    const canceled = new AbortController()
    canceled.abort()
    let refused = false
    try {
      await processes.run({ executable: 'rg', args: ['--files'], cwd: workspace }, canceled.signal)
    } catch {
      refused = true
    }
    if (!refused) throw new Error('Canceled search started a process')
    reports.push({
      name,
      fixture: {
        seed: 'zero-workspaces-v1',
        files: count,
        bytes,
        metadataChecksum: digest.digest('hex'),
        directory: workspace,
        reused: Boolean(reused),
      },
      generatedMs,
      initialIndexMs,
      invalidations,
      indexed,
      read,
      search,
      memory: process.memoryUsage(),
      canceledBeforeSpawn: refused,
    })
  } finally {
    index.close()
  }
}
const output = resolve(
  import.meta.dir,
  '../../../.audits/tui-bench/working-tree/win32/F1-F2-workspaces.json',
)
await mkdir(resolve(output, '..'), { recursive: true })
await writeFile(
  output,
  JSON.stringify(
    {
      at: new Date().toISOString(),
      notes:
        'Warm filesystem; isolated fixtures. Content formula in source. RSS includes generation and both fixtures; not idle application RSS.',
      reports,
    },
    null,
    2,
  ),
)
console.log(
  JSON.stringify(
    {
      output,
      reports: reports.map((r) => ({
        name: r.name,
        initialIndexMs: r.initialIndexMs,
        searchP95: r.search.p95,
        readP95: r.read.p95,
        indexP95: r.indexed.p95,
      })),
    },
    null,
    2,
  ),
)
