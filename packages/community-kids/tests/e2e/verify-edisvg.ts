import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { basename, resolve } from 'node:path'
import { chromium, expect, type Page } from '@playwright/test'
import { readStylesheet } from '../../../ui/scripts/read-stylesheet.mjs'

/** Local Chromium measurement. This does not emulate a slower phone CPU. */
async function measureAnimation(page: Page) {
  const session = await page.context().newCDPSession(page)
  await session.send('Performance.enable')
  const read = async () =>
    new Map(
      (await session.send('Performance.getMetrics')).metrics.map((value) => [
        value.name,
        value.value,
      ]),
    )
  const before = await read()
  const start = performance.now()
  const frames = await page.evaluate(
    () =>
      new Promise<number[]>((resolve) => {
        const samples: number[] = []
        let previous = 0
        const end = performance.now() + 2000
        function next(time: number) {
          if (previous) samples.push(time - previous)
          previous = time
          if (time >= end) resolve(samples)
          else requestAnimationFrame(next)
        }
        requestAnimationFrame(next)
      }),
  )
  const after = await read()
  const elapsed = (performance.now() - start) / 1000
  await session.detach()
  const sorted = [...frames].sort((a, b) => a - b)
  const percentile = (p: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? null
  return {
    elapsedSeconds: elapsed,
    samples: frames.length,
    frameMsP50: percentile(0.5),
    frameMsP95: percentile(0.95),
    frameMsMax: sorted.at(-1) ?? null,
    taskSeconds: (after.get('TaskDuration') ?? 0) - (before.get('TaskDuration') ?? 0),
    jsHeapBytes: after.get('JSHeapUsedSize') ?? null,
    domNodes: after.get('Nodes') ?? null,
  }
}

declare global {
  interface Window {
    __ediQaFrames: number
  }
}

const [outputArgument, caseFilter] = process.argv.slice(2)
if (!outputArgument) throw new Error('Informe uma pasta nova para os recibos.')
const output = resolve(outputArgument)
await mkdir(output, { recursive: false })
const result: { path: string; bytes: number }[] = JSON.parse(
  execFileSync(
    'bun',
    [resolve(import.meta.dirname, 'bundle-edisvg.ts'), resolve(output, 'build')],
    { encoding: 'utf8', windowsHide: true },
  ),
)
const modules = new Map<string, Uint8Array>(
  await Promise.all(
    result.map(async (file) => [`/${basename(file.path)}`, await readFile(file.path)] as const),
  ),
)
const assetsFolder = resolve(import.meta.dirname, '../../../edisvg/assets')
const manifest = JSON.parse(await readFile(resolve(assetsFolder, 'manifest.json'), 'utf8'))
const css = readStylesheet(resolve(import.meta.dirname, '../../src/app/globals.css'))
const shakeStart = css.indexOf('@keyframes kids-chest-shake')
const shakeEnd = css.indexOf('}', css.indexOf('.kids-chest-opening', shakeStart)) + 1
assert.ok(shakeStart >= 0 && shakeEnd > shakeStart)
const styles = `body{font:16px system-ui;margin:24px;background:#faf8ff;color:#292439}button{margin:8px;padding:10px;border:1px solid #8672ad;border-radius:10px;background:white}main{display:flex;flex-wrap:wrap;gap:24px}.voice-size{width:160px;height:160px}.art-size{width:200px;height:200px}.size-full{width:100%;height:100%}.absolute{position:absolute}.inset-0{inset:0}.grid{display:grid}.place-items-center{place-items:center}.opacity-0{opacity:0}.kids-node--chest{position:relative;display:grid;place-items:center;width:72px;height:72px}.kids-chest-hit-area{position:absolute;left:0;top:0;width:72px;height:72px;z-index:10;background:transparent;border:0;margin:0}.kids-chest-artwork{width:72%;height:72%;display:grid;place-items:center}.size-8{width:32px;height:32px}.size-7{width:28px;height:28px}[data-trail-obstacle]{left:0!important;margin:0;position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;width:180px}.sz-overlay{position:fixed;inset:0;background:#221138aa;display:grid;place-items:center;z-index:50}.sz-modal{background:white;border:1px solid #cdc3e5;border-radius:24px;padding:24px;max-width:340px}.size-24{width:96px;height:96px}${css.slice(shakeStart, shakeEnd)}`
const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><link rel="icon" href="data:,"><title>ediSVG QA</title><style>${styles}</style><div id="root"></div><script type="module" src="/edisvg.js"></script></html>`
const tone = Buffer.alloc(44 + 16000 * 2)
tone.write('RIFF', 0)
tone.writeUInt32LE(tone.length - 8, 4)
tone.write('WAVEfmt ', 8)
tone.writeUInt32LE(16, 16)
tone.writeUInt16LE(1, 20)
tone.writeUInt16LE(1, 22)
tone.writeUInt32LE(16000, 24)
tone.writeUInt32LE(32000, 28)
tone.writeUInt16LE(2, 32)
tone.writeUInt16LE(16, 34)
tone.write('data', 36)
tone.writeUInt32LE(tone.length - 44, 40)
for (let i = 0; i < 16000; i++)
  tone.writeInt16LE(Math.round(Math.sin((i / 16000) * Math.PI * 2 * 440) * 500), 44 + i * 2)
const sound = await readFile(resolve(import.meta.dirname, '../../public/sounds/celebracao.mp3'))
const coin = await readFile(resolve(import.meta.dirname, '../../public/zappy/coin.webp'))
let scenario = '',
  claims = 0
const requests: { scenario: string; path: string; status: number }[] = []
async function respond(request: IncomingMessage, response: ServerResponse) {
  const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname
  const send = (body: string | Uint8Array, status: number, mime: string) => {
    requests.push({ scenario, path, status })
    response.writeHead(status, { 'content-type': mime, 'cache-control': 'no-store' })
    response.end(body)
  }
  if (path.endsWith('/chest/claim') && request.method === 'POST') {
    claims++
    if (scenario === 'claim-error') return send('{"error":"fixture"}', 503, 'application/json')
    return send(
      JSON.stringify({
        xpAwarded: claims === 1 && scenario !== 'zero-award' ? 25 : 0,
        coinsAwarded: claims === 1 && scenario !== 'zero-award' ? 15 : 0,
      }),
      200,
      'application/json',
    )
  }
  if (path === '/') return send(html, 200, 'text/html')
  if (path === '/api/media/module-animation/preview') {
    if (!request.headers.cookie?.includes('qa-preview=allowed'))
      return send('unauthorized', 401, 'text/plain')
    const key = Object.keys(manifest.files).find(
      (name) => name.startsWith('happy.') && name.endsWith('.edi-animation.json'),
    )
    assert.ok(key)
    return send(await readFile(resolve(assetsFolder, key)), 200, 'application/json')
  }
  const module = modules.get(path)
  if (module) return send(module, 200, 'text/javascript')
  if (path === '/qa/tone.wav') return send(tone, 200, 'audio/wav')
  if (path === '/qa/tone.vtt')
    return send('WEBVTT\n\n00:00.000 --> 00:01.000\nTom contínuo de teste.\n', 200, 'text/vtt')
  if (path === '/sounds/celebracao.mp3') return send(sound, 200, 'audio/mpeg')
  if (path === '/zappy/coin.webp') return send(coin, 200, 'image/webp')
  if (path.startsWith('/edisvg/') && basename(path) in manifest.files) {
    if (
      ((scenario === 'art-failure' && basename(path).startsWith('chest.')) ||
        (scenario === 'swap-failure' && basename(path).startsWith('happy.'))) &&
      path.endsWith('.json')
    )
      return send('unavailable', 404, 'text/plain')
    return send(
      await readFile(resolve(assetsFolder, basename(path))),
      200,
      path.endsWith('.webp') ? 'image/webp' : 'application/json',
    )
  }
  return send('not found', 404, 'text/plain')
}
const server = createServer((request, response) => {
  void respond(request, response).catch((error) => response.destroy(error))
})
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
const address = server.address()
assert.ok(address && typeof address !== 'string')
const baseUrl = `http://127.0.0.1:${address.port}/`
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
const report: { cases: Record<string, unknown>[]; passed: boolean; error?: string } = {
  cases: [],
  passed: false,
}
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
try {
  browser = await chromium.launch({
    ...(process.env.SZ_CHECK_CHROMIUM
      ? { executablePath: process.env.SZ_CHECK_CHROMIUM }
      : { channel: 'chrome' }),
    timeout: 20000,
    args: ['--mute-audio'],
  })
  const scenarios = [
    'desktop',
    'mobile',
    'offscreen',
    'reduced',
    'savedata',
    'opened',
    'art-failure',
    'claim-error',
    'zero-award',
    'swap',
    'swap-failure',
    'same-origin',
    'performance',
  ]
  if (caseFilter && !scenarios.includes(caseFilter)) throw new Error('Cenário desconhecido.')
  for (const mode of scenarios.filter((mode) => !caseFilter || mode === caseFilter)) {
    scenario = mode
    claims = 0
    const context = await browser.newContext({
      viewport: mode === 'mobile' ? { width: 390, height: 844 } : { width: 1000, height: 900 },
      isMobile: mode === 'mobile',
      hasTouch: mode === 'mobile',
      reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference',
    })
    const errors: { text: string; url: string }[] = []
    try {
      if (mode === 'same-origin')
        await context.addCookies([{ name: 'qa-preview', value: 'allowed', url: baseUrl }])
      console.log(JSON.stringify({ mode, step: 'context-ready' }))
      await context.addInitScript(() => {
        const pending = new Set<number>()
        const request = window.requestAnimationFrame.bind(window)
        const cancel = window.cancelAnimationFrame.bind(window)
        window.requestAnimationFrame = (callback) => {
          const id = request((time) => {
            pending.delete(id)
            callback(time)
          })
          pending.add(id)
          return id
        }
        window.cancelAnimationFrame = (id) => {
          pending.delete(id)
          cancel(id)
        }
        Object.defineProperty(window, '__ediQaFrames', { get: () => pending.size })
      })
      if (mode === 'savedata')
        await context.addInitScript(() =>
          Object.defineProperty(navigator, 'connection', {
            value: Object.assign(new EventTarget(), { saveData: true }),
            configurable: true,
          }),
        )
      const page = await context.newPage()
      page.setDefaultTimeout(8000)
      page.setDefaultNavigationTimeout(8000)
      page.on('pageerror', (error) => {
        errors.push({ text: error.message, url: '' })
        console.log(JSON.stringify({ mode, pageError: error.message }))
      })
      page.on('console', (message) => {
        if (message.type() === 'error')
          errors.push({ text: message.text(), url: message.location().url ?? '' })
      })
      await page.goto(
        `${baseUrl}${mode === 'opened' ? '?opened=1' : mode === 'offscreen' ? '?offscreen=1' : mode === 'same-origin' ? '?preview=1' : ''}`,
      )
      console.log(JSON.stringify({ mode, step: 'page-loaded' }))
      await expect(page.locator('#react-version')).toHaveText('19.2.6')
      const voice = page.locator('#speaking-art svg')
      if (mode === 'same-origin') await expect(page.locator('#art svg')).toBeVisible()
      if (mode === 'swap' || mode === 'swap-failure') {
        if (mode === 'swap') await expect(page.locator('#art svg')).toBeVisible()
        else await expect(page.locator('#art img')).toBeVisible()
        await page.getByRole('button', { name: 'Trocar arte', exact: true }).click()
        await expect(page.locator('#art svg')).toBeVisible()
        const key = Object.keys(manifest.files).find(
          (name) => name.startsWith('thinking.') && name.endsWith('.edi-animation.json'),
        )
        assert.ok(key)
        const expected = JSON.parse(await readFile(resolve(assetsFolder, key), 'utf8')).document
          .content[0].id
        await expect(page.locator(`#art [data-edi-object="${expected}"]`)).toHaveCount(1)
      }
      if (mode === 'offscreen') {
        await page.evaluate(
          () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
            ),
        )
        assert.equal(
          requests.filter(
            (value) => value.scenario === mode && value.path.endsWith('.edi-animation.json'),
          ).length,
          0,
        )
        await page.locator('#voice').scrollIntoViewIfNeeded()
        await expect(voice).toBeVisible()
        await page.evaluate(() => scrollTo(0, 0))
        await expect.poll(() => page.evaluate(() => window.__ediQaFrames)).toBe(0)
      }
      if (mode === 'desktop' || mode === 'mobile') {
        await expect(voice).toBeVisible()
        const closed = hash(await voice.screenshot())
        await page.getByRole('button', { name: 'Ouvir', exact: true }).click()
        await expect(page.locator('#talking')).toHaveText('true')
        await expect.poll(async () => hash(await voice.screenshot())).not.toBe(closed)
        await page.getByRole('button', { name: 'Pausar', exact: true }).click()
        await expect(page.locator('#talking')).toHaveText('false')
        await expect.poll(async () => hash(await voice.screenshot())).toBe(closed)
        await page.getByRole('button', { name: 'Ouvir', exact: true }).click()
        await expect(page.locator('#talking')).toHaveText('true')
        await expect(page.locator('#talking')).toHaveText('false', { timeout: 5000 })
        await expect.poll(async () => hash(await voice.screenshot())).toBe(closed)
      }
      if (mode === 'reduced' || mode === 'savedata') {
        await expect(page.locator('#voice img')).toBeVisible()
        assert.equal(await page.locator('svg[data-edi-object]').count(), 0)
        assert.equal(
          requests.filter(
            (value) => value.scenario === mode && value.path.endsWith('.edi-animation.json'),
          ).length,
          0,
        )
      }
      let measurement: unknown
      if (mode === 'performance') {
        await expect(page.locator('#art svg')).toBeVisible()
        const active = await measureAnimation(page)
        await page.getByRole('button', { name: 'Pausar arte', exact: true }).click()
        await expect.poll(() => page.evaluate(() => window.__ediQaFrames)).toBe(0)
        const paused = await measureAnimation(page)
        await expect.poll(() => page.evaluate(() => window.__ediQaFrames)).toBe(0)
        measurement = {
          active,
          paused,
          description:
            'Voice and closed chest are paused. One happy artwork animates in the active sample.',
        }
      }
      if (mode === 'opened') {
        await expect(page.getByRole('button', { name: /Abrir o baú/ })).toHaveCount(0)
        await expect(page.locator('#chest img')).toHaveAttribute(
          'src',
          /chestOpen\.[a-f0-9]+\.webp$/,
        )
        await expect(page.locator('#chest img')).toBeVisible()
      } else {
        assert.equal(claims, 0)
        const authorized = page.waitForResponse((response) =>
          response.url().endsWith('/chest/claim'),
        )
        await page.getByRole('button', { name: /Abrir o baú/ }).click()
        const claim = await authorized
        if (mode !== 'reduced') await expect(page.getByRole('dialog')).toHaveCount(0)
        if (mode === 'claim-error') {
          await expect(page.getByRole('button', { name: /Abrir o baú/ })).toBeEnabled()
          await expect(page.getByRole('dialog')).toHaveCount(0)
        } else if (mode === 'zero-award') {
          assert.equal((await claim.json()).xpAwarded, 0)
          await expect(page.locator('#chest [data-trail-obstacle]')).toHaveAttribute(
            'aria-label',
            /aberto$/,
          )
          await expect(page.locator('#chest img')).toHaveAttribute(
            'src',
            /chestOpen\.[a-f0-9]+\.webp$/,
          )
          await expect(page.locator('#chest img')).toBeVisible()
          await expect(page.getByRole('dialog')).toHaveCount(0)
          assert.equal(claims, 1)
        } else {
          await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 })
          assert.equal(claims, 1)
          assert.equal(await page.locator('html').getAttribute('data-refreshed'), '1')
          await page.getByRole('button', { name: 'Continuar', exact: true }).click()
          await expect(page.getByRole('dialog')).toHaveCount(0)
          await expect(page.locator('#chest img')).toHaveAttribute(
            'src',
            /chestOpen\.[a-f0-9]+\.webp$/,
          )
          await expect(page.locator('#chest img')).toBeVisible()
        }
      }
      await page.screenshot({ path: resolve(output, `${mode}.png`), fullPage: true })
      await page.getByRole('button', { name: 'Sair da prévia', exact: true }).click()
      await expect(page.locator('main')).toHaveCount(0)
      await expect.poll(() => page.evaluate(() => window.__ediQaFrames)).toBe(0)
      const unexpected = errors.filter(
        (error) =>
          !(
            (mode === 'art-failure' && /chest\.[a-f0-9]+\.edi-animation\.json$/.test(error.url)) ||
            (mode === 'claim-error' && error.url.endsWith('/chest/claim')) ||
            (mode === 'swap-failure' && /happy\.[a-f0-9]+\.edi-animation\.json$/.test(error.url))
          ),
      )
      assert.deepEqual(unexpected, [])
      report.cases.push({
        mode,
        claims,
        errors,
        ...(measurement ? { measurement } : {}),
        passed: true,
      })
      console.log(JSON.stringify(report.cases.at(-1)))
    } catch (error) {
      report.cases.push({ mode, claims, errors, passed: false })
      const page = context.pages()[0]
      if (page) {
        await page
          .screenshot({ path: resolve(output, `${mode}-failed.png`), timeout: 5000 })
          .catch(() => {})
        await writeFile(resolve(output, `${mode}-failed.html`), await page.content()).catch(
          () => {},
        )
      }
      throw error
    } finally {
      await context.close()
    }
  }
  report.passed = true
} catch (error) {
  report.error = error instanceof Error ? error.stack : String(error)
  throw error
} finally {
  await browser?.close()
  server.closeAllConnections()
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  )
  await writeFile(resolve(output, 'receipt.json'), JSON.stringify({ ...report, requests }, null, 2))
}
