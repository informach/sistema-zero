import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { ilha } from '@sistemazero/arquipelago-contracts'
import { chromium, type Page } from 'playwright-core'
import { centroNoAnel, giroDaIlha } from '../src/mundo/medidas'

// Lê a âncora do modelo existente, sem gerar ou alterar arte.
const glb = readFileSync('src/assets/ilhas/bosque.glb')
const gltf = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString()) as {
  nodes: { name?: string; translation?: number[] }[]
}
const ancora = gltf.nodes.find((n) => n.name === 'morador')?.translation
assert(ancora && ancora.length === 3, 'Âncora da Capi ausente')
const bosque = ilha('bosque')
const centro = centroNoAnel(bosque)
const giro = giroDaIlha(bosque)
// Um metro à frente dela, dentro do alcance, sem sobrepor seu colisor.
const localX = ancora[0]!,
  localZ = ancora[2]! + 1.1
const ponto = {
  x: centro.x + localX * Math.cos(giro) + localZ * Math.sin(giro),
  z: centro.z - localX * Math.sin(giro) + localZ * Math.cos(giro),
  y: ancora[1]! + 1.2,
}
const port = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4599)
const baseURL = `http://127.0.0.1:${port}`
const probe = createServer()
await new Promise<void>((resolve, reject) => {
  probe.once('error', reject)
  probe.listen(port, '127.0.0.1', resolve)
})
await new Promise<void>((resolve, reject) => probe.close((e) => (e ? reject(e) : resolve())))
const server = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
})
server.stdout.on('data', () => {})
server.stderr.on('data', (d) => process.stderr.write(d))
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
const erros: string[] = []
try {
  const prazo = Date.now() + 30_000
  while (true) {
    if (server.exitCode !== null) throw new Error('Playground encerrou antes de iniciar')
    try {
      if ((await fetch(baseURL)).ok) break
    } catch {}
    if (Date.now() >= prazo) throw new Error('Playground não iniciou')
    await new Promise((r) => setTimeout(r, 200))
  }
  browser = await chromium.launch({
    ...(process.env.ARQUIPELAGO_CHROMIUM
      ? { executablePath: process.env.ARQUIPELAGO_CHROMIUM }
      : { channel: process.env.ARQUIPELAGO_BROWSER_CHANNEL ?? 'chrome' }),
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  for (const publico of ['kids', 'adulto']) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
    context.setDefaultTimeout(45_000)
    context.on('page', (p) => p.on('pageerror', (e) => erros.push(e.message)))
    const page = await context.newPage()
    const conversar = async (p: Page) => {
      await p.getByText('Conversar com a Capi', { exact: false }).waitFor()
      await p.keyboard.press('e')
      const dialogo = p.getByRole('dialog', { name: 'Capi', exact: true })
      await dialogo.waitFor()
      const falas: string[] = []
      for (let i = 0; i < 15; i++) {
        const continuar = dialogo.getByRole('button', { name: 'Continuar', exact: true })
        if (!(await continuar.count())) break
        falas.push(await dialogo.locator('.arq-capi-fala').innerText())
        await continuar.click()
      }
      await dialogo.getByRole('button', { name: 'Tchau, Capi', exact: true }).click()
      await dialogo.waitFor({ state: 'hidden' })
      return falas
    }
    await page.goto(
      `${baseURL}/?publico=${publico}&novo=1&bichos=achados&em=${ponto.x},${ponto.z},${ponto.y}`,
    )
    const primeira = await conversar(page)
    assert.match(primeira.at(-2) ?? '', /encontrou os quatro bichos/)
    assert.match(primeira.at(-1) ?? '', /Preparei uma salada/)
    const repetida = await conversar(page)
    assert(!repetida.some((f) => f.includes('Preparei uma salada')))
    await page.waitForFunction(() => {
      const s = JSON.parse(localStorage.getItem('arquipelago-playground') ?? 'null')?.salvamento
      return s?.versao === 5 && s.presenteDosBichosEntregue === true && s.inventario.salada === 1
    })
    // Remove em/novo: esses parâmetros começam outra partida. Mantém o atalho de bichos
    // para provar que ele preserva a entrega ao carregar a partida já salva.
    await page.goto(`${baseURL}/?publico=${publico}&bichos=achados`)
    const reaberta = await conversar(page)
    assert(!reaberta.some((f) => f.includes('Preparei uma salada')))
    await page.waitForFunction(() => {
      const s = JSON.parse(localStorage.getItem('arquipelago-playground') ?? 'null')?.salvamento
      return s?.presenteDosBichosEntregue === true && s.inventario.salada === 1
    })
    assert.deepEqual(erros, [])
    console.log(
      `PASS ${publico}: conversa real, falas finais, salada única, V5 salvo e reabertura sem duplicação`,
    )
    await context.close()
  }
} catch (erro) {
  for (const c of browser?.contexts() ?? [])
    for (const p of c.pages()) {
      console.error(
        'Página:',
        p.url(),
        await p
          .locator('body')
          .innerText({ timeout: 3000 })
          .catch(() => '(indisponível)'),
      )
    }
  console.error('Erros das páginas:', erros)
  throw erro
} finally {
  try {
    await browser?.close()
  } finally {
    if (server.exitCode === null) server.kill()
    await new Promise<void>((resolve, reject) => {
      if (server.exitCode !== null || server.signalCode !== null) return resolve()
      const prazo = setTimeout(() => reject(new Error('Servidor próprio não encerrou')), 3000)
      server.once('exit', () => {
        clearTimeout(prazo)
        resolve()
      })
    })
  }
}
