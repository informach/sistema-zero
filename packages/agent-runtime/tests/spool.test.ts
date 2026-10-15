import { expect, test } from 'bun:test'
import { mkdir, mkdtemp, open, stat, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Spool } from '../src/process/spool'

test('aggregate spool quota includes retained logs and concurrent reservations', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-spool-'))
  const logs = join(directory, 'logs')
  await mkdir(logs)
  const retained = join(logs, `${crypto.randomUUID()}.log`)
  const file = await open(retained, 'wx')
  await file.truncate(1024 ** 3 - 100)
  await file.close()
  const expired = join(logs, `${crypto.randomUUID()}.log`)
  await writeFile(expired, 'expired')
  await utimes(expired, 1, 1)
  await writeFile(join(logs, 'operator.log'), 'unmanaged')
  const spool = new Spool(directory)
  const release = await spool.reserve(`${crypto.randomUUID()}.log`, 80)
  await expect(new Spool(directory).reserve(`${crypto.randomUUID()}.log`, 21)).rejects.toThrow(
    'quota',
  )
  expect((await spool.collect()).active).toBe(1)
  await release(10)
  await release(10)
  const next = await spool.reserve(`${crypto.randomUUID()}.log`, 90)
  await next(0)
  await expect(stat(expired)).rejects.toThrow()
  expect((await stat(join(logs, 'operator.log'))).size).toBe(9)
  // Remove only the owned sparse fixture contents; retain the directory for diagnostics.
  const cleanup = await open(retained, 'r+')
  await cleanup.truncate(0)
  await cleanup.close()
})
