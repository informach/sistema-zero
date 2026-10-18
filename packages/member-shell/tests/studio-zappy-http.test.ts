import { expect, test } from 'bun:test'
import { resolve } from 'node:path'

test('Python Zappy checks fresh rights, flushes before settlement, preserves late status and cancels the model over HTTP', async () => {
  const child = Bun.spawn(
    [process.execPath, resolve(import.meta.dirname, 'fixtures/zappy-python-http.ts')],
    {
      stdout: 'pipe',
      stderr: 'pipe',
      windowsHide: true,
    },
  )
  const deadline = setTimeout(() => child.kill(), 12_000)
  try {
    const [exit, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    expect({ exit, stderr: stderr.slice(-4000) }).toMatchObject({ exit: 0 })
    expect(JSON.parse(stdout)).toEqual({ verified: true })
  } finally {
    clearTimeout(deadline)
    if (child.exitCode === null) child.kill()
  }
}, 15_000)
