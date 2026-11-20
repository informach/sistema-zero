/**
 * Prova do cenário publicado no /macro (lote 8.5), com o personagem e o controlador reais.
 *
 * Antes: publicar a Faísca no ensaio local com as duas versões
 *   CENARIOS_QA_VERSOES=2 CENARIOS_PUBLICADOS_QA_DIR=<pasta> bun packages/molda-cenarios/playground/oficina/preparar-publicacao-faisca.mjs
 * e subir o playground com a mesma pasta:
 *   CENARIOS_PUBLICADOS_QA_DIR=<pasta> AVATAR_QA_DIR=output/morada-avatar-qa bun run dev
 * Depois: CENARIOS_PUBLICADOS_QA_DIR=<pasta> node packages/arquipelago/playground/verificar-cenario-publicado-browser.mjs
 *
 * Confere: chegada na versão 1, andar, correr, ponte, água, câmera, retomada depois de
 * recarregar, três ciclos de sair e voltar à ilha (sem crescer geometrias e texturas, e sem
 * voltar ao ponto guardado) e a troca para a versão 2. Ao terminar, o perfil volta à versão 1.
 */
import assert from 'node:assert/strict'
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const base = process.env.ARQUIPELAGO_QA_URL ?? 'http://127.0.0.1:4520',
  pasta = process.env.CENARIOS_PUBLICADOS_QA_DIR,
  saida = resolve(
    import.meta.dirname,
    '../../../output/cenarios-reforma/lote8-publicacao/macro-prova',
  )
assert.ok(pasta, 'Informe CENARIOS_PUBLICADOS_QA_DIR, a mesma pasta do servidor do playground.')
const perfil = resolve(pasta, 'perfis/sua-ilha.json'),
  perfilV1 = resolve(pasta, 'perfis/sua-ilha.v1.json'),
  perfilV2 = resolve(pasta, 'perfis/sua-ilha.v2.json')
assert.ok(existsSync(perfilV2), 'Publique a versão 2 (CENARIOS_QA_VERSOES=2) antes da prova.')
copyFileSync(perfil, perfilV1)
mkdirSync(saida, { recursive: true })

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: [
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
  ],
})
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } }),
  page = await context.newPage(),
  erros = [],
  evidencias = []
page.on('pageerror', (e) => erros.push(e.message))
const anotar = (caso, dados) => {
  evidencias.push({ caso, ...dados })
  console.log(JSON.stringify(evidencias.at(-1)))
}
async function dados() {
  return page
    .locator('.macro-painel dl')
    .evaluate((el) =>
      Object.fromEntries(
        [...el.querySelectorAll('dt')].map((dt) => [
          dt.textContent.trim(),
          dt.nextElementSibling.textContent.trim(),
        ]),
      ),
    )
}
async function posicao() {
  const p = (await dados()).Posição.split(', ').map((v) =>
    Number(v.replace(' m', '').replace(',', '.')),
  )
  return { x: p[0], y: p[1], z: p[2] }
}
const publicacao = () =>
  page.evaluate(
    () => document.querySelector('.macro-topo')?.getAttribute('data-publicacao') ?? null,
  )
async function esperarPublicacao(valor, tempo = 240000) {
  await page.waitForFunction(
    (v) => (document.querySelector('.macro-topo')?.getAttribute('data-publicacao') ?? null) === v,
    valor,
    { timeout: tempo },
  )
}
async function semErroNaTela() {
  const alerta = await page.locator('.macro-erro').count()
  assert.equal(alerta, 0, alerta ? await page.locator('.macro-erro').first().innerText() : '')
}
async function andar(x, z, voltas = 100) {
  for (let i = 0; i < voltas; i++) {
    const p = await posicao(),
      dx = x - p.x,
      dz = z - p.z,
      d = Math.hypot(dx, dz)
    if (d < 0.35) {
      await page.waitForTimeout(500)
      return p
    }
    const teclas = []
    if (Math.abs(dx) > 0.12) teclas.push(dx > 0 ? 'd' : 'a')
    if (Math.abs(dz) > 0.12) teclas.push(dz > 0 ? 's' : 'w')
    for (const k of teclas) await page.keyboard.down(k)
    await page.waitForTimeout(Math.max(80, Math.min(340, (d / 1.65) * 1000)))
    for (const k of teclas) await page.keyboard.up(k)
    await page.waitForTimeout(220)
  }
  throw Error(`Não chegou em ${x},${z}: ${JSON.stringify(await posicao())}`)
}
async function abrirPainel() {
  if (
    !(await page
      .locator('.macro-painel dl')
      .isVisible()
      .catch(() => false))
  )
    await page.getByText('Medidas e pontos de teste', { exact: true }).click()
}

try {
  const inicio = Date.now()
  await page.goto(`${base}/macro?ritmo=explorar`)
  await esperarPublicacao('sua-ilha:1')
  anotar('Chegada na versão 1', { segundos: Math.round((Date.now() - inicio) / 1000) })
  await page.waitForTimeout(2500)
  await semErroNaTela()
  await abrirPainel()
  await page.screenshot({ path: resolve(saida, 'v1-chegada.png') })

  // Andar e correr no relevo publicado.
  const antes = await posicao()
  const horta = await andar(20, 139)
  assert.ok(horta.y > 0, 'O corpo segue no relevo publicado')
  anotar('Andar até a horta', { antes, depois: horta })
  await page.keyboard.down('Shift')
  await page.keyboard.down('w')
  await page.waitForTimeout(1500)
  await page.keyboard.up('w')
  await page.keyboard.up('Shift')
  await page.waitForTimeout(400)
  const correu = await posicao()
  anotar('Correr', {
    metros: Math.round(Math.hypot(correu.x - horta.x, correu.z - horta.z) * 10) / 10,
    andarCorrer: (await dados())['Andar / correr'],
  })

  // Ponte dos Campos, por cima do lago.
  await andar(18, 147)
  await andar(35, 147)
  const sul = await andar(58, 135)
  const meio = await andar(58, 127)
  assert.ok(meio.y > 4, 'A ponte publicada sustenta o corpo sobre o lago')
  const norte = await andar(58, 119)
  anotar('Ponte dos Campos', { sul, meio, norte })
  await page.screenshot({ path: resolve(saida, 'v1-ponte.png') })

  // Água: descer do lado do lago e conferir o nado (registrado, não exigido).
  let nado = null
  try {
    await andar(58, 131)
    await andar(48, 131, 40)
    await andar(42, 128, 40)
    nado = (await dados()).Nadando
  } catch (erro) {
    nado = `não alcançou: ${erro.message}`
  }
  anotar('Água do lago', { nadando: nado, posicao: await posicao() })

  // Câmera: arrastar gira a vista.
  const giroAntes = (await dados())['Giro da câmera']
  const canvas = page.locator('canvas').first(),
    caixa = await canvas.boundingBox()
  await page.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2)
  await page.mouse.down()
  await page.mouse.move(caixa.x + caixa.width / 2 + 220, caixa.y + caixa.height / 2, { steps: 12 })
  await page.mouse.up()
  await page.waitForTimeout(600)
  const giroDepois = (await dados())['Giro da câmera']
  assert.notEqual(giroDepois, giroAntes, 'Arrastar gira a câmera')
  anotar('Câmera', { giroAntes, giroDepois })

  // Retomada: parado num ponto seguro, recarregar volta perto dele (só desta versão).
  const seguro = await andar(20, 139)
  await page.waitForTimeout(6500)
  await page.reload()
  await esperarPublicacao('sua-ilha:1')
  await page.waitForTimeout(3000)
  await abrirPainel()
  const retomado = await posicao()
  const distancia = Math.hypot(retomado.x - seguro.x, retomado.z - seguro.z)
  assert.ok(distancia < 3, `A retomada volta ao ponto seguro (${distancia.toFixed(2)} m)`)
  anotar('Retomada depois de recarregar', { seguro, retomado, metros: distancia })
  await semErroNaTela()

  // Ciclos de sair da ilha e voltar: a ponte do Bosque precisa estar aberta no ensaio.
  await page.evaluate(() => {
    for (const chave of Object.keys(localStorage))
      if (chave.startsWith('arquipelago:faisca:ensaio')) {
        const v = JSON.parse(localStorage.getItem(chave))
        v.ponteInstalada = true
        localStorage.setItem(chave, JSON.stringify(v))
      }
  })
  await page.reload()
  await esperarPublicacao('sua-ilha:1')
  await abrirPainel()
  const ciclos = []
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Chegada do Bosque', exact: true }).click()
    await esperarPublicacao(null, 120000)
    await page.waitForTimeout(2500)
    const longe = await dados()
    await page.getByRole('button', { name: 'Vila dos Criadores', exact: true }).click()
    await esperarPublicacao('sua-ilha:1')
    await page.waitForTimeout(3000)
    const perto = await dados(),
      onde = await posicao()
    // Voltar não leva ao ponto guardado antes: a chegada é a do "Ir" (a Vila).
    assert.ok(
      Math.hypot(onde.x - seguro.x, onde.z - seguro.z) > 5,
      'A reentrada não teleporta de volta ao ponto guardado',
    )
    ciclos.push({ longe, perto, onde })
    anotar(`Ciclo ${i + 1}`, {
      geometrias: [longe.Geometrias, perto.Geometrias],
      texturas: [longe.Texturas, perto.Texturas],
      onde,
    })
  }
  assert.ok(
    Number(ciclos[2].perto.Geometrias) - Number(ciclos[1].perto.Geometrias) <= 2,
    'Geometrias não crescem a cada reentrada',
  )
  assert.ok(
    Number(ciclos[2].perto.Texturas) - Number(ciclos[1].perto.Texturas) <= 2,
    'Texturas não crescem a cada reentrada',
  )
  await semErroNaTela()

  // Versão 2: o perfil da ilha passa a apontar para ela; sair e voltar instala a nova.
  copyFileSync(perfilV2, perfil)
  await page.getByRole('button', { name: 'Chegada do Bosque', exact: true }).click()
  await esperarPublicacao(null, 120000)
  await page.waitForTimeout(1500)
  await page.getByRole('button', { name: 'Vila dos Criadores', exact: true }).click()
  await esperarPublicacao('sua-ilha:2')
  await page.waitForTimeout(3000)
  await page.screenshot({ path: resolve(saida, 'v2-chegada.png') })
  anotar('Troca para a versão 2', { publicacao: await publicacao(), dados: await dados() })
  await semErroNaTela()

  assert.deepEqual(erros, [], erros.join('\n'))
  writeFileSync(resolve(saida, 'prova.json'), JSON.stringify({ evidencias, erros }, null, 2))
  console.log('PASS: cenário publicado no /macro (1 → 2)')
} finally {
  copyFileSync(perfilV1, perfil)
  writeFileSync(
    resolve(saida, 'prova-parcial.json'),
    JSON.stringify({ evidencias, erros }, null, 2),
  )
  await context.close()
  await browser.close()
}
