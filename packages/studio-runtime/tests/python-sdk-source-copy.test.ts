import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readdir, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { copyPythonSdkProofSources } from './fixtures/prepare-python-sdk-linux'

test('SDK packaging preserves source/package/lock bytes without installed dependencies', async () => {
  const temporary = await mkdtemp(path.join(tmpdir(), 'sz-python-sdk-copy-'))
  const source = path.join(temporary, 'source')
  const directory = path.join(temporary, 'proof')
  const expected = [
    'packages/core/src/index.ts',
    'packages/core/package.json',
    'packages/studio-runtime/src/index.ts',
    'packages/studio-runtime/runtime/check-project.mjs',
    'packages/studio-runtime/runtime/package.json',
    'packages/studio-runtime/runtime/package-lock.json',
    'packages/studio-runtime/Dockerfile',
    'packages/studio-runtime/tests/fixtures/python-sdk-worker.ts',
    'packages/studio-runtime/tests/fixtures/python-sdk-workerd.cjs',
  ].sort()
  const excluded = [
    'node_modules/unrelated/index.js',
    'packages/core/src/node_modules/vendor/index.js',
    'packages/studio-runtime/runtime/node_modules/vendor/package.json',
    'packages/studio-runtime/runtime/node_modules/vendor/win32-x64.node',
    'packages/studio-runtime/tests/unrelated.test.ts',
  ]
  try {
    for (const file of [...expected, ...excluded]) {
      const target = path.join(source, file)
      await mkdir(path.dirname(target), { recursive: true })
      await writeFile(target, `source:${file}\n`)
    }
    await copyPythonSdkProofSources({
      root: source,
      directory,
      signal: new AbortController().signal,
    })
    const actual: string[] = []
    async function collect(relative = '') {
      for (const entry of await readdir(path.join(directory, relative), { withFileTypes: true })) {
        const file = relative ? `${relative}/${entry.name}` : entry.name
        if (entry.isDirectory()) await collect(file)
        else actual.push(file)
      }
    }
    await collect()
    expect(actual.sort()).toEqual(expected)
    const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
    for (const file of expected)
      expect(hash(await readFile(path.join(directory, file)))).toBe(
        hash(await readFile(path.join(source, file))),
      )
  } finally {
    const resolved = await realpath(temporary)
    expect(path.dirname(resolved).toLowerCase()).toBe((await realpath(tmpdir())).toLowerCase())
    expect(path.basename(resolved)).toStartWith('sz-python-sdk-copy-')
    await rm(resolved, { recursive: true })
  }
})
