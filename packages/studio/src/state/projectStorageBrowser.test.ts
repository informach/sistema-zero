import { expect, test } from 'bun:test'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

test('actual pagehide: large pending CAS + latest draft survive reload; two tabs conflict', async () => {
  const browser = process.env.STUDIO_STORAGE_BROWSER ?? 'all'
  // `all` continua Chromium + WebKit; Firefox é pedido à parte (a CI o instala só no job dele).
  if (!['all', 'chromium', 'webkit', 'firefox'].includes(browser))
    throw new Error('Unknown storage browser')
  let deepBlocks: string | undefined
  if (process.env.STUDIO_STORAGE_DEEP === '1') {
    const fixture = Bun.spawn(
      [process.execPath, 'scripts/profile-js-classic.ts', '--blocks-fixture'],
      { env: { ...process.env, SZ_PROFILE_BLOCKS: '10000' }, stdout: 'pipe', stderr: 'pipe' },
    )
    const [code, output, error] = await Promise.all([
      fixture.exited,
      Bun.readableStreamToText(fixture.stdout),
      Bun.readableStreamToText(fixture.stderr),
    ])
    if (code !== 0) throw new Error(`Deep fixture generation failed: ${error}`)
    deepBlocks = output
  }
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
        // Match Vite's browser definePlugin: no host environment or process shim.
        '--define=process.env={}',
        '--define=process.env.NODE_ENV="production"',
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
    if (request.url === '/deep-blocks.json') {
      response.writeHead(deepBlocks ? 200 : 404, { 'Content-Type': 'application/json' })
      response.end(deepBlocks ?? '{}')
      return
    }
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
    await mkdir('.cache/mission', { recursive: true })
    const mode = process.env.STUDIO_STORAGE_EXIT_FAULT === 'abort' ? 'aborted' : 'normal'
    await writeFile(`.cache/mission/storage-driver-${browser}-${mode}.txt`, `${output}\n${error}`)
    if (code !== 0) throw new Error(`${output}\n${error}`)
    for (const name of browser === 'all' ? ['chromium', 'webkit'] : [browser])
      expect(output).toContain(`pass ${name}`)
  } finally {
    clearTimeout(timeout)
    server.close()
  }
}, 60_000)
