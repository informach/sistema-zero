/** Jogo e modelos reais, consentimento simulado local. Sem banco remoto ou sessão real. */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import path from 'node:path'
import { chromium, type Page } from 'playwright-core'
import { CODIGO_DA_VISITA_ADULTA_DE_EXEMPLO as codigo } from '../src/plataforma/visitas-adultas-falsas'

const prints = process.env.ARQUIPELAGO_PRINTS
if (!prints) throw new Error('Defina ARQUIPELAGO_PRINTS com uma pasta inédita.')
await mkdir(prints, { recursive: false })
const porta = await new Promise<number>((resolve, reject) => {
  const s = createServer().once('error', reject)
  s.listen(0, '127.0.0.1', () => {
    const a = s.address()
    if (!a || typeof a === 'string') return reject(new Error('Sem porta local'))
    s.close(() => resolve(a.port))
  })
})
const base = `http://127.0.0.1:${porta}`
const server = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(porta) },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
const encerrado = new Promise<void>((r) => server.once('close', () => r()))
let logs = '',
  browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
server.stdout.on('data', (s) => {
  logs += s
})
server.stderr.on('data', (s) => {
  logs += s
})
const terminal = setTimeout(() => {
  void browser?.close()
  server.kill()
}, 10 * 60_000)
const resultados: unknown[] = []
const url = (exemplo: '1' | 'revogar', publico = 'adulto') =>
  `${base}/?novo=1&posicao=8&publico=${publico}&obra=exemplo&visita-adulta=${exemplo}&qualidade=leve&em=2.5,11,2`
async function painel(page: Page) {
  await page.getByRole('button', { name: 'Abrir o menu', exact: true }).click()
  await page.getByRole('button', { name: 'Visitas da comunidade', exact: true }).click()
  return page.getByRole('dialog', { name: 'Visitas entre pessoas da comunidade', exact: true })
}
async function entrar(page: Page) {
  const p = await painel(page)
  await p.getByLabel('Código recebido', { exact: true }).fill(codigo)
  await p.getByRole('button', { name: 'Abrir visita', exact: true }).click()
  await p.waitFor({ state: 'detached' })
  await page.locator('.arq-visita-faixa').waitFor()
}
const guardado = (page: Page) => page.evaluate(() => localStorage.getItem('arquipelago-playground'))
try {
  const prazo = Date.now() + 45000
  while (true) {
    if (server.exitCode !== null) throw new Error(logs)
    if (logs.includes('Arquipélago no ar') && (await fetch(base)).ok) break
    if (Date.now() > prazo) throw new Error('O playground não iniciou.')
    await new Promise((r) => setTimeout(r, 100))
  }
  browser = await chromium.launch({
    ...(process.env.ARQUIPELAGO_CHROMIUM
      ? { executablePath: process.env.ARQUIPELAGO_CHROMIUM }
      : { channel: 'chrome' }),
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  const navegador = browser
  for (const celular of [false, true]) {
    const tipo = celular ? 'celular' : 'computador'
    const erros: string[] = []
    const novaPagina = async () => {
      const ctx = await navegador.newContext({
        viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 800 },
        isMobile: celular,
        hasTouch: celular,
        reducedMotion: celular ? 'reduce' : 'no-preference',
      })
      const page = await ctx.newPage()
      page.setDefaultTimeout(60000)
      page.on('pageerror', (e) => erros.push(e.message))
      page.on('console', (m) => {
        if (m.type() === 'error') erros.push(m.text())
      })
      return { ctx, page }
    }
    let { ctx, page } = await novaPagina()
    await page.goto(url('1'))
    let p = await painel(page)
    await p.getByText('As visitas estão desligadas.', { exact: true }).waitFor()
    await p.getByRole('button', { name: 'Ativar e gerar código', exact: true }).click()
    const gerado = await p.getByLabel('Código para compartilhar', { exact: true }).inputValue()
    assert.equal(gerado.length, 32)
    assert.equal(
      await page.evaluate((c) => Object.values(localStorage).some((v) => v.includes(c)), gerado),
      false,
    )
    await page.screenshot({ path: path.join(prints, `${tipo}-convite.png`) })
    await p.getByRole('button', { name: 'Voltar ao jogo', exact: true }).click()
    p = await painel(page)
    assert.equal(await p.getByLabel('Código para compartilhar', { exact: true }).count(), 0)
    await p.getByRole('button', { name: 'Gerar outro código', exact: true }).click()
    assert.notEqual(
      await p.getByLabel('Código para compartilhar', { exact: true }).inputValue(),
      gerado,
    )
    await p.getByRole('button', { name: 'Desligar visitas', exact: true }).click()
    await p.getByText('As visitas estão desligadas.', { exact: true }).waitFor()
    assert.equal(await p.getByLabel('Código para compartilhar', { exact: true }).count(), 0)
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    )

    await ctx.close()
    const segunda = await novaPagina()
    ctx = segunda.ctx
    page = segunda.page
    await page.goto(url('1'))
    // A massa inicial existe no serviço falso em memória. Observar a primeira gravação normal
    // antes da visita, sem confundir ausência de cópia local com perda do save canônico.
    await page.waitForFunction(() => localStorage.getItem('arquipelago-playground') !== null)
    await entrar(page)
    assert.equal(await page.locator('.arq-modos').count(), 0)
    await page.waitForTimeout(1200)
    const antes = await guardado(page)
    assert.ok(antes, 'O save próprio precisa existir antes de conferir a visita')
    await page.waitForTimeout(1800)
    const depois = await guardado(page)
    assert.equal(depois, antes, 'Visitar não pode gravar a casa alheia ou alterar o save próprio')
    await page.screenshot({ path: path.join(prints, `${tipo}-visita.png`) })
    await page
      .locator('.arq-visita-faixa')
      .getByRole('button', { name: 'Voltar para a minha casa', exact: true })
      .click()
    await page.locator('.arq-visita-faixa').waitFor({ state: 'detached' })
    await page.getByRole('button', { name: 'Construir', exact: true }).waitFor()

    await ctx.close()
    const terceira = await novaPagina()
    ctx = terceira.ctx
    page = terceira.page
    await page.goto(url('revogar'))
    await entrar(page)
    // Simula o evento de retomada. A plataforma falsa revoga na próxima conferência.
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
    await page.locator('.arq-visita-faixa').waitFor({ state: 'detached' })
    await page.getByRole('button', { name: 'Construir', exact: true }).waitFor()
    await page.screenshot({ path: path.join(prints, `${tipo}-revogada.png`) })
    assert.equal(erros.length, 0, JSON.stringify(erros))
    resultados.push({
      tipo,
      geracaoRotacaoRevogacao: true,
      codigoForaDoArmazenamento: true,
      saveIntactoNaVisita: true,
      retornoPorRevogacao: true,
      erros,
    })
    await ctx.close()
    console.log(`PASS ${tipo}: consentimento, rotação, visita sem escrita, revogação e retorno`)
  }
  const ctx = await browser.newContext(),
    page = await ctx.newPage()
  await page.goto(url('1', 'kids'))
  await page.getByRole('button', { name: 'Abrir o menu', exact: true }).click()
  assert.equal(
    await page.getByRole('button', { name: 'Visitas da comunidade', exact: true }).count(),
    0,
  )
  await page.getByRole('button', { name: 'Visitar um irmão', exact: true }).waitFor()
  await ctx.close()
  await writeFile(
    path.join(prints, 'resultado.json'),
    `${JSON.stringify({ resultados, kidsSeparado: true }, null, 2)}\n`,
  )
} catch (erro) {
  await writeFile(path.join(prints, 'falha.txt'), `${String(erro)}\n${logs}`)
  for (const c of browser?.contexts() ?? [])
    for (const p of c.pages())
      await p.screenshot({ path: path.join(prints, 'falha.png') }).catch(() => {})
  throw erro
} finally {
  clearTimeout(terminal)
  await browser?.close()
  server.kill()
  await encerrado
}
