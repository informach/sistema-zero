/**
 * A barraca do jogo na feira da Vila Doce e o quiosque do festival no Pico (B10, 31/10/2026), no
 * playground com os minijogos de exemplo (`?jogos=exemplo`): na âncora `jogar` aparece a ação, ela
 * abre a lista só com o minijogo da própria ilha, e "Voltar" fecha. Plataforma falsa, sem banco.
 *
 * No Windows: `bun build playground/verificar-brinquedos-browser.ts --target=node --external
 * playwright-core --outfile .cache/verificar-brinquedos-browser.mjs && node
 * .cache/verificar-brinquedos-browser.mjs`. Aceita `ARQUIPELAGO_CHROMIUM`, `ARQUIPELAGO_PRINTS` e
 * `ARQUIPELAGO_CELULAR=1`.
 */
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { chromium, type Page } from 'playwright-core'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { giroDaIlha, ilhasEmVolta } from '../src/mundo/medidas'
import {
  ANCORA_DO_BRINQUEDO,
  BRINQUEDOS_DE_MINIJOGO,
  type IlhaComBrinquedo,
} from '../src/sistemas/brinquedos-de-minijogo'

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
const celular = process.env.ARQUIPELAGO_CELULAR === '1'
type P = { x: number; y: number; z: number }
/** Os minijogos de exemplo da plataforma falsa (`src/plataforma/falsa.ts`, que traz a arte junto). */
const DE_EXEMPLO: Record<IlhaComBrinquedo, string[]> = {
  'vila-doce': ['Corrida do entregador'],
  pico: ['Fase de plataforma'],
}
const DO_BOSQUE = 'Corrida dos bichos da Ana'
type Desenho = { ilhasCompletas: number }

/** A âncora `jogar` da ilha no mundo e um ponto a 1 m da frente dela, olhando para o brinquedo. */
async function lugarDeJogar(ilha: IlhaComBrinquedo) {
  const noAnel = ilhasEmVolta().find((i) => i.ilha.id === ilha)
  if (!noAnel) throw new Error(`Sem ${ilha} no anel.`)
  const glb = readFileSync(path.resolve('src', 'assets', 'ilhas', `${ilha}.glb`))
  const modelo = (
    await new GLTFLoader().parseAsync(
      glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength),
      '',
    )
  ).scene
  const giro = giroDaIlha(noAnel.ilha)
  const mundo = (nome: string): P => {
    const o = modelo.getObjectByName(nome)
    if (!o) throw new Error(`sem ${nome} em ${ilha}`)
    o.updateWorldMatrix(true, false)
    const { x, y, z } = o.getWorldPosition(o.position.clone())
    return {
      x: noAnel.centro.x + x * Math.cos(giro) + z * Math.sin(giro),
      y,
      z: noAnel.centro.z - x * Math.sin(giro) + z * Math.cos(giro),
    }
  }
  const jogar = mundo(ANCORA_DO_BRINQUEDO)
  const brinquedo = mundo(BRINQUEDOS_DE_MINIJOGO[ilha].no)
  return { jogar, olhar: Math.atan2(brinquedo.x - jogar.x, brinquedo.z - jogar.z) }
}

const server = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
})
server.stdout.on('data', () => {})
server.stderr.on('data', (d) => process.stderr.write(d))
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
const erros: string[] = []
const usar = (page: Page) =>
  celular
    ? page.getByRole('button', { name: 'Usar', exact: true }).click()
    : page.keyboard.press('KeyE')
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
  // Um contexto por ilha: o mesmo aparelho abrindo outro salvamento novo pediria para escolher.
  for (const ilha of ['vila-doce', 'pico'] as const) {
    const context = await browser.newContext({
      viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 720 },
      isMobile: celular,
      hasTouch: celular,
      deviceScaleFactor: 0.5,
      reducedMotion: 'reduce',
    })
    context.setDefaultTimeout(60_000)
    await context.addInitScript(() => {
      localStorage.setItem('arquipelago:medir', '1')
      localStorage.setItem(
        'arquipelago:conforto',
        JSON.stringify({ menosMovimento: true, qualidade: 'leve' }),
      )
    })
    const page = await context.newPage()
    page.on('pageerror', (e) => erros.push(e.message))
    const { jogar, olhar } = await lugarDeJogar(ilha)
    const em = `${jogar.x.toFixed(2)},${jogar.z.toFixed(2)},${(jogar.y + 1.2).toFixed(2)}`
    await page.goto(`${baseURL}/?novo=1&persistir=0&jogos=exemplo&posicao=8&em=${em}`, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForFunction(
      () =>
        ((globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho?.ilhasCompletas ??
          0) > 0,
      undefined,
      { timeout: 240_000 },
    )
    await page.evaluate(
      ({ x, y, z, g }) =>
        (globalThis as { __arquipelagoLevar?: (...a: number[]) => void }).__arquipelagoLevar?.(
          x,
          y,
          z,
          g,
        ),
      { x: jogar.x, y: jogar.y + 1.2, z: jogar.z, g: olhar + Math.PI },
    )
    const brinquedo = BRINQUEDOS_DE_MINIJOGO[ilha]
    try {
      await page.locator('.arq-acao').filter({ hasText: brinquedo.rotulo }).waitFor()
    } catch (e) {
      await page.screenshot({ path: path.join(prints, `brinquedo-${ilha}-falhou.png`) })
      const acoes = await page.locator('.arq-acao').allInnerTexts()
      const onde = await page.evaluate(
        () =>
          (globalThis as { __arquipelagoDesenho?: { posicao?: P } }).__arquipelagoDesenho?.posicao,
      )
      throw Error(`${ilha}: sem a ação (ações: ${acoes.join(' | ')}; em ${JSON.stringify(onde)})`, {
        cause: e,
      })
    }
    await page.screenshot({ path: path.join(prints, `brinquedo-${ilha}-1-acao.png`) })
    await usar(page)
    const painel = page.getByRole('dialog', { name: brinquedo.titulo, exact: true })
    await painel.waitFor()
    const daIlha = DE_EXEMPLO[ilha]
    for (const titulo of daIlha)
      await painel.getByRole('button', { name: `Jogar ${titulo}`, exact: true }).waitFor()
    const botoes = await painel.getByRole('button', { name: /^Jogar / }).count()
    if (botoes !== daIlha.length) throw Error(`${ilha}: ${botoes} jogos na lista`)
    if (await painel.getByText(DO_BOSQUE).count())
      throw Error(`${ilha}: o minijogo do Bosque apareceu`)
    await page.screenshot({ path: path.join(prints, `brinquedo-${ilha}-2-lista.png`) })
    await painel.getByRole('button', { name: 'Voltar', exact: true }).click()
    await painel.waitFor({ state: 'detached' })
    console.log(`PASS ${ilha}: "${brinquedo.rotulo}" abre só os minijogos da ilha`)
    await context.close()
  }
  if (erros.length) throw Error(erros.join('\n'))
  console.log(`Prints: ${prints}`)
} finally {
  await browser?.close()
  if (server.exitCode === null) server.kill()
}
