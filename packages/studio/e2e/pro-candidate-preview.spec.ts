import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { buildProRuntimeBridgeScript } from '@sistemazero/core/studio'
import { build, type PreviewServer, preview } from 'vite'

let directory: string, server: PreviewServer, origin: string
test.beforeAll(async () => {
  test.setTimeout(120_000)
  directory = await mkdtemp(join(tmpdir(), 'studio-candidate-browser-'))
  const root = fileURLToPath(new URL('./fixtures/pro-candidate', import.meta.url))
  const configFile = fileURLToPath(new URL('../playground/vite.config.ts', import.meta.url))
  await build({
    configFile,
    root,
    logLevel: 'warn',
    build: { outDir: directory, emptyOutDir: true, target: 'esnext' },
  })
  server = await preview({
    configFile,
    root,
    logLevel: 'warn',
    build: { outDir: directory },
    preview: { host: '127.0.0.1', port: 0 },
  })
  const address = server.httpServer.address()
  if (!address || typeof address === 'string') throw new Error('Fixture server did not listen')
  origin = `http://127.0.0.1:${address.port}`
})
test.afterAll(async () => {
  if (server)
    await new Promise<void>((res, reject) =>
      server.httpServer.close((error) => (error ? reject(error) : res())),
    )
  if (
    directory &&
    resolve(directory).startsWith(resolve(tmpdir()) + sep) &&
    resolve(directory).includes('studio-candidate-browser-')
  )
    await rm(directory, { recursive: true, force: true })
})
test.beforeEach(async ({ page }) => {
  await page.route('https://runtime.test/**', async (route) => {
    const id = new URL(route.request().url()).pathname.split('/')[3]![0]!
    if (id === 'd') {
      await route.fulfill({ status: 404, body: 'Expired on server' })
      return
    }
    const html = `<!doctype html><html lang="pt-BR"><head><script>${buildProRuntimeBridgeScript(origin)}</script><style>body{background:#14232f;color:white;font:18px sans-serif}canvas{width:100%;max-width:500px}button{padding:12px}</style></head><body><h1>${id === 'a' ? 'Atual' : 'Proposta'} executando</h1><canvas width="500" height="220"></canvas><p id="score">carregando</p><button id="save">Guardar</button><button id="sound">Som</button><script>
    const canvas=document.querySelector('canvas'), ctx=canvas.getContext('2d'); let tick=0;
    function draw(){ctx.fillStyle='#14232f';ctx.fillRect(0,0,500,220);ctx.fillStyle='#50deb7';ctx.fillRect(30+(tick++%400),80,30,30);document.body.dataset.ticks=String(tick);requestAnimationFrame(draw)}draw();
    szGameStorage.get('score').then(value=>document.querySelector('#score').textContent=value??'empty');
    document.querySelector('#save').onclick=async()=>{await szGameStorage.set('score','${id}');document.querySelector('#score').textContent=await szGameStorage.get('score')};
    document.querySelector('#sound').onclick=async()=>{const ac=new AudioContext();await ac.resume();const oscillator=ac.createOscillator();const gain=ac.createGain();gain.gain.value=0.001;oscillator.connect(gain).connect(ac.destination);oscillator.start();document.body.dataset.audio=ac.state;};
    </script></body></html>`
    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Content-Security-Policy': `sandbox allow-scripts allow-pointer-lock; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-ancestors ${origin};`,
      },
      body: html,
    })
  })
  await page.goto(origin)
})

test('one live document, ephemeral proposal storage, persistent current progress and 20 swaps under StrictMode', async ({
  page,
}, info) => {
  test.setTimeout(60_000)
  const game = () => page.frameLocator('iframe')
  await expect(game().locator('#score')).toHaveText('saved')
  const current = page.frames().find((frame) => frame.url().includes('/artifacts/'))!
  await page.getByRole('button', { name: 'Jogar proposta', exact: true }).click()
  await expect(page.locator('iframe')).toHaveCount(1)
  await expect(game().locator('#score')).toHaveText('empty')
  expect(current.isDetached()).toBe(true)
  const baselineBuilds = await page.getByLabel('Compilações').textContent()
  await expect(page.getByLabel('Estado da proposta')).toHaveText('ready')
  await game().getByRole('button', { name: 'Guardar' }).click()
  await expect(game().locator('#score')).toHaveText('b')
  await game().getByRole('button', { name: 'Som', exact: true }).click()
  await expect(game().locator('body')).toHaveAttribute('data-audio', 'running')
  const proposal = page.frames().find((frame) => frame.url().includes('/artifacts/'))!
  await page.getByRole('button', { name: 'Fechar painel', exact: true }).click()
  expect(proposal.isDetached()).toBe(false)
  await expect
    .poll(async () => Number(await game().locator('body').getAttribute('data-ticks')))
    .toBeGreaterThan(2)
  await page.setViewportSize({ width: 360, height: 740 })
  await page.screenshot({ path: info.outputPath('candidate-mobile.png'), fullPage: true })
  for (let i = 0; i < 20; i++) {
    await page.getByRole('button', { name: 'Jogo atual', exact: true }).click()
    await expect(game().locator('#score')).toHaveText('saved')
    await expect(page.locator('iframe')).toHaveCount(1)
    await page.getByRole('button', { name: 'Proposta', exact: true }).click()
    await expect(game().locator('#score')).toHaveText('empty')
    await expect(page.locator('iframe')).toHaveCount(1)
  }
  expect(proposal.isDetached()).toBe(true)
  await expect(page.getByLabel('Compilações')).toHaveText(baselineBuilds!)
  await page.getByRole('button', { name: 'Consultar progresso salvo' }).click()
  await expect(page.getByLabel('Progresso salvo')).toHaveText('saved')
  await expect(page.getByLabel('Código persistido')).toHaveText('const goal = 10')
  await page.getByRole('button', { name: 'Fechar experiência' }).click()
  await expect(page.getByLabel('Estado da proposta')).toHaveText('none')
  await expect(game().locator('#score')).toHaveText('saved')
})

test('expiry stops execution, reports to owner and accepts an explicit replacement without compiling', async ({
  page,
}) => {
  await expect(page.frameLocator('iframe').locator('#score')).toHaveText('saved')
  await page.getByRole('button', { name: 'Prévia breve' }).click()
  await expect(page.getByLabel('Estado da proposta')).toHaveText('expired')
  await expect(page.locator('iframe')).toHaveCount(0)
  await expect(page.getByText(/Esta prévia expirou/)).toBeVisible()
  const builds = await page.getByLabel('Compilações').textContent()
  await page.getByRole('button', { name: 'Recriar prévia', exact: true }).click()
  await expect(page.frameLocator('iframe').locator('#score')).toHaveText('empty')
  await expect(page.getByLabel('Estado da proposta')).toHaveText('ready')
  await expect(page.getByLabel('Compilações')).toHaveText(builds!)
  await page.getByRole('button', { name: 'Trocar perfil' }).click()
  await expect(page.getByLabel('Estado da proposta')).toHaveText('none')
  await expect(page.locator('iframe')).toHaveCount(1)
  await page.getByRole('button', { name: 'Jogar proposta', exact: true }).click()
  await expect(page.frameLocator('iframe').locator('#score')).toHaveText('empty')
  await page.getByRole('button', { name: 'Trocar projeto' }).click()
  await expect(page.getByLabel('Estado da proposta')).toHaveText('none')
})

test('an unavailable server artifact never becomes ready or triggers an implicit rebuild', async ({
  page,
}) => {
  test.setTimeout(25_000)
  await expect(page.frameLocator('iframe').locator('#score')).toHaveText('saved')
  await page.getByRole('button', { name: 'Artefato indisponível' }).click()
  await expect(page.getByLabel('Estado da proposta')).not.toHaveText('ready')
  const builds = await page.getByLabel('Compilações').textContent()
  await expect(page.getByLabel('Estado da proposta')).toHaveText('unavailable', { timeout: 15_000 })
  await expect(page.locator('iframe')).toHaveCount(0)
  await expect(page.getByLabel('Compilações')).toHaveText(builds!)
})
