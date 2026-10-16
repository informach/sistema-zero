import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { mkdtemp, rmdir, unlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { verifyUpdateFile } from '../src/main/verify-update-file'

test('a valid publisher cannot substitute another installer after download', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'marketing-update-review-'))
  const file = path.join(directory, 'update.exe')
  const original = Buffer.from('expected installer'),
    replacement = Buffer.from('replaced installer')
  const expected = {
    size: original.length,
    sha512: createHash('sha512').update(original).digest('base64'),
  }
  const signed = async () => null
  try {
    await writeFile(file, original)
    await verifyUpdateFile(file, expected, ['publisher'], signed)
    await writeFile(file, replacement)
    await expect(verifyUpdateFile(file, expected, ['publisher'], signed)).rejects.toThrow(
      'manifesto',
    )
    await writeFile(file, original.subarray(1))
    await expect(verifyUpdateFile(file, expected, ['publisher'], signed)).rejects.toThrow(
      'manifesto',
    )
    await writeFile(file, original)
    await expect(
      verifyUpdateFile(file, expected, ['publisher'], async () => 'wrong publisher'),
    ).rejects.toThrow('Assinatura')
    await expect(
      verifyUpdateFile(file, expected, ['publisher'], async () => {
        await writeFile(file, replacement)
        return null
      }),
    ).rejects.toThrow('manifesto')
  } finally {
    await unlink(file)
    await rmdir(directory)
  }
})
