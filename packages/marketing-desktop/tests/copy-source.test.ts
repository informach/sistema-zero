import { afterEach, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { copySource } from '../src/main/media/copy-source'

const owned: string[] = []
afterEach(async () => {
  for (const directory of owned.splice(0)) await rm(directory, { recursive: true, force: true })
})
test('bounded source copy rejects a changed inventoried file and cancels without orphan or quota leak', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'marketing-source-copy-'))
  owned.push(directory)
  const source = path.join(directory, 'original.txt'),
    destination = path.join(directory, 'copy.txt'),
    bytes = Buffer.alloc(2 * 1024 ** 2 + 37, 65)
  await writeFile(source, bytes)
  const expected = { sha256: createHash('sha256').update(bytes).digest('hex'), size: bytes.length }
  let reserved = 0
  const reserve = async (size: number) => {
    reserved += size
    return () => {
      reserved -= size
    }
  }
  await copySource(source, destination, reserve, { expected })
  expect(await readFile(destination)).toEqual(bytes)
  expect(reserved).toBe(0)
  await expect(copySource(source, destination, reserve, { expected })).rejects.toThrow()
  expect(await readFile(destination)).toEqual(bytes)
  expect(reserved).toBe(0)
  const rejected = path.join(directory, 'rejected.txt')
  await expect(
    copySource(source, rejected, reserve, { expected: { ...expected, sha256: 'a'.repeat(64) } }),
  ).rejects.toThrow('mudou')
  expect((await readdir(directory)).includes('rejected.txt')).toBe(false)
  expect(reserved).toBe(0)
  const controller = new AbortController()
  await expect(
    copySource(
      source,
      rejected,
      async (size) => {
        const release = await reserve(size)
        controller.abort()
        return release
      },
      { expected, signal: controller.signal },
    ),
  ).rejects.toThrow()
  expect((await readdir(directory)).includes('rejected.txt')).toBe(false)
  expect(reserved).toBe(0)
})
