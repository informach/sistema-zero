import { expect, test } from 'bun:test'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Prazo das operações de armazenamento de UM motor, a partir de o navegador abrir. */
const STORAGE_BUDGET_MS = 55_000
/** Folga para o navegador abrir (ou fechar), que não é o que se testa aqui. */
const LAUNCH_BUDGET_MS = 90_000
/** Teto do teste inteiro: dois motores, cada um com abrir + armazenamento. */
const TEST_BUDGET_MS = 2 * (LAUNCH_BUDGET_MS + STORAGE_BUDGET_MS)

test(
  'actual pagehide: large pending CAS + latest draft survive reload; two tabs conflict',
  async () => {
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
    // O prazo de 55 s é do ARMAZENAMENTO, por motor: conta a partir da fase `launched` que o driver
    // imprime. Abrir o navegador tem a sua folga (o Firefox do Windows levou 44 s só para abrir na
    // CI de 19/11/2026, e o prazo único matava o driver no meio das recargas, com tudo certo).
    let timeout = setTimeout(() => child.kill(), LAUNCH_BUDGET_MS)
    const restart = (ms: number) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => child.kill(), ms)
    }
    const readOutput = async () => {
      const decoder = new TextDecoder()
      let text = ''
      let launchedSeen = 0
      const reader = child.stdout.getReader()
      for (;;) {
        const { done, value: chunk } = await reader.read()
        if (done) break
        text += decoder.decode(chunk, { stream: true })
        const launched = text.split('"phase":"launched"').length - 1
        if (launched > launchedSeen) {
          launchedSeen = launched
          restart(STORAGE_BUDGET_MS)
        }
        // Fechar o navegador também não é armazenamento: o próximo motor ganha a folga de abrir.
        if (/closing browser \w+\n/.test(text.slice(-200))) restart(LAUNCH_BUDGET_MS)
      }
      return text + decoder.decode()
    }
    try {
      const [code, output, error] = await Promise.all([
        child.exited,
        readOutput(),
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
  },
  TEST_BUDGET_MS,
)
