/** Festa na Vila com serviço em memória, sem conta nem banco. Compilar para Node no Windows. */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { chromium } from 'playwright-core'
import { FOGUEIRA_DA_FESTA } from '../src/mundo/arranjo-da-festa'
import { giroDaIlha, ilhasEmVolta } from '../src/mundo/medidas'
import type { MedidaDoDesenho } from '../src/mundo/medidor'

declare global {
  var __arquipelagoDesenho: MedidaDoDesenho | undefined
  var __arquipelagoLevar: ((x: number, y: number, z: number, giro?: number) => void) | undefined
}
const port = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4651),
  base = `http://127.0.0.1:${port}`
const prints = path.resolve(
  process.env.ARQUIPELAGO_PRINTS ?? '../../docs/qa/assets/2026-10-29-festa',
)
mkdirSync(prints, { recursive: true })
const vila = ilhasEmVolta().find((i) => i.ilha.id === 'vila-doce')!
const giro = giroDaIlha(vila.ilha)
const mundo = (x: number, z: number) => ({
  x: vila.centro.x + x * Math.cos(giro) + z * Math.sin(giro),
  z: vila.centro.z - x * Math.sin(giro) + z * Math.cos(giro),
})
const perto = mundo(FOGUEIRA_DA_FESTA.x + 1.7, FOGUEIRA_DA_FESTA.z)
const salvo = criarSalvamentoInicial(new Date(Date.now() - 13 * 60_000))
salvo.posicao = { ...perto, y: 2.2 }
salvo.casa.portaNova = true
salvo.inventario = { milho: 2 }
salvo.necessidades.diversao = 20
salvo.pontesVistas = ['bosque', 'vila-doce']
const probe = createServer()
await new Promise<void>((resolve, reject) => {
  probe.once('error', reject)
  probe.listen(port, '127.0.0.1', resolve)
})
await new Promise<void>((resolve) => probe.close(() => resolve()))
const server = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
})
server.stdout.on('data', () => {})
server.stderr.on('data', (d) => process.stderr.write(d))
const terminou = new Promise<void>((resolve) => server.once('exit', () => resolve()))
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
const resultados: string[] = []
try {
  const limite = Date.now() + 30_000
  while (true) {
    try {
      if ((await fetch(base)).ok) break
    } catch {}
    if (Date.now() > limite || server.exitCode !== null) throw Error('Playground não iniciou')
    await new Promise((r) => setTimeout(r, 200))
  }
  const linux = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
  const executablePath = process.env.ARQUIPELAGO_CHROMIUM ?? (existsSync(linux) ? linux : undefined)
  browser = await chromium.launch({
    ...(executablePath ? { executablePath } : { channel: 'chrome' }),
    headless: true,
  })
  for (const largura of [1280, 390]) {
    const context = await browser.newContext({
      viewport: { width: largura, height: 844 },
      hasTouch: largura === 390,
    })
    context.setDefaultTimeout(90_000)
    await context.addInitScript(
      ({ base, salvo }) => {
        if (location.origin !== base) return
        localStorage.setItem('arquipelago:medir', '1')
        if (!localStorage.getItem('festa-qa-iniciada')) {
          localStorage.setItem(
            'arquipelago-playground',
            JSON.stringify({
              revisao: 1,
              salvamento: salvo,
              atualizadoEm: new Date().toISOString(),
            }),
          )
          localStorage.setItem('festa-qa-iniciada', '1')
        }
      },
      { base, salvo },
    )
    const page = await context.newPage(),
      erros: string[] = []
    page.on('pageerror', (e) => erros.push(e.message))
    await page.goto(`${base}/?posicao=3&festa=junina&dia=nenhum`, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(
      () =>
        globalThis.__arquipelagoDesenho?.festa.nome === 'festa-da-vila-junina' &&
        globalThis.__arquipelagoDesenho.festa.emissao.some((e) => e > 0),
    )
    const fogo = await page.evaluate(() => globalThis.__arquipelagoDesenho?.festa.escalaDoFogo)
    await page.waitForFunction(
      (inicial) =>
        JSON.stringify(globalThis.__arquipelagoDesenho?.festa.escalaDoFogo) !==
        JSON.stringify(inicial),
      fogo,
    )
    await page.evaluate(({ x, z, giro }) => globalThis.__arquipelagoLevar?.(x, 2.2, z, giro), {
      ...perto,
      giro: giro + Math.PI / 2,
    })
    await page.getByText('Cozinhar na fogueira', { exact: false }).first().waitFor()
    // Teleporte e câmera suavizam em quadros diferentes. O print espera a pose realmente parar.
    await page.waitForFunction(() => {
      const d = globalThis.__arquipelagoDesenho
      if (!d?.noChao) return false
      const g = globalThis as typeof globalThis & {
        __cameraDaFesta?: { x: number; y: number; z: number; desde: number }
      }
      const anterior = g.__cameraDaFesta
      if (
        !anterior ||
        Math.hypot(d.camera.x - anterior.x, d.camera.y - anterior.y, d.camera.z - anterior.z) > 0.03
      ) {
        g.__cameraDaFesta = { ...d.camera, desde: performance.now() }
        return false
      }
      return performance.now() - anterior.desde > 600
    })
    await page.screenshot({ path: path.join(prints, `junina-noite-${largura}.png`) })
    // E é a mesma ação usada pelo botão de toque. O teste usa o teclado também na viewport móvel.
    await page.keyboard.press('KeyE')
    const painel = page.getByRole('dialog', { name: 'Fogueira da Festa Junina' })
    await painel.waitFor()
    await painel.getByRole('button', { name: /Pipoca de festa:/ }).click()
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem('arquipelago-playground') ?? '{}').salvamento?.inventario?.[
          'pipoca-de-festa'
        ] === 1,
    )
    assert.equal(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('arquipelago-playground') ?? '{}').salvamento.inventario
            .milho,
      ),
      1,
    )
    await page.screenshot({ path: path.join(prints, `pipoca-${largura}.png`) })
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await painel.getByRole('button', { name: 'Voltar ao jogo' }).click()
    await page.getByRole('button', { name: 'Comer pipoca de festa (1)', exact: true }).click()
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem('arquipelago-playground') ?? '{}').salvamento?.necessidades
          ?.diversao > 45,
    )
    // Espera a fila de falas inicial terminar: o aviso sazonal não apaga outra dica.
    await page.waitForFunction(() =>
      Object.keys(localStorage).some(
        (k) => k.startsWith('arquipelago:festa:') && k.endsWith(':junina'),
      ),
    )
    const avisos = await page.evaluate(() =>
      Object.keys(localStorage)
        .filter((k) => k.startsWith('arquipelago:festa:'))
        .map((k) => [k, localStorage.getItem(k)]),
    )
    await page.evaluate(() => globalThis.__arquipelagoLevar?.(0, 2, 10))
    await page.waitForFunction(() => globalThis.__arquipelagoDesenho?.festa.nome === null)
    await page.evaluate(({ x, z }) => globalThis.__arquipelagoLevar?.(x, 2.2, z), perto)
    await page.waitForFunction(
      () => globalThis.__arquipelagoDesenho?.festa.nome === 'festa-da-vila-junina',
    )
    assert.deepEqual(
      await page.evaluate(() =>
        Object.keys(localStorage)
          .filter((k) => k.startsWith('arquipelago:festa:'))
          .map((k) => [k, localStorage.getItem(k)]),
      ),
      avisos,
    )
    assert.deepEqual(erros, [])
    resultados.push(
      `Junina ${largura}: luz, clipe, E, receita, inventário, diversão, aviso e desmontagem`,
    )
    await context.close()
  }
  writeFileSync(
    path.join(prints, 'resultado.json'),
    `${JSON.stringify(
      { resultados, navegador: await browser.version(), aparelhoFisico: false },
      null,
      2,
    )}\n`,
  )
  console.log(`PASS ${resultados.length} fluxos. ${prints}`)
} finally {
  await browser?.close()
  if (server.exitCode === null) server.kill()
  await Promise.race([
    terminou,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(Error('Servidor não encerrou')), 5000).unref(),
    ),
  ])
}
