import { expect, test } from 'bun:test'
import path from 'node:path'

for (const scenario of ['stdin', 'stdin-completed', 'click-race', 'key-race', 'infra-click'])
  test(`isolated Node driver regression: ${scenario}`, async () => {
    const child = Bun.spawn(
      [process.execPath, 'test', './tests/fixtures/python-playtest-driver.cases.mjs'],
      {
        cwd: path.resolve(import.meta.dirname, '..'),
        windowsHide: true,
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
          ...process.env,
          STUDIO_PYTHON_DRIVER_SCENARIO: scenario,
          NO_COLOR: '1',
          FORCE_COLOR: '0',
        },
      },
    )
    const deadline = setTimeout(() => child.kill(), 10_000)
    try {
      const [exitCode, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ])
      const output = Bun.stripANSI(`${stdout}\n${stderr}`)
      if (exitCode !== 0) throw new Error(`Driver child failed: ${output}`)
      expect(output).toMatch(/\b1 pass\b/)
      expect(output).toMatch(/\b0 fail\b/)
    } finally {
      clearTimeout(deadline)
      if (child.exitCode === null) child.kill()
    }
  }, 12_000)
