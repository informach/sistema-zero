import { afterAll, beforeAll, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import {
  copyFile,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rmdir,
  unlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { preparePythonStandardLibrary } from './prepare-stdlib'
import manifest from './stdlib-manifest.json'

const integrationVendor = process.env.STUDIO_PYTHON_BUILD_TEST_VENDOR_DIRECTORY
const integration = integrationVendor ? test : test.skip
const caches: string[] = []
let root: string
let built: Awaited<ReturnType<typeof preparePythonStandardLibrary>>

beforeAll(async () => {
  root = await mkdtemp(resolve(tmpdir(), 'sz-python-stdlib-test-'))
})
afterAll(async () => {
  for (const directory of caches) {
    // Only flat test-owned cache files. A leaked compiler directory fails cleanup.
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (!entry.isFile()) throw new Error(`Leaked compiler resource: ${entry.name}`)
      await unlink(resolve(directory, entry.name))
    }
    await rmdir(directory)
  }
  await rmdir(root)
})

async function cache(name: string) {
  const directory = resolve(root, name)
  await mkdir(directory)
  caches.push(directory)
  return directory
}
async function failure(promise: Promise<unknown>) {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('The operation unexpectedly succeeded')
}

test('the reviewed recipe pin is independent of checkout line endings', async () => {
  const source = await readFile(resolve(import.meta.dirname, 'precompile-stdlib.py'), 'utf8')
  const digest = createHash('sha256').update(source.replace(/\r\n/g, '\n')).digest('hex')
  expect(digest).toBe(manifest.recipeSha256)
})

test('a same-size corrupt cache is never accepted or silently replaced by upstream', async () => {
  const cacheDirectory = await cache('invalid')
  const destination = resolve(cacheDirectory, `${manifest.sha256}.zip`)
  await writeFile(destination, new Uint8Array(manifest.bytes))
  const error = await failure(
    preparePythonStandardLibrary({
      cacheDirectory,
      vendorDirectory: root,
      nodeExecutable: resolve(root, 'no-node-executable'),
    }),
  )
  expect(error).toBeInstanceOf(Error)
  expect(await readdir(cacheDirectory)).toEqual([`${manifest.sha256}.zip`])
  expect(
    createHash('sha256')
      .update(await readFile(destination))
      .digest('hex'),
  ).not.toBe(manifest.sha256)
})

test('an already cancelled owner creates no cache or compiler resources', async () => {
  const signal = AbortSignal.abort(new Error('owner retired'))
  const directory = resolve(root, 'not-created')
  expect(
    await failure(
      preparePythonStandardLibrary({
        cacheDirectory: directory,
        vendorDirectory: root,
        signal,
      }),
    ),
  ).toBe(signal.reason)
  expect((await readdir(root)).includes('not-created')).toBe(false)
})

test('a deadline cannot be disabled with a nonfinite or oversized value', async () => {
  for (const timeoutMs of [0, -1, NaN, Infinity, 60001]) {
    expect(
      await failure(
        preparePythonStandardLibrary({
          cacheDirectory: root,
          vendorDirectory: root,
          timeoutMs,
        }),
      ),
    ).toBeInstanceOf(Error)
  }
})

integration(
  'actual pinned WASM compilation produces the reviewed portable archive',
  async () => {
    const cacheDirectory = await cache('actual')
    built = await preparePythonStandardLibrary({
      cacheDirectory,
      vendorDirectory: integrationVendor!,
    })
    const bytes = await readFile(built.path)
    expect(bytes.length).toBe(manifest.bytes)
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(manifest.sha256)
    expect(built.recipe).toBe(manifest.recipe)
    expect(await readdir(cacheDirectory)).toEqual([`${manifest.sha256}.zip`])
  },
  70000,
)

integration('a fully verified cache needs neither a compiler nor vendor access', async () => {
  const cacheDirectory = await cache('hit')
  await copyFile(built.path, resolve(cacheDirectory, `${manifest.sha256}.zip`))
  const result = await preparePythonStandardLibrary({
    cacheDirectory,
    vendorDirectory: resolve(root, 'no-vendor'),
    nodeExecutable: resolve(root, 'no-node-executable'),
  })
  expect(result.sha256).toBe(manifest.sha256)
  expect(await readdir(cacheDirectory)).toEqual([`${manifest.sha256}.zip`])
})

integration(
  'a running compiler deadline retires its process before removing its temporary directory',
  async () => {
    const cacheDirectory = await cache('timeout')
    const error = await failure(
      preparePythonStandardLibrary({
        cacheDirectory,
        vendorDirectory: integrationVendor!,
        timeoutMs: 300,
      }),
    )
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).name).toBe('TimeoutError')
    expect(await readdir(cacheDirectory)).toEqual([])
  },
  10000,
)

integration(
  'two concurrent compiler owners can publish the identical archive atomically',
  async () => {
    const cacheDirectory = await cache('concurrent')
    const results = await Promise.all([
      preparePythonStandardLibrary({ cacheDirectory, vendorDirectory: integrationVendor! }),
      preparePythonStandardLibrary({ cacheDirectory, vendorDirectory: integrationVendor! }),
    ])
    expect(results[0]).toEqual(results[1])
    expect(
      createHash('sha256')
        .update(await readFile(results[0]!.path))
        .digest('hex'),
    ).toBe(manifest.sha256)
    expect(await readdir(cacheDirectory)).toEqual([`${manifest.sha256}.zip`])
  },
  70000,
)

integration(
  'cancelling one concurrent owner does not cancel the other compiler',
  async () => {
    const cacheDirectory = await cache('cancel-one')
    const owner = new AbortController()
    const reason = new Error('first build cancelled')
    const first = failure(
      preparePythonStandardLibrary({
        cacheDirectory,
        vendorDirectory: integrationVendor!,
        signal: owner.signal,
      }),
    )
    const second = preparePythonStandardLibrary({
      cacheDirectory,
      vendorDirectory: integrationVendor!,
    })
    const timer = setTimeout(() => owner.abort(reason), 300)
    try {
      expect(await first).toBe(reason)
      expect((await second).sha256).toBe(manifest.sha256)
      expect(await readdir(cacheDirectory)).toEqual([`${manifest.sha256}.zip`])
    } finally {
      clearTimeout(timer)
      await Promise.allSettled([first, second])
    }
  },
  70000,
)

integration.each(['hit', 'published', 'cleanup'] as const)(
  'caller withdrawal after %s cache verification is fenced before returning',
  async (mode) => {
    const cacheDirectory = await cache(`boundary-${mode}`)
    if (mode === 'hit')
      await copyFile(built.path, resolve(cacheDirectory, `${manifest.sha256}.zip`))
    const child = Bun.spawn(
      [process.execPath, 'test', resolve(import.meta.dirname, 'fixtures/cache-cancel.cases.ts')],
      {
        // Build tools use native globals, independently of Studio's HappyDOM preload.
        cwd: resolve(import.meta.dirname, '../../../..'),
        windowsHide: true,
        stdout: 'pipe',
        stderr: 'pipe',
        env: { ...process.env, STDLIB_CANCEL_MODE: mode, STDLIB_CANCEL_CACHE: cacheDirectory },
      },
    )
    const timer = setTimeout(() => child.kill('SIGKILL'), 75000)
    async function drain(stream: ReadableStream<Uint8Array>) {
      const reader = stream.getReader()
      const decoder = new TextDecoder()
      let tail = ''
      try {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) return tail + decoder.decode()
          tail = (tail + decoder.decode(value, { stream: true })).slice(-16000)
        }
      } finally {
        reader.releaseLock()
      }
    }
    try {
      const [code, stdout, stderr] = await Promise.all([
        child.exited,
        drain(child.stdout),
        drain(child.stderr),
      ])
      expect(code, `${stdout}\n${stderr}`).toBe(0)
      expect(`${stdout}\n${stderr}`).toMatch(/\b0 fail\b/)
    } finally {
      clearTimeout(timer)
      if (child.exitCode === null) {
        child.kill('SIGKILL')
        await child.exited
      }
    }
  },
  80000,
)
