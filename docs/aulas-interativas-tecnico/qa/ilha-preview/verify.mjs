import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('../../../../', import.meta.url))
const { chromium } = createRequire(resolve(root, 'packages/studio/package.json'))(
  '@playwright/test',
)
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.SZ_CHECK_CHROMIUM ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
})
try {
  const page = await browser.newPage({ viewport: { width: 1250, height: 1000 } }),
    errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(pathToFileURL(resolve(root, '.cache/ilha-do-farol/curso-preview.html')).href)
  await page.locator('[data-ready="true"]').waitFor()
  // As telas livres do Faísca (08/11/2026): a câmera é um controle com três lugares, cada número
  // tem − e +, e no contato o resultado do encontro fica na cena (sem "Testar o encontro").
  const camera = (lugar) =>
    page.getByRole('group', { name: 'Onde fica a câmera' }).getByRole('button', { name: lugar })
  await camera('Lado').click()
  const answers = page.getByRole('button', { name: /O lugar d/ })
  const colors = await answers.evaluateAll((els) =>
    els.map((e) => getComputedStyle(e).backgroundColor),
  )
  assert.equal(colors[0], colors[1], 'answers must not reveal the solution')
  await page.getByRole('button', { name: /O lugar da câmera/ }).click()
  assert.match(await page.locator('body').innerText(), /2 de 2 descobertas/)
  await page.getByRole('button', { name: 'experiencia-posicao-3d', exact: true }).click()
  await page.locator('[data-ready="true"]').waitFor()
  for (const axis of ['z', 'y', 'x']) {
    await page.getByRole('button', { name: `${axis} mais meio`, exact: true }).click()
    await page.getByRole('button', { name: `${axis} menos meio`, exact: true }).click()
  }
  assert.match(await page.locator('body').innerText(), /3 de 3 descobertas/)
  await page.screenshot({
    path: resolve(root, '.cache/ilha-do-farol/position.png'),
    fullPage: true,
  })
  await page.getByRole('button', { name: 'experiencia-contato-3d', exact: true }).click()
  await page.locator('[data-ready="true"]').waitFor()
  assert.match(await page.locator('body').innerText(), /Não encostou/)
  await camera('Lado').click()
  await page.getByRole('button', { name: 'y menos meio', exact: true }).click()
  await page.getByRole('button', { name: 'y menos meio', exact: true }).click()
  assert.match(await page.locator('body').innerText(), /2 de 2 descobertas/)
  await page.getByRole('switch', { name: /Caixas/ }).click()
  await page.screenshot({ path: resolve(root, '.cache/ilha-do-farol/contact.png'), fullPage: true })
  await page.getByRole('button', { name: 'quiz', exact: true }).click()
  await page.locator('[data-ready="true"]').waitFor()
  await page.getByRole('radio').first().click()
  await page.getByRole('button', { name: 'Ver o que acontece', exact: true }).click()
  await page.waitForTimeout(250)
  assert.match(await page.locator('body').innerText(), /A câmera mudou|Mudou a câmera/)
  await page.screenshot({ path: resolve(root, '.cache/ilha-do-farol/quiz.png'), fullPage: true })
  await page.getByRole('button', { name: 'Tentar de novo', exact: true }).click()
  const correctAnswers = [
    'O lugar de onde olhamos.',
    'Continua igual, porque a altura é y.',
    'Não. Precisamos conferir também a altura.',
    'Levar o personagem até ela e conferir se a coleta acontece.',
  ]
  for (const [i, answer] of correctAnswers.entries()) {
    await page.locator('[data-ready="true"]').waitFor()
    await page.getByRole('radio').filter({ hasText: answer }).click()
    await page.getByRole('button', { name: 'Ver o que acontece', exact: true }).click()
    await page.locator('[data-correct="true"]').waitFor()
    await page
      .getByRole('button', {
        name: i === correctAnswers.length - 1 ? 'Concluir revisão' : 'Próxima pergunta',
        exact: true,
      })
      .click()
  }
  await page.locator('[data-complete="true"]').waitFor()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'experiencia-contato-3d', exact: true }).click()
  await page.locator('[data-ready="true"]').waitFor()
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    'mobile overflow',
  )
  await page.screenshot({ path: resolve(root, '.cache/ilha-do-farol/mobile.png'), fullPage: true })
  assert.deepEqual(errors, [])
  console.log(
    'PASS: real experiences, neutral answers, arbitrary axis order, undo/reset, contact, quiz demonstration and mobile layout.',
  )
} finally {
  await browser.close()
}
