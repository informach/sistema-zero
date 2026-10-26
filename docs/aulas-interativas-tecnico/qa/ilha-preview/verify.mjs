import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
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
  const answers = page.getByRole('button', { name: /^O lugar/ })
  const colors = await answers.evaluateAll((els) =>
    els.map((e) => getComputedStyle(e).backgroundColor),
  )
  assert.equal(colors[0], colors[1], 'answers must not reveal the solution')
  await page.getByRole('button', { name: 'Ver de lado', exact: true }).click()
  await page.getByRole('button', { name: 'O lugar de onde olhamos', exact: true }).click()
  assert.match(await page.locator('body').innerText(), /2 de 2 descobertas/)
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
  assert.match(await page.locator('body').innerText(), /1 de 2 descobertas/)
  await page.getByRole('button', { name: 'Recomeçar experiência', exact: true }).click()
  assert.match(await page.locator('body').innerText(), /0 de 2 descobertas/)
  await page.getByRole('button', { name: 'experiencia-posicao-3d', exact: true }).click()
  await page.locator('[data-ready="true"]').waitFor()
  for (const axis of ['z', 'y', 'x']) {
    const field = page.getByRole('spinbutton', { name: `Valor ${axis}`, exact: true })
    await field.fill('4')
    await field.fill(axis === 'y' ? '0' : '-4')
  }
  assert.match(await page.locator('body').innerText(), /3 de 3 descobertas/)
  await page.getByRole('button', { name: 'Voltar à posição inicial', exact: true }).click()
  assert.match(await page.locator('body').innerText(), /3 de 3 descobertas/)
  await page.screenshot({
    path: resolve(root, '.cache/ilha-do-farol/position.png'),
    fullPage: true,
  })
  await page.getByRole('button', { name: 'experiencia-contato-3d', exact: true }).click()
  await page.locator('[data-ready="true"]').waitFor()
  await page.getByRole('button', { name: 'Testar o encontro', exact: true }).click()
  assert.match(await page.locator('body').innerText(), /não há contato/)
  await page.getByRole('spinbutton', { name: 'Valor y', exact: true }).fill('1')
  await page.getByRole('button', { name: 'Testar o encontro', exact: true }).click()
  assert.match(await page.locator('body').innerText(), /2 de 2 descobertas/)
  await page.getByRole('button', { name: 'Ver de lado', exact: true }).click()
  await page.getByRole('button', { name: 'Mostrar onde encosta', exact: true }).click()
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
