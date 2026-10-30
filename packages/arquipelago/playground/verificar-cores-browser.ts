/** Cores confirmadas no shader, catálogo e recarga. Só playground local, sem serviço remoto. */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { ilha } from '@sistemazero/arquipelago-contracts'
import { chromium } from 'playwright-core'
import { Object3D } from 'three'
import { posicaoDoQuadro } from '../src/mundo/lugar-do-quadro'
import { centroNoAnel, giroDaIlha } from '../src/mundo/medidas'

type Cor = { ilha: string; quadros: number[]; chegada: number; base: number }
type Inspecao = { __arquipelagoCores?: () => Cor[] }
const port = await new Promise<number>((resolve, reject) => {
  const reserva = createServer()
  reserva.once('error', reject)
  reserva.listen(0, '127.0.0.1', () => {
    const a = reserva.address()
    if (!a || typeof a === 'string') return reject(new Error('Sem porta local'))
    reserva.close(() => resolve(a.port))
  })
})
const baseURL = `http://127.0.0.1:${port}`
const prints =
  process.env.ARQUIPELAGO_PRINTS ?? path.resolve('../../docs/qa/2026-10-30-cores-conquistadas')
mkdirSync(prints, { recursive: true })
// A pose de conferência vem da âncora real e da regra usada pelo quadro no mundo.
const bytes = readFileSync('src/assets/ilhas/bosque.glb')
const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString()) as {
  nodes: { name?: string; translation?: number[] }[]
}
const chegada = gltf.nodes.find((n) => n.name === 'chegada')?.translation
assert(chegada, 'Bosque sem âncora de chegada')
const modelo = new Object3D()
const ancora = new Object3D()
ancora.name = 'chegada'
ancora.position.set(chegada[0]!, chegada[1]!, chegada[2]!)
modelo.add(ancora)
modelo.rotation.y = giroDaIlha(ilha('bosque'))
const quadro = posicaoDoQuadro(modelo)
const centro = centroNoAnel(ilha('bosque'))
const x = centro.x + quadro.x + Math.sin(quadro.giro) * 1.6
const z = centro.z + quadro.z + Math.cos(quadro.giro) * 1.6
const url = (modo: string, novo = false) =>
  `${baseURL}/?posicao=2&qualidade=leve&dia=nenhum&cores=${modo}&em=${x},${z},${quadro.y + 0.8}${novo ? '&novo=1' : ''}`
const server = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(port) },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
server.stderr.on('data', (d) => process.stderr.write(d))
let pronto = false
server.stdout.on('data', (d) => {
  if (String(d).includes('Arquipélago no ar')) pronto = true
})
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
    const opcoes = {
      viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 720 },
      isMobile: celular,
      hasTouch: celular,
    }
    let context = await browser.newContext(opcoes)
    const prepararContexto = async () => {
      context.setDefaultTimeout(120_000)
      await context.addInitScript(() => {
        localStorage.setItem('arquipelago:medir', '1')
        localStorage.setItem('arquipelago:camera-dica', '1')
        localStorage.setItem('arquipelago:conforto', JSON.stringify({ qualidade: 'leve' }))
      })
    }
    await prepararContexto()
    let page = await context.newPage()
    await page.emulateMedia({ reducedMotion: celular ? 'reduce' : 'no-preference' })
    const erros: string[] = []
    page.on('pageerror', (e) => erros.push(e.message))
    const mudar = async (modo: string) => {
      // A plataforma falsa reinicia revisões ao montar. Isola seu IndexedDB entre cenários,
      // conservando localStorage, que é justamente a fotografia visual sob teste.
      const storageState = await context.storageState()
      await context.close()
      context = await browser!.newContext({ ...opcoes, storageState })
      await prepararContexto()
      page = await context.newPage()
      await page.emulateMedia({ reducedMotion: celular ? 'reduce' : 'no-preference' })
      page.on('pageerror', (e) => erros.push(e.message))
      await page.goto(url(modo))
    }
    const medidas: Record<string, Cor[] | undefined> = {}
    const conferir = async (nome: string, esperado: number[]) => {
      await page.waitForFunction((esperado) => {
        const cor = (globalThis as Inspecao).__arquipelagoCores?.().find((i) => i.ilha === 'bosque')
        return cor?.chegada === 1 && cor.quadros.every((p, i) => p === esperado[i])
      }, esperado)
      if (esperado.some(Boolean)) {
        // O indicador superior fica oculto no celular; o contador visível é o do painel.
        await page
          .getByText(`Quadro das Cores ${esperado.filter(Boolean).length} de 6`, { exact: true })
          .waitFor({ state: 'attached' })
      }
      medidas[nome] = await page.evaluate(() => (globalThis as Inspecao).__arquipelagoCores?.())
      await page.screenshot({ path: path.join(prints, `${nome}-${tipo}.png`) })
    }
    const abrirQuadro = async () => {
      await page.locator('.arq-acao').filter({ hasText: 'Ver o Quadro das Cores' }).waitFor()
      if (celular) await page.getByRole('button', { name: 'Usar', exact: true }).tap()
      else await page.keyboard.press('KeyE')
      await page.getByRole('heading', { name: 'Quadro das Cores', exact: true }).waitFor()
    }
    await page.goto(url('fora-do-ar', true))
    await conferir('primeiro-offline', [0, 0, 0, 0, 0, 0])
    await mudar('sem-conquistas')
    await conferir('antes', [0, 0, 0, 0, 0, 0])
    await abrirQuadro()
    await page.getByText('Bosque dos Bichos: 0 de 6 cores de volta.', { exact: true }).waitFor()
    await page
      .locator('.arq-quadro-cartao')
      .filter({ hasText: 'A borboleta que voa' })
      .getByRole('button', { name: 'Fazer o desafio', exact: true })
      .click()
    await page
      .getByRole('heading', { name: 'Quadro das Cores', exact: true })
      .waitFor({ state: 'detached' })
    await conferir('conquistada', [1, 0, 0, 0, 0, 0])
    await mudar('fora-do-ar')
    await conferir('recarga-offline', [1, 0, 0, 0, 0, 0])
    await mudar('arquivadas')
    await conferir('arquivadas', [1, 0, 1, 0, 0, 0])
    await abrirQuadro()
    await page.getByText('Bosque dos Bichos: 2 de 6 cores de volta.', { exact: true }).waitFor()
    assert.equal(
      await page.getByRole('button', { name: 'Fazer o desafio', exact: true }).count(),
      0,
    )
    await page.screenshot({ path: path.join(prints, `quadro-arquivadas-${tipo}.png`) })
    await mudar('antigo')
    await conferir('host-antigo', [1, 0, 1, 0, 0, 0])
    await mudar('desligado')
    await conferir('catalogo-desligado', [1, 0, 1, 0, 0, 0])
    await abrirQuadro()
    await page
      .getByText('Os desafios não estão disponíveis agora. Suas cores continuam aqui.', {
        exact: true,
      })
      .waitFor()
    assert.deepEqual(erros, [])
    writeFileSync(
      path.join(prints, `medidas-${tipo}.json`),
      JSON.stringify({ medidas, erros }, null, 2),
    )
    console.log(`${tipo}: sete cenários conferidos, sem erro de página`)
    await context.close()
  }
} finally {
  await browser?.close()
  server.kill()
}
