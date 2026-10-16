import { expect, test } from 'bun:test'
import { join } from 'node:path'

test('help is usable without TTY or a supervisor', async () => {
  const child = Bun.spawn([process.execPath, join(import.meta.dir, '../src/cli.ts'), '--help'], {
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'ignore',
  })
  const output = await new Response(child.stdout).text()
  expect(await child.exited).toBe(0)
  expect(output).toContain('Sistema Zero')
  expect(output).toContain('doctor')
})
