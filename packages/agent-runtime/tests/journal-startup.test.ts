import { expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

test('journal waits for a temporary startup lock before enabling WAL and preserves the database', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-journal-startup-'))
  const child = Bun.spawn(
    [
      process.execPath,
      fileURLToPath(new URL('./fixtures/journal-startup.fixture.ts', import.meta.url)),
      join(directory, 'state.sqlite'),
    ],
    { stdin: 'ignore', stdout: 'pipe', stderr: 'pipe' },
  )
  const timer = setTimeout(() => child.kill(), 10000)
  try {
    const [exit, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    if (exit !== 0) throw new Error(`Journal startup failed (${exit}): ${stderr}`)
    expect(JSON.parse(stdout)).toEqual({
      marker: { value: 'preserved' },
      integrity: { integrity_check: 'ok' },
      mode: { journal_mode: 'wal' },
    })
  } finally {
    clearTimeout(timer)
    if (child.exitCode === null) {
      child.kill()
      await child.exited
    }
    expect(dirname(resolve(directory))).toBe(resolve(tmpdir()))
    expect(basename(directory)).toStartWith('zero-journal-startup-')
    await rm(directory, { recursive: true })
  }
}, 15000)
