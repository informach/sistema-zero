/** Plataforma falsa, sem persistência. Compilar para Node como verificar-luneta-browser.ts. */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { PerspectiveCamera, Vector3 } from 'three'

const porta = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4597)
const base = `http://127.0.0.1:${porta}`
const prints = path.resolve('.cache/aconchego')
mkdirSync(prints, { recursive: true })
const linux = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const executavel = process.env.ARQUIPELAGO_CHROMIUM ?? (existsSync(linux) ? linux : undefined)
const servidor = spawn('bun', ['run', 'dev'], {
  env: { ...process.env, PORTA: String(porta) },
  stdio: ['ignore', 'pipe', 'pipe'],
})
servidor.stdout.on('data', () => {})
servidor.stderr.on('data', (d) => process.stderr.write(d))
type Janela = typeof globalThis & {
  __arquipelagoDesenho?: { camera: { x: number; y: number; z: number } }
}
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  const fim = Date.now() + 30_000
  while (true) {
    if (servidor.exitCode !== null) throw new Error('Playground encerrou')
    try {
      if ((await fetch(base)).ok) break
    } catch {}
    if (Date.now() > fim) throw new Error('Playground não iniciou')
    await new Promise((r) => setTimeout(r, 200))
  }
  browser = await chromium.launch({
    ...(executavel ? { executablePath: executavel } : { channel: 'chrome' }),
    headless: true,
  })
  for (const tela of [
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
  ]) {
    const contexto = await browser.newContext({ viewport: tela, hasTouch: tela.width === 390 })
    await contexto.addInitScript(() => localStorage.setItem('arquipelago:medir', '1'))
    const p = await contexto.newPage()
    p.setDefaultTimeout(45_000)
    const erros: string[] = []
    p.on('pageerror', (e) => erros.push(e.message))
    await p.goto(`${base}/?novo=1&persistir=0&obra=exemplo`, { waitUntil: 'networkidle' })
    await p.getByRole('button', { name: 'Construir', exact: true }).click()
    await p.getByRole('button', { name: 'Olhar', exact: true }).click()
    await p.waitForTimeout(1800)
    // Projeta uma célula do quarto com a câmera real medida e o alvo inicial do Construir.
    const pos = await p.evaluate(() => (globalThis as Janela).__arquipelagoDesenho?.camera)
    assert(pos)
    const cam = new PerspectiveCamera(55, tela.width / tela.height, 0.1, 1000)
    cam.position.set(pos.x, pos.y, pos.z)
    cam.lookAt(0, 1.02, -3)
    cam.updateMatrixWorld()
    const projetar = (x: number, z: number) => {
      const v = new Vector3(x, 1.02, z).project(cam)
      return { x: ((v.x + 1) * tela.width) / 2, y: ((1 - v.y) * tela.height) / 2 }
    }
    const alvo = projetar(0, -5)
    if (tela.width === 390) await p.touchscreen.tap(alvo.x, alvo.y)
    else await p.mouse.click(alvo.x, alvo.y)
    const painel = p.getByRole('region', { name: 'Aconchego do cômodo' })
    await painel.waitFor()
    assert.equal(await p.getByLabel('Cômodo observado').inputValue(), '-6,-8')
    const quarto = await painel.innerText()
    assert(quarto.includes('Muito aconchegante'))
    await p.getByLabel('Cômodo observado').selectOption('-6,0')
    await painel.getByText('Aconchego', { exact: true }).click()
    // O exemplo já ganhou a planta de interior: a dica sugere pôr no cômodo que não tem.
    assert((await painel.innerText()).includes('A planta de interior traz mais aconchego'))
    assert.equal(await painel.locator('dt').count(), 5)
    const caixa = await painel.boundingBox()
    assert(caixa && caixa.x >= 0 && caixa.x + caixa.width <= tela.width && caixa.y >= 60)
    assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await p.screenshot({ path: path.join(prints, `aconchego-${tela.width}.png`) })
    if (tela.width === 1280) {
      // Edita de verdade, confere o recálculo e desfaz. Só o serviço em memória participa.
      await p.getByRole('button', { name: 'Fechar aconchego' }).click()
      await p.mouse.move(640, 350)
      await p.mouse.down()
      await p.mouse.move(640, 180, { steps: 10 })
      await p.mouse.up()
      await p.waitForTimeout(1500)
      const perto = await p.evaluate(() => (globalThis as Janela).__arquipelagoDesenho?.camera)
      assert(perto)
      cam.position.set(perto.x, perto.y, perto.z)
      cam.lookAt(perto.x, 1.02, perto.z - Math.cos(0.95) * 24)
      cam.updateMatrixWorld()
      await p.getByRole('button', { name: 'Janela', exact: true }).click()
      await p.getByRole('button', { name: 'Redonda', exact: true }).click()
      const janela = projetar(-1.5, 3)
      await p.mouse.click(janela.x, janela.y)
      await p.waitForTimeout(150)
      assert(await p.getByRole('button', { name: '↶ Desfazer', exact: true }).isEnabled())
      await p.getByRole('button', { name: '☆ Aconchego', exact: true }).click()
      assert((await painel.innerText()).includes('16 pontos'))
      await p.getByRole('button', { name: '↶ Desfazer', exact: true }).click()
      assert((await painel.innerText()).includes('14 pontos'))
      await p.getByRole('button', { name: 'Piso', exact: true }).click()
      await p.getByRole('button', { name: 'Azulejo', exact: true }).click()
      const piso = projetar(-4, 1)
      await p.mouse.click(piso.x, piso.y)
      assert(await p.getByRole('button', { name: '↶ Desfazer', exact: true }).isEnabled())
      await p.getByRole('button', { name: '☆ Aconchego', exact: true }).click()
      assert((await painel.innerText()).includes('14 pontos'))
      await p.getByRole('button', { name: '↶ Desfazer', exact: true }).click()
    }
    // Fechar, arrastar e voltar ao painel não pode selecionar outro cômodo.
    await p.getByRole('button', { name: 'Fechar aconchego' }).click()
    await p.mouse.move(alvo.x, alvo.y)
    await p.mouse.down()
    await p.mouse.move(alvo.x + 40, alvo.y, { steps: 6 })
    await p.mouse.up()
    assert.equal(await painel.count(), 0)
    await p.getByRole('button', { name: '☆ Aconchego', exact: true }).click()
    assert.equal(await p.getByLabel('Cômodo observado').inputValue(), '-6,0')
    await p.getByRole('button', { name: 'Piso', exact: true }).click()
    assert.equal(await painel.count(), 0)
    // O seletor da barra também funciona por teclado, sem exigir acertar o chão.
    await p.getByRole('button', { name: '☆ Aconchego', exact: true }).focus()
    await p.keyboard.press('Enter')
    await painel.waitFor()
    await p.getByLabel('Cômodo observado').selectOption('-6,-8')
    assert.equal(await painel.innerText(), quarto)
    await p.getByRole('button', { name: 'Pronto', exact: true }).click()
    assert.equal(await painel.count(), 0)
    assert.deepEqual(erros, [])
    console.log(`PASS ${tela.width}: toque, seletor, arrasto, teclado, parcelas e Viver`)
    await contexto.close()
  }
  console.log(`Prints: ${prints}`)
} finally {
  await browser?.close()
  if (servidor.exitCode === null) servidor.kill()
}
