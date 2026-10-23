import { expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'

test('a sala de curso ao vivo monta a aula pelo slot (criança, turma antiga e professora)', async () => {
  // Bun shares the module cache across files. Run this real-component test in a
  // separate process so the media double does not leak into other suites.
  const process = Bun.spawn(
    [Bun.which('bun')!, 'test', './tests/fixtures/live-classroom-slot.tsx'],
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
}, 30_000)
