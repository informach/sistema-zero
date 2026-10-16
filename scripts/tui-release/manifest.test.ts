import { expect, test } from 'bun:test'
import { mkdtemp, open, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { manifest, verify } from './manifest'

test('release manifest rejects altered content, path escapes and oversized input', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-manifest-'))
  for (const name of [
    'cli.js',
    'main.js',
    'worker.js',
    'schema-worker.js',
    'typescript-worker.js',
    'browser-worker.mjs',
    'windows-job.ps1',
    'windows-job.exe',
    'windows-security.ps1',
    'package.json',
    'bun.lock',
    'smoke.js',
    'launcher.js',
  ])
    await writeFile(join(directory, name), 'fixture')
  const value = await manifest(directory),
    path = join(directory, 'manifest.json')
  await writeFile(path, JSON.stringify(value))
  expect((await verify(directory)).value.files['cli.js']?.bytes).toBe(7)
  await writeFile(join(directory, 'cli.js'), 'changed')
  await expect(verify(directory)).rejects.toThrow('integrity')
  await writeFile(
    path,
    JSON.stringify({ ...value, files: { ...value.files, '../escape': value.files['cli.js'] } }),
  )
  await expect(verify(directory)).rejects.toThrow()
  const oversized = await open(path, 'w')
  await oversized.truncate(1_000_001)
  await oversized.close()
  await expect(verify(directory)).rejects.toThrow('exceeds limit')
})
