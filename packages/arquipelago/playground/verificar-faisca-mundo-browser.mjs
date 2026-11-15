import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const base = process.env.ARQUIPELAGO_QA_URL ?? 'http://127.0.0.1:4530',
  saida = resolve(import.meta.dirname, '../../../output/faisca-qa')
const somenteRecursos = process.argv.includes('--recursos')
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
  const m = await dados()
  const p = m.Posição.split(', ').map((v) => Number(v.replace(' m', '').replace(',', '.')))
  return { x: p[0], y: p[1], z: p[2] }
}
async function andar(x, z) {
  for (let i = 0; i < 100; i++) {
    const p = await posicao(),
      dx = x - p.x,
      dz = z - p.z,
      d = Math.hypot(dx, dz)
    if (d < 0.35) {
      await page.waitForTimeout(500)
      return
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
try {
  await page.goto(`${base}/macro?ritmo=explorar`)
  await page.waitForFunction(
    () => document.querySelector('.macro-topo')?.getAttribute('data-arte') === 'pronto',
    {},
    { timeout: 60000 },
  )
  await page.getByText('Medidas e pontos de teste', { exact: true }).click()
  if (!somenteRecursos) {
    await page.getByText('Medir um percurso com o avatar', { exact: true }).click()
    await page.getByRole('button', { name: 'Praça → Horta', exact: true }).click()
    await page.waitForFunction(() =>
      document.querySelector('[role=status]')?.textContent.includes('medindo'),
    )
    await andar(20, 139)
    evidencias.push({
      caso: 'Praça → Horta',
      posicao: await posicao(),
      medida: await page.getByRole('status').innerText(),
    })
    console.log(JSON.stringify(evidencias.at(-1)))
    await andar(18, 135.5)
    await page.getByRole('button', { name: /Conversar com a Íris/ }).waitFor({ timeout: 25000 })
    await page.getByRole('button', { name: /Conversar com a Íris/ }).click()
    await page.getByRole('dialog', { name: 'Íris · estudo da personagem' }).waitFor()
    await page.waitForTimeout(1600)
    await page.screenshot({ path: resolve(saida, 'iris-conversa.png') })
    await page.getByRole('button', { name: 'Continuar explorando', exact: true }).press('Enter')
    assert.equal(await page.getByRole('dialog').count(), 0)
    evidencias.push({ caso: 'Íris: conversa e fechamento pelo teclado', passou: true })
    // Acesso à ponte pela borda sul: sem atravessar os canteiros.
    await andar(18, 147)
    await andar(35, 147)
    await andar(58, 135)
    const sul = await posicao()
    assert.ok(sul.y > 4)
    await andar(58, 127)
    const meio = await posicao()
    assert.ok(meio.y > 4, 'O piso real da ponte deve manter o corpo sobre o lago')
    await andar(58, 119)
    const norte = await posicao()
    assert.ok(norte.y > 4)
    evidencias.push({ caso: 'Ponte real dos Campos', sul, meio, norte })
    console.log(JSON.stringify(evidencias.at(-1)))
    await page.getByText('Medidas e pontos de teste', { exact: true }).click()
    await page.screenshot({ path: resolve(saida, 'ponte-campos.png') })
    await page.getByText('Medidas e pontos de teste', { exact: true }).click()
  }
  const ciclos = []
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Bosque das Lanternas', exact: true }).click()
    await page.waitForFunction(() =>
      document.querySelector('.macro-topo')?.textContent.includes('arte longe'),
    )
    await page.waitForTimeout(900)
    assert.ok(
      (await posicao()).z < -40,
      'A amostra distante exige a chegada real ao Bosque das Lanternas',
    )
    const longe = await dados()
    await page.getByRole('button', { name: 'Vila dos Criadores', exact: true }).click()
    await page.waitForFunction(
      () => document.querySelector('.macro-topo')?.getAttribute('data-arte') === 'pronto',
      {},
      { timeout: 60000 },
    )
    await page.waitForTimeout(1200)
    ciclos.push({ longe, perto: await dados() })
    console.log(JSON.stringify({ ciclo: i + 1, ...ciclos.at(-1) }))
    writeFileSync(resolve(saida, 'ciclos-recursos.json'), JSON.stringify(ciclos, null, 2))
    assert.ok(
      Number(ciclos.at(-1).perto.Texturas) > Number(longe.Texturas),
      'As texturas do piloto devem sair da GPU ao afastar',
    )
  }
  // O contrato é ausência de crescimento. Uma queda (liberação) não é vazamento.
  assert.ok(
    Number(ciclos[2].perto.Geometrias) - Number(ciclos[1].perto.Geometrias) <= 2,
    'Geometrias não devem crescer a cada recarga',
  )
  assert.ok(
    Number(ciclos[2].perto.Texturas) - Number(ciclos[1].perto.Texturas) <= 2,
    'Texturas não devem crescer a cada recarga',
  )
  evidencias.push({ caso: 'Descarga e reentrada', ciclos })
  console.log(JSON.stringify(evidencias.at(-1)))
  await page.getByRole('button', { name: 'Pátio das Invenções', exact: true }).click()
  await page.waitForTimeout(700)
  assert.ok((await posicao()).x > -30, 'Chegada do Pátio deve ser à entrada, fora da construção')
  await page.getByRole('button', { name: 'Colina do Farol', exact: true }).click()
  await page.waitForTimeout(700)
  assert.ok((await posicao()).z > 105, 'Chegada do Farol deve ser fora do volume do modelo')
  await page.getByText('Medidas e pontos de teste', { exact: true }).click()
  await page.screenshot({ path: resolve(saida, 'farol.png') })
  assert.equal(erros.length, 0, erros.join('\n'))
  writeFileSync(
    resolve(saida, somenteRecursos ? 'recursos.json' : 'mundo.json'),
    JSON.stringify({ evidencias, erros }, null, 2),
  )
  console.log('PASS: navegação entre arte real, conversa, ponte e descarregamento')
} finally {
  await context.close()
  await browser.close()
}
