/**
 * A pele adulta do jogo no navegador (fase3-13). Só usa a plataforma falsa, sem banco.
 *
 * 1. Computador (1280 × 800, `?publico=adulto`): a raiz com `.arq-adulto`, o CSS do pedaço adulto
 *    aplicado (o amarelo com degrau, a letra Atkinson pedida, nada abaixo de 15 px no menu), sem a
 *    pílula do tempo livre, o menu sem "Visitar um irmão" e com "Voltar para a comunidade".
 * 2. Celular emulado (390 × 844, toque): o mesmo menu pelo toque, sem rolagem para o lado.
 * 3. A tela de fechado (`?liberado=0`) na voz adulta, no palco.
 * 4. O Kids na mesma página: sem `.arq-adulto`, sem o CSS adulto, com a visita e a voz de sempre.
 *
 * No Windows: `bun build playground/verificar-pele-adulta-browser.ts --target=node --external
 * playwright-core --outfile .cache/verificar-pele-adulta-browser.mjs && node
 * .cache/verificar-pele-adulta-browser.mjs`. Aceita `ARQUIPELAGO_CHROMIUM` (com o SwiftShader),
 * `ARQUIPELAGO_TEST_PORT` e `ARQUIPELAGO_PRINTS`.
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { type Browser, chromium, type Page } from 'playwright-core'

const porta = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4613)
const base = `http://127.0.0.1:${porta}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? path.resolve('.cache/pele-adulta')
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

/** Abre o playground e espera o HUD (o jogo pronto). */
async function abrir(browser: Browser, consulta: string, celular = false) {
  const contexto = await browser.newContext(
    celular
      ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
      : { viewport: { width: 1280, height: 800 } },
  )
  contexto.setDefaultTimeout(120_000)
  const pagina = await contexto.newPage()
  const erros: string[] = []
  pagina.on('pageerror', (e) => erros.push(e.message))
  await pagina.goto(`${base}/?novo=1&${consulta}`, { waitUntil: 'domcontentloaded' })
  return { contexto, pagina, erros }
}

async function abrirMenu(pagina: Page, celular: boolean) {
  const botao = pagina.getByRole('button', { name: 'Abrir o menu' })
  await botao.waitFor({ timeout: 180_000 })
  if (celular) await botao.tap()
  else await botao.click()
  const menu = pagina.getByRole('dialog', { name: 'Menu do jogo' })
  await menu.waitFor()
  return menu
}

/** A menor letra de texto visível dentro de um elemento. */
const menorLetra = (pagina: Page, seletor: string) =>
  pagina.evaluate((s) => {
    const raiz = document.querySelector(s)
    if (!raiz) return { menor: 0, qual: 'sem o elemento' }
    let menor = Number.POSITIVE_INFINITY
    let qual = ''
    const andar = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT)
    while (andar.nextNode()) {
      const no = andar.currentNode
      const el = no.parentElement
      if (!el || !no.textContent?.trim() || el.closest('.arq-sr')) continue
      const caixa = el.getBoundingClientRect()
      if (caixa.width === 0 || caixa.height === 0) continue
      const tamanho = Number.parseFloat(getComputedStyle(el).fontSize)
      if (tamanho < menor) {
        menor = tamanho
        qual = `${el.tagName.toLowerCase()}.${el.className} "${no.textContent.trim().slice(0, 30)}"`
      }
    }
    return { menor, qual }
  }, seletor)

const semRolagemDeLado = (pagina: Page) =>
  pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth)

let browser: Browser | undefined
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
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })

  // ── 1 e 2. O adulto no computador e no celular ──────────────────────────────────────────────
  for (const celular of [false, true]) {
    const nome = celular ? 'celular' : 'computador'
    const { contexto, pagina, erros } = await abrir(browser, 'publico=adulto&posicao=3', celular)
    const menu = await abrirMenu(pagina, celular)
    assert.equal(await pagina.locator('.arq-raiz.arq-adulto').count(), 1, 'sem .arq-adulto')
    const botao = await menu.getByRole('button', { name: 'Continuar jogando' }).evaluate((b) => {
      const c = getComputedStyle(b)
      return { fundo: c.backgroundColor, sombra: c.boxShadow, letra: c.fontFamily }
    })
    assert.equal(botao.fundo, 'rgb(255, 192, 46)', `fundo do botão: ${botao.fundo}`)
    assert.match(botao.sombra, /rgb\(201, 138, 0\) 0px 4px 0px/, `degrau: ${botao.sombra}`)
    assert.match(botao.letra, /Atkinson/, `letra: ${botao.letra}`)
    assert.equal(await menu.getByRole('button', { name: /Visitar um irmão/ }).count(), 0)
    await menu.getByRole('button', { name: 'Voltar para a comunidade' }).waitFor()
    assert.equal(await pagina.getByText(/^Hoje: \d+ min$/).count(), 0, 'pílula do tempo livre')
    const letra = await menorLetra(pagina, '.arq-pausa')
    assert(letra.menor >= 15, `letra de ${letra.menor}px no menu: ${letra.qual}`)
    assert(await semRolagemDeLado(pagina), 'rolagem para o lado')
    await pagina.screenshot({ path: path.join(prints, `${nome}-menu.png`) })
    const fechar = menu.getByRole('button', { name: 'Continuar jogando' })
    if (celular) await fechar.tap()
    else await fechar.click()
    await menu.waitFor({ state: 'hidden' })
    await pagina.waitForTimeout(1500)
    await pagina.screenshot({ path: path.join(prints, `${nome}-hud.png`) })
    assert.deepEqual(erros, [])
    console.log(`Adulto, ${nome}: pele, menu sem família, sem tempo livre e letra ≥ 15 px`)
    await contexto.close()
  }

  // ── 3. Fechado, na voz adulta ───────────────────────────────────────────────────────────────
  {
    const { contexto, pagina, erros } = await abrir(browser, 'publico=adulto&liberado=0')
    await pagina.getByRole('heading', { name: 'Ainda não abriu para você' }).waitFor()
    await pagina
      .getByText('O Arquipélago Vagalume está abrindo aos poucos.', { exact: false })
      .waitFor()
    await pagina.getByRole('button', { name: 'Voltar para a comunidade' }).waitFor()
    const fundo = await pagina
      .locator('.arq-tela')
      .evaluate((t) => getComputedStyle(t).backgroundColor)
    assert.equal(fundo, 'rgb(18, 23, 51)', `fundo do palco: ${fundo}`)
    assert.equal(await pagina.locator('.arq-tela .arq-zappy').isVisible(), false)
    await pagina.screenshot({ path: path.join(prints, 'computador-fechado.png') })
    assert.deepEqual(erros, [])
    console.log('Adulto, fechado: a tela no palco, sem mascote e na voz adulta')
    await contexto.close()
  }

  // ── 4. O Kids continua o de sempre ──────────────────────────────────────────────────────────
  {
    const { contexto, pagina, erros } = await abrir(browser, 'posicao=3')
    const menu = await abrirMenu(pagina, false)
    assert.equal(await pagina.locator('.arq-adulto').count(), 0)
    const cssAdulto = await pagina.evaluate(() =>
      [...document.querySelectorAll('style')].some((s) => s.textContent?.includes('.arq-adulto')),
    )
    assert.equal(cssAdulto, false, 'o CSS adulto chegou ao Kids')
    await menu.getByRole('button', { name: 'Visitar um irmão' }).waitFor()
    await menu.getByRole('button', { name: 'Voltar para a plataforma' }).waitFor()
    const fundo = await menu
      .getByRole('button', { name: 'Continuar jogando' })
      .evaluate((b) => getComputedStyle(b).backgroundColor)
    assert.equal(fundo, 'rgb(255, 201, 60)', `o botão do Kids mudou: ${fundo}`)
    await pagina.screenshot({ path: path.join(prints, 'kids-menu.png') })
    assert.deepEqual(erros, [])
    console.log('Kids: sem a pele adulta, com a visita e a voz de sempre')
    await contexto.close()
  }
} finally {
  await browser?.close()
  if (servidor.exitCode === null) servidor.kill()
}
