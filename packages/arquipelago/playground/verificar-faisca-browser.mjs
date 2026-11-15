/** Usa somente controles e leituras da interface. Requer playground e arte local preparados. */
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const url = process.env.ARQUIPELAGO_QA_URL ?? 'http://127.0.0.1:4530'
const saida = resolve(import.meta.dirname, '../../../output/faisca-qa')
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
const contexto = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await contexto.newPage(),
  erros = []
page.on('pageerror', (e) => erros.push(e.message))
const resultados = []
try {
  for (const [ritmo, correr] of [
    ['referencia', false],
    ['explorar', false],
    ['explorar', true],
  ]) {
    await page.goto(`${url}/macro?ritmo=${ritmo}`)
    await page.waitForFunction(
      () => document.querySelector('.macro-topo')?.textContent.includes('23/23'),
      {},
      { timeout: 60000 },
    )
    await page.getByText('Medidas e pontos de teste', { exact: true }).click()
    await page.getByText('Medir um percurso com o avatar', { exact: true }).click()
    await page.getByRole('button', { name: 'Porta → Praça', exact: true }).click()
    await page.waitForFunction(() =>
      document.querySelector('[role=status]')?.textContent.includes('medindo'),
    )
    if (correr) await page.keyboard.down('Shift')
    await page.keyboard.down('w')
    try {
      if (ritmo === 'explorar' && !correr) {
        await page.waitForTimeout(1000)
        await page.getByRole('button', { name: 'Pausar', exact: true }).click()
        await page.waitForTimeout(200)
        const congelado = await page.getByRole('status').innerText()
        await page.waitForTimeout(1000)
        assert.equal(
          await page.getByRole('status').innerText(),
          congelado,
          'Pausa não conta no tempo do percurso',
        )
        await page.getByRole('button', { name: 'Continuar', exact: true }).click()
      }
      await page.waitForFunction(
        () => document.querySelector('[role=status]')?.textContent.includes('concluida'),
        {},
        { timeout: 35000 },
      )
    } finally {
      await page.keyboard.up('w')
      await page.keyboard.up('Shift')
    }
    const texto = await page.getByRole('status').innerText(),
      match = texto.match(/([\d.]+) m · ([\d.]+) s/)
    assert.ok(match, texto)
    const metros = Number(match[1]),
      segundos = Number(match[2])
    assert.ok(metros > 12 && metros < 15, texto)
    assert.ok(segundos > 2 && segundos < 30, texto)
    resultados.push({
      ritmo,
      correr,
      metros,
      segundos,
      medidas: await page.locator('.macro-painel dl').innerText(),
    })
    console.log(JSON.stringify(resultados.at(-1)))
  }
  assert.ok(
    resultados[1].segundos < resultados[0].segundos * 0.8,
    'Exploração deve encurtar significativamente a caminhada',
  )
  assert.ok(
    resultados[2].segundos < resultados[1].segundos * 0.7,
    'Corrida deve se distinguir da caminhada',
  )
  await page.getByText('Medidas e pontos de teste', { exact: true }).click()
  await page.screenshot({ path: resolve(saida, 'praca-dia.png') })
  await page.getByRole('button', { name: 'Ver à noite', exact: true }).click()
  await page.waitForTimeout(600)
  await page.screenshot({ path: resolve(saida, 'praca-noite.png') })
  await page.getByRole('button', { name: 'Mapa', exact: true }).click()
  await page.screenshot({ path: resolve(saida, 'mapa.png') })
  assert.equal(erros.length, 0, erros.join('\n'))
  writeFileSync(resolve(saida, 'ritmo.json'), JSON.stringify({ resultados, erros }, null, 2))
  console.log('PASS: percursos reais, comparação de ritmos e cena sem erros de JavaScript')
} finally {
  await contexto.close()
  await browser.close()
}
