import { expect, test } from 'bun:test'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { runOwnedNodeProcess } from './fixtures/owned-node-process'
import { pythonDistributionFixture } from './python-distribution-fixture'

test('native Node delivery checks raw gzip, rejection and connection cleanup', async () => {
  const node = process.env.STUDIO_PYTHON_BUILD_NODE ?? Bun.which('node')
  if (!node) throw new Error('Node is required for the HTTP wire proof')
  const directory = await mkdtemp(join(tmpdir(), 'sz-delivery-qualification-'))
  const entry = join(directory, 'qualifier.mjs'),
    seed = join(directory, 'seed.json'),
    report = join(directory, 'report.json')
  let retired = true
  try {
    const fixture = await pythonDistributionFixture({ compressed: true })
    const deadline = performance.now() + 30000
    function remainingTime() {
      const remaining = Math.ceil(deadline - performance.now())
      if (remaining < 1) throw new Error('Delivery qualification deadline expired')
      return remaining
    }
    // Compile real modules in a fresh VM, independent of test-module mocks and caches.
    const buildTimeout = remainingTime()
    retired = false
    const build = await runOwnedNodeProcess({
      command: [
        process.execPath,
        '--no-env-file',
        'build',
        resolve('scripts/qualify-python-delivery.ts'),
        '--target',
        'node',
        '--format',
        'esm',
        '--outfile',
        entry,
      ],
      timeoutMs: buildTimeout,
    })
    retired = build.retired
    expect(build.failure, build.stderr).toBeUndefined()
    expect(build.exit, `${build.stdout}\n${build.stderr}`).toBe(0)
    expect(await readdir(directory)).toEqual(['qualifier.mjs'])
    await Bun.write(
      seed,
      JSON.stringify({
        deployment: fixture.deployment,
        files: Object.fromEntries(
          [...fixture.contents].map(([path, bytes]) => [
            path,
            Buffer.from(bytes).toString('base64'),
          ]),
        ),
      }),
    )
    const runTimeout = remainingTime()
    retired = false
    const result = await runOwnedNodeProcess({
      command: [
        node,
        resolve('tests/fixtures/python-delivery-qualification.mjs'),
        entry,
        seed,
        report,
      ],
      timeoutMs: runTimeout,
    })
    retired = result.retired
    expect(result.failure, result.stderr).toBeUndefined()
    expect(result.exit, `${result.stdout}\n${result.stderr}`).toBe(0)
    const proof = JSON.parse(await readFile(report, 'utf8'))
    expect(proof.failures).toEqual([])
    expect(proof.checks).toHaveLength(7)
    expect(proof.cleanupConfirmed).toBe(true)
  } finally {
    if (retired) await rm(directory, { recursive: true, force: true })
  }
}, 45000)
