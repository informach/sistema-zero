/** bun playground/verificar-luneta-browser.ts. Só usa a plataforma falsa, sem banco. */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { tabuasDaPonte } from '../src/mundo/colisao-da-ilha-central'
import { LUNETA, vistaDaLuneta } from '../src/mundo/luneta-medidas'
import { trajetoDaPonte } from '../src/mundo/medidas'
import { ilhaDaLuneta } from '../src/sistemas/luneta'

const porta = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4596)
const base = `http://127.0.0.1:${porta}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? path.resolve('.cache/luneta')
mkdirSync(prints, { recursive: true })
const chromiumLinux = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const executavel =
  process.env.ARQUIPELAGO_CHROMIUM ?? (existsSync(chromiumLinux) ? chromiumLinux : undefined)
const servidor = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(porta) },
  stdio: ['ignore', 'pipe', 'pipe'],
})
servidor.stdout.on('data', () => {})
servidor.stderr.on('data', (d) => process.stderr.write(d))
type Medida = {
  posicao: { x: number; y: number; z: number }
  camera: { x: number; y: number; z: number }
  ilhasCompletas: number
}
type Janela = typeof globalThis & {
  __arquipelagoDesenho?: Medida
  __arquipelagoLevar?: (x: number, y: number, z: number, giro: number) => void
}
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  const limite = Date.now() + 30_000
  while (true) {
    if (servidor.exitCode !== null) throw new Error('O playground encerrou antes de iniciar')
    try {
      if ((await fetch(base)).ok) break
    } catch {}
    if (Date.now() > limite) throw new Error('O playground não iniciou')
    await new Promise((r) => setTimeout(r, 200))
  }
  browser = await chromium.launch({
    ...(executavel ? { executablePath: executavel } : { channel: 'chrome' }),
    headless: true,
  })
  for (const caso of [
    { posto: 1, reduzido: false, largura: 1280, altura: 800 },
    { posto: 2, reduzido: true, largura: 390, altura: 844 },
    { posto: 8, reduzido: false, largura: 1280, altura: 800 },
  ]) {
    const contexto = await browser.newContext({
      viewport: { width: caso.largura, height: caso.altura },
      reducedMotion: caso.reduzido ? 'reduce' : 'no-preference',
      hasTouch: caso.largura < 500,
    })
    await contexto.addInitScript(() => localStorage.setItem('arquipelago:medir', '1'))
    const pagina = await contexto.newPage()
    pagina.setDefaultTimeout(45_000)
    const erros: string[] = []
    const glbs: string[] = []
    pagina.on('pageerror', (e) => erros.push(e.message))
    pagina.on('request', (r) => {
      if (r.url().endsWith('.glb')) glbs.push(r.url())
    })
    await pagina.goto(`${base}/?novo=1&persistir=0&posicao=${caso.posto}&em=${LUNETA.x},28,1.6`, {
      waitUntil: 'networkidle',
    })
    await pagina.waitForFunction(() => (globalThis as Janela).__arquipelagoLevar)
    await pagina.evaluate(
      (x) => (globalThis as Janela).__arquipelagoLevar?.(x, 1.6, 28, Math.PI),
      LUNETA.x,
    )
    await pagina.locator('canvas').click({ position: { x: 180, y: 300 } })
    await pagina.keyboard.down('w')
    await pagina.waitForFunction(
      () => ((globalThis as Janela).__arquipelagoDesenho?.posicao.z ?? 0) > 34.1,
    )
    await pagina.keyboard.up('w')
    await pagina.locator('.arq-acao').filter({ hasText: 'Olhar pela luneta' }).waitFor()
    await pagina.waitForTimeout(400)
    const antes = await pagina.evaluate(() => (globalThis as Janela).__arquipelagoDesenho)
    assert(antes)
    if (caso.largura < 500) await pagina.getByRole('button', { name: 'Usar', exact: true }).click()
    else await pagina.keyboard.press('e')
    const visor = pagina.getByRole('region', { name: 'Vista pela luneta' })
    await visor.waitFor()
    await pagina.waitForTimeout(700)
    const dentro = await pagina.evaluate(() => (globalThis as Janela).__arquipelagoDesenho)
    assert(dentro)
    assert.equal(dentro.ilhasCompletas, 0)
    assert(
      Math.hypot(dentro.posicao.x - antes.posicao.x, dentro.posicao.z - antes.posicao.z) < 0.08,
    )
    const vista = vistaDaLuneta(ilhaDaLuneta(caso.posto), caso.largura / caso.altura)
    assert(
      Math.hypot(
        dentro.camera.x - vista.posicao.x,
        dentro.camera.y - vista.posicao.y,
        dentro.camera.z - vista.posicao.z,
      ) < 0.05,
    )
    assert(
      glbs.every(
        (url) => !/\/(bosque|vila-doce|recife|pico|vale-dos-dinos|nuvens)-[^/]*\.glb$/.test(url),
      ),
    )
    await pagina.screenshot({ path: path.join(prints, `luneta-posto-${caso.posto}.png`) })
    // Tira o foco de Voltar: espaço num botão deve ativá-lo, não testar o pulo.
    await visor.click({ position: { x: 180, y: 200 } })
    await pagina.keyboard.press('w')
    await pagina.keyboard.press('Space')
    if (caso.posto === 1) await pagina.keyboard.press('Escape')
    else await pagina.getByRole('button', { name: 'Voltar', exact: true }).click()
    await visor.waitFor({ state: 'hidden' })
    await pagina.waitForTimeout(400)
    const depois = await pagina.evaluate(() => (globalThis as Janela).__arquipelagoDesenho)
    assert(depois)
    assert(
      Math.hypot(
        depois.camera.x - antes.camera.x,
        depois.camera.y - antes.camera.y,
        depois.camera.z - antes.camera.z,
      ) < 1,
    )
    await pagina.locator('canvas').click({ position: { x: 180, y: 300 } })
    await pagina.keyboard.down('s')
    await pagina.waitForTimeout(500)
    await pagina.keyboard.up('s')
    const andando = await pagina.evaluate(
      () => (globalThis as Janela).__arquipelagoDesenho?.posicao.z,
    )
    assert(andando !== undefined && andando < depois.posicao.z - 0.3)
    if (caso.posto === 1) {
      const tabuas = tabuasDaPonte(trajetoDaPonte(ilhaDaLuneta(1), 36))
      const t = tabuas[Math.floor(tabuas.length * 0.25) - 1]
      assert(t)
      await pagina.evaluate(
        (t) =>
          (globalThis as Janela).__arquipelagoLevar?.(
            t.x - Math.sin(t.giro) * 2,
            t.y + 1.2,
            t.z - Math.cos(t.giro) * 2,
            t.giro + Math.PI,
          ),
        t,
      )
      await pagina.waitForTimeout(1000)
      await pagina.locator('.arq-acao').filter({ hasText: 'Ler recado da Íris' }).waitFor()
      await pagina.keyboard.press('e')
      await pagina.locator('.arq-dica').filter({ hasText: 'Tem mais para descobrir.' }).waitFor()
      await pagina.waitForTimeout(500)
      await pagina.screenshot({ path: path.join(prints, 'placa-ponte-bosque.png') })
    }
    assert.deepEqual(erros, [])
    console.log(
      `PASS posto ${caso.posto}: caminhada, E/Usar, vista sem ilha completa, saída e volta ao movimento`,
    )
    await contexto.close()
  }
  console.log(`Prints: ${prints}`)
} finally {
  await browser?.close()
  if (servidor.exitCode === null) servidor.kill()
}
