import { expect, test } from 'bun:test'
import { collectStoredPythonInputGarbage } from '../src/python-input-maintenance'
import { pythonInputFixture } from './python-input-fixture'

test('stored input GC resumes its verified checkpoint and persists only confirmed page progress', async () => {
  const f = await pythonInputFixture()
  const seen: (string | undefined)[] = []
  let page = 0
  const bucket = {
    ...f.bucket,
    async list(options: { prefix: string; limit: number; cursor?: string }) {
      expect(options.prefix).toBe('python-input-states/')
      expect(options.limit).toBe(100)
      seen.push(options.cursor)
      page++
      return page === 1
        ? { objects: [], truncated: true, cursor: 'next-page' }
        : { objects: [], truncated: false }
    },
  }
  await collectStoredPythonInputGarbage(bucket)
  await collectStoredPythonInputGarbage(bucket)
  expect(seen).toEqual([undefined, 'next-page'])
  expect(
    new TextDecoder().decode(f.objects.get('maintenance/python-input-cursor.json')!.bytes),
  ).toBe('{}')
})

test('a corrupted persistent GC checkpoint is rejected before listing or deletion', async () => {
  const f = await pythonInputFixture()
  f.objects.set('maintenance/python-input-cursor.json', {
    bytes: new TextEncoder().encode('{"cursor":"next"}'),
    hash: new ArrayBuffer(32),
  })
  let listed = 0
  await expect(
    collectStoredPythonInputGarbage({
      ...f.bucket,
      async list() {
        listed++
        return { objects: [], truncated: false }
      },
    }),
  ).rejects.toThrow('hash')
  expect(listed).toBe(0)
})
