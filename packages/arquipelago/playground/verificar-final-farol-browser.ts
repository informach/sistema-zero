/** Final real, computador e celular. Compile em .cache com bun build --target=node --external playwright-core. */
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { chromium } from 'playwright-core'
import type { MedidaDoDesenho } from '../src/mundo/medidor'

const port = process.env.ARQUIPELAGO_TEST_PORT
  ? Number(process.env.ARQUIPELAGO_TEST_PORT)
  : await new Promise<number>((resolve, reject) => {
      const reserva = createServer()
      reserva.once('error', reject)
      reserva.listen(0, '127.0.0.1', () => {
        const endereco = reserva.address()
        if (!endereco || typeof endereco === 'string') return reject(new Error('Sem porta local'))
        reserva.close(() => resolve(endereco.port))
      })
    })
const baseURL = `http://127.0.0.1:${port}`
const prints =
  process.env.ARQUIPELAGO_PRINTS ?? path.resolve('../../docs/qa/2026-10-29-final-farol')
mkdirSync(prints, { recursive: true })
const server = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(port) },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
let servidorPronto = false
server.stdout.on('data', (d) => {
  if (String(d).includes('Arquipélago no ar')) servidorPronto = true
})
server.stderr.on('data', (d) => process.stderr.write(d))
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  const deadline = Date.now() + 30_000
  while (true) {
    if (server.exitCode !== null) throw new Error('Playground encerrou')
    try {
      if (servidorPronto && (await fetch(baseURL)).ok) break
    } catch {}
    if (Date.now() > deadline) throw new Error('Playground não iniciou')
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
    await page.emulateMedia({ reducedMotion: celular ? 'reduce' : 'no-preference' })
    const erros: string[] = []
    page.on('pageerror', (e) => erros.push(e.message))
    const ler = () =>
      page.evaluate(
        () => (globalThis as { __arquipelagoDesenho?: MedidaDoDesenho }).__arquipelagoDesenho,
      )
    const etapa = async (nome: string) =>
      page.waitForFunction(
        (nome) =>
          (globalThis as { __arquipelagoDesenho?: MedidaDoDesenho }).__arquipelagoDesenho
            ?.finalDoFarol.etapa === nome,
        nome,
      )
    const usar = async () => {
      if (celular) await page.getByRole('button', { name: 'Usar', exact: true }).tap()
      else await page.keyboard.press('KeyE')
    }
    const levar = (x: number, y: number, z: number) =>
      page.evaluate(
        ({ x, y, z }) => {
          const ir = (
            globalThis as {
              __arquipelagoLevar?: (x: number, y: number, z: number, g: number) => void
            }
          ).__arquipelagoLevar
          if (!ir) throw new Error('Medidor sem transporte')
          ir(x, y, z, 0)
        },
        { x, y, z },
      )
    await page.goto(`${baseURL}/?novo=1&posicao=8&em=-9.2,-10.9,2.2`)
    await page.locator('.arq-acao').filter({ hasText: 'Subir o Farol' }).waitFor()
    // Perto da porta, com a Lenda aberta, a porta do farol abre na dobradiça.
    await page.waitForTimeout(1500)
    await page.screenshot({ path: path.join(prints, `porta-${tipo}.png`) })
    const antes = await ler()
    await usar()
    await etapa('sala')
    await page.waitForFunction(() => {
      const d = (globalThis as { __arquipelagoDesenho?: MedidaDoDesenho }).__arquipelagoDesenho
      return d && d.posicao.y > 40 && d.noChao
    })
    await page.locator('.arq-corte').waitFor({ state: 'detached' })
    const voltarBox = await page
      .getByRole('button', { name: 'Descer do Farol', exact: true })
      .boundingBox()
    const menuBox = await page
      .getByRole('button', { name: 'Abrir o menu', exact: true })
      .boundingBox()
    if (
      voltarBox &&
      menuBox &&
      voltarBox.x < menuBox.x + menuBox.width &&
      voltarBox.x + voltarBox.width > menuBox.x &&
      voltarBox.y < menuBox.y + menuBox.height &&
      voltarBox.y + voltarBox.height > menuBox.y
    )
      throw new Error('Descer cobre o menu')
    const sala = await ler()
    console.log(
      'chegada',
      JSON.stringify({
        posicao: sala?.posicao,
        noChao: sala?.noChao,
        final: sala?.finalDoFarol,
        erros,
      }),
    )
    if (!sala || sala.posicao.y < 40 || !sala.noChao) throw new Error('Chegada sem apoio no alto')
    await page.screenshot({ path: path.join(prints, `sala-${tipo}.png`) })
    // Seguir do ponto de entrada para a mesa com o controle, sem teleporte no interior.
    await page.evaluate(async () => {
      if (document.activeElement?.tagName === 'BUTTON')
        throw new Error('Foco da sala capturou o teclado')
      // Liberar no mesmo processo do jogo evita andar além da mesa se o Node ficar ocupado.
      const tecla = (tipo: string) =>
        window.dispatchEvent(new KeyboardEvent(tipo, { code: 'KeyW', key: 'w', bubbles: true }))
      tecla('keydown')
      const limite = performance.now() + 30_000
      try {
        while (performance.now() < limite) {
          const d = (globalThis as { __arquipelagoDesenho?: MedidaDoDesenho }).__arquipelagoDesenho
          if (d && Math.hypot(d.posicao.x + 12.82277, d.posicao.z + 14.98634) < 1.95) return
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
        }
        throw new Error('A caminhada não alcançou a mesa')
      } finally {
        tecla('keyup')
      }
    })
    await page.locator('.arq-acao').filter({ hasText: 'Ler a última página' }).waitFor()
    await usar()
    await etapa('pagina')
    await page.screenshot({ path: path.join(prints, `pagina-${tipo}.png`) })
    if (process.env.ARQUIPELAGO_INTERROMPER === '1') {
      await page.getByRole('button', { name: 'Continuar', exact: true }).click()
      await page.keyboard.press('Escape')
      await etapa('fora')
      await page.waitForFunction(() => {
        const raw = localStorage.getItem('arquipelago-playground')
        const f = raw && JSON.parse(raw).salvamento?.farol
        return f?.pagina === false && f.concluido === false
      })
      await page.goto(`${baseURL}/?posicao=8`)
      await page.waitForFunction(() => {
        const d = (globalThis as { __arquipelagoDesenho?: MedidaDoDesenho }).__arquipelagoDesenho
        return d?.finalDoFarol.etapa === 'fora' && !d.finalDoFarol.leu && !d.finalDoFarol.voltou
      })
      if (erros.length) throw new Error(erros.join('\n'))
      await page.screenshot({ path: path.join(prints, `interrompido-${tipo}.png`) })
      writeFileSync(
        path.join(prints, `interrompido-${tipo}.json`),
        JSON.stringify(await ler(), null, 2),
      )
      console.log(`${tipo}: leitura interrompida não concedeu página nem conclusão ao reabrir`)
      await context.close()
      continue
    }
    for (let i = 0; i < 3; i++)
      await page.getByRole('button', { name: 'Continuar', exact: true }).click()
    await page.getByRole('button', { name: 'Ver a luz do Farol', exact: true }).click()
    await etapa('fachos')
    await page.getByRole('button', { name: 'Abrir o menu', exact: true }).click()
    await page.waitForTimeout(500)
    const pausado = await ler()
    await page.waitForTimeout(1000)
    const depois = await ler()
    if (pausado?.finalDoFarol.tempo !== depois?.finalDoFarol.tempo)
      throw new Error('Final correu com o menu aberto')
    await page.getByRole('button', { name: 'Continuar jogando', exact: true }).click()
    await etapa('fim')
    const final = await ler()
    if (final?.finalDoFarol.fachos !== 6 || !final.finalDoFarol.voltou || !final.finalDoFarol.leu)
      throw new Error('Final não concluiu')
    await page.screenshot({ path: path.join(prints, `fachos-${tipo}.png`) })
    await page.getByRole('button', { name: 'Voltar para casa', exact: true }).click()
    await etapa('fora')
    await page.waitForTimeout(2000)
    const volta = await ler()
    if (!volta || volta.posicao.y > 4) throw new Error('Corpo não voltou à ilha')
    await levar(-7.1, 2.2, -8)
    await page.locator('.arq-acao').filter({ hasText: 'Conversar com a Íris' }).waitFor()
    await usar()
    await page
      .getByText('Voltei para casa. Obrigada por abrir meus rascunhos.', { exact: true })
      .waitFor()
    await page.screenshot({ path: path.join(prints, `iris-${tipo}.png`) })
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Abrir o menu', exact: true }).click()
    await page.getByRole('button', { name: 'Diário', exact: true }).click()
    await page
      .locator('.arq-diario-pagina.aberta')
      .filter({ hasText: 'Essa faísca é o Zappy.' })
      .waitFor()
    await page.keyboard.press('Escape')
    const memoriaAntes = await ler()
    // Reentrar e sair com Esc não repete a revelação nem deixa a câmera presa.
    await levar(-9.2, 2.2, -10.9)
    await page.locator('.arq-acao').filter({ hasText: 'Subir o Farol' }).waitFor()
    await usar()
    await etapa('sala')
    await page.keyboard.press('Escape')
    await etapa('fora')
    await page.waitForTimeout(1500)
    const memoriaDepois = await ler()
    if (memoriaAntes && memoriaDepois && memoriaDepois.geometrias > memoriaAntes.geometrias + 2)
      throw new Error('Geometrias ficaram depois da segunda saída')
    // Uma primeira volta aquece os personagens que aparecem no final. Reentradas seguintes
    // não podem acumular suas texturas de ossos, mesmo sem aumentar geometrias.
    const ciclos = [memoriaDepois]
    for (let ciclo = 0; ciclo < 3; ciclo++) {
      await levar(-9.2, 2.2, -10.9)
      await page.locator('.arq-acao').filter({ hasText: 'Subir o Farol' }).waitFor()
      await usar()
      await etapa('sala')
      await page.locator('.arq-corte').waitFor({ state: 'detached' })
      await page.waitForTimeout(1500)
      await page.keyboard.press('Escape')
      await etapa('fora')
      await page.locator('.arq-corte').waitFor({ state: 'detached' })
      await page.waitForTimeout(3000)
      const medida = await ler()
      ciclos.push(medida)
      if (!medida || !memoriaDepois) throw new Error('Medidor ausente na prova de descarte')
      if (medida.geometrias > memoriaDepois.geometrias + 2)
        throw new Error('Geometrias acumularam ao reabrir o Farol')
      if (medida.texturas > memoriaDepois.texturas)
        throw new Error('Texturas acumularam ao reabrir o Farol')
    }
    console.log(
      `${tipo}: recursos após remontagens`,
      ciclos.map((d) => ({
        geometrias: d?.geometrias,
        texturas: d?.texturas,
      })),
    )
    writeFileSync(path.join(prints, `ciclos-${tipo}.json`), JSON.stringify(ciclos, null, 2))
    if (!celular) {
      await page.route('**/*alto-do-farol*.glb', (route) =>
        route.fulfill({ status: 503, body: '' }),
      )
      await page.locator('.arq-acao').filter({ hasText: 'Subir o Farol' }).waitFor()
      await usar()
      await page
        .getByText('A sala não abriu agora. Você pode tentar de novo na porta.', { exact: true })
        .waitFor()
      await etapa('fora')
      await page.unroute('**/*alto-do-farol*.glb')
    }
    // Reabrir sem ?novo: comprova a leitura durável, não apenas o estado React desta sessão.
    await page.waitForFunction(() => {
      const raw = localStorage.getItem('arquipelago-playground')
      if (!raw) return false
      const s = JSON.parse(raw)
      return s.salvamento?.farol?.concluido === true
    })
    await page.goto(`${baseURL}/?posicao=8`)
    await page.waitForFunction(() => {
      const d = (globalThis as { __arquipelagoDesenho?: MedidaDoDesenho }).__arquipelagoDesenho
      return d?.finalDoFarol.leu && d.finalDoFarol.voltou && d.finalDoFarol.etapa === 'fora'
    })
    await levar(-7.1, 2.2, -8)
    await page.locator('.arq-acao').filter({ hasText: 'Conversar com a Íris' }).waitFor()
    await page.screenshot({ path: path.join(prints, `reaberto-${tipo}.png`) })
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
      throw new Error('Interface ultrapassou a tela')
    if (erros.length) throw new Error(erros.join('\n'))
    writeFileSync(
      path.join(prints, `medidas-${tipo}.json`),
      JSON.stringify({ antes, sala, final, volta, memoriaAntes, memoriaDepois }, null, 2),
    )
    console.log(`${tipo}: sala, página, pausa, seis ilhas, Íris, reentrada e saída conferidas`)
    await context.close()
  }
  // Outro contexto isola a plataforma falsa e sua fila local entre jornadas.
  const bloqueado = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  await bloqueado.addInitScript(() => localStorage.setItem('arquipelago:medir', '1'))
  const porta = await bloqueado.newPage()
  porta.setDefaultTimeout(120_000)
  await porta.goto(`${baseURL}/?novo=1&posicao=7&em=-9.2,-10.9,2.2`)
  await porta.locator('.arq-acao').filter({ hasText: 'Ler o recado do Farol' }).waitFor()
  await porta.keyboard.press('KeyE')
  await porta
    .getByText('O Farol abre na Lenda. Enquanto isso, há muito para criar nas ilhas.', {
      exact: true,
    })
    .waitFor()
  const fase = await porta.evaluate(
    () =>
      (globalThis as { __arquipelagoDesenho?: MedidaDoDesenho }).__arquipelagoDesenho?.finalDoFarol
        .etapa,
  )
  if (fase !== 'fora') throw new Error('Entrou antes da Lenda')
  await bloqueado.close()
  console.log('Antes da Lenda: porta fechada, sem revelar o final')
} finally {
  await browser?.close()
  server.kill()
}
