/** Pausa e menos movimento nas poses reais do quarto, sem banco ou plataforma remota. */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { chromium } from 'playwright-core'

type Pose = { nome: string; pose: number[] }
type Inspecao = { __arquipelagoLerQuarto?: () => Pose[] }
const port = await new Promise<number>((resolve, reject) => {
  const reserva = createServer()
  reserva.once('error', reject)
  reserva.listen(0, '127.0.0.1', () => {
    const a = reserva.address()
    if (!a || typeof a === 'string') return reject(new Error('Sem porta local'))
    reserva.close(() => resolve(a.port))
  })
})
const base = `http://127.0.0.1:${port}`
const prints =
  process.env.ARQUIPELAGO_PRINTS ?? path.resolve('../../docs/qa/2026-10-30-quarto-pausa')
mkdirSync(prints, { recursive: true })
const server = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(port) },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
let pronto = false
server.stdout.on('data', (d) => {
  if (String(d).includes('Arquipélago no ar')) pronto = true
})
server.stderr.on('data', (d) => process.stderr.write(d))
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  const limite = Date.now() + 30_000
  while (!pronto) {
    if (server.exitCode !== null || Date.now() > limite) throw new Error('Playground não iniciou')
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
    const tipo = celular ? 'celular' : 'computador'
    if (process.env.ARQUIPELAGO_TELA && process.env.ARQUIPELAGO_TELA !== tipo) continue
    const context = await browser.newContext({
      viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 720 },
      isMobile: celular,
      hasTouch: celular,
    })
    context.setDefaultTimeout(120_000)
    await context.addInitScript(() => {
      localStorage.setItem('arquipelago:medir', '1')
      localStorage.setItem('arquipelago:camera-dica', '1')
      localStorage.setItem('arquipelago:conforto', JSON.stringify({ qualidade: 'leve' }))
    })
    const page = await context.newPage()
    const erros: string[] = []
    const resultados: string[] = []
    page.on('pageerror', (e) => erros.push(e.message))
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto(
      `${base}/?novo=1&posicao=4&dia=nenhum&pet=passaro&familia=irmaos&qualidade=leve`,
    )
    await page.waitForFunction(
      () => ((globalThis as Inspecao).__arquipelagoLerQuarto?.().length ?? 0) > 50,
    )
    await page.getByRole('button', { name: 'Abrir o menu' }).waitFor()
    const ler = () => page.evaluate(() => (globalThis as Inspecao).__arquipelagoLerQuarto?.() ?? [])
    const conferir = async (nome: string, parado: boolean) => {
      // O SwiftShader pode desenhar abaixo de 3 FPS nesta máquina. Espera quadros reais:
      // uma espera fixa de 400 ms fotografava antes do evento de mídia ser aplicado.
      await page.evaluate(async () => {
        for (let i = 0; i < 3; i++) await new Promise(requestAnimationFrame)
      })
      const antes = await ler()
      assert.ok(antes.length > 50, 'modelos carregados')
      await page.waitForTimeout(900)
      await page.evaluate(async () => {
        for (let i = 0; i < 3; i++) await new Promise(requestAnimationFrame)
      })
      const depois = await ler()
      if (parado) assert.deepEqual(depois, antes, `${nome}: a pose mudou`)
      else assert.notDeepEqual(depois, antes, `${nome}: não houve animação`)
      resultados.push(`${nome}: ${parado ? 'pose conservada' : 'movimento observado'}`)
    }
    const pausar = async () => {
      await page.getByRole('button', { name: 'Abrir o menu' }).click()
      await page.getByRole('button', { name: 'Continuar jogando', exact: true }).waitFor()
    }
    const retomar = () =>
      page.getByRole('button', { name: 'Continuar jogando', exact: true }).click()
    await conferir('pássaro ativo', false)
    await pausar()
    await conferir('menu', true)
    await page.screenshot({ path: path.join(prints, `menu-${tipo}.png`) })
    await retomar()
    await conferir('retomada', false)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await conferir('preferência do aparelho', true)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await conferir('aparelho voltou ao movimento', false)
    await pausar()
    await page.getByRole('button', { name: 'Conforto e controles', exact: true }).click()
    await page.getByRole('checkbox', { name: 'Menos movimento da câmera e do ambiente' }).check()
    await retomar()
    await conferir('preferência do jogo', true)
    await page.screenshot({ path: path.join(prints, `quarto-${tipo}.png`) })
    await pausar()
    await page.getByRole('button', { name: 'Conforto e controles', exact: true }).click()
    await page.getByRole('checkbox', { name: 'Menos movimento da câmera e do ambiente' }).uncheck()
    await retomar()
    await conferir('jogo voltou ao movimento', false)
    await pausar()
    await page.getByRole('button', { name: 'Visitar um irmão', exact: true }).click()
    await conferir('painel de visitas', true)
    await page.getByRole('button', { name: 'Ver a casa de Ana', exact: true }).click()
    await page.getByText('Você está na casa de Ana. Aqui você só olha.', { exact: true }).waitFor()
    // A faixa chega antes dos GLBs do outro quarto. Não confundir sua montagem com animação.
    await page.waitForFunction(() => {
      const nomes = new Set((globalThis as Inspecao).__arquipelagoLerQuarto?.().map((p) => p.nome))
      return [
        'beliche',
        'estante',
        'mesa-estudo',
        'pufe',
        'planta',
        'poster',
        'mapa-mundi',
        'rabo',
        'corpo',
      ].every((n) => nomes.has(n))
    })
    await conferir('pet da visita ativo', false)
    await pausar()
    await conferir('visita pausada', true)
    await retomar()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await conferir('visita com menos movimento', true)
    assert.deepEqual(erros, [])
    writeFileSync(
      path.join(prints, `resultado-${tipo}.json`),
      JSON.stringify({ resultados, erros }, null, 2),
    )
    console.log(`${tipo}: ${resultados.length} verificações de pose passaram`)
    await context.close()
  }
} finally {
  await browser?.close()
  server.kill()
}
