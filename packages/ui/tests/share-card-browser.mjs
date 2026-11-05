import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '../../..')
const studio = createRequire(new URL('../../studio/package.json', import.meta.url))
const admin = createRequire(new URL('../../admin/package.json', import.meta.url))
const funnel = createRequire(new URL('../../funnel/package.json', import.meta.url))
const fonts = new Map([
  [
    '/display.woff2',
    readFileSync(
      funnel.resolve(
        '@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-800-normal.woff2',
      ),
    ),
  ],
  [
    '/body.woff2',
    readFileSync(
      funnel.resolve(
        '@fontsource/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-400-normal.woff2',
      ),
    ),
  ],
])
const fontCss =
  '@font-face{font-family:"Bricolage Grotesque";src:url(/display.woff2);font-weight:800}@font-face{font-family:"Atkinson Hyperlegible Next";src:url(/body.woff2);font-weight:400}'
const { chromium } = studio('playwright-core')
const tailwind = admin('@tailwindcss/postcss')
const postcss = createRequire(admin.resolve('@tailwindcss/postcss'))('postcss')
const styles = resolve(here, '../../admin/src/app/globals.css')
const css = await postcss([tailwind({ base: resolve(here, '../../admin') })]).process(
  readFileSync(styles, 'utf8'),
  { from: styles },
)
const temp = mkdtempSync(join(tmpdir(), 'sz-share-card-'))
assert.equal(dirname(temp), tmpdir())
const artifacts = resolve(repo, '.cache/commissions-970/share-card')
mkdirSync(artifacts, { recursive: true })
let browser
let server
try {
  const bundle = join(temp, 'fixture.js')
  execFileSync(
    'bun',
    [
      'build',
      join(here, 'fixtures/share-card-browser.tsx'),
      '--target',
      'browser',
      '--outfile',
      bundle,
    ],
    { cwd: repo, stdio: 'pipe', timeout: 30000 },
  )
  const js = readFileSync(bundle)
  server = createServer((req, res) => {
    if (fonts.has(req.url)) {
      res.writeHead(200, { 'content-type': 'font/woff2' })
      res.end(fonts.get(req.url))
      return
    }
    const script = req.url === '/fixture.js'
    const stylesheet = req.url === '/style.css'
    res.writeHead(200, {
      'content-type': script ? 'text/javascript' : stylesheet ? 'text/css' : 'text/html',
    })
    res.end(
      script
        ? js
        : stylesheet
          ? css.css + fontCss
          : '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body class="bg-background text-foreground" style="font-family:Arial"><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>',
    )
  })
  await new Promise((done) => server.listen(0, '127.0.0.1', done))
  browser = await chromium.launch({
    headless: true,
    ...(process.env.SZ_CHECK_CHROMIUM ? { executablePath: process.env.SZ_CHECK_CHROMIUM } : {}),
  })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  page.setDefaultTimeout(10000)
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`http://127.0.0.1:${server.address().port}`)
  await page.waitForFunction(() => Boolean(window.fixture))
  const content = {
    url: 'https://sistemazero.com.br/bolsa/laopa-20261106?utm_source=palestra&utm_content=qr',
    title: 'Palestra na clínica Laopa',
    subtitle: 'Um presente para famílias · Kids',
    description: '7 dias gratuitos no curso Cadê Todo Mundo e no Mural de criações.',
    notice:
      'Resgate de 06/11/2026 00:00 até 09/11/2026 00:00 (Brasília). Para crianças de 9 a 17 anos. Cadastro pelo responsável.',
  }
  await page.evaluate((data) => window.fixture.show(data), content)
  await page.getByRole('button', { name: 'Cartão de divulgação' }).click()
  const download = page.getByRole('link', { name: 'Baixar PNG' })
  await download.waitFor()
  const image = await download.getAttribute('href')
  assert.deepEqual(await page.evaluate((url) => window.fixture.decode(url), image), {
    url: content.url,
    width: 1080,
    height: 1350,
  })
  writeFileSync(join(artifacts, 'laopa.png'), Buffer.from(image.split(',')[1], 'base64'))
  await page.screenshot({ path: join(artifacts, 'mobile.png') })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  const downloaded = page.waitForEvent('download')
  await download.click()
  await (await downloaded).saveAs(join(artifacts, 'download.png'))
  assert.equal(
    readFileSync(join(artifacts, 'download.png')).equals(
      readFileSync(join(artifacts, 'laopa.png')),
    ),
    true,
  )
  const adult = {
    ...content,
    url: 'https://sistemazero.com.br/bolsa/adulto-teste',
    title: 'Seu primeiro jogo começa aqui',
    subtitle: 'Adultos · 18 anos ou mais',
    notice: 'Acesse o link e faça seu cadastro.',
  }
  await page.evaluate((data) => window.fixture.show(data), adult)
  await page.waitForFunction(
    (previous) =>
      document.querySelector('a[download]')?.getAttribute('href') !== previous &&
      Boolean(document.querySelector('a[download]')),
    image,
  )
  assert.equal(
    (await page.evaluate((url) => window.fixture.decode(url), await download.getAttribute('href')))
      .url,
    adult.url,
  )
  await page.keyboard.press('Escape')
  assert.equal(
    await page.getByRole('dialog', { name: 'Cartão de divulgação', exact: true }).count(),
    0,
  )
  assert.equal(await page.getByRole('dialog', { name: 'Campanha', exact: true }).count(), 1)
  await page.evaluate(() => {
    const original = HTMLCanvasElement.prototype.toDataURL
    HTMLCanvasElement.prototype.toDataURL = () => {
      HTMLCanvasElement.prototype.toDataURL = original
      throw new Error('Falha de exportação simulada')
    }
  })
  await page.getByRole('button', { name: 'Cartão de divulgação' }).click()
  await page.getByRole('alert').waitFor()
  assert.equal(await download.count(), 0)
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await download.waitFor()
  const validation = await page.evaluate(async (data) => {
    const invalid = []
    for (const url of [
      'javascript:alert(1)',
      'data:text/html,x',
      'https://user:password@example.com',
    ]) {
      try {
        await window.fixture.createShareCardImage({ ...data, url })
      } catch {
        invalid.push(url)
      }
    }
    const long = await window.fixture.createShareCardImage({
      ...data,
      title:
        'Uma palestra para criar e aprender em família na clínica Laopa: descubra como transformar ideias em jogos e compartilhar suas primeiras criações com outras pessoas',
    })
    return { invalid: invalid.length, decoded: await window.fixture.decode(long) }
  }, content)
  assert.equal(validation.invalid, 3)
  assert.equal(validation.decoded.url, content.url)
  assert.deepEqual(errors, [])
  console.log(
    JSON.stringify({
      result: 'PASS',
      browser: browser.version(),
      qr: 'PNG decoded; attribution query preserved',
      cases: [
        'download',
        'mobile',
        'audience change',
        'nested dialog',
        'export failure and retry',
        'invalid URL',
        'long title',
      ],
    }),
  )
} finally {
  await browser?.close()
  if (server) await new Promise((done) => server.close(done))
  rmSync(temp, { recursive: true, force: true })
}
