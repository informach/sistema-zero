import { expect, test } from 'bun:test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
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
    const build = await Bun.build({
      entrypoints: [resolve('scripts/qualify-python-delivery.ts')],
      target: 'node',
      format: 'esm',
    })
    expect(build.success).toBe(true)
    expect(build.outputs).toHaveLength(1)
    await Bun.write(entry, build.outputs[0]!)
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
    retired = false
    const result = await runOwnedNodeProcess({
      command: [
        node,
        resolve('tests/fixtures/python-delivery-qualification.mjs'),
        entry,
        seed,
        report,
      ],
      timeoutMs: 30000,
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
