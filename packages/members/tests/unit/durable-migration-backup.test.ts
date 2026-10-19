import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rmdir, stat, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  prepareDurableMigrationDirectory,
  writeDurableMigrationJson,
} from '../../scripts/lib/durable-migration-backup'

test.skipIf(process.platform === 'linux')(
  'unsupported apply platforms fail before creating a backup directory',
  async () => {
    const directory = join(tmpdir(), `sz-pedagogy-refused-${crypto.randomUUID()}`)
    await expect(prepareDurableMigrationDirectory(directory)).rejects.toThrow('Linux')
    expect(
      await stat(directory).then(
        () => true,
        () => false,
      ),
    ).toBe(false)
  },
)

test.skipIf(process.platform !== 'linux')(
  'Linux backup synchronizes entries, verifies exact bytes and never overwrites prior evidence',
  async () => {
    const parent = await mkdtemp(join(tmpdir(), 'sz-pedagogy-backup-'))
    const directory = await prepareDurableMigrationDirectory(join(parent, 'backup'))
    const backup = await writeDurableMigrationJson(directory, 'lesson.json', {
      version: 1,
      source: 'criação preservada',
    })
    const bytes = await readFile(backup.path)
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(backup.sha256)
    expect(JSON.parse(bytes.toString('utf8'))).toEqual({ version: 1, source: 'criação preservada' })
    const prepared = await writeDurableMigrationJson(directory, 'lesson.prepared.json', {
      phase: 'prepared',
      backup,
    })
    await expect(
      writeDurableMigrationJson(directory, 'lesson.json', { source: 'overwrite' }),
    ).rejects.toThrow()
    await expect(writeDurableMigrationJson(directory, '../escape.json', {})).rejects.toThrow(
      'dentro',
    )
    expect(await readFile(backup.path)).toEqual(bytes)
    // Own fixed files only; no recursive cleanup of a computed directory.
    await unlink(prepared.path)
    await unlink(backup.path)
    await rmdir(directory)
    await rmdir(parent)
  },
)
