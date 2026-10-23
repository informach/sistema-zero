import { expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'

test('live-replay-progress', async () => {
  // Bun shares the module cache across files. Run this real-component test in a
  // separate process so other tests' next/dynamic Studio doubles cannot replace it.
  const process = Bun.spawn(
    [Bun.which('bun')!, 'test', './tests/fixtures/live-replay-progress.tsx'],
    {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  )
  const [exitCode, stdout, stderr] = await Promise.all([
    process.exited,
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
  ])
  expect({ exitCode, output: exitCode === 0 ? '' : stdout + stderr }).toEqual({
    exitCode: 0,
    output: '',
  })
}, 15_000)
