import { expect, test } from 'bun:test'
import { resolve } from 'node:path'

test('Pensa JavaScript boundaries own an isolated module realm', async () => {
  const child = Bun.spawn(
    [process.execPath, '--no-env-file', 'test', './qa/pensa-studio-language.fixture.tsx'],
    {
      cwd: resolve(import.meta.dirname, '..'),
      stdout: 'pipe',
      stderr: 'pipe',
      windowsHide: true,
    },
  )
  const deadline = setTimeout(() => child.kill(), 15_000)
  try {
    const [exit, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    const output = Bun.stripANSI(stdout + stderr)
    expect(exit, output).toBe(0)
    expect(output).toMatch(/\b9 pass\b/)
    expect(output).toMatch(/\b0 fail\b/)
    console.info(
      `Isolated Pensa cases: 9 pass, 0 fail, ${output.match(/\b\d+ expect\(\) calls\b/)?.[0] ?? 'no expectation summary'}`,
    )
  } finally {
    clearTimeout(deadline)
    if (child.exitCode === null) child.kill()
    await child.exited
  }
}, 18_000)
