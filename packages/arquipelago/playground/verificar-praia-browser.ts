/** Modelos e jogo reais, plataforma falsa local. Nenhum banco ou perfil remoto. */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import path from 'node:path'
import { chromium, type Page } from 'playwright-core'
import { PONTO_DA_PESCA } from '../src/mundo/lugares-da-praia'
import { alturaDaIlha } from '../src/mundo/medidas'
import { CODIGO_DA_VISITA_ADULTA_DE_EXEMPLO as codigo } from '../src/plataforma/visitas-adultas-falsas'
import { CONCHAS_DA_PRAIA, PEIXES_DA_PRAIA } from '../src/sistemas/colecoes-da-praia'
import { CORPO } from '../src/sistemas/corpo'

const prints = process.env.ARQUIPELAGO_PRINTS
if (!prints) throw new Error('Defina uma pasta inédita em ARQUIPELAGO_PRINTS.')
const somenteVisual = process.env.ARQUIPELAGO_PRAIA_VISUAL === '1'
const aparelho = process.env.ARQUIPELAGO_PRAIA_APARELHO
if (aparelho && aparelho !== 'celular' && aparelho !== 'computador')
  throw new Error('Aparelho inválido')
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
const servidor = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(porta) },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
const encerrado = new Promise<void>((r) => servidor.once('close', () => r()))
let logs = '',
  browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
servidor.stdout.on('data', (s) => {
  logs += s
})
servidor.stderr.on('data', (s) => {
  logs += s
})
const terminal = setTimeout(() => {
  void browser?.close()
  servidor.kill()
}, 10 * 60_000)
const resultados: unknown[] = []
// Repetição curta apenas do acabamento da barra; não substitui a prova completa.
async function levar(page: Page, p: { x: number; y: number; z: number }) {
  await page.waitForFunction(
    () => typeof (globalThis as { __arquipelagoLevar?: unknown }).__arquipelagoLevar === 'function',
  )
  await page.evaluate(
    ({ x, y, z }) => {
      const g = globalThis as {
        __arquipelagoLevar?: (x: number, y: number, z: number, giro: number) => void
      }
      g.__arquipelagoLevar?.(x, y, z, Math.PI)
    },
    { ...p, y: p.y + CORPO.doCentroAoPe + 0.1 },
  )
}
async function inventario(page: Page): Promise<Record<string, number>> {
  return page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('arquipelago-playground') ?? '{}').salvamento?.inventario ??
      {},
  )
}
async function esperarMiniaturas(page: Page) {
  await page.waitForFunction(() => {
    const imagens = Array.from(
      document.querySelectorAll('.arq-album .arq-caderno-secao:nth-of-type(-n+2) img'),
    )
    return (
      imagens.length === 11 &&
      imagens.every(
        (img) => img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0,
      )
    )
  })
}
try {
  const prazo = Date.now() + 45000
  while (true) {
    if (servidor.exitCode !== null) throw new Error(`Playground encerrou: ${logs}`)
    try {
      if ((await fetch(base)).ok) break
    } catch {}
    if (Date.now() > prazo) throw new Error(`Playground não iniciou: ${logs}`)
    await new Promise((r) => setTimeout(r, 200))
  }
  browser = await chromium.launch({
    ...(process.env.ARQUIPELAGO_CHROMIUM
      ? { executablePath: process.env.ARQUIPELAGO_CHROMIUM }
      : { channel: 'chrome' }),
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  for (const celular of aparelho ? [aparelho === 'celular'] : [false, true]) {
    const tipo = celular ? 'celular' : 'computador'
    const ctx = await browser.newContext({
      viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 800 },
      isMobile: celular,
      hasTouch: celular,
      reducedMotion: celular ? 'reduce' : 'no-preference',
    })
    const page = await ctx.newPage(),
      erros: string[] = []
    page.setDefaultTimeout(60000)
    page.on('pageerror', (e) => erros.push(e.message))
    page.on('console', (m) => {
      if (m.type() === 'error') erros.push(m.text())
    })
    await page.addInitScript(() => localStorage.setItem('arquipelago:medir', '1'))
    await page.goto(
      `${base}/?novo=1&posicao=8&publico=${celular ? 'adulto' : 'kids'}&qualidade=leve&em=8,25,2`,
    )
    const usar = async (texto: string) => {
      await page.locator('.arq-acao').filter({ hasText: texto }).waitFor()
      if (celular) await page.getByRole('button', { name: 'Usar', exact: true }).tap()
      else await page.keyboard.press('e')
    }
    for (const p of somenteVisual ? CONCHAS_DA_PRAIA.slice(0, 1) : CONCHAS_DA_PRAIA) {
      await levar(page, { x: p.x, y: alturaDaIlha(p.x, p.z), z: p.z })
      await usar(
        p.observar ? 'Observar a estrela-do-mar' : `Pegar ${p.nome.toLocaleLowerCase('pt-BR')}`,
      )
      await page.waitForFunction(
        (id) =>
          JSON.parse(localStorage.getItem('arquipelago-playground') ?? '{}').salvamento
            ?.inventario?.[id] === 1,
        p.id,
      )
    }
    await page.screenshot({ path: path.join(prints, `${tipo}-praia.png`) })
    if (somenteVisual) {
      assert.equal(await page.locator('.arq-inventario .arq-item').count(), 4)
      await page.getByRole('button', { name: 'Abrir coleções da praia', exact: true }).waitFor()
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
      )
      assert.deepEqual(erros, [])
      const botao = page.getByRole('button', { name: 'Abrir coleções da praia', exact: true })
      if (celular) await botao.tap()
      else await botao.click()
      await esperarMiniaturas(page)
      await page.screenshot({ path: path.join(prints, `${tipo}-miniaturas.png`) })
      resultados.push({ tipo, escopo: 'barra-compacta', umAtalhoDeColecoes: true, erros })
      await ctx.close()
      continue
    }
    console.log(`PASS ${tipo}: seis descobertas da areia`)
    await levar(page, PONTO_DA_PESCA)
    await usar('Lançar a linha')
    await page.getByRole('button', { name: 'Abrir o menu', exact: true }).click()
    await page.waitForTimeout(8500)
    await page.getByRole('button', { name: 'Continuar jogando', exact: true }).first().click()
    await page.locator('.arq-acao').filter({ hasText: 'Esperar o peixe' }).waitFor()
    await page.locator('.arq-acao').filter({ hasText: 'Recolher a linha' }).waitFor()
    // Perder a janela não altera o inventário e permite nova tentativa.
    await page.locator('.arq-acao').filter({ hasText: 'Tentar a pesca de novo' }).waitFor()
    const antes = await inventario(page)
    assert(!PEIXES_DA_PRAIA.some((p) => antes[p.id]))
    await usar('Tentar a pesca de novo')
    for (let i = 0; i < PEIXES_DA_PRAIA.length; i++) {
      if (i > 0) await usar('Lançar a linha')
      await usar('Recolher a linha')
      const peixe = PEIXES_DA_PRAIA[i]
      assert(peixe)
      await page.waitForFunction(
        (id) =>
          JSON.parse(localStorage.getItem('arquipelago-playground') ?? '{}').salvamento
            ?.inventario?.[id] === 1,
        peixe.id,
      )
    }
    await page.screenshot({ path: path.join(prints, `${tipo}-pesca.png`) })
    assert.equal(await page.locator('.arq-inventario .arq-item').count(), 4)
    console.log(`PASS ${tipo}: pausa, janela perdida e cinco peixes`)
    const abrirAlbum = page.getByRole('button', { name: 'Abrir coleções da praia', exact: true })
    if (celular) await abrirAlbum.tap()
    else await abrirAlbum.click()
    await page
      .getByRole('heading', { name: 'Conchas e estrela-do-mar: 6 de 6', exact: true })
      .waitFor()
    await page.getByRole('heading', { name: 'Peixes da praia: 5 de 5', exact: true }).waitFor()
    await esperarMiniaturas(page)
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    )
    await page.screenshot({ path: path.join(prints, `${tipo}-album.png`) })
    // Reabre sem novo=1 nem em, que são produtores de nova massa.
    await page.goto(`${base}/?posicao=8&publico=${celular ? 'adulto' : 'kids'}&qualidade=leve`)
    await page.getByRole('button', { name: 'Abrir o menu', exact: true }).waitFor()
    const depois = await inventario(page)
    for (const p of [...CONCHAS_DA_PRAIA, ...PEIXES_DA_PRAIA]) assert.equal(depois[p.id], 1)
    assert.deepEqual(erros, [])
    resultados.push({
      tipo,
      publico: celular ? 'adulto' : 'kids',
      conchas: 6,
      peixes: 5,
      pausa: true,
      janelaPerdidaSemPerda: true,
      reabertura: true,
      erros,
    })
    await ctx.close()
  }
  if (!somenteVisual) {
    const ctx = await browser.newContext(),
      page = await ctx.newPage()
    page.setDefaultTimeout(60000)
    await page.addInitScript(() => localStorage.setItem('arquipelago:medir', '1'))
    await page.goto(
      `${base}/?novo=1&posicao=8&publico=adulto&visita-adulta=1&qualidade=leve&em=2.5,11,2`,
    )
    await page.getByRole('button', { name: 'Abrir o menu', exact: true }).click()
    await page.getByRole('button', { name: 'Visitas da comunidade', exact: true }).click()
    await page.getByLabel('Código recebido', { exact: true }).fill(codigo)
    await page.getByRole('button', { name: 'Abrir visita', exact: true }).click()
    await page.locator('.arq-visita-faixa').waitFor()
    // O píer fica fora do raio da visita. Não sair desse raio para conferir sua política.
    await levar(page, { x: 8, y: alturaDaIlha(8, 25), z: 25 })
    await page.waitForTimeout(1500)
    await page.locator('.arq-visita-faixa').waitFor()
    assert.equal(await page.locator('.arq-acao').filter({ hasText: 'Pegar concha' }).count(), 0)
    await ctx.close()
  }
  await writeFile(
    path.join(prints, 'resultado.json'),
    `${JSON.stringify({ resultados, visitaSemColeta: somenteVisual ? null : true }, null, 2)}\n`,
  )
} catch (erro) {
  await writeFile(path.join(prints, 'falha.txt'), `${String(erro)}\n${logs}`)
  for (const c of browser?.contexts() ?? [])
    for (const p of c.pages()) {
      await writeFile(
        path.join(prints, 'pagina.txt'),
        await p
          .locator('body')
          .innerText()
          .catch(() => 'Página indisponível'),
      )
      await p.screenshot({ path: path.join(prints, 'falha.png') }).catch(() => {})
    }
  throw erro
} finally {
  clearTimeout(terminal)
  try {
    await browser?.close()
  } finally {
    servidor.kill()
    await encerrado
  }
}
