/**
 * Conferência no navegador dos turnos da Vila Doce (fase2-03): "Ajudar no balcão" na conversa com
 * o Bento abre o turno da padaria; um engano repete o pedido; os seis fregueses atendidos fecham o
 * turno com as estrelas e o pagamento no inventário; perto da sorveteria e da barraca de sucos o
 * E / Usar abre o turno de cada uma.
 *
 * `bun playground/verificar-turnos-browser.ts` (navegador: `ARQUIPELAGO_CHROMIUM` com o caminho
 * do executável, ou o canal `ARQUIPELAGO_BROWSER_CHANNEL`, padrão `chrome`). Os prints vão para
 * `ARQUIPELAGO_PRINTS` (padrão: a pasta temporária).
 */
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { giroDaIlha, ilhasEmVolta } from '../src/mundo/medidas'
import { BALCOES } from '../src/sistemas/turnos'

const port = await new Promise<number>((resolve, reject) => {
  const s = createServer().once('error', reject)
  s.listen(0, '127.0.0.1', () => {
    const a = s.address()
    if (!a || typeof a === 'string') return reject(Error('Sem porta local'))
    s.close(() => resolve(a.port))
  })
})
const baseURL = `http://127.0.0.1:${port}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? tmpdir()
mkdirSync(prints, { recursive: true })
const publico = process.env.ARQUIPELAGO_PUBLICO === 'adulto' ? 'adulto' : 'kids'
const celular = process.env.ARQUIPELAGO_CELULAR === '1'
const vila = ilhasEmVolta().find((i) => i.ilha.id === 'vila-doce')
if (!vila) throw new Error('Sem a Vila Doce no anel.')
const giroIlha = giroDaIlha(vila.ilha)
const glb = readFileSync(path.resolve('src', 'assets', 'ilhas', 'vila-doce.glb'))
const modelo = (
  await new GLTFLoader().parseAsync(
    glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength),
    '',
  )
).scene
type P = { x: number; y: number; z: number }
/** Uma âncora do modelo no mundo (centro da ilha em y 0, girada como no jogo). */
const ancora = (nome: string): P => {
  const o = modelo.getObjectByName(nome)
  if (!o) throw new Error(`sem a âncora ${nome}`)
  const { x, y, z } = o.position
  return {
    x: vila.centro.x + x * Math.cos(giroIlha) + z * Math.sin(giroIlha),
    y,
    z: vila.centro.z - x * Math.sin(giroIlha) + z * Math.cos(giroIlha),
  }
}
const rumoDe = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  Math.atan2(b.x - a.x, b.z - a.z)
type Desenho = { posicao: P; ilhasCompletas: number }

const NUMEROS: Record<string, number> = { um: 1, uma: 1, dois: 2, duas: 2, três: 3 }
/** Lê o pedido do freguês (`Eu queria dois pães de queijo e um sonho, por favor.`). */
function lerPedido(posto: keyof typeof BALCOES, fala: string): Record<string, number> {
  const itens: Record<string, number> = {}
  for (const p of BALCOES[posto].produtos) {
    const m = fala.match(new RegExp(`\\b(um|uma|dois|duas|três) (${p.varios}|${p.um})(?=[ ,.])`))
    if (m?.[1]) itens[p.nome] = NUMEROS[m[1]] ?? 0
  }
  return itens
}

const server = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
})
const encerrado = new Promise<void>((resolve) => server.once('close', () => resolve()))
server.stdout.on('data', () => {})
server.stderr.on('data', (d) => process.stderr.write(d))
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
const erros: string[] = []
const limite = setTimeout(() => {
  void browser?.close()
  server.kill()
}, 6 * 60_000)
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
    ...(process.env.ARQUIPELAGO_CHROMIUM
      ? { executablePath: process.env.ARQUIPELAGO_CHROMIUM }
      : { channel: process.env.ARQUIPELAGO_BROWSER_CHANNEL ?? 'chrome' }),
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  const context = await browser.newContext({
    viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 720 },
    isMobile: celular,
    hasTouch: celular,
    deviceScaleFactor: 0.5,
    reducedMotion: 'reduce',
  })
  context.setDefaultTimeout(30_000)
  await context.addInitScript((origem) => {
    if (location.origin === origem) {
      localStorage.setItem('arquipelago:medir', '1')
      localStorage.setItem(
        'arquipelago:conforto',
        JSON.stringify({ menosMovimento: true, qualidade: 'leve' }),
      )
    }
  }, baseURL)
  const page = await context.newPage()
  page.on('pageerror', (e) => erros.push(e.message))
  const chegada = ancora('chegada')
  const em = `${chegada.x.toFixed(2)},${chegada.z.toFixed(2)},${(chegada.y + 1.2).toFixed(2)}`
  // Posição 8: todas as ilhas abertas.
  await page.goto(`${baseURL}/?novo=1&posicao=8&publico=${publico}&em=${em}`, {
    waitUntil: 'domcontentloaded',
  })
  await page.evaluate(() => {
    const u = new URL(location.href)
    u.searchParams.delete('novo')
    u.searchParams.delete('em')
    history.replaceState(null, '', u)
  })
  const levar = (p: P, olhar: number) =>
    page.evaluate(
      ({ x, y, z, g }) =>
        (globalThis as { __arquipelagoLevar?: (...a: number[]) => void }).__arquipelagoLevar?.(
          x,
          y,
          z,
          g,
        ),
      // A câmera olha para −(sin g, cos g), e andar para a frente segue a câmera.
      { x: p.x, y: p.y + 1.2, z: p.z, g: olhar + Math.PI },
    )
  await page.waitForFunction(
    () =>
      ((globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho?.ilhasCompletas ??
        0) > 0,
    undefined,
    { timeout: 180_000 },
  )
  await page.locator('canvas').click()
  await page.waitForTimeout(3000)

  const bento = ancora('morador')
  const fonte = ancora('fonte')
  const rumo = rumoDe(bento, fonte)
  const perto = { x: bento.x + Math.sin(rumo) * 1.6, y: bento.y, z: bento.z + Math.cos(rumo) * 1.6 }
  await levar(perto, rumoDe(perto, bento))
  await page.waitForTimeout(3000)
  await page.getByText('Conversar com o Bento').first().waitFor({ timeout: 20_000 })

  // 1. A conversa com o Bento oferece o balcão da padaria.
  if (celular) await page.getByRole('button', { name: 'Usar', exact: true }).click()
  else await page.keyboard.press('KeyE')
  const conversa = page.getByRole('dialog', { name: 'Bento' })
  await conversa.waitFor({ timeout: 10_000 })
  for (let i = 0; i < 8; i++) {
    const continuar = conversa.getByRole('button', { name: 'Continuar' })
    if (!(await continuar.isVisible())) break
    await continuar.click()
  }
  await conversa.getByRole('button', { name: 'Ajudar no balcão' }).click()
  const turno = page.getByRole('dialog', { name: 'Turno na padaria' })
  await turno.waitFor({ timeout: 10_000 })
  await turno
    .getByText('O primeiro turno do dia dá ingredientes e 5 moedas', { exact: false })
    .waitFor()
  await page.screenshot({ path: path.join(prints, 'turno-convite.png') })
  await turno.getByRole('button', { name: 'Começar o turno' }).click()

  // 2. Um engano: o freguês repete o pedido e a bandeja esvazia.
  const fala = async () => (await turno.locator('.arq-turno-pedido span').innerText()).trim()
  const primeira = await fala()
  const pedido1 = lerPedido('padaria', primeira)
  if (Object.keys(pedido1).length === 0) throw new Error(`Pedido ilegível: ${primeira}`)
  const outro = BALCOES.padaria.produtos.find((p) => !pedido1[p.nome])
  await turno.getByRole('button', { name: outro?.nome ?? '' }).click()
  await page.screenshot({ path: path.join(prints, 'turno-bandeja.png') })
  await turno.getByRole('button', { name: 'Entregar' }).click()
  await turno.getByText('Não era bem isso.').waitFor()
  if ((await fala()) !== primeira) throw new Error('O freguês mudou de pedido depois do engano.')
  await turno.getByText('Nada ainda.').waitFor()

  // 3. Os seis fregueses, cada um com a bandeja certa.
  for (let i = 0; i < 6; i++) {
    await turno.getByText(`Freguês ${i + 1} de 6`).waitFor()
    const texto = await fala()
    const itens = lerPedido('padaria', texto)
    console.log(`Freguês ${i + 1}: ${texto}`)
    for (const [nome, q] of Object.entries(itens))
      for (let k = 0; k < q; k++)
        await turno.getByRole('button', { name: nome, exact: false }).first().click()
    if (i === 4) await page.screenshot({ path: path.join(prints, 'turno-pedido-grande.png') })
    await turno.getByRole('button', { name: 'Entregar' }).click()
  }
  await turno.getByRole('img', { name: '2 de 3 estrelas' }).waitFor({ timeout: 10_000 })
  await turno.getByText('O Bento paga o turno com 1 fubá, 1 leite e 1 ovo.').waitFor()
  await turno.getByText('Obrigado pela ajuda no balcão.', { exact: false }).waitFor()
  await turno.getByText('5 moedas confirmadas pelo turno de hoje.', { exact: true }).waitFor()
  await page.locator('.arq-moedas b').filter({ hasText: /^85$/ }).waitFor()
  const largura = await turno.evaluate((e) => ({ visivel: e.clientWidth, conteudo: e.scrollWidth }))
  if (largura.conteudo > largura.visivel + 1) throw Error('Painel com rolagem horizontal')
  await page.screenshot({ path: path.join(prints, 'turno-fim.png') })
  await turno.getByRole('button', { name: 'Voltar ao jogo' }).click()
  await turno.waitFor({ state: 'detached' })

  // 4. A sorveteria e a barraca de sucos abrem pelo E / Usar.
  for (const [nomeDaAncora, rotulo, titulo] of [
    ['sorveteria', 'Fazer um turno na sorveteria', 'Turno na sorveteria'],
    ['barraca-5', 'Fazer um turno na barraca de sucos', 'Turno na barraca de sucos'],
  ] as const) {
    const a = ancora(nomeDaAncora)
    const praca = rumoDe(a, fonte)
    const junto = { x: a.x + Math.sin(praca) * 0.6, y: a.y, z: a.z + Math.cos(praca) * 0.6 }
    await levar(junto, rumoDe(junto, a))
    await page.waitForTimeout(2500)
    await page.getByText(rotulo).first().waitFor({ timeout: 20_000 })
    if (celular) await page.getByRole('button', { name: 'Usar', exact: true }).click()
    else await page.keyboard.press('KeyE')
    const painel = page.getByRole('dialog', { name: titulo })
    await painel.waitFor({ timeout: 10_000 })
    await painel.getByRole('button', { name: 'Começar o turno' }).click()
    await painel.getByText('Freguês 1 de 6').waitFor()
    await page.screenshot({ path: path.join(prints, `turno-${nomeDaAncora}.png`) })
    await painel.getByRole('button', { name: 'Sair do turno' }).click()
    await painel.waitFor({ state: 'detached' })
    console.log(`${titulo}: abre pelo E e fecha pelo Sair do turno`)
  }

  if (erros.length > 0) throw new Error(`Erros na página: ${erros.join(' | ')}`)
  const carteira = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('arquipelago-playground:galeria') ?? 'null'),
  )
  if (carteira?.saldo !== 85) throw Error(`Saldo inesperado ${carteira?.saldo}`)
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem('arquipelago-playground') ?? 'null')?.salvamento?.inventario
        ?.fuba === 1,
  )
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => !!(globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho,
  )
  const reaberto = await page.evaluate(() => ({
    carteira: JSON.parse(localStorage.getItem('arquipelago-playground:galeria') ?? 'null'),
    inventario: JSON.parse(localStorage.getItem('arquipelago-playground') ?? 'null')?.salvamento
      ?.inventario,
  }))
  if (reaberto.carteira?.saldo !== 85 || reaberto.inventario?.fuba !== 1)
    throw Error('Reabertura perdeu a recompensa')
  writeFileSync(
    path.join(prints, 'resultado.json'),
    JSON.stringify({ publico, celular, largura, saldo: 85, reaberto, erros }, null, 2),
  )
  console.log(`Turnos conferidos. Prints em ${prints}`)
} catch (erro) {
  for (const contexto of browser?.contexts() ?? []) {
    const pagina = contexto.pages()[0]
    if (pagina) {
      await pagina.screenshot({ path: path.join(prints, 'falha.png') }).catch(() => {})
      writeFileSync(
        path.join(prints, 'falha.txt'),
        `${String(erro)}\n${await pagina
          .locator('body')
          .innerText()
          .catch(() => '(página indisponível)')}`,
      )
    }
  }
  throw erro
} finally {
  clearTimeout(limite)
  await browser?.close()
  server.kill()
  await encerrado
}
