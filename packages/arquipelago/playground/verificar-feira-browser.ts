/** Feira real no playground, com serviço simulado local. Nunca acessa banco remoto. */
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { giroDaIlha, ilhasEmVolta } from '../src/mundo/medidas'
import { ANCORA_DA_FEIRA } from '../src/sistemas/feira'

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
const insumos = process.env.ARQUIPELAGO_INSUMOS === '1'
const compartilhada = process.env.ARQUIPELAGO_GALERIA_COMPARTILHADA === '1'
const alvo = compartilhada
  ? { nome: 'Planta no vaso', objeto: 'planta-interior', id: 'planta-interior-classica', saldo: 50 }
  : // A versão retrô da geladeira (B8, 31/10/2026): mesma compra, outra aparência.
    { nome: 'Geladeira retrô', objeto: 'geladeira', id: 'geladeira-retro', saldo: 20 }
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
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text())
  })
  const chegada = ancora('chegada')
  const em = `${chegada.x.toFixed(2)},${chegada.z.toFixed(2)},${(chegada.y + 1.2).toFixed(2)}`
  // Posição 8: todas as ilhas abertas.
  await page.goto(`${baseURL}/?novo=1&obra=exemplo&posicao=8&publico=${publico}&em=${em}`, {
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

  const barraca = ancora(ANCORA_DA_FEIRA)
  await levar(barraca, rumoDe(barraca, ancora('fonte')))
  await page.waitForTimeout(1600)
  await page.getByText('Ver a feira da semana', { exact: false }).first().waitFor()
  const abrir = async () => {
    if (celular) await page.getByRole('button', { name: 'Usar', exact: true }).click()
    else await page.keyboard.press('KeyE')
  }
  await abrir()
  const feira = page.getByRole('dialog', { name: 'Feira da Vila Doce', exact: true })
  await feira.waitFor()
  await page.screenshot({ path: path.join(prints, '00-entrada.png') })
  if (insumos) {
    await feira.getByText('Você tem 80 moedas.', { exact: true }).first().waitFor()
    const bloco = feira.getByRole('region', { name: 'Sementes, ingredientes e iscas' })
    await bloco.getByLabel('Item', { exact: true }).selectOption('leite')
    await bloco.getByLabel('Quantidade', { exact: true }).selectOption('3')
    await bloco.getByRole('button', { name: 'Comprar ingredientes', exact: true }).click()
    await bloco
      .getByRole('button', { name: 'Confirmar compra por 6 moedas', exact: true })
      .waitFor()
    await bloco.scrollIntoViewIfNeeded()
    await page.screenshot({ path: path.join(prints, '01-insumos-confirmacao.png') })
    await bloco.getByRole('button', { name: 'Cancelar compra', exact: true }).click()
    const ler = () =>
      page.evaluate(() => ({
        jogo: JSON.parse(localStorage.getItem('arquipelago-playground') ?? 'null'),
        carteira: JSON.parse(localStorage.getItem('arquipelago-playground:galeria') ?? 'null'),
      }))
    const antes = await ler()
    if (
      (antes.carteira && antes.carteira.saldo !== 80) ||
      (antes.jogo?.salvamento.inventario.leite ?? 0) !== 0
    )
      throw Error('Cancelar alterou carteira ou mochila')
    await bloco.getByRole('button', { name: 'Comprar ingredientes', exact: true }).click()
    await bloco.getByRole('button', { name: 'Confirmar compra por 6 moedas', exact: true }).click()
    await page.waitForFunction(() => {
      const s = JSON.parse(localStorage.getItem('arquipelago-playground') ?? 'null')
      return s?.salvamento.inventario.leite === 3
    })
    // A pausa transitória conserva o painel; cada nova compra exige outra confirmação.
    await bloco
      .getByRole('button', { name: 'Comprar ingredientes', exact: true })
      .waitFor({ timeout: 10_000 })
    if (
      await bloco
        .getByRole('button', { name: 'Confirmar compra por 6 moedas', exact: true })
        .count()
    )
      throw Error('Confirmação anterior permaneceu ativa depois da entrega')
    await page.screenshot({ path: path.join(prints, '02-insumos-entregues.png') })
    await feira.getByRole('button', { name: 'Voltar à Vila', exact: true }).click()
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Abrir o menu', exact: true }).waitFor()
    await page.waitForFunction(
      () =>
        ((globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho?.ilhasCompletas ??
          0) > 0,
      undefined,
      { timeout: 180_000 },
    )
    await page.locator('canvas').click()
    await levar(barraca, rumoDe(barraca, ancora('fonte')))
    await page.getByText('Ver a feira da semana', { exact: false }).first().waitFor()
    await abrir()
    await feira.waitFor()
    await feira
      .getByRole('region', { name: 'Sementes, ingredientes e iscas' })
      .scrollIntoViewIfNeeded()
    const limites = await feira.evaluate((el) => ({
      largura: el.clientWidth,
      conteudo: el.scrollWidth,
      direita: el.getBoundingClientRect().right,
      tela: innerWidth,
    }))
    if (limites.conteudo > limites.largura + 1 || limites.direita > limites.tela)
      throw Error('Insumos não cabem na tela')
    const depois = await ler()
    if (
      depois.jogo?.salvamento.inventario.leite !== 3 ||
      depois.carteira?.saldo !== 74 ||
      Object.keys(depois.carteira.debitos ?? {}).length !== 1
    )
      throw Error('Compra mudou depois de reabrir')
    if (
      await page
        .getByText(
          'Seu progresso está guardado neste aparelho. Vamos enviá-lo quando a conexão voltar.',
          { exact: true },
        )
        .count()
    )
      throw Error('Aviso offline sem falha de conexão')
    await page.screenshot({ path: path.join(prints, '03-insumos-reabertos.png') })
    if (erros.length) throw Error(erros.join('\n'))
    writeFileSync(
      path.join(prints, 'resultado.json'),
      JSON.stringify(
        {
          publico,
          celular,
          insumos: true,
          quantidade: 3,
          saldo: depois.carteira.saldo,
          debitos: Object.keys(depois.carteira.debitos).length,
          limites,
          erros,
        },
        null,
        2,
      ),
    )
    console.log(`Insumos conferidos em ${prints}`)
  } else {
    await feira.locator('summary').click()
    // Nove objetos com a clássica, a retrô e a moderna (B8).
    if ((await feira.getByRole('article').count()) !== 27) throw Error('Catálogo incompleto')
    const geladeira = feira.getByRole('article', { name: alvo.nome, exact: true })
    await geladeira.getByText('Você tem 80 moedas.', { exact: true }).waitFor()
    await geladeira
      .getByText(
        compartilhada
          ? 'A posse também vale no Meu quarto. O visual acompanha cada lugar.'
          : 'Esta aparência é usada no Arquipélago.',
        { exact: true },
      )
      .waitFor()
    const forno = feira.getByRole('article', { name: 'Forno clássico', exact: true })
    if (await forno.getByRole('button', { name: 'Comprar', exact: true }).count())
      throw Error('Compra oferecida sem projeto funcional')
    await page.screenshot({ path: path.join(prints, '01-feira.png') })
    await geladeira.getByRole('button', { name: 'Comprar', exact: true }).click()
    const confirmar = geladeira.getByRole('group')
    await confirmar.waitFor()
    const antes = await page.evaluate(() => localStorage.getItem('arquipelago-playground:galeria'))
    if (antes && JSON.parse(antes).saldo !== 80) throw Error('Cobrou antes de confirmar')
    await page.screenshot({ path: path.join(prints, '02-confirmar.png') })
    await confirmar.getByRole('button', { name: 'Agora não', exact: true }).click()
    await geladeira.getByRole('button', { name: 'Comprar', exact: true }).click()
    await geladeira.getByRole('group').getByRole('button', { name: 'Comprar', exact: true }).click()
    await geladeira.getByText('Em uso', { exact: true }).waitFor()
    await geladeira.getByText(`Você tem ${alvo.saldo} moedas.`, { exact: true }).waitFor()
    const limites = await feira.evaluate((el) => ({
      largura: el.clientWidth,
      conteudo: el.scrollWidth,
      esquerda: el.getBoundingClientRect().left,
      direita: el.getBoundingClientRect().right,
      tela: innerWidth,
    }))
    if (
      limites.conteudo > limites.largura + 1 ||
      limites.esquerda < 0 ||
      limites.direita > limites.tela
    )
      throw Error('Feira não cabe na tela')
    await page.screenshot({ path: path.join(prints, '03-comprada.png') })
    await feira.getByRole('button', { name: 'Voltar à Vila', exact: true }).click()
    await feira.waitFor({ state: 'detached' })
    await page.waitForFunction(({ objeto, id }) => {
      const s = JSON.parse(localStorage.getItem('arquipelago-playground') ?? 'null')
      return s?.salvamento?.projetos?.[objeto]?.aparencia?.id === id
    }, alvo)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForFunction(
      () =>
        ((globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho?.ilhasCompletas ??
          0) > 0,
      undefined,
      { timeout: 180_000 },
    )
    await page.locator('canvas').click()
    await levar(barraca, rumoDe(barraca, ancora('fonte')))
    await page.waitForTimeout(1600)
    await page.getByText('Ver a feira da semana', { exact: false }).first().waitFor()
    await abrir()
    await feira.waitFor()
    await feira.locator('summary').click()
    await geladeira.getByText('Em uso', { exact: true }).waitFor()
    await geladeira.getByText(`Você tem ${alvo.saldo} moedas.`, { exact: true }).waitFor()
    if (await geladeira.getByRole('button', { name: 'Comprar', exact: true }).count())
      throw Error('Ofereceu cobrança repetida')
    const carteira = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('arquipelago-playground:galeria') ?? 'null'),
    )
    if (carteira?.saldo !== alvo.saldo || carteira?.pagas?.length !== 1)
      throw Error('Compra não persistiu')
    await page.screenshot({ path: path.join(prints, '04-reaberta.png') })
    if (erros.length) throw Error(erros.join('\n'))
    writeFileSync(
      path.join(prints, 'resultado.json'),
      JSON.stringify({ publico, celular, compartilhada, alvo, limites, carteira, erros }, null, 2),
    )
    console.log(`Feira conferida em ${prints}`)
  }
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
