import { expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'

test('live workspace handoff and durable drafts through the real UI', async () => {
  // Bun shares the module cache across files. Run this real-component test in a
  // separate process so other tests' next/dynamic Studio doubles cannot replace it.
  const process = Bun.spawn(
    [Bun.which('bun')!, 'test', './tests/fixtures/live-workspace-review.tsx'],
    {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      stdout: 'inherit',
      stderr: 'inherit',
    },
  )
  const exitCode = await process.exited
  expect({ exitCode, output: '' }).toEqual({
    exitCode: 0,
    output: '',
  })
}, 15_000)
