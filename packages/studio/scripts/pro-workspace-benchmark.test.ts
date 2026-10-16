import { test } from 'bun:test'
import { createHash } from 'node:crypto'
import { cpus, platform, release, totalmem } from 'node:os'
import { unzipSync } from 'fflate'
import type { ProjectTree } from '../src/core/proProject'
import { zipFiles } from '../src/export/zip'
import { currentProDiagnostics } from '../src/modes/pro/workspace/ProBottomPanel'
import { searchProFiles } from '../src/modes/pro/workspace/search'
import { studioTutorSourceHash } from '../src/studio/tutorSafety'

// Explicit command only: this file is outside the normal src test discovery.
// STUDIO_BENCH_OUTPUT selects the evidence file, never a threshold or a skip.
test('records reproducible workspace CPU costs and output fingerprints', async () => {
  const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
  const treeOf = (count: number, chars: number): ProjectTree =>
    Object.fromEntries(
      Array.from({ length: count }, (_, index) => [
        `src/file-${String(index).padStart(4, '0')}.ts`,
        {
          kind: 'file',
          content: `export const score${index} = ${index}\r\n// ação İ🙂\n`
            .repeat(
              Math.ceil(chars / `export const score${index} = ${index}\r\n// ação İ🙂\n`.length),
            )
            .slice(0, chars),
        },
      ]),
    )
  const fixtures = [
    { id: 'typical-v1', tree: treeOf(30, 4_000) },
    { id: 'remote-v1', tree: treeOf(80, 18_000) },
    { id: 'local-v1', tree: treeOf(2_000, 3_900) },
  ]
  const results: Array<{
    id: string
    samplesMs: number[]
    p50: number
    p95: number
    max: number
    outputHash: string
  }> = []
  const measure = async (id: string, run: () => unknown | Promise<unknown>, repetitions = 30) => {
    for (let index = 0; index < (repetitions === 30 ? 3 : 0); index++) await run()
    const samples: number[] = []
    let output: unknown
    for (let index = 0; index < repetitions; index++) {
      const start = performance.now()
      output = await run()
      samples.push(performance.now() - start)
    }
    const sorted = [...samples].sort((a, b) => a - b)
    const row = {
      id,
      samplesMs: samples,
      p50: sorted[Math.ceil(repetitions * 0.5) - 1]!,
      p95: sorted[Math.ceil(repetitions * 0.95) - 1]!,
      max: sorted.at(-1)!,
      outputHash: hash(output),
    }
    results.push(row)
    console.log(JSON.stringify({ id, p50: row.p50, p95: row.p95, samples: repetitions }))
  }
  for (const { id, tree } of fixtures) {
    await measure(`${id}:search-missing`, () => searchProFiles(tree, 'missingXYZ', 'content'))
    await measure(`${id}:search-matches`, () => searchProFiles(tree, 'score', 'content'))
    await measure(`${id}:search-files`, () => searchProFiles(tree, 'file-002', 'files'))
  }
  const content = '// diagnóstico repetido\n'.repeat(80_000)
  const diagnostics = Array.from({ length: 100 }, (_, index) => ({
    path: 'large.ts',
    line: index + 1,
    code: 2322,
    message: `Issue ${index}`,
    sourceHash: studioTutorSourceHash(content),
    severity: 'error' as const,
  }))
  await measure(
    'large-file:100-diagnostics',
    () => currentProDiagnostics(diagnostics, { 'large.ts': { kind: 'file', content } }),
    3,
  )
  const files = Object.fromEntries(
    Object.entries(fixtures[1]!.tree).flatMap(([path, node]) =>
      node.kind === 'file' ? [[path, node.content]] : [],
    ),
  )
  await measure('remote-v1:zip', async () => {
    const zipped = await zipFiles(files)
    return Object.entries(unzipSync(zipped)).map(([path, bytes]) => [
      path,
      createHash('sha256').update(bytes).digest('hex'),
    ])
  })
  const evidence = {
    kind: 'cpu-microbenchmark-not-browser-latency',
    fixtureVersion: 1,
    environment: {
      cpu: cpus()[0]?.model,
      memoryBytes: totalmem(),
      platform: platform(),
      release: release(),
      bun: Bun.version,
    },
    fixtures: fixtures.map(({ id, tree }) => ({
      id,
      files: Object.keys(tree).length,
      chars: Object.values(tree).reduce(
        (sum, node) => sum + (node.kind === 'file' ? node.content.length : 0),
        0,
      ),
    })),
    results,
  }
  await Bun.write(
    process.env.STUDIO_BENCH_OUTPUT ?? '../../.audits/studio-pro-evolution/cpu-current.json',
    `${JSON.stringify(evidence, null, 2)}\n`,
  )
}, 180_000)
