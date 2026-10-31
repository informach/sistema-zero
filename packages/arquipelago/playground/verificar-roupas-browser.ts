/**
 * As roupas conquistadas no playground (§6.28, A21). Só a plataforma falsa, sem banco.
 *
 * Um jogo com três corações de amizade com a Jade: ao abrir, o jogo salva, pede a conferência e o
 * Zappy conta o chapéu que chegou ao avatar. Reabrir não repete o recado. No computador e no
 * celular. Depois, na Festa Junina do ensaio (`?festa=junina`), as duas roupas da festa (B16: só
 * conquistadas na festa) chegam junto, com o recado da festa.
 *
 * No Windows: `bun build playground/verificar-roupas-browser.ts --target=node --external
 * playwright-core --outfile .cache/verificar-roupas-browser.mjs && node
 * .cache/verificar-roupas-browser.mjs`. Aceita `ARQUIPELAGO_CHROMIUM` e `ARQUIPELAGO_PRINTS`.
 */
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { criarSalvamentoInicial, ilhasDoAnel } from '@sistemazero/arquipelago-contracts'
import { chromium } from 'playwright-core'
import { VESTUARIO_DAS_FESTAS } from '@sistemazero/arquipelago-contracts'
import { falaDasRoupasNovas, ROUPAS_DA_AMIZADE } from '../src/sistemas/roupas'

const port = await new Promise<number>((resolve, reject) => {
  const s = createServer().once('error', reject)
  s.listen(0, '127.0.0.1', () => {
    const a = s.address()
    if (!a || typeof a === 'string') return reject(Error('Sem porta local'))
    s.close(() => resolve(a.port))
  })
})
const baseURL = `http://127.0.0.1:${port}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? path.resolve('.cache/roupas')
mkdirSync(prints, { recursive: true })
const fala = falaDasRoupasNovas([ROUPAS_DA_AMIZADE.jade], null)!
const daJunina = [...VESTUARIO_DAS_FESTAS.junina.conquista]
const falaDaFesta = falaDasRoupasNovas(daJunina, 'junina')!

function semente() {
  const agora = new Date()
  const s = criarSalvamentoInicial(agora)
  s.moradores.jade.amizade = 300
  return {
    revisao: 1,
    atualizadoEm: agora.toISOString(),
    salvamento: {
      ...s,
      casa: { portaNova: true },
      pontesVistas: ilhasDoAnel().map((i) => i.id),
      posicao: { x: 3, y: 1.6, z: 18 },
    },
  }
}

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
    const nome = celular ? 'celular' : 'computador'
    const context = await browser.newContext({
      viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 720 },
      isMobile: celular,
      hasTouch: celular,
      deviceScaleFactor: 0.5,
      reducedMotion: 'reduce',
    })
    context.setDefaultTimeout(60_000)
    await context.addInitScript((salvo) => {
      localStorage.setItem('arquipelago:medir', '1')
      if (!sessionStorage.getItem('roupas-semeado')) {
        localStorage.removeItem('arquipelago-playground:roupas')
        localStorage.setItem('arquipelago-playground', salvo)
        sessionStorage.setItem('roupas-semeado', '1')
      }
    }, JSON.stringify(semente()))
    const page = await context.newPage()
    const erros: string[] = []
    page.on('pageerror', (e) => erros.push(e.message))
    await page.goto(`${baseURL}/?posicao=8&qualidade=leve`, { waitUntil: 'domcontentloaded' })
    await page.getByText(fala).first().waitFor({ timeout: 180_000 })
    await page.screenshot({ path: path.join(prints, `${nome}-roupa-nova.png`) })
    const dadas = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('arquipelago-playground:roupas') ?? '[]'),
    )
    if (JSON.stringify(dadas) !== JSON.stringify([ROUPAS_DA_AMIZADE.jade]))
      throw Error(`Roupas dadas: ${JSON.stringify(dadas)}`)
    // Reabrir confere de novo, mas nada chega duas vezes.
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Abrir o menu' }).waitFor({ timeout: 180_000 })
    await page.waitForTimeout(6000)
    if (await page.getByText(fala).count()) throw Error('O recado da roupa se repetiu')
    if (erros.length) throw Error(erros.join('\n'))
    console.log(`PASS ${nome}: o chapéu da Jade chegou uma vez ao avatar`)
    // Na Festa Junina do ensaio, as roupas da festa chegam (e só elas: a da Jade já foi dada).
    await page.goto(`${baseURL}/?posicao=8&qualidade=leve&festa=junina`, {
      waitUntil: 'domcontentloaded',
    })
    await page.getByText(falaDaFesta).first().waitFor({ timeout: 180_000 })
    await page.screenshot({ path: path.join(prints, `${nome}-roupas-da-festa.png`) })
    const comAFesta = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('arquipelago-playground:roupas') ?? '[]'),
    )
    if (JSON.stringify(comAFesta) !== JSON.stringify([ROUPAS_DA_AMIZADE.jade, ...daJunina]))
      throw Error(`Roupas da festa: ${JSON.stringify(comAFesta)}`)
    if (erros.length) throw Error(erros.join('\n'))
    console.log(`PASS ${nome}: as roupas da Festa Junina chegaram ao avatar na festa`)
    await context.close()
  }
  console.log(`Prints: ${prints}`)
} finally {
  await browser?.close()
  if (server.exitCode === null) server.kill()
}
