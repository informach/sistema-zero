/** Visitas e festa: UI real, conversa, saída e retorno, sem serviço remoto. */
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

type Convidado = { quem: string; x: number; z: number }
type Medida = { convidados: Convidado[]; posicao: { x: number; y: number; z: number } }
const port = await new Promise<number>((resolve, reject) => {
  const s = createServer().once('error', reject)
  s.listen(0, '127.0.0.1', () => {
    const a = s.address()
    if (!a || typeof a === 'string') return reject(Error('Sem porta local'))
    s.close(() => resolve(a.port))
  })
})
const baseURL = `http://127.0.0.1:${port}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? tmpdir()
mkdirSync(prints, { recursive: true })
const publico = process.env.ARQUIPELAGO_PUBLICO === 'adulto' ? 'adulto' : 'kids'
const celular = process.env.ARQUIPELAGO_CELULAR === '1'
const server = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
})
const encerrado = new Promise<void>((resolve) => server.once('close', () => resolve()))
server.stdout.on('data', () => {})
server.stderr.on('data', (d) => process.stderr.write(d))
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
const erros: string[] = []
const limite = setTimeout(() => {
  void browser?.close()
  server.kill()
}, 6 * 60_000)
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
      : { channel: process.env.ARQUIPELAGO_BROWSER_CHANNEL ?? 'chrome' }),
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  const context = await browser.newContext({
    viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 720 },
    isMobile: celular,
    hasTouch: celular,
    deviceScaleFactor: 0.5,
    reducedMotion: 'reduce',
  })
  context.setDefaultTimeout(30_000)
  await context.addInitScript((origem) => {
    if (location.origin === origem) {
      localStorage.setItem('arquipelago:medir', '1')
      localStorage.setItem(
        'arquipelago:conforto',
        JSON.stringify({ menosMovimento: true, qualidade: 'leve' }),
      )
    }
  }, baseURL)
  const page = await context.newPage()
  page.on('pageerror', (e) => erros.push(e.message))
  await page.goto(`${baseURL}/?novo=1&posicao=8&publico=${publico}&em=2,-1,2&convidados=1`, {
    waitUntil: 'domcontentloaded',
  })
  await page.waitForFunction(
    () =>
      (globalThis as { __arquipelagoDesenho?: Medida }).__arquipelagoDesenho?.convidados.length ===
      1,
    undefined,
    { timeout: 180_000 },
  )
  const medir = () =>
    page.evaluate(() => (globalThis as { __arquipelagoDesenho?: Medida }).__arquipelagoDesenho!)
  const levar = (x: number, z: number, giro = 0) =>
    page.evaluate(
      ({ x, z, giro }) =>
        (globalThis as { __arquipelagoLevar?: (...a: number[]) => void }).__arquipelagoLevar?.(
          x,
          2.2,
          z,
          giro,
        ),
      { x, z, giro },
    )
  await page.waitForTimeout(2000)
  await page.screenshot({ path: path.join(prints, '01-visita.png') })
  await page.getByRole('button', { name: 'Abrir o menu', exact: true }).click()
  await page.getByRole('button', { name: 'Moradores em casa', exact: true }).click()
  const painel = page.getByRole('dialog', { name: 'Moradores em casa', exact: true })
  await painel.waitFor()
  const leitura = await painel.evaluate((el) => {
    const titulo = el.querySelector('h2')!.getBoundingClientRect()
    return {
      tituloVisivel: titulo.top >= 0 && titulo.bottom <= innerHeight,
      larguraDoTexto: Math.min(
        ...[...el.querySelectorAll('li > div')].map((p) => p.getBoundingClientRect().width),
      ),
      largura: el.getBoundingClientRect().width,
      dentroDaTela:
        el.getBoundingClientRect().left >= 0 && el.getBoundingClientRect().right <= innerWidth,
    }
  })
  if (!leitura.tituloVisivel || leitura.larguraDoTexto < 200 || !leitura.dentroDaTela)
    throw Error(`Painel difícil de ler: ${JSON.stringify(leitura)}`)
  await page.screenshot({ path: path.join(prints, '02-convites.png') })
  const largura = await page.evaluate(() => ({
    tela: innerWidth,
    pagina: document.documentElement.scrollWidth,
  }))
  if (largura.pagina > largura.tela) throw Error('Rolagem lateral no painel')
  await painel.getByRole('button', { name: 'Começar festa', exact: true }).click()
  await page.waitForFunction(
    () =>
      (globalThis as { __arquipelagoDesenho?: Medida }).__arquipelagoDesenho?.convidados.length ===
      3,
  )
  const festa = (await medir()).convidados
  const nomes: Record<string, string> = {
    capi: 'Capi',
    bento: 'Bento',
    mare: 'Maré',
    floco: 'Floco',
    jade: 'Jade',
    irie: 'Iriê',
  }
  const c = festa[0]!
  await levar(c.x, c.z + 1.4, 0)
  await page.waitForTimeout(2500)
  await page
    .locator('.arq-acao')
    .filter({
      hasText: `Conversar com ${c.quem === 'bento' || c.quem === 'floco' ? 'o' : 'a'} ${nomes[c.quem]}`,
    })
    .first()
    .waitFor()
  if (celular) await page.getByRole('button', { name: 'Usar', exact: true }).click()
  else await page.keyboard.press('KeyE')
  const conversa = page.getByRole('dialog', { name: nomes[c.quem], exact: true })
  await conversa.waitFor()
  await page.waitForTimeout(1500)
  if (!(await conversa.isVisible())) throw Error('Atualização fechou a conversa')
  await page.screenshot({ path: path.join(prints, '03-conversa.png') })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
  // Andar com a física real pelo espaço livre ao lado da visita.
  await levar(2.5, -1.3, 0)
  await page.waitForFunction(() => {
    const p = (globalThis as { __arquipelagoDesenho?: Medida }).__arquipelagoDesenho?.posicao
    return p && Math.abs(p.x - 2.5) < 0.2 && Math.abs(p.z + 1.3) < 0.2
  })
  const antes = (await medir()).posicao
  await page.keyboard.down('KeyW')
  await page.waitForTimeout(700)
  await page.keyboard.up('KeyW')
  await page.waitForTimeout(400)
  const depois = (await medir()).posicao
  if (Math.hypot(depois.x - antes.x, depois.z - antes.z) < 0.5) throw Error('Não andou na casa')
  await page.screenshot({ path: path.join(prints, '04-festa.png') })
  await levar(0, 23)
  await page.waitForFunction(
    () =>
      (globalThis as { __arquipelagoDesenho?: Medida }).__arquipelagoDesenho?.convidados.length ===
      0,
  )
  await levar(2.5, -1.3)
  await page.waitForFunction(
    () =>
      (globalThis as { __arquipelagoDesenho?: Medida }).__arquipelagoDesenho?.convidados.length ===
      3,
  )
  await page.getByRole('button', { name: 'Abrir o menu', exact: true }).click()
  await page.getByRole('button', { name: 'Moradores em casa', exact: true }).click()
  await painel.getByRole('button', { name: 'Descansar das visitas', exact: true }).click()
  // O menu pausa o desenho; fechar antes de ler o próximo medidor.
  await painel.getByRole('button', { name: 'Voltar ao jogo', exact: true }).click()
  await page.waitForFunction(
    () =>
      (globalThis as { __arquipelagoDesenho?: Medida }).__arquipelagoDesenho?.convidados.length ===
      0,
  )
  await page.screenshot({ path: path.join(prints, '05-descanso.png') })
  await page.getByRole('button', { name: 'Abrir o menu', exact: true }).click()
  await page.getByRole('button', { name: 'Diário', exact: true }).click()
  const diario = page.getByRole('dialog', { name: 'Diário', exact: true })
  await diario.getByText('Tema de construção da semana', { exact: true }).waitFor()
  await diario.getByLabel('Ideias para construir').selectOption('horta')
  await diario.getByText('Uma ideia para continuar', { exact: true }).waitFor()
  await page.screenshot({ path: path.join(prints, '06-tema-semanal.png') })
  const tema = await diario.locator('.arq-tema-semana').evaluate((el) => ({
    texto: el.textContent,
    largura: el.getBoundingClientRect().width,
    cabe: el.getBoundingClientRect().left >= 0 && el.getBoundingClientRect().right <= innerWidth,
  }))
  if (!tema.cabe || !tema.texto?.includes('Não há nota, prazo ou compra obrigatória.'))
    throw Error('Convite não está acessível')
  await diario.getByRole('button', { name: 'Construir na minha casa', exact: true }).click()
  await page.waitForTimeout(1200)
  if (await diario.isVisible()) throw Error('Diário não abriu Construir')
  await page.getByRole('region', { name: 'Ferramentas de construir', exact: true }).waitFor()
  await page.screenshot({ path: path.join(prints, '07-construir.png') })
  if (erros.length) throw Error(erros.join('\n'))
  writeFileSync(
    path.join(prints, 'resultado.json'),
    JSON.stringify(
      { publico, celular, largura, leitura, tema, festa, caminhada: { antes, depois }, erros },
      null,
      2,
    ),
  )
  console.log(`Visitas conferidas em ${prints}`)
} catch (erro) {
  for (const contexto of browser?.contexts() ?? []) {
    const pagina = contexto.pages()[0]
    if (pagina) {
      await pagina.screenshot({ path: path.join(prints, 'falha.png') }).catch(() => {})
      writeFileSync(
        path.join(prints, 'falha.txt'),
        `${String(erro)}\n${await pagina
          .locator('body')
          .innerText()
          .catch(() => '(página indisponível)')}`,
      )
    }
  }
  throw erro
} finally {
  clearTimeout(limite)
  await browser?.close()
  server.kill()
  await encerrado
}
