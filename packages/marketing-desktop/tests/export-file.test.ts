import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { exportVerifiedFile } from '../src/main/media/export-file'

test('exportação substitui destino somente após conferir bytes; corrupção/cancelamento preservam original', async () => {
  const root = path.resolve(tmpdir()),
    directory = await mkdtemp(path.join(root, 'marketing-export-'))
  if (!directory.startsWith(`${root}${path.sep}marketing-export-`))
    throw new Error('Diretório de teste inválido')
  try {
    const source = path.join(directory, 'source.bin'),
      destination = path.join(directory, 'destino.bin'),
      bytes = Buffer.from('edição aprovada')
    await writeFile(source, bytes)
    await writeFile(destination, 'anterior')
    const identity = {
      size: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    }
    await expect(
      exportVerifiedFile(
        source,
        destination,
        { ...identity, sha256: 'f'.repeat(64) },
        new AbortController().signal,
      ),
    ).rejects.toThrow('diverge')
    expect(await readFile(destination, 'utf8')).toBe('anterior')
    expect((await readdir(directory)).filter((file) => file.endsWith('.partial'))).toEqual([])
    const canceled = new AbortController()
    canceled.abort(new Error('cancelado'))
    await expect(
      exportVerifiedFile(source, destination, identity, canceled.signal),
    ).rejects.toThrow('cancelado')
    expect(await readFile(destination, 'utf8')).toBe('anterior')
    await exportVerifiedFile(source, destination, identity, new AbortController().signal)
    expect(await readFile(destination)).toEqual(bytes)
    expect(await readFile(source)).toEqual(bytes)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
