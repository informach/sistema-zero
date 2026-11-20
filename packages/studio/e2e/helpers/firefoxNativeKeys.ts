import { execFile, spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { dirname, join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { expect, firefox } from '@playwright/test'

const exec = promisify(execFile)
const elementId = 'element-6066-11e4-a52e-4f735466cecf'
const version = '0.37.1'
const platforms = {
  linux: {
    archive: 'linux64.tar.gz',
    sha256: 'e815130ea95983e162ae91843b48d3a3ce991735635fce83a647afde21e09f7e',
    executable: 'geckodriver',
  },
  win32: {
    archive: 'win64.zip',
    sha256: 'dfed9315abe8d2fbc1b6161a2ee8002452e79cf05ee92fdc653a4e26bc35edd8',
    executable: 'geckodriver.exe',
  },
} as const

async function driverBinary(signal: AbortSignal): Promise<string> {
  const platform = platforms[process.platform as keyof typeof platforms]
  if (!platform || process.arch !== 'x64')
    throw new Error('Native Firefox QA requires x64 Linux/Windows')
  const cache = resolve('.cache', `geckodriver-${version}-${process.platform}`)
  const binary = join(cache, 'bin', platform.executable)
  const archive = join(cache, platform.archive)
  await mkdir(dirname(binary), { recursive: true })
  let bytes: Buffer
  try {
    bytes = await readFile(archive)
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error
    const response = await fetch(
      `https://github.com/mozilla/geckodriver/releases/download/v${version}/geckodriver-v${version}-${platform.archive}`,
      { signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]) },
    )
    if (!response.ok) throw new Error('Official geckodriver download failed')
    bytes = Buffer.from(await response.arrayBuffer())
    if (bytes.length > 10 * 1024 * 1024) throw new Error('geckodriver archive exceeds QA budget')
  }
  if (createHash('sha256').update(bytes).digest('hex') !== platform.sha256)
    throw new Error('geckodriver archive checksum differs from its pinned release')
  await writeFile(archive, bytes)
  // Re-extract the verified release: a cached executable is never trusted on its own.
  if (process.platform === 'win32') {
    await exec(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        `$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.IO.Compression.FileSystem;
        $taskArchive=[System.IO.Compression.ZipFile]::OpenRead($env:PINTA_QA_ARCHIVE);
        try {
          if ($taskArchive.Entries.Count -ne 1 -or $taskArchive.Entries[0].FullName -ne 'geckodriver.exe') { throw 'Unexpected driver archive'; }
          [System.IO.Compression.ZipFileExtensions]::ExtractToFile($taskArchive.Entries[0],(Join-Path $env:PINTA_QA_BIN 'geckodriver.exe'),$true);
        } finally { $taskArchive.Dispose(); }`,
      ],
      {
        windowsHide: true,
        timeout: 15_000,
        signal,
        env: { ...process.env, PINTA_QA_ARCHIVE: archive, PINTA_QA_BIN: dirname(binary) },
      },
    )
  } else {
    await exec('tar', ['-xzf', archive, '-C', dirname(binary)], { timeout: 15_000, signal })
  }
  if (!(await stat(binary)).isFile()) throw new Error('Verified driver was not extracted')
  return binary
}

async function unusedPort(): Promise<number> {
  const server = createServer()
  await new Promise<void>((done, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', done)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('QA loopback port unavailable')
  await new Promise<void>((done, reject) =>
    server.close((error) => (error ? reject(error) : done())),
  )
  return address.port
}

interface FocusState {
  top: { focused: boolean; active: string }
  middle: { focused: boolean; active: string }
  inner: { focused: boolean; active: string; ready?: string }
}

/**
 * Juggler's key dispatcher always uses its main-frame textInputProcessor (Playwright #43506
 * is a separate focus-emulation regression). It cannot target this remote focused document.
 * WebDriver selects that document WITHOUT focusing/clicking it, then sends native actions.
 * The editor, shell, sandbox and the three native focus states remain under test.
 */
export async function verifyFirefoxNativeKeys(baseURL: string) {
  const lifetime = AbortSignal.timeout(75_000)
  const url = new URL(baseURL)
  if (url.hostname !== '127.0.0.1' || url.protocol !== 'http:')
    throw new Error('Local QA origin required')
  const binary = await driverBinary(lifetime)
  const port = await unusedPort()
  const driver = spawn(binary, ['--host', '127.0.0.1', '--port', String(port), '--log', 'fatal'], {
    windowsHide: true,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'ignore', 'pipe'],
  })
  let startupDiagnostic = ''
  driver.stderr.on('data', (bytes: Buffer) => {
    startupDiagnostic = (startupDiagnostic + bytes.toString()).slice(-2000)
  })
  let launchError: Error | undefined
  driver.once('error', (error) => {
    launchError = error
  })
  const exited = new Promise<void>((done) => driver.once('close', () => done()))
  let sessionId: string | undefined
  const pause = (ms: number) => new Promise<void>((done) => setTimeout(done, ms))
  async function call<T>(
    path: string,
    method = 'GET',
    body?: unknown,
    cleanup = false,
  ): Promise<T> {
    if (launchError || driver.exitCode !== null) throw new Error('Native Firefox driver stopped')
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: cleanup
        ? AbortSignal.timeout(5_000)
        : AbortSignal.any([lifetime, AbortSignal.timeout(20_000)]),
    })
    const data = await response.json()
    if (!response.ok)
      throw new Error(`Native Firefox command failed: ${data.value?.error ?? response.status}`)
    return data.value as T
  }
  const wd = <T>(path: string, body: unknown) =>
    call<T>(`/session/${sessionId}${path}`, 'POST', body)
  const js = <T>(script: string, args: unknown[] = []) => wd<T>('/execute/sync', { script, args })
  async function until<T>(read: () => Promise<T>, description: string): Promise<NonNullable<T>> {
    const deadline = Date.now() + 20_000
    while (Date.now() < deadline) {
      lifetime.throwIfAborted()
      const result = await read()
      if (result) return result as NonNullable<T>
      await pause(100)
    }
    throw new Error(`Native Firefox did not reach: ${description}`)
  }
  const element = (selector: string, text?: string) =>
    js<Record<string, string> | null>(
      `return [...document.querySelectorAll(arguments[0])].find(e=>e.getClientRects().length&&
      (arguments[1]===null||((e.getAttribute('aria-label')||'')+' '+e.textContent).replace(/\\s+/g,' ').includes(arguments[1])))||null`,
      [selector, text ?? null],
    )
  async function click(selector: string, text?: string) {
    const reference = await until(() => element(selector, text), text ?? selector)
    await wd(`/element/${reference[elementId]}/click`, {})
  }
  async function game(): Promise<FocusState | null> {
    await wd('/frame', { id: null })
    const outer = await element('iframe[title="Pré-visualização"]')
    if (!outer) return null
    const top = await js<{ focused: boolean; active: string }>(
      'return {focused:document.hasFocus(),active:document.activeElement?.tagName}',
    )
    await wd('/frame', { id: outer })
    const middle = await js<FocusState['middle']>(
      'return {focused:document.hasFocus(),active:document.activeElement?.tagName}',
    )
    const inner = await element('iframe[title="Jogo"]')
    if (!inner) return null
    await wd('/frame', { id: inner })
    const state = await js<FocusState['inner']>(
      'return {focused:document.hasFocus(),active:document.activeElement?.tagName,ready:document.body?.dataset.voltou}',
    )
    // O frame pode navegar entre selecioná-lo e executar a leitura nativa.
    // Nesse instante o WebDriver devolve null; aguarde o documento novo no mesmo prazo.
    if (!state) return null
    return { top, middle, inner: state }
  }
  try {
    await until(async () => {
      try {
        return await call('/status')
      } catch {
        if (launchError || driver.exitCode !== null)
          throw new Error(
            `Native Firefox driver failed to start (${driver.exitCode ?? launchError?.name}): ${startupDiagnostic}`,
          )
        return false
      }
    }, 'driver ready')
    const session = await call<{ sessionId: string; capabilities: { browserVersion: string } }>(
      '/session',
      'POST',
      {
        capabilities: {
          alwaysMatch: {
            browserName: 'firefox',
            'moz:firefoxOptions': {
              binary: firefox.executablePath(),
              args: ['-headless'],
              prefs: { 'fission.webContentIsolationStrategy': 1 },
            },
          },
        },
      },
    )
    if (typeof session.sessionId !== 'string') throw new Error('Invalid native Firefox session')
    sessionId = session.sessionId
    await wd('/window/rect', { width: 1440, height: 1000 })
    await wd('/url', { url: new URL('/?casca=1', baseURL).href })
    await click('button', 'Novo projeto')
    await click('button', 'Criar e abrir')
    await click('[role="tab"]', 'Mensagens do jogo')
    await click('button', 'Ponte')
    await click('button', 'script.js')
    await click('.monaco-editor .view-line')
    await wd('/actions', {
      actions: [
        {
          type: 'key',
          id: 'edit',
          actions: [
            { type: 'keyDown', value: '\uE009' },
            { type: 'keyDown', value: 'a' },
            { type: 'keyUp', value: 'a' },
            { type: 'keyUp', value: '\uE009' },
            { type: 'keyDown', value: '\uE003' },
            { type: 'keyUp', value: '\uE003' },
          ],
        },
      ],
    })
    const input = await until(() => element('[aria-label="Editor content"]'), 'Monaco input')
    // One line prevents Monaco indentation from changing the fixture while typing natively.
    const code =
      'document.body.dataset.voltou="sim";document.body.style.background="rgb(0, 128, 0)";document.body.style.minHeight="100vh";document.addEventListener("keydown",e=>{console.log("tecla "+e.key);if(e.isTrusted)console.log("tecla nativa "+e.key)});'
    await wd(`/element/${input[elementId]}/value`, { text: code })
    await until(async () => (await game())?.inner.ready === 'sim', 'program running')
    await wd('/frame', { id: null })
    const rounds = []
    for (let iteration = 0; iteration < 3; iteration++) {
      await click('[data-live-target="studio-stop"]')
      await until(
        () =>
          js<boolean>(
            'return document.querySelector("[data-live-target=studio-run]")?.textContent.trim()==="Rodar"',
          ),
        'stopped',
      )
      await click('[data-live-target="studio-run"]')
      const focus = await until(async () => {
        const state = await game()
        return state?.inner.ready === 'sim' &&
          state.top.focused &&
          state.top.active === 'IFRAME' &&
          state.middle.focused &&
          state.middle.active === 'IFRAME' &&
          state.inner.focused
          ? state
          : null
      }, 'native focus in the new game')
      await wd('/frame', { id: null })
      const countMessages = (text: string) =>
        js<number>(
          `return [...document.querySelectorAll('section[aria-label="Problemas e saída do jogo"] *')].filter(n=>n.children.length===0&&n.textContent===arguments[0]).length`,
          [text],
        )
      const before = await countMessages('tecla ArrowUp')
      const trustedBefore = await countMessages('tecla nativa ArrowUp')
      const current = await game()
      expect(current?.top).toEqual({ focused: true, active: 'IFRAME' })
      expect(current?.middle).toEqual({ focused: true, active: 'IFRAME' })
      expect(current?.inner.focused).toBe(true)
      await wd('/actions', {
        actions: [
          {
            type: 'key',
            id: 'game',
            actions: [
              { type: 'keyDown', value: '\uE013' },
              { type: 'keyUp', value: '\uE013' },
            ],
          },
        ],
      })
      await wd('/frame', { id: null })
      await until(
        async () =>
          (await countMessages('tecla ArrowUp')) > before &&
          (await countMessages('tecla nativa ArrowUp')) > trustedBefore,
        'ArrowUp reported by the actual Studio console',
      )
      rounds.push({
        iteration,
        focus,
        nativeArrowReceived: true,
        trustedEvent: true,
        noPreviewClick: true,
      })
    }
    return {
      browserVersion: session.capabilities.browserVersion,
      protocol: 'W3C WebDriver',
      siteIsolation: 1,
      realStudioUi: true,
      rounds,
    }
  } finally {
    if (sessionId)
      await call(`/session/${sessionId}`, 'DELETE', undefined, true).catch(() => undefined)
    if (driver.pid && driver.exitCode === null) {
      if (process.platform === 'win32')
        await exec('taskkill', ['/PID', String(driver.pid), '/T', '/F'], {
          windowsHide: true,
          timeout: 5_000,
        }).catch(() => undefined)
      else {
        try {
          process.kill(-driver.pid, 'SIGKILL')
        } catch {}
      }
    }
    await exited
  }
}
