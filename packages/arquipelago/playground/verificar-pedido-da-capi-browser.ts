/**
 * O pedido da Capi no Estúdio (lacunas, 01/11/2026: um pedido de morador em toda ilha) no
 * playground, só com a plataforma falsa: na conversa com a Capi, o cartão "Pedido no Estúdio"
 * mostra "A lanterna da cabana"; "Fazer no Estúdio" resolve na hora e o cartão diz que a placa
 * acende à noite. A placa do pedido fica ao lado da Capi. No computador e no celular emulado.
 *
 *   bun build playground/verificar-pedido-da-capi-browser.ts --target=node --external \
 *     playwright-core --outdir .cache/pedido-da-capi-build && \
 *     node .cache/pedido-da-capi-build/verificar-pedido-da-capi-browser.js
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { ilha } from '@sistemazero/arquipelago-contracts'
import { chromium } from 'playwright-core'
import { centroNoAnel, giroDaIlha } from '../src/mundo/medidas'

// A âncora da Capi no modelo do Bosque (sem gerar arte).
const glb = readFileSync('src/assets/ilhas/bosque.glb')
const gltf = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString()) as {
  nodes: { name?: string; translation?: number[] }[]
}
const ancora = gltf.nodes.find((n) => n.name === 'morador')?.translation
assert(ancora && ancora.length === 3, 'Âncora da Capi ausente')
const bosque = ilha('bosque')
const centro = centroNoAnel(bosque)
const giro = giroDaIlha(bosque)
const localX = ancora[0]!
const localZ = ancora[2]! + 1.1
const ponto = {
  x: centro.x + localX * Math.cos(giro) + localZ * Math.sin(giro),
  z: centro.z - localX * Math.sin(giro) + localZ * Math.cos(giro),
  y: ancora[1]! + 1.2,
}

const porta = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4531)
const base = `http://127.0.0.1:${porta}`
const prints = path.resolve(process.env.ARQUIPELAGO_PRINTS ?? '.cache/pedido-da-capi')
mkdirSync(prints, { recursive: true })
const servidor = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(porta) },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
servidor.stdout.on('data', () => {})
servidor.stderr.on('data', (d) => process.stderr.write(d))

let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  const prazo = Date.now() + 45_000
  while (true) {
    if (servidor.exitCode !== null) throw new Error('O playground encerrou antes de iniciar')
    try {
      if ((await fetch(base)).ok) break
    } catch {}
    if (Date.now() > prazo) throw new Error('O playground não iniciou')
    await new Promise((r) => setTimeout(r, 200))
  }
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  for (const celular of [false, true]) {
    const tipo = celular ? 'celular' : 'computador'
    const ctx = await browser.newContext({
      viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 800 },
      isMobile: celular,
      hasTouch: celular,
    })
    const page = await ctx.newPage()
    page.setDefaultTimeout(90_000)
    const erros: string[] = []
    page.on('pageerror', (e) => erros.push(e.message))
    await page.addInitScript(() => localStorage.setItem('arquipelago:medir', '1'))
    await page.goto(`${base}/?novo=1&posicao=8&qualidade=leve&em=${ponto.x},${ponto.z},${ponto.y}`)
    await page.locator('.arq-acao').filter({ hasText: 'Conversar com a Capi' }).waitFor()
    // A placa existe, aparece e fica a uns passos da Capi.
    const placa = await page.waitForFunction(() => {
      const achar = (
        globalThis as {
          __arquipelagoAcharNos?: (n: string) => { x: number; z: number; visivel: boolean }[]
        }
      ).__arquipelagoAcharNos
      return achar?.('placa-do-pedido-capi')?.find((n) => n.visivel) ?? null
    })
    const lugar = (await placa.jsonValue()) as { x: number; z: number; visivel: boolean }
    assert.equal(lugar.visivel, true)
    const perto = Math.hypot(lugar.x - ponto.x, lugar.z - ponto.z)
    assert.ok(perto < 4, `a placa ficou a ${perto.toFixed(1)} m da Capi`)
    // Na frente da Capi, olhando para a placa.
    await page.evaluate(
      ({ de, para }) => {
        const ir = (globalThis as { __arquipelagoLevar?: (...a: number[]) => void })
          .__arquipelagoLevar
        ir?.(de.x, de.y, de.z, Math.atan2(para.x - de.x, para.z - de.z))
      },
      { de: ponto, para: lugar },
    )
    await page.waitForTimeout(2500)
    await page.screenshot({ path: path.join(prints, `${tipo}-1-placa-ao-lado.png`) })
    await page.evaluate(({ x, z, y }) => {
      const ir = (globalThis as { __arquipelagoLevar?: (...a: number[]) => void })
        .__arquipelagoLevar
      ir?.(x, y, z, 0)
    }, ponto)
    await page.locator('.arq-acao').filter({ hasText: 'Conversar com a Capi' }).waitFor()
    if (celular) await page.getByRole('button', { name: 'Usar', exact: true }).tap()
    else await page.keyboard.press('e')
    const dialogo = page.getByRole('dialog', { name: 'Capi', exact: true })
    await dialogo.waitFor()
    for (let i = 0; i < 15; i++) {
      const continuar = dialogo.getByRole('button', { name: 'Continuar', exact: true })
      if (!(await continuar.count())) break
      await continuar.click()
    }
    await dialogo.getByText('Pedido no Estúdio').waitFor()
    await dialogo.getByText('A lanterna da cabana').waitFor()
    await page.screenshot({ path: path.join(prints, `${tipo}-2-cartao.png`) })
    await dialogo.getByRole('button', { name: 'Fazer no Estúdio', exact: true }).click()
    await dialogo.getByText('Pedido feito. A placa acende à noite.').waitFor()
    await page.screenshot({ path: path.join(prints, `${tipo}-3-feito.png`) })
    assert.deepEqual(erros, [])
    console.log(`PASS ${tipo}: o pedido da Capi abre no Estúdio, com a placa ao lado dela`)
    await ctx.close()
  }
  console.log(`Prints: ${prints}`)
} finally {
  await browser?.close()
  if (servidor.exitCode === null) servidor.kill()
}
