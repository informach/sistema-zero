import { expect, test } from 'bun:test'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Artifacts } from '../src/store/artifacts'
import { Store } from '../src/store/client'
import { hash } from '../src/tools/paths'
import { Patches } from '../src/workspace/patch'

test('patch validates the entire set, preserves literal replacements and refuses external changes on restore', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-patch-'))
  const store = new Store(join(directory, 'state.sqlite'))
  const patches = new Patches(store, directory)
  const signal = new AbortController().signal
  try {
    await writeFile(join(directory, 'a.txt'), 'hello world')
    await expect(
      patches.apply(
        directory,
        'run',
        {
          changes: [
            {
              operation: 'replace',
              path: 'a.txt',
              expectedHash: hash('hello world'),
              edits: [{ oldText: 'world', newText: '$&' }],
            },
            { operation: 'write', path: 'b.txt', expectedHash: 'missing', content: 'no' },
          ],
        },
        signal,
      ),
    ).rejects.toThrow('conflict')
    expect(await readFile(join(directory, 'a.txt'), 'utf8')).toBe('hello world')
    const result = await patches.apply(
      directory,
      'run',
      {
        changes: [
          {
            operation: 'replace',
            path: 'a.txt',
            expectedHash: hash('hello world'),
            edits: [{ oldText: 'world', newText: '$&' }],
          },
        ],
      },
      signal,
    )
    expect(await readFile(join(directory, 'a.txt'), 'utf8')).toBe('hello $&')
    await writeFile(join(directory, 'a.txt'), 'external')
    await expect(patches.restore(result.checkpointId, 'run', signal)).rejects.toThrow(
      'External changes',
    )
    await writeFile(join(directory, 'a.txt'), 'hello $&')
    await patches.restore(result.checkpointId, 'run', signal)
    expect(await readFile(join(directory, 'a.txt'), 'utf8')).toBe('hello world')
  } finally {
    await store.close()
  }
})

test('artifact integration restores binary data and creates nested parents without losing the checkpoint', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-binary-patch-'))
  const workspace = await mkdtemp(join(tmpdir(), 'zero-binary-source-'))
  const store = new Store(join(directory, 'state.sqlite'))
  const patches = new Patches(store, directory)
  const artifacts = new Artifacts(directory)
  const signal = new AbortController().signal
  const original = Buffer.from([0, 255, 128, 1])
  try {
    await writeFile(join(workspace, 'binary.bin'), original)
    const ref = await artifacts.put(Buffer.from([0, 240, 2]), 'application/octet-stream')
    const result = await patches.apply(
      workspace,
      'run',
      {
        changes: [
          {
            operation: 'artifact',
            path: 'binary.bin',
            expectedHash: hash(original),
            artifact: ref,
          },
          { operation: 'artifact', path: 'new/deep/file.bin', expectedHash: null, artifact: ref },
        ],
      },
      signal,
    )
    expect(await readFile(join(workspace, 'new/deep/file.bin'))).toEqual(Buffer.from([0, 240, 2]))
    await patches.restore(result.checkpointId, 'restore', signal, workspace)
    expect(await readFile(join(workspace, 'binary.bin'))).toEqual(original)
    expect(await Bun.file(join(workspace, 'new/deep/file.bin')).exists()).toBe(false)
  } finally {
    await store.close()
  }
})
