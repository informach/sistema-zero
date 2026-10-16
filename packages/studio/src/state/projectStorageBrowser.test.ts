import { expect, test } from 'bun:test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

test('actual pagehide: large pending CAS + latest draft survive reload; two tabs conflict', async () => {
  const browser = process.env.STUDIO_STORAGE_BROWSER ?? 'all'
  if (!['all', 'chromium', 'webkit'].includes(browser)) throw new Error('Unknown storage browser')
  // Bun.build shares the test process's resolver cache (including module mocks).
  // Compile in a clean process so the browser exercises actual production modules.
  const temporaryRoot = resolve(tmpdir())
  const directory = await mkdtemp(join(temporaryRoot, 'studio-storage-browser-'))
  if (!resolve(directory).startsWith(temporaryRoot + sep)) throw new Error('Unsafe fixture path')
  let javascript: string
  try {
    const output = join(directory, 'fixture.js')
    const build = Bun.spawn(
      [
        process.execPath,
        'build',
        fileURLToPath(new URL('./fixtures/projectStorageBrowser.ts', import.meta.url)),
        '--target=browser',
        '--format=esm',
        '--minify',
        `--outfile=${output}`,
      ],
      { stdout: 'pipe', stderr: 'pipe' },
    )
    const [code, stdout, stderr] = await Promise.all([
      build.exited,
      Bun.readableStreamToText(build.stdout),
      Bun.readableStreamToText(build.stderr),
    ])
    if (code !== 0) throw new Error(`${stdout}\n${stderr}`)
    javascript = await readFile(output, 'utf8')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
  const server = createServer((request, response) => {
    response.writeHead(200, {
      'Content-Type': request.url?.startsWith('/fixture.js') ? 'text/javascript' : 'text/html',
    })
    response.end(
      request.url?.startsWith('/fixture.js')
        ? javascript
        : '<!doctype html><script type="module" src="/fixture.js"></script>',
    )
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Fixture did not listen')
  const child = Bun.spawn(
    [
      'node',
      fileURLToPath(new URL('../../scripts/verify-project-storage-browser.mjs', import.meta.url)),
      `http://127.0.0.1:${address.port}`,
      browser,
    ],
    { stdout: 'pipe', stderr: 'pipe' },
  )
  const timeout = setTimeout(() => child.kill(), 55_000)
  try {
    const [code, output, error] = await Promise.all([
      child.exited,
      Bun.readableStreamToText(child.stdout),
      Bun.readableStreamToText(child.stderr),
    ])
    if (code !== 0) throw new Error(`${output}\n${error}`)
    for (const name of browser === 'all' ? ['chromium', 'webkit'] : [browser])
      expect(output).toContain(`pass ${name}`)
  } finally {
    clearTimeout(timeout)
    server.close()
  }
}, 60_000)
