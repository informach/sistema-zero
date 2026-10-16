import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { readFile, writeFile } from 'node:fs/promises'
const desktop = createRequire(new URL('../../packages/marketing-desktop/package.json', import.meta.url))
const funnel = createRequire(new URL('../../packages/funnel/package.json', import.meta.url))
const { createServer } = await import(pathToFileURL(desktop.resolve('vite')).href)
const { default: tailwindcss } = await import(pathToFileURL(desktop.resolve('@tailwindcss/vite')).href)
const sharp = desktop('sharp'), { chromium } = funnel('playwright')
const root = fileURLToPath(new URL('../..', import.meta.url)).replaceAll('\\', '/')
const proof = JSON.parse(await readFile(new URL('./render-evidence.json', import.meta.url), 'utf8'))
for (const source of proof.sources) source.url = `/@fs/${root}/${source.file}`
const server = await createServer({ configFile: false, root: fileURLToPath(new URL('./ui-proof', import.meta.url)), plugins: [tailwindcss()], esbuild: { jsx: 'automatic' }, resolve: { alias: { '@remotion/player': desktop.resolve('@remotion/player'), 'remotion/no-react': desktop.resolve('remotion/no-react'), remotion: desktop.resolve('remotion'), react: fileURLToPath(new URL('../../packages/marketing-workbench/node_modules/react', import.meta.url)), 'react-dom': fileURLToPath(new URL('../../packages/marketing-workbench/node_modules/react-dom', import.meta.url)) }, dedupe: ['react', 'react-dom'] }, server: { host: '127.0.0.1', port: 15478, strictPort: true, fs: { allow: [root] } } })
await server.listen()
const browser = await chromium.launch({ executablePath: fileURLToPath(new URL('../../packages/marketing-desktop/node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe', import.meta.url)), headless: true })
const context = await browser.newContext({ viewport: { width: 1200, height: 2000 }, deviceScaleFactor: 1 })
await context.addInitScript((input) => { window.proofInput = input }, proof)
const page = await context.newPage(), errors = [], comparisons = []
page.on('pageerror', (error) => errors.push(error.message))
try {
  for (const height of [1920, 1350]) for (let scene = 0; scene < proof.scenes.length; scene++) {
    await page.goto(`http://127.0.0.1:15478/?raw=1&scene=${scene}&height=${height}`)
    for (const frame of [89, 0, 45]) {
      await page.waitForFunction(() => Boolean(window.seekProof))
      await page.evaluate((frame) => window.seekProof(frame), frame)
      await page.waitForFunction((frame) => document.querySelector('[data-proof-frame]')?.getAttribute('data-proof-frame') === String(frame) && document.fonts.status === 'loaded' && [...document.images].every((image) => image.complete && image.naturalWidth > 0), frame)
      const png = await page.locator('#player-proof').screenshot()
      const actual = await sharp(png).removeAlpha().raw().toBuffer()
      const name = `${proof.scenes[scene].recipeId}-${height}-${frame}-${frame === 89 ? 0 : frame === 0 ? 1 : 2}.png`
      const expected = await sharp(fileURLToPath(new URL(`../../packages/marketing-desktop/.cache/demonstration-proof/${name}`, import.meta.url))).removeAlpha().raw().toBuffer()
      assert.equal(actual.length, expected.length)
      let difference = 0
      for (let i = 0; i < actual.length; i++) difference += Math.abs(actual[i] - expected[i])
      const meanChannelDifference = difference / actual.length
      assert.ok(meanChannelDifference < 1, `${name}: Player differs from renderer: ${meanChannelDifference}`)
      comparisons.push({ recipe: proof.scenes[scene].recipeId, height, frame, meanChannelDifference })
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('http://127.0.0.1:15478/?scene=2&height=1350')
  await page.getByText('Conferir demonstrações e fontes', { exact: true }).click()
  await page.getByRole('button', { name: 'Antes e depois', exact: true }).click()
  assert.match(await page.getByPlaceholder('Ex.: deixe a abertura mais direta e preserve a chamada para ação.').inputValue(), /Antes e depois/)
  await page.locator('select[id$="-video-scene"]').selectOption({ index: 1 })
  assert.equal(await page.locator('select[id$="-video-scene"] option:checked').textContent(), `Cena 1: ${proof.scenes[2].headline}`)
  await page.getByLabel('O que pode mudar nesta cena', { exact: false }).selectOption('text')
  assert.equal(await page.getByLabel('O que pode mudar nesta cena', { exact: false }).inputValue(), 'text')
  assert.deepEqual(await page.evaluate(() => window.proofWrites), [])
  assert.equal(await page.getByRole('alert').count(), 0)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.screenshot({ path: fileURLToPath(new URL('./ui-desktop.png', import.meta.url)), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.screenshot({ path: fileURLToPath(new URL('./ui-mobile.png', import.meta.url)), fullPage: true })
  assert.deepEqual(errors, [])
  const tiles = []
  for (const [row, height] of [1920, 1350].entries()) for (const [column, scene] of proof.scenes.entries()) {
    const file = new URL(`../../packages/marketing-desktop/.cache/demonstration-proof/${scene.recipeId}-${height}-45-2.png`, import.meta.url)
    tiles.push({ input: await sharp(fileURLToPath(file)).resize(360).toBuffer(), left: column * 360, top: row * 640 })
  }
  await sharp({ create: { width: 1080, height: 1090, channels: 3, background: '#fffcf4' } }).composite(tiles).png().toFile(fileURLToPath(new URL('./demonstracoes.png', import.meta.url)))
  await writeFile(new URL('./ui-validation.json', import.meta.url), JSON.stringify({ status: 'passed', comparisons, exampleOnlyFillsRequest: true, demonstrationTextScopeSelectable: true, noHorizontalOverflow: [1440, 390], browserErrors: errors, note: 'Real components and Player; fixture transport. No authenticated execution or publication.' }, null, 2))
  console.log(`Player/render: ${comparisons.length} frame comparisons passed; request and preview UI passed`)
} finally { await browser.close(); await server.close() }
