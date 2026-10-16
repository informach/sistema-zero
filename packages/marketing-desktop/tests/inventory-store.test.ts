import { afterEach, expect, test } from 'bun:test'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { InventoryStore } from '../src/main/imports/inventory-store'

const owned: string[] = []
afterEach(async () => {
  for (const directory of owned.splice(0)) await rm(directory, { recursive: true, force: true })
})
test('inventory survives process/store restart with opaque identity and isolated project directories', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'marketing-import-store-'))
  owned.push(directory)
  const source = path.join(directory, 'source'),
    local = path.join(directory, 'account-a/project-a/imports')
  await mkdir(path.join(source, 'meus-produtos'), { recursive: true })
  await writeFile(path.join(source, 'meus-produtos', 'direcao.md'), 'Referência anterior')
  const original = await new InventoryStore(local).prepare(
    source,
    'fluxo-criativo',
    new AbortController().signal,
    () => {},
  )
  const restarted = new InventoryStore(local)
  expect((await restarted.list()).items).toEqual([original])
  expect((await restarted.page(original.id)).entries).toHaveLength(1)
  expect(JSON.stringify(await restarted.page(original.id))).not.toContain(source)
  expect(
    (await new InventoryStore(path.join(directory, 'account-b/project-a/imports')).list()).items,
  ).toEqual([])
  const file = path.join(local, `${original.id}.json`)
  // Corrupt a digest without relying on source byte length or encoding.
  await writeFile(file, (await readFile(file, 'utf8')).replace(original.digest, 'a'.repeat(64)))
  await expect(restarted.page(original.id)).rejects.toThrow('divergente')
})
