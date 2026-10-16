import { expect, test } from 'bun:test'
import { mkdir, mkdtemp, realpath, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { workspacePath } from '../src/tools/paths'

test('workspace path rejects credential aliases and special Windows file names', async () => {
  const root = await mkdtemp(join(tmpdir(), 'zero-path-policy-'))
  await writeFile(join(root, '.ENV'), 'synthetic fixture')
  await mkdir(join(root, '.GiT'))
  await writeFile(join(root, '.GiT', 'config'), 'synthetic fixture')
  if (process.platform === 'win32') {
    for (const name of [
      '.ENV',
      '.env',
      '.GiT/config',
      '.SSH/key',
      'nested/.AWS/config',
      '.env.',
      '.env ',
      'safe.txt:stream',
      'NUL',
      'COM1.txt',
    ])
      await expect(workspacePath(root, name, true)).rejects.toThrow()
  }
  await expect(workspacePath(root, '../outside', true)).rejects.toThrow('escapes')
  expect(await workspacePath(root, 'nested/safe.txt', true)).toBe(
    join(await realpath(root), 'nested', 'safe.txt'),
  )
})
