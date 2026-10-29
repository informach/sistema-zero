import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { chromium } from 'playwright-core'
import { PerspectiveCamera, Vector3 } from 'three'
import { type AmostraDaPausa, conferirPausaNoAr } from './pausa-observada'

const port = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4598)
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
    channel: process.env.ARQUIPELAGO_BROWSER_CHANNEL ?? 'chrome',
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  context.setDefaultTimeout(30_000)
  await context.addInitScript((origem) => {
    // O init script também roda em about:blank, que não possui armazenamento de origem.
    if (location.origin === origem) localStorage.setItem('arquipelago:medir', '1')
  }, baseURL)
  context.on('page', (page) => page.on('pageerror', (e) => erros.push(e.message)))
  const page = await context.newPage()
  await page.route('**/preparar-qa', (r) =>
    r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Preparar diário</title>' }),
  )
  await page.goto(`${baseURL}/preparar-qa`)
  const inicial = criarSalvamentoInicial(new Date('2026-10-28T15:00:00Z'))
  inicial.casa.portaNova = true
  const base = { revisao: 1, salvamento: inicial, atualizadoEm: inicial.criadoEm }
  const remoto = { ...base, revisao: 2, salvamento: { ...inicial, inventario: { milho: 9 } } }
  const local = { ...inicial, inventario: { milho: 2 } }
  await page.evaluate(
    async ({ base, local, remoto }) => {
      localStorage.setItem('arquipelago-playground', JSON.stringify(remoto))
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open('sistema-zero-arquipelago-salvamento', 1)
        req.onupgradeneeded = () => req.result.createObjectStore('rascunhos', { keyPath: 'perfil' })
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('rascunhos', 'readwrite')
        tx.objectStore('rascunhos').put({
          versao: 1,
          perfil: 'adulto:perfil-de-teste',
          base,
          local,
          enviado: null,
        })
        tx.oncomplete = () => resolve()
        tx.onabort = () => reject(tx.error)
      })
      db.close()
    },
    { base, local, remoto },
  )
  await page.goto(`${baseURL}/?publico=adulto`, { waitUntil: 'domcontentloaded' })
  const dialogo = page.getByRole('dialog', { name: 'Seu jogo mudou em outro aparelho' })
  await dialogo.waitFor({ timeout: 45_000 })
  if (!(await dialogo.evaluate((el) => el.matches(':modal'))))
    throw new Error('Conflito não tornou a página inerte.')
  await page.keyboard.press('Escape')
  if (!(await dialogo.isVisible())) throw new Error('Escape descartou o conflito.')
  await page.setViewportSize({ width: 390, height: 844 })
  const caixa = await dialogo.boundingBox()
  if (
    !caixa ||
    caixa.x < 0 ||
    caixa.y < 0 ||
    caixa.x + caixa.width > 390 ||
    caixa.y + caixa.height > 844
  )
    throw new Error('Diálogo não cabe na tela estreita.')
  const outra = await context.newPage()
  await outra.goto(`${baseURL}/?publico=adulto`, { waitUntil: 'domcontentloaded' })
  await outra
    .getByText('Este jogo já está aberto em outra aba. Feche aquela aba para continuar aqui.', {
      exact: true,
    })
    .waitFor({ timeout: 45_000 })
  await outra.close()
  await page.getByRole('button', { name: 'Usar a versão online', exact: true }).click()
  await dialogo.waitFor({ state: 'hidden', timeout: 10_000 })
  const confirmado = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('arquipelago-playground') ?? 'null'),
  )
  if (confirmado.revisao !== 2 || confirmado.salvamento.inventario.milho !== 9)
    throw new Error('Escolher online reescreveu o servidor.')
  if (erros.length) throw new Error(erros.join('\n'))
  await page.close()
  const reaberto = await context.newPage()
  await reaberto.goto(`${baseURL}/?publico=adulto`, { waitUntil: 'domcontentloaded' })
  await reaberto
    .getByRole('button', { name: 'Abrir o menu', exact: true })
    .waitFor({ timeout: 45_000 })
  if (await reaberto.getByRole('dialog', { name: 'Seu jogo mudou em outro aparelho' }).count())
    throw new Error('Escolha confirmada voltou como conflito.')
  await reaberto.waitForFunction(
    () => typeof (globalThis as { __arquipelagoLevar?: unknown }).__arquipelagoLevar === 'function',
  )
  await reaberto.evaluate(() => {
    const g = globalThis as { __arquipelagoLevar?: (x: number, y: number, z: number) => void }
    g.__arquipelagoLevar?.(0, 40, 10)
  })
  await reaberto.waitForFunction(() => {
    const medida = (
      globalThis as { __arquipelagoDesenho?: { posicao: { y: number }; noChao: boolean } }
    ).__arquipelagoDesenho
    const y = medida?.posicao.y
    if (!medida || medida.noChao || y === undefined || y <= 30 || y >= 39) return false
    // Aciona o mesmo botão durante a queda; esperar sua estabilidade geométrica permitiria
    // pousar antes de abrir o menu num renderer de software lento, invalidando a pré-condição.
    const botao = document.querySelector<HTMLButtonElement>('button[aria-label="Abrir o menu"]')
    if (!botao) return false
    botao.click()
    return true
  })
  await reaberto.getByRole('dialog', { name: 'Menu do jogo' }).waitFor()
  const pausa = await reaberto.evaluate(async () => {
    const g = globalThis as {
      __arquipelagoDesenho?: { posicao: { x: number; y: number; z: number }; noChao: boolean }
    }
    // Cada amostra vem de uma publicação nova do medidor real, não do estado de teste.
    const amostras: AmostraDaPausa[] = []
    let anterior = g.__arquipelagoDesenho
    const limite = performance.now() + 10_000
    while (amostras.length < 5 && performance.now() < limite) {
      await new Promise(requestAnimationFrame)
      const atual = g.__arquipelagoDesenho
      if (atual && atual !== anterior) {
        amostras.push({ ...atual.posicao, noChao: atual.noChao })
        anterior = atual
      }
    }
    return amostras
  })
  console.log('Amostras durante o menu:', JSON.stringify(pausa))
  const ultimo = conferirPausaNoAr(pausa)
  await reaberto.keyboard.press('Escape')
  await reaberto.waitForFunction((y) => {
    const p = (globalThis as { __arquipelagoDesenho?: { posicao: { y: number } } })
      .__arquipelagoDesenho?.posicao
    return p && p.y < y - 0.1
  }, ultimo.y)
  if (erros.length) throw new Error(erros.join('\n'))
  console.log(
    'PASS: IndexedDB real, conflito acessível, viewport estreito, isolamento entre abas e liberação da trava após fechar.',
  )
  console.log('PASS: menu pausa a física real e fechar o menu retoma a queda.')
  await reaberto.getByRole('button', { name: '🔨 Construir', exact: true }).click()
  const desfazer = reaberto.getByRole('button', { name: '↶ Desfazer', exact: true })
  await desfazer.waitFor()
  await reaberto.waitForFunction(() => {
    const c = (
      globalThis as { __arquipelagoDesenho?: { camera: { x: number; y: number; z: number } } }
    ).__arquipelagoDesenho?.camera
    return (
      c &&
      Math.hypot(c.x, c.y - (1.02 + Math.sin(0.95) * 24), c.z - (-3 + Math.cos(0.95) * 24)) < 0.02
    )
  })
  const canvas = reaberto.locator('canvas')
  const ret = await canvas.boundingBox()
  if (!ret) throw new Error('Canvas da obra ausente.')
  const camera = new PerspectiveCamera(55, ret.width / ret.height, 0.1, 1000)
  camera.position.set(0, 1.02 + Math.sin(0.95) * 24, -3 + Math.cos(0.95) * 24)
  camera.lookAt(0, 1.02, -3)
  camera.updateMatrixWorld()
  const naTela = (z: number) => {
    const p = new Vector3(-6, 1.02, z).project(camera)
    return { x: ret.x + ((p.x + 1) / 2) * ret.width, y: ret.y + ((1 - p.y) / 2) * ret.height }
  }
  const inicio = naTela(0),
    fim = naTela(3)
  const arrastar = async () => {
    await reaberto.mouse.move(inicio.x, inicio.y)
    await reaberto.mouse.down()
    await reaberto.mouse.move(fim.x, fim.y, { steps: 3 })
  }
  await arrastar()
  await canvas.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse', bubbles: true })
  await reaberto.mouse.up()
  if (!(await desfazer.isDisabled())) throw new Error('Gesto cancelado confirmou a parede.')
  // Mesmo arrasto, agora confirmado: prova que a região escolhida aceita uma parede.
  await arrastar()
  await reaberto.mouse.up()
  await reaberto.waitForFunction(() => {
    const b = [...document.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.includes('Desfazer'),
    )
    return b && !b.disabled
  })
  await desfazer.click()
  if (!(await desfazer.isDisabled()))
    throw new Error('Desfazer não retirou a única parede aplicada.')
  if (erros.length) throw new Error(erros.join('\n'))
  console.log(
    'PASS: construção real cancela o gesto sem gravar; confirmar aplica e desfazer retorna.',
  )
  await context.close()
} catch (erro) {
  console.error('Erros das páginas:', erros)
  for (const context of browser?.contexts() ?? []) {
    for (const page of context.pages()) {
      console.error(
        'Página:',
        page.url(),
        await page
          .locator('body')
          .innerText({ timeout: 3000 })
          .catch(() => '(indisponível)'),
      )
    }
  }
  throw erro
} finally {
  try {
    await browser?.close()
  } finally {
    if (server.exitCode === null) server.kill()
    await new Promise<void>((resolve, reject) => {
      if (server.exitCode !== null || server.signalCode !== null) return resolve()
      const prazo = setTimeout(() => reject(new Error('Servidor próprio não encerrou.')), 3000)
      server.once('exit', () => {
        clearTimeout(prazo)
        resolve()
      })
    })
  }
}
