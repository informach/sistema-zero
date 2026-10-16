import { Database } from 'bun:sqlite'
import { expect, test } from 'bun:test'
import { mkdtemp, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Store } from '../src/store/client'

test('schema upgrade backs up the previous database before adding memory index', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-migrate-'))
  const file = join(directory, 'state.sqlite')
  let store = new Store(file)
  await store.call({
    op: 'document.put',
    namespace: 'fixture',
    id: 'retained',
    value: { marker: true },
  })
  await store.close()
  const old = new Database(file)
  old.run('DROP TABLE memory_search; PRAGMA user_version=1')
  old.close()
  store = new Store(file)
  try {
    expect(await store.call({ op: 'document.get', namespace: 'fixture', id: 'retained' })).toEqual({
      marker: true,
    })
    const backup = (await readdir(directory)).find((name) => name.endsWith('.backup'))
    expect(backup).toBeDefined()
    if (!backup) throw new Error('Backup not found')
    const preserved = new Database(join(directory, backup), { readonly: true })
    try {
      expect(preserved.query('PRAGMA user_version').get()).toEqual({ user_version: 1 })
    } finally {
      preserved.close()
    }
    expect(
      await store.call({ op: 'memory.search', workspace: directory, query: '', offset: 0 }),
    ).toEqual([])
  } finally {
    await store.close()
  }
})
