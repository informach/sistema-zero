import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { basename, resolve } from 'node:path'
import { chromium, expect, type Page } from '@playwright/test'
import tailwind from '@tailwindcss/postcss'

const root = resolve(import.meta.dirname, '../../../..')
const output = resolve(process.argv[2] ?? '.cache/lesson-parity-browser-r1')
await mkdir(output, { recursive: false })
const files = new Map<string, Buffer>()
for (const audience of ['kids', 'adult']) {
  const filesList = JSON.parse(
    execFileSync(
      'bun',
      [
        resolve(import.meta.dirname, 'bundle-lesson-parity.ts'),
        resolve(output, 'bundle', audience),
        audience,
      ],
      { encoding: 'utf8', windowsHide: true },
    ),
  ) as { path: string; bytes: number }[]
  for (const file of filesList)
    files.set(`/${audience}/${basename(file.path)}`, await readFile(file.path))
}
const postcss = createRequire(createRequire(import.meta.url).resolve('@tailwindcss/postcss'))(
  'postcss',
)
console.log(JSON.stringify({ stage: 'bundle-ready', files: files.size }))
const styles = new Map<string, string>()
for (const [audience, path] of [
  ['kids', 'packages/community-kids/src/app/globals.css'],
  ['adult', 'packages/community/src/app/globals.generated.css'],
]) {
  const from = resolve(root, path!)
  styles.set(
    audience!,
    (await postcss([tailwind()]).process(await readFile(from, 'utf8'), { from })).css,
  )
}
const tone = Buffer.alloc(44 + 16000 * 2 * 4)
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
for (let i = 0; i < 16000 * 4; i++)
  tone.writeInt16LE(Math.round(Math.sin((i / 16000) * Math.PI * 2 * 440) * 100), 44 + i * 2)
const requests: string[] = []
async function respond(request: Request) {
  const url = new URL(request.url)
  requests.push(url.pathname)
  if (files.has(url.pathname))
    return new Response(new Uint8Array(files.get(url.pathname)!), {
      headers: { 'content-type': url.pathname.endsWith('.css') ? 'text/css' : 'text/javascript' },
    })
  if (url.pathname === '/app.css')
    return new Response(styles.get(url.searchParams.get('audience') ?? 'kids'), {
      headers: { 'content-type': 'text/css' },
    })
  if (url.pathname === '/qa/tone.wav')
    return new Response(tone, { headers: { 'content-type': 'audio/wav' } })
  if (url.pathname.startsWith('/edisvg/'))
    return new Response(
      await readFile(resolve(root, 'packages/edisvg/assets', basename(url.pathname))),
      {
        headers: {
          'content-type': url.pathname.endsWith('.json') ? 'application/json' : 'image/webp',
          'cache-control': 'public, max-age=31536000, immutable',
        },
      },
    )
  if (url.pathname.startsWith('/sounds/') || url.pathname.startsWith('/zappy/'))
    return new Response(
      await readFile(resolve(root, 'packages/community-kids/public', url.pathname.slice(1))),
    )
  if (url.pathname === '/api/members/gamification/me')
    return Response.json({
      xp: 1320,
      streak: { current: 3, best: 3, activeToday: true },
      coins: { balance: 25 },
      badges: [],
      level: null,
    })
  if (url.pathname.startsWith('/api/')) return Response.json({})
  if (url.pathname === '/favicon.ico') return new Response(null, { status: 204 })
  const audience = url.searchParams.get('audience') ?? 'kids'
  return new Response(
    `<!doctype html><html lang="pt-BR" data-sz-palette="blue" style="--font-nunito:Arial;--font-baloo:Arial"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ensaio local de aula</title><link rel="stylesheet" href="/app.css?audience=${audience}"><body><div id="root"></div><script type="module" src="/${audience}/lesson-parity.js"></script></body></html>`,
    { headers: { 'content-type': 'text/html', 'cache-control': 'private, no-store' } },
  )
}
const server = createServer((req, res) => {
  void respond(new Request(`http://127.0.0.1${req.url}`))
    .then(async (response) => {
      res.writeHead(response.status, Object.fromEntries(response.headers))
      res.end(Buffer.from(await response.arrayBuffer()))
    })
    .catch((error) => {
      console.error(error)
      res.writeHead(500)
      res.end()
    })
})
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
const address = server.address()
if (!address || typeof address === 'string') throw Error('Endereço local ausente.')
const origin = `http://127.0.0.1:${address.port}/`
console.log(JSON.stringify({ stage: 'server-ready', origin }))
async function metrics(page: Page) {
  return page.evaluate(() => {
    const block = document.querySelector('.kids-unit-verde')!
    const style = getComputedStyle(block)
    const chip = block.querySelector('span')!
    const chipStyle = getComputedStyle(chip)
    const footer = document.querySelector('.sz-lesson-nav-immersive')!
    const rect = footer.getBoundingClientRect()
    return {
      bodyFont: getComputedStyle(document.body).fontFamily,
      fontSize: getComputedStyle(document.documentElement).fontSize,
      cardRadius: style.borderRadius,
      chipFontSize: chipStyle.fontSize,
      chipLineHeight: chipStyle.lineHeight,
      chipHeight: chip.getBoundingClientRect().height,
      bodyBackground: getComputedStyle(document.body).backgroundColor,
      footer: { x: rect.x, width: rect.width },
      overflow: document.documentElement.scrollWidth > innerWidth,
    }
  })
}
const report: { cases: unknown[]; passed: boolean; requests?: string[]; error?: string } = {
  cases: [],
  passed: false,
}
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  browser = await chromium.launch({
    executablePath:
      process.env.SZ_CHECK_CHROMIUM ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    timeout: 30000,
  })
  console.log(JSON.stringify({ stage: 'browser-ready' }))
  for (const width of [1440, 768, 390]) {
    const snapshots = new Map<string, Awaited<ReturnType<typeof metrics>>>()
    for (const audience of ['kids', 'adult']) {
      const context = await browser.newContext({ viewport: { width, height: 900 } })
      try {
        const page = await context.newPage()
        const errors: string[] = []
        page.on('pageerror', (e) => errors.push(e.message))
        const cdp = await context.newCDPSession(page)
        await cdp.send('Network.enable')
        await cdp.send('Network.setCacheDisabled', { cacheDisabled: false })
        await page.goto(`${origin}?audience=${audience}`)
        await expect(page.getByText('Jogue', { exact: true })).toBeVisible()
        await expect(page.getByText('Brinque', { exact: true })).toHaveCount(0)
        await expect(page.locator('iframe')).toHaveCount(1)
        await page.frameLocator('iframe').getByRole('button', { name: '0', exact: true }).click()
        await expect(
          page.frameLocator('iframe').getByRole('button', { name: '1', exact: true }),
        ).toBeVisible()
        snapshots.set(audience, await metrics(page))
        assert.equal(snapshots.get(audience)!.overflow, false)
        await page.getByRole('button', { name: 'Mostrar lista de aulas', exact: true }).click()
        await expect(page.getByRole('link', { name: '1 Primeira aula' })).toBeVisible()
        await page.screenshot({ path: resolve(output, `${audience}-${width}-outline.png`) })
        await page.getByRole('button', { name: 'Esconder lista de aulas', exact: true }).click()
        await page.getByRole('button', { name: 'Ouvir', exact: true }).click()
        await expect
          .poll(() => page.locator('span[role=img] > span > svg').count())
          .toBeGreaterThanOrEqual(1)
        const frames = await page.evaluate(async () => {
          const found = new Set<string>()
          for (let i = 0; i < 6; i++) {
            found.add(document.querySelector('span[role=img] > span > svg')?.outerHTML ?? '')
            await new Promise((r) => setTimeout(r, 120))
          }
          return found.size
        })
        assert.ok(frames > 1, `${audience} speech must animate`)
        await page.screenshot({ path: resolve(output, `${audience}-${width}.png`) })
        // A regular reload with browser cache enabled must retain the same artwork references.
        await page.reload()
        await expect(page.getByText('Jogue', { exact: true })).toBeVisible()
        assert.equal((await page.locator('img[src*="/edisvg/"]').count()) > 0, true)
        await page.locator('#leave').click()
        await expect(page.locator('#outside')).toBeVisible()
        if (audience === 'adult') assert.equal(await page.locator('.sz-lesson-ui').count(), 0)
        assert.deepEqual(errors, [])
        report.cases.push({
          audience,
          width,
          frames,
          cacheEnabled: true,
          metrics: snapshots.get(audience),
          passed: true,
        })
      } finally {
        await context.close()
      }
    }
    const kids = snapshots.get('kids')!,
      adult = snapshots.get('adult')!
    for (const key of [
      'bodyFont',
      'fontSize',
      'bodyBackground',
      'cardRadius',
      'chipFontSize',
      'chipLineHeight',
      'chipHeight',
    ] as const)
      assert.equal(adult[key], kids[key], `${width} ${key}`)
  }
  assert.equal(
    requests.some((path) => /\.riv$|rive\.wasm/.test(path)),
    false,
  )
  report.passed = true
} catch (error) {
  report.error = error instanceof Error ? error.stack : String(error)
  throw error
} finally {
  try {
    await browser?.close()
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    )
  }
  report.requests = requests
  await writeFile(resolve(output, 'receipt.json'), JSON.stringify(report, null, 2))
}
console.log(JSON.stringify({ passed: report.passed, cases: report.cases.length }))
