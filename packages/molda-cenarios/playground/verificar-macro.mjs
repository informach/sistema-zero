import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'
import { criarClienteCenarios } from '../../../output/molda-cenarios/qa-helpers.mjs'

const raiz = resolve(import.meta.dirname, '../../..'),
  saida = resolve(raiz, 'output/molda-cenarios/final')
mkdirSync(saida, { recursive: true })
const acesso = JSON.parse(readFileSync(resolve(raiz, 'output/molda-cenarios/local-session.json'))),
  cliente = criarClienteCenarios(acesso)
const estudo = JSON.parse(
  readFileSync(resolve(raiz, 'output/molda-cenarios/integracao/resultados.json')),
)
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: [
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
  ],
})
const c = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: resolve(saida, 'video'), size: { width: 1440, height: 900 } },
  }),
  p = await c.newPage(),
  erros = []
p.on('pageerror', (e) => {
  erros.push(e.message)
  console.error(e.stack)
})
async function sessao() {
  await p.waitForSelector('[data-runtime-pronto=true]', { timeout: 120000 })
  const id = await p.locator('[data-sessao]').getAttribute('data-sessao')
  for (let n = 0; n < 120; n++) {
    const s = (await cliente.sessoes()).find((s) => s.id === id)
    if (s && s.estado.revisao === s.estado.revisaoPronta && !s.estado.ocupado) return s
    await p.waitForTimeout(500)
  }
  throw Error('Sessão indisponível')
}
async function cmd(acao) {
  const s = await sessao(),
    r = await cliente.executar(s.id, {
      id: crypto.randomUUID(),
      revisaoEsperada: s.estado.revisao,
      acao,
    })
  assert.ok(r.ok, r.erro)
  return r
}
try {
  const aplicado = await fetch('http://127.0.0.1:4530/api/cenario-aplicado')
  assert.equal(aplicado.status, 200)
  const dados = await aplicado.json()
  assert.equal(dados.revisao.projetoId, estudo.id)
  assert.equal(dados.revisao.revisao, estudo.revisao)
  await p.goto('http://127.0.0.1:4530/macro')
  await p
    .getByRole('button', { name: 'Reconstruir ponte do Bosque · ensaio', exact: true })
    .waitFor({ timeout: 120000 })
  await p.waitForTimeout(6000)
  await p.screenshot({ path: resolve(saida, 'macro-aplicado.png') })
  await p.keyboard.down('w')
  await p.waitForTimeout(2200)
  await p.keyboard.up('w')
  await p.keyboard.down('Shift')
  await p.keyboard.down('d')
  await p.waitForTimeout(1800)
  await p.keyboard.up('d')
  await p.keyboard.up('Shift')
  await p.keyboard.press('Space')
  await p.waitForTimeout(700)
  await p.keyboard.down('a')
  await p.waitForTimeout(1000)
  await p.keyboard.up('a')
  await p.getByRole('button', { name: 'Reconstruir ponte do Bosque · ensaio', exact: true }).click()
  await p.getByRole('button', { name: 'Partir ponte do Bosque · ensaio', exact: true }).waitFor()
  await p.screenshot({ path: resolve(saida, 'macro-movimento.png') })
  const referencia = await fetch('http://127.0.0.1:4530/macro?referencia=1')
  assert.equal(referencia.status, 200)
  assert.match(await referencia.text(), /src="\/macro.js"/)
  // Pincel real pelo mouse numa cópia isolada; o estudo aplicado continua intacto.
  const base = await cliente.projeto(estudo.id),
    copia = await cliente.criar('QA — pincel visual', base.documento, crypto.randomUUID())
  await p.goto(`http://127.0.0.1:4531/?projeto=${copia.projetoId}`)
  await sessao()
  await cmd({
    tipo: 'camera',
    posicao: { x: 60, y: 65, z: 150.001 },
    alvo: { x: 60, y: 4, z: 150 },
  })
  await p.getByRole('button', { name: 'Terreno', exact: true }).click()
  const area = await p.locator('canvas').boundingBox(),
    x = area.x + area.width * 0.5,
    y = area.y + area.height * 0.55
  const antes = await cliente.projeto(copia.projetoId)
  await p.mouse.move(x, y)
  await p.mouse.down()
  await p.mouse.move(x + 45, y + 20, { steps: 8 })
  await p.mouse.up()
  await p.waitForSelector(`[data-revisao="${antes.revisao + 1}"]`, { timeout: 30000 })
  await sessao()
  const depois = await cliente.projeto(copia.projetoId)
  assert.ok(depois.documento.relevo.length > antes.documento.relevo.length)
  await p.screenshot({ path: resolve(saida, 'pincel-visual.png') })
  await cmd({ tipo: 'desfazer' })
  const rev = (await cliente.projeto(copia.projetoId)).revisao
  await p.mouse.move(x, y)
  await p.mouse.down()
  await p.mouse.move(x + 20, y + 10, { steps: 4 })
  await p.keyboard.press('Escape')
  await p.mouse.up()
  await p.waitForTimeout(1800)
  assert.equal((await cliente.projeto(copia.projetoId)).revisao, rev)
  // O mesmo ensaio com a mídia de toque; sem simular um aparelho físico.
  const toque = await browser.newContext({
      viewport: { width: 1024, height: 768 },
      hasTouch: true,
      isMobile: true,
    }),
    t = await toque.newPage()
  t.on('pageerror', (e) => {
    erros.push(e.message)
    console.error('TOQUE', e.stack)
  })
  await t.goto('http://127.0.0.1:4530/macro')
  await t.locator('.arq-zona-joystick').waitFor({ timeout: 120000 })
  await t.waitForTimeout(3000)
  const zona = await t.locator('.arq-zona-joystick').boundingBox(),
    cdp = await toque.newCDPSession(t)
  const ponto = { x: zona.x + zona.width * 0.5, y: zona.y + zona.height * 0.65, id: 1 }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [ponto] })
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ ...ponto, y: ponto.y - 48 }],
  })
  await t.waitForTimeout(1800)
  await t.screenshot({ path: resolve(saida, 'macro-toque.png') })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await toque.close()
  assert.equal(erros.length, 0)
  writeFileSync(
    resolve(saida, 'resultados.json'),
    JSON.stringify(
      {
        aplicado: { id: estudo.id, revisao: estudo.revisao },
        pincel: { carimbos: depois.documento.relevo.length, escPreservouRevisao: rev },
        toque: 'Chrome emulado',
        erros,
      },
      null,
      2,
    ),
  )
  console.log('Macro, ponte de ensaio, pincel e toque verificados')
} finally {
  await c.close()
  await browser.close()
}
