/**
 * Os móveis da cozinha, da sala e do banheiro no modo Construir, no navegador de verdade: a obra
 * de exemplo do playground (`?obra=exemplo`), a ferramenta Móveis com as abas, toques na grade,
 * a peça de parede achando a parede, a recusa no quarto e o Desfazer. Desde 31/10/2026, com a
 * Vila Doce aberta e a Festa Junina do playground (`posicao=3&festa=junina`), também as abas do
 * café (B7) e da festa (B9), pondo peças no cômodo da direita. Plataforma falsa, sem
 * persistência. Compilar para Node como os outros:
 *
 *   bun build playground/verificar-moveis-browser.ts --target=node --external playwright-core \
 *     --outfile .cache/verificar-moveis-browser.mjs && node .cache/verificar-moveis-browser.mjs
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { PerspectiveCamera, Vector3 } from 'three'

const porta = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4598)
const base = `http://127.0.0.1:${porta}`
const prints = path.resolve(process.env.ARQUIPELAGO_PRINTS ?? '.cache/moveis')
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

/** A altura do piso da casa na grade (a mesma do verificador do aconchego). */
const PISO = 1.02

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
    const celular = tela.width === 390
    const contexto = await browser.newContext({ viewport: tela, hasTouch: celular })
    await contexto.addInitScript(() => localStorage.setItem('arquipelago:medir', '1'))
    const p = await contexto.newPage()
    p.setDefaultTimeout(45_000)
    const erros: string[] = []
    p.on('pageerror', (e) => erros.push(e.message))
    await p.goto(`${base}/?novo=1&persistir=0&obra=exemplo`, { waitUntil: 'networkidle' })
    await p.getByRole('button', { name: 'Construir', exact: true }).click()
    await p.getByRole('button', { name: 'Móveis', exact: true }).click()
    await p.waitForTimeout(1800)
    const pos = await p.evaluate(() => (globalThis as Janela).__arquipelagoDesenho?.camera)
    assert(pos)
    const cam = new PerspectiveCamera(55, tela.width / tela.height, 0.1, 1000)
    cam.position.set(pos.x, pos.y, pos.z)
    cam.lookAt(0, PISO, -3)
    cam.updateMatrixWorld()
    const projetar = (x: number, z: number) => {
      const v = new Vector3(x, PISO, z).project(cam)
      return { x: ((v.x + 1) * tela.width) / 2, y: ((1 - v.y) * tela.height) / 2 }
    }
    const tocar = async (x: number, z: number) => {
      const alvo = projetar(x, z)
      if (celular) await p.touchscreen.tap(alvo.x, alvo.y)
      else await p.mouse.click(alvo.x, alvo.y)
      await p.waitForTimeout(250)
    }
    const desfazer = p.getByRole('button', { name: '↶ Desfazer', exact: true })

    // As três abas e as miniaturas do cômodo escolhido.
    const abas = p.getByRole('group', { name: 'Cômodo dos móveis' })
    for (const nome of ['Cozinha', 'Sala', 'Banheiro'])
      await abas.getByRole('button', { name: nome, exact: true }).waitFor()
    const moveis = p.getByRole('group', { name: 'Móvel' })
    assert.equal(await moveis.getByRole('button').count(), 6) // os seis da cozinha
    await p.screenshot({ path: path.join(prints, `moveis-barra-${tela.width}.png`) })
    assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth))

    if (celular) {
      // No celular a fileira das miniaturas rola para o lado, sem passar da tela.
      await abas.getByRole('button', { name: 'Sala', exact: true }).click()
      const fileira = await moveis.evaluate((el) => ({
        rola: el.scrollWidth > el.clientWidth,
        direita: el.getBoundingClientRect().right,
      }))
      assert(fileira.rola && fileira.direita <= tela.width)
      await p.screenshot({ path: path.join(prints, 'moveis-sala-390.png') })
    } else {
      // No quarto não vai: o Zappy explica.
      await moveis
        .getByRole('button', { name: /^Balcão/ })
        .first()
        .click()
      await tocar(-2.5, -4.5)
      await p.getByText('O quarto é o da plataforma. Ponha o móvel num cômodo novo.').waitFor()
      assert(!(await desfazer.isEnabled()))
    }

    if (!celular) {
      // Arrasta a vista (no Olhar) para o cômodo da frente sair de baixo da barra, como no aconchego.
      await p.getByRole('button', { name: 'Olhar', exact: true }).click()
      await p.mouse.move(640, 300)
      await p.mouse.down()
      await p.mouse.move(640, 120, { steps: 10 })
      await p.mouse.up()
      await p.waitForTimeout(1500)
      const perto = await p.evaluate(() => (globalThis as Janela).__arquipelagoDesenho?.camera)
      assert(perto)
      cam.position.set(perto.x, perto.y, perto.z)
      cam.lookAt(perto.x, PISO, perto.z - Math.cos(0.95) * 24)
      cam.updateMatrixWorld()
      await p.getByRole('button', { name: 'Móveis', exact: true }).click()
      // O balcão no canto do cômodo da frente, encostado na parede do quarto.
      await moveis.getByRole('button', { name: 'Balcão', exact: true }).click()
      await tocar(-5.5, 0.5)
      assert(await desfazer.isEnabled())
      // A prateleira acha a parede da esquerda (x = -6) sozinha.
      await moveis.getByRole('button', { name: /Prateleira de potes/ }).click()
      await tocar(-5.9, 1.5)
      // Sala: o tapete no meio (a geladeira fica em cima dele) e a poltrona.
      await abas.getByRole('button', { name: 'Sala', exact: true }).click()
      await moveis.getByRole('button', { name: 'Tapete', exact: true }).click()
      await tocar(-3.5, 1.5)
      await moveis.getByRole('button', { name: 'Poltrona', exact: true }).click()
      await tocar(-2.5, 2.5)
      await moveis.getByRole('button', { name: 'Luminária de pé', exact: true }).click()
      await tocar(-1.5, 0.5)
      // Banheiro no cômodo da direita: vaso, pia e espelho em cima da pia.
      await abas.getByRole('button', { name: 'Banheiro', exact: true }).click()
      await moveis.getByRole('button', { name: 'Vaso sanitário', exact: true }).click()
      await tocar(6.5, -5.5)
      await moveis.getByRole('button', { name: 'Pia', exact: true }).click()
      await tocar(7.5, -5.5)
      await moveis.getByRole('button', { name: /^Espelho/ }).click()
      await tocar(7.5, -5.9)
      await p.waitForTimeout(1200)
      await p.screenshot({ path: path.join(prints, 'moveis-construir-1280.png') })
      // O aconchego do cômodo da frente soma os móveis.
      await p.getByRole('button', { name: '☆ Aconchego', exact: true }).click()
      await p.getByLabel('Cômodo observado').selectOption('-6,0')
      const painel = p.getByRole('region', { name: 'Aconchego do cômodo' })
      const texto = await painel.innerText()
      console.log(`aconchego da frente: ${texto.replace(/\s+/g, ' ').slice(0, 200)}`)
      await p.screenshot({ path: path.join(prints, 'moveis-aconchego-1280.png') })
      await p.getByRole('button', { name: 'Fechar aconchego' }).click()
      // Desfazer tira o último (o espelho), sem mexer no resto.
      await desfazer.click()
      // Volta ao Viver: os móveis ficam, com a colisão.
      await p.getByRole('button', { name: 'Pronto', exact: true }).click()
      await p.waitForTimeout(1500)
      await p.screenshot({ path: path.join(prints, 'moveis-viver-1280.png') })
    }
    assert.deepEqual(erros, [])
    console.log(
      `PASS ${tela.width}: abas, miniaturas${celular ? ' e fileira rolável' : ', recusa no quarto, pôr, aconchego e desfazer'}`,
    )
    await contexto.close()
  }
  {
    // O café e a festa (B7 e B9): só aparecem com a Vila Doce aberta e durante a festa.
    const tela = { width: 1280, height: 800 }
    const contexto = await browser.newContext({ viewport: tela })
    await contexto.addInitScript(() => localStorage.setItem('arquipelago:medir', '1'))
    const p = await contexto.newPage()
    p.setDefaultTimeout(45_000)
    const erros: string[] = []
    p.on('pageerror', (e) => erros.push(e.message))
    await p.goto(`${base}/?novo=1&persistir=0&obra=exemplo&posicao=3&festa=junina`, {
      waitUntil: 'networkidle',
    })
    await p.getByRole('button', { name: 'Construir', exact: true }).click()
    await p.getByRole('button', { name: 'Móveis', exact: true }).click()
    await p.waitForTimeout(1800)
    const pos = await p.evaluate(() => (globalThis as Janela).__arquipelagoDesenho?.camera)
    assert(pos)
    const cam = new PerspectiveCamera(55, tela.width / tela.height, 0.1, 1000)
    cam.position.set(pos.x, pos.y, pos.z)
    cam.lookAt(0, PISO, -3)
    cam.updateMatrixWorld()
    const tocar = async (x: number, z: number) => {
      const v = new Vector3(x, PISO, z).project(cam)
      await p.mouse.click(((v.x + 1) * tela.width) / 2, ((1 - v.y) * tela.height) / 2)
      await p.waitForTimeout(250)
    }
    const abas = p.getByRole('group', { name: 'Cômodo dos móveis' })
    const moveis = p.getByRole('group', { name: 'Móvel' })
    const desfazer = p.getByRole('button', { name: '↶ Desfazer', exact: true })
    await abas.getByRole('button', { name: 'Café e feira', exact: true }).click()
    assert.equal(await moveis.getByRole('button').count(), 7)
    await p.screenshot({ path: path.join(prints, 'moveis-cafe-1280.png') })
    // No cômodo da direita (x 6 a 7, z -6 a -3; a planta fica em 7, -3): a banca no fundo.
    await moveis.getByRole('button', { name: 'Banca de feira', exact: true }).click()
    await tocar(6.5, -5.5)
    assert(await desfazer.isEnabled())
    await abas.getByRole('button', { name: 'Festa', exact: true }).click()
    assert.equal(await moveis.getByRole('button').count(), 3)
    await moveis.getByRole('button', { name: 'Fogueira de enfeite', exact: true }).click()
    await tocar(6.5, -4.5)
    await moveis.getByRole('button', { name: /^Bandeirinhas/ }).click()
    await tocar(6.5, -5.9)
    await p.waitForTimeout(1200)
    await p.screenshot({ path: path.join(prints, 'moveis-festa-1280.png') })
    await p.getByRole('button', { name: 'Pronto', exact: true }).click()
    await p.waitForTimeout(1500)
    await p.screenshot({ path: path.join(prints, 'moveis-cafe-festa-viver-1280.png') })
    assert.deepEqual(erros, [])
    console.log('PASS 1280: abas do café e da festa, banca, fogueira e bandeirinhas')
    await contexto.close()
  }
  console.log(`Prints: ${prints}`)
} finally {
  await browser?.close()
  if (servidor.exitCode === null) servidor.kill()
}
