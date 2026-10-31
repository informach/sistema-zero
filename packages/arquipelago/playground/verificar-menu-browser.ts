/**
 * Os painéis do menu abrem dentro dele (31/10/2026, pedido da dona): no menu de pausa, diário,
 * álbum, caderno dos Lumis, mapa e visitas aparecem no meio, no estilo do menu, com a lista de
 * lugares à vista e a barra de rolagem do meio; nenhuma janela à parte abre por cima. "Voltar ao
 * jogo" fecha o menu (o pedido vindo do mundo, que também abre dentro do menu, está em
 * `tests/paineis-no-menu.test.ts`).
 * No computador e no celular, com a plataforma falsa, sem banco.
 *
 * No Windows: `bun build playground/verificar-menu-browser.ts --target=node --external
 * playwright-core --outfile .cache/verificar-menu-browser.mjs && node .cache/verificar-menu-browser.mjs`.
 * Aceita `ARQUIPELAGO_CHROMIUM` e `ARQUIPELAGO_PRINTS`.
 */
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { chromium } from 'playwright-core'

const port = await new Promise<number>((resolve, reject) => {
  const s = createServer().once('error', reject)
  s.listen(0, '127.0.0.1', () => {
    const a = s.address()
    if (!a || typeof a === 'string') return reject(Error('Sem porta local'))
    s.close(() => resolve(a.port))
  })
})
const baseURL = `http://127.0.0.1:${port}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? path.resolve('.cache/menu')
mkdirSync(prints, { recursive: true })
const SECOES = [
  { lugar: 'Diário', titulo: 'Diário' },
  { lugar: 'Álbum de coleções', titulo: 'Álbum de coleções' },
  { lugar: 'Caderno dos Lumis', titulo: 'Caderno dos Lumis' },
  { lugar: 'Mapa do arquipélago', titulo: 'Mapa do arquipélago' },
  { lugar: 'Visitar um irmão', titulo: null },
  { lugar: 'Moradores em casa', titulo: null },
] as const

const server = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
})
server.stdout.on('data', () => {})
server.stderr.on('data', (d) => process.stderr.write(d))
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  const deadline = Date.now() + 30_000
  while (true) {
    if (server.exitCode !== null) throw new Error('Playground encerrou antes de iniciar.')
    try {
      if ((await fetch(baseURL)).ok) break
    } catch {}
    if (Date.now() >= deadline) throw new Error('Playground não iniciou.')
    await new Promise((r) => setTimeout(r, 200))
  }
  browser = await chromium.launch({
    ...(process.env.ARQUIPELAGO_CHROMIUM
      ? { executablePath: process.env.ARQUIPELAGO_CHROMIUM }
      : { channel: 'chrome' }),
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  for (const celular of [false, true]) {
    const tela = celular ? 'celular' : 'computador'
    const context = await browser.newContext({
      viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 720 },
      isMobile: celular,
      hasTouch: celular,
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    })
    context.setDefaultTimeout(60_000)
    await context.addInitScript(() => {
      localStorage.setItem(
        'arquipelago:conforto',
        JSON.stringify({ menosMovimento: true, qualidade: 'leve' }),
      )
    })
    const page = await context.newPage()
    const erros: string[] = []
    page.on('pageerror', (e) => erros.push(e.message))
    await page.goto(`${baseURL}/?novo=1&persistir=0&posicao=8&qualidade=leve`, {
      waitUntil: 'domcontentloaded',
    })
    const abrirMenu = page.getByRole('button', { name: 'Abrir o menu', exact: true })
    await abrirMenu.waitFor({ timeout: 240_000 })
    await abrirMenu.click()
    const menu = page.getByRole('dialog', { name: 'Menu do jogo', exact: true })
    await menu.waitFor()
    const nav = menu.getByRole('navigation', { name: 'Lugares do menu' })
    const corpo = menu.locator('.arq-pausa-corpo')
    for (const s of SECOES) {
      await nav.getByRole('button', { name: s.lugar, exact: true }).click()
      if (s.titulo) await corpo.getByRole('heading', { name: s.titulo, exact: true }).waitFor()
      else await corpo.locator('.arq-no-menu').first().waitFor()
      // Nenhuma janela à parte: o único diálogo aberto é o menu, e a lista continua à vista.
      if ((await page.getByRole('dialog').count()) !== 1) throw Error(`${s.lugar}: outra janela`)
      if (!(await nav.isVisible())) throw Error(`${s.lugar}: o menu sumiu`)
      const atual = await nav.locator('[aria-current="page"]').innerText()
      if (!atual.includes(s.lugar)) throw Error(`${s.lugar}: lugar marcado é ${atual}`)
      const nome = s.lugar.toLowerCase().replaceAll(' ', '-')
      await page.screenshot({ path: path.join(prints, `${tela}-${nome}.png`) })
    }
    // A barra de rolagem do meio: o álbum é mais alto que a tela.
    await nav.getByRole('button', { name: 'Álbum de coleções', exact: true }).click()
    const rola = await corpo.evaluate((el) => el.scrollHeight > el.clientHeight)
    if (!rola) throw Error('o álbum não rola no meio do menu')
    await corpo.evaluate((el) => el.scrollTo({ top: el.scrollHeight / 2 }))
    await page.screenshot({ path: path.join(prints, `${tela}-album-rolado.png`) })
    // "Voltar ao jogo" do painel fecha o menu.
    await corpo.getByRole('button', { name: 'Voltar ao jogo', exact: true }).last().click()
    await menu.waitFor({ state: 'detached' })
    if (erros.length) throw Error(erros.join('\n'))
    console.log(`PASS ${tela}: os painéis abrem dentro do menu, com a lista à vista`)
    await context.close()
  }
  console.log(`Prints: ${prints}`)
} finally {
  await browser?.close()
  if (server.exitCode === null) server.kill()
}
