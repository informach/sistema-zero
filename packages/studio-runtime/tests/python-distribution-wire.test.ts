import { expect, test } from 'bun:test'
import { mkdtemp, readFile, rmdir, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { createStudioRuntimeRelease } from '@sistemazero/core/studio/runtime-catalog'
import { sha256 } from '../src/artifacts'
import { runOwnedNodeProcess } from './fixtures/owned-node-process'
import { pythonDistributionFixture } from './python-distribution-fixture'

test('native workerd/R2 serve exactly one layer of gzip with correct HTTP semantics', async () => {
  const fixture = await pythonDistributionFixture()
  const contents = new Map(fixture.contents)
  contents.set('frame.mjs', new TextEncoder().encode('export const value = 42;\n'.repeat(100)))
  const encoded = new Uint8Array(gzipSync(contents.get('frame.mjs')!, { level: 9 }))
  const artifactPath = `_http/gzip/${await sha256(encoded)}.gz`
  contents.set(artifactPath, encoded)
  const distribution = {
    ...fixture.deployment.distribution,
    files: await Promise.all(
      [...contents].map(async ([path, bytes]) => ({
        path,
        bytes: bytes.byteLength,
        sha256: await sha256(bytes),
      })),
    ),
    httpRepresentations: [{ path: 'frame.mjs', encoding: 'gzip' as const, artifactPath }],
  }
  const release = await createStudioRuntimeRelease({
    ...fixture.deployment.release.manifest,
    artifacts: distribution.files.map(({ path, sha256 }) => ({ path, sha256 })),
  })
  const node = process.env.STUDIO_PYTHON_BUILD_NODE ?? Bun.which('node')
  if (!node) throw new Error('Node is required for the native workerd wire proof')
  const directory = await mkdtemp(join(tmpdir(), 'sz-python-wire-'))
  const worker = join(directory, 'worker.mjs')
  const seed = join(directory, 'seed.json')
  const report = join(directory, 'report.json')
  let retired = true
  const errors: unknown[] = []
  try {
    const build = await Bun.build({
      entrypoints: [resolve(import.meta.dirname, 'fixtures/python-distribution-wire-worker.ts')],
      target: 'browser',
      format: 'esm',
    })
    if (!build.success || build.outputs.length !== 1)
      throw new AggregateError(build.logs, 'Wire fixture compilation failed')
    await writeFile(worker, new Uint8Array(await build.outputs[0]!.arrayBuffer()))
    await writeFile(
      seed,
      JSON.stringify({
        deployment: { release, distribution },
        files: Object.fromEntries([...contents].map(([path, bytes]) => [path, [...bytes]])),
      }),
    )
    retired = false
    const resultProcess = await runOwnedNodeProcess({
      command: [
        node,
        resolve(import.meta.dirname, 'fixtures/python-distribution-wire.mjs'),
        worker,
        seed,
        report,
      ],
      timeoutMs: 45000,
    })
    retired = resultProcess.retired
    const { exit, stdout, stderr, failure } = resultProcess
    if (failure)
      throw new AggregateError(
        [failure],
        `Wire proof failed. stdout=${stdout}\nstderr=${stderr}\ninputs=${directory}`,
      )
    if (exit !== 0) console.error(JSON.stringify({ exit, stdout, stderr }))
    const result = JSON.parse(await readFile(report, 'utf8'))
    console.log(JSON.stringify({ exit, result, stderr }))
    expect(exit, `${stdout}\n${stderr}`).toBe(0)
    expect(result.failures).toEqual([])
    expect(result.cleanupConfirmed).toBe(true)
    expect(result.results.map((item: { name: string }) => item.name)).toEqual([
      'gzip',
      'identity',
      'head-gzip',
      'conditional-gzip',
      'unacceptable',
    ])
  } catch (error) {
    errors.push(error)
  } finally {
    // Keep evidence and inputs intact if the owned process tree could still use them.
    if (!retired)
      errors.push(new Error(`Wire proof retirement unconfirmed; inputs preserved at ${directory}`))
    else
      try {
        for (const path of [worker, seed, report]) {
          await unlink(path).catch((error: unknown) => {
            if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'))
              throw error
          })
        }
        await rmdir(directory)
      } catch (cleanupError) {
        errors.push(cleanupError)
      }
  }
  if (errors.length) throw new AggregateError(errors, 'Native wire proof failed')
}, 60000)
