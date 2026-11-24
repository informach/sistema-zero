// Fotografa as telas da oficina no playground (http://127.0.0.1:4541), para conferir o visual.
// Uso: node playground/oficina/fotografar.mjs <pasta de saída> [tela ...]
// Telas: inicio, bibliotecas, mundo, oficina, oficina-escolha, oficina-luz, celular, escuro.

import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright-core'

const saida = process.argv[2] ?? 'fotos'
const pedidas = process.argv.slice(3)
const quer = (tela) => pedidas.length === 0 || pedidas.includes(tela)
const BASE = process.env.OFICINA_URL ?? 'http://127.0.0.1:4541'
mkdirSync(saida, { recursive: true })

const navegador = await chromium.launch({
  channel: process.env.OFICINA_CANAL ?? 'chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const erros = []

async function abrir(caminho, largura, altura, toque = false) {
  const pagina = await navegador.newPage({
    viewport: { width: largura, height: altura },
    hasTouch: toque,
    isMobile: toque,
  })
  pagina.on('console', (m) => m.type() === 'error' && erros.push(`${caminho}: ${m.text()}`))
  pagina.on('pageerror', (e) => erros.push(`${caminho}: ${e.message}`))
  await pagina.goto(`${BASE}/${caminho}`)
  await pagina.waitForFunction(() => globalThis.__cenarios, null, { timeout: 180_000 })
  return pagina
}
async function foto(pagina, nome, espera = 800) {
  await pagina.waitForTimeout(espera)
  await pagina.screenshot({ path: join(saida, `${nome}.png`) })
  console.log(`foto: ${nome}`)
}
/** Espera o palco terminar de trazer os modelos e desenhar. */
async function palcoPronto(pagina) {
  await pagina.waitForSelector('.mcn-palco-tela')
  await pagina.waitForFunction(
    () => {
      const texto = document.querySelector('.mcn-orcamento')?.textContent ?? ''
      return texto.includes('objeto') && !texto.includes('chegando')
    },
    null,
    { timeout: 180_000 },
  )
  await pagina.waitForTimeout(2500)
}

if (quer('inicio')) {
  const p = await abrir('', 1440, 900)
  await foto(p, '01-meus-mundos')
  await p.close()
}
if (quer('bibliotecas')) {
  const p = await abrir('?tela=bibliotecas', 1440, 900)
  await foto(p, '02-bibliotecas')
  await p.getByRole('button', { name: /Abrir Aventura/ }).click()
  await foto(p, '03-biblioteca-aventura', 1500)
  await p.close()
}
if (quer('mundo')) {
  const p = await abrir('?tela=mundo', 1440, 900)
  await foto(p, '04-o-mundo')
  await p.close()
}
if (quer('oficina')) {
  const p = await abrir('?tela=oficina', 1440, 900)
  await palcoPronto(p)
  await foto(p, '05-oficina')
  await p.close()
}
if (quer('oficina-escolha')) {
  const p = await abrir('?tela=oficina', 1440, 900)
  await palcoPronto(p)
  const tela = await p.locator('.mcn-palco-tela').boundingBox()
  // Toca perto do meio do palco, onde ficam as casas da demonstração.
  for (const [dx, dy] of [
    [0, 0.05],
    [0.06, 0],
    [-0.06, 0.02],
    [0.03, 0.1],
    [-0.04, -0.06],
  ]) {
    await p.mouse.click(tela.x + tela.width * (0.5 + dx), tela.y + tela.height * (0.5 + dy))
    await p.waitForTimeout(600)
    if (await p.getByText('O que está escolhido').count()) break
  }
  await p.getByRole('button', { name: 'Mover' }).click()
  await foto(p, '06-oficina-objeto-escolhido', 1500)
  await p.close()
}
if (quer('oficina-luz')) {
  const p = await abrir('?tela=oficina', 1440, 900)
  await palcoPronto(p)
  await p.getByRole('button', { name: 'Luz e céu' }).click()
  await p.getByRole('button', { name: 'Tarde' }).click()
  await foto(p, '07-oficina-luz-tarde', 2500)
  await p.getByRole('button', { name: 'Noite' }).click()
  await foto(p, '08-oficina-luz-noite', 2500)
  await p.close()
}
if (quer('notebook')) {
  const p = await abrir('?tela=oficina', 1366, 768)
  await palcoPronto(p)
  await foto(p, '09-oficina-1366')
  await p.close()
}
if (quer('tablet')) {
  const p = await abrir('?tela=oficina', 1024, 768)
  await palcoPronto(p)
  await foto(p, '10-oficina-1024')
  await p.close()
}
if (quer('celular')) {
  const p = await abrir('', 390, 844)
  await foto(p, '11-meus-mundos-celular')
  await p.close()
  const o = await abrir('?tela=oficina', 390, 844)
  await palcoPronto(o)
  await foto(o, '12-oficina-celular')
  await o.close()
}
if (quer('escuro')) {
  const p = await abrir('?tema=dark', 1440, 900)
  await foto(p, '13-meus-mundos-escuro')
  await p.close()
  const o = await abrir('?tela=oficina&tema=dark', 1440, 900)
  await palcoPronto(o)
  await foto(o, '14-oficina-escuro')
  await o.close()
}

if (quer('toque')) {
  const resultados = []
  for (const largura of [390, 1024]) {
    const p = await abrir('?tela=oficina', largura, 844, true)
    await palcoPronto(p)
    const lerDocumento = () =>
      p.evaluate(async () => {
        const host = globalThis.__cenarios.host
        const mundo = (await host.listarMundos('conta')).find((m) => m.nome === 'Ilha do Farol')
        const cenario = (await host.listarCenarios(mundo.id)).find(
          (c) => c.nome === 'Vila da praia',
        )
        return (await host.abrirCenario(cenario.id)).documento
      })
    const antes = await lerDocumento()
    await p.getByRole('button', { name: /^Pôr / }).first().tap()
    await p.getByText('Guardado', { exact: true }).waitFor()
    const depois = await lerDocumento()
    assert.equal(depois.instancias.length, antes.instancias.length + 1)
    await p.getByRole('button', { name: 'Escolher', exact: true }).tap()
    const grade = p.getByRole('button', { name: 'Encaixar', exact: true })
    await grade.tap()
    assert.equal(await grade.getAttribute('aria-pressed'), 'false')
    await grade.tap()
    assert.equal(await grade.getAttribute('aria-pressed'), 'true')
    const canvas = p.locator('.mcn-palco-tela'),
      caixa = await canvas.boundingBox()
    const imagemAntes = await canvas.screenshot()
    const sessao = await p.context().newCDPSession(p)
    const ponto = (dx) => ({
      x: caixa.x + caixa.width * 0.7 + dx,
      y: caixa.y + caixa.height * 0.45,
      radiusX: 2,
      radiusY: 2,
      force: 1,
    })
    await sessao.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [ponto(0)] })
    for (const dx of [10, 20, 30, 40])
      await sessao.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [ponto(dx)] })
    await sessao.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await p.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
    )
    assert.notDeepEqual(await canvas.screenshot(), imagemAntes, 'O gesto precisa alterar a vista')
    assert.deepEqual(await lerDocumento(), depois, 'Mover a câmera não altera a autoria')
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await p.screenshot({ path: join(saida, `toque-${largura}.png`) })
    resultados.push({
      largura,
      porModeloComToque: true,
      grade: true,
      orbitarComToque: true,
      autoriaPreservada: true,
      semRolagemHorizontal: true,
    })
    await p.close()
  }
  writeFileSync(join(saida, 'toque.json'), JSON.stringify({ resultados, erros }, null, 2))
  console.log(JSON.stringify({ resultados, erros }))
}

await navegador.close()
if (erros.length) {
  console.log('ERROS NO CONSOLE:')
  for (const erro of [...new Set(erros)].slice(0, 20)) console.log(` - ${erro}`)
  process.exitCode = 1
}
