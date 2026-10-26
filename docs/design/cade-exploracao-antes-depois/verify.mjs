import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const { chromium, expect } = createRequire(
  resolve(import.meta.dirname, '../../../packages/studio/package.json'),
)('@playwright/test')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const p = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
const errors = [],
  network = []
p.on('pageerror', (e) => errors.push(e.message))
p.on('request', (r) => {
  if (!/^(file:|data:|blob:)/.test(r.url())) network.push(r.url())
})
try {
  await p.goto(
    pathToFileURL(resolve('docs/design/cade-todo-mundo-exploracao-antes-depois.html')).href,
  )
  const before = p.locator('[data-version=before]'),
    after = p.locator('[data-version=after]')
  const click = (name) => after.getByRole('button', { name, exact: true }).click()
  const proposal = () =>
    p.getByRole('button', { name: 'Proposta Exploração livre', exact: true }).click()
  const original = () =>
    p.getByRole('button', { name: 'Antes Como está hoje', exact: true }).click()
  await expect(
    before.getByRole('button', { name: 'Ligar a reação ao toque', exact: true }),
  ).toHaveAttribute('aria-disabled', 'true')
  await before.getByRole('button', { name: 'Tocar no arbusto', exact: true }).click()
  await before.getByRole('button', { name: 'Ligar a reação ao toque', exact: true }).click()
  await before.getByRole('button', { name: 'Tocar no arbusto', exact: true }).click()
  await expect(
    before.getByRole('button', { name: 'Testar com outro esconderijo', exact: true }),
  ).toBeVisible()
  await p.evaluate(() => scrollTo(0, 0))
  await p.screenshot({ path: '.cache/cade-current.png', fullPage: true })
  await proposal()
  await expect(
    after.getByRole('button', { name: 'Ligar a reação ao toque', exact: true }),
  ).toBeEnabled()
  await expect(after.getByRole('button', { name: 'Tocar nas pedras', exact: true })).toBeEnabled()
  await p.evaluate(() => scrollTo(0, 0))
  await p.screenshot({ path: '.cache/cade-proposed-touch.png', fullPage: true })
  await click('Ligar a reação ao toque')
  await click('Tocar nas pedras')
  await expect(after).toContainText('1 de 3 descobertas')
  await click('Desfazer último teste')
  await expect(after).toContainText('0 de 3 descobertas')
  await expect(
    after.getByRole('button', { name: 'Desligar a reação ao toque', exact: true }),
  ).toBeVisible()
  await click('Tocar nas pedras')
  await click('Tocar de novo no lugar de raposa')
  await expect(after).toContainText('1 de 3 descobertas')
  await click('Desligar a reação ao toque')
  await click('Tocar no arbusto')
  await expect(after).toContainText('2 de 3 descobertas')
  await click('Esconder de novo')
  await expect(
    after.getByRole('button', { name: 'Ligar a reação ao toque', exact: true }),
  ).toBeVisible()
  await click('Ligar a reação ao toque')
  await click('Tocar no arbusto')
  await expect(after).toContainText('3 de 3 descobertas')
  await click('Esconder de novo')
  await click('Tocar nas pedras')
  await expect(after).toContainText('3 de 3 descobertas')
  await original()
  await expect(
    before.getByRole('button', { name: 'Testar com outro esconderijo', exact: true }),
  ).toBeVisible()
  await proposal()
  await expect(after).toContainText('3 de 3 descobertas')
  await click('Recomeçar experiência')
  await expect(after).toContainText('0 de 3 descobertas')
  console.log(
    'PASS ação/reação / pedras primeiro / alternar / repetir / conservar / reiniciar / antes independente',
  )
  await p
    .getByRole('navigation')
    .getByRole('button', { name: /Contagem/ })
    .click()
  await after.getByText('Procurar aqui', { exact: true }).click()
  await expect(after).toContainText('1 de 5 descobertas')
  await click('Tocar nas flores')
  await expect(after.locator('[data-current-value]')).toHaveText('1')
  const repeat = after.getByRole('button', { name: /Tocar de novo/ })
  await repeat.click()
  await expect(after.locator('[data-current-value]')).toHaveText('1')
  await click('Recomeçar a busca')
  await expect(after).toContainText('4 de 5 descobertas')
  await click('Tocar nas pedras')
  await click('Tocar no arbusto')
  await expect(after).toContainText('5 de 5 descobertas')
  await expect(after.locator('[data-current-value]')).toHaveText('2')
  await click('Recomeçar a busca')
  await click('Tocar nas flores')
  await expect(after).toContainText('5 de 5 descobertas')
  await p.evaluate(() => scrollTo(0, 0))
  await p.screenshot({ path: '.cache/cade-proposed-count.png', fullPage: true })
  await original()
  await expect(before).toContainText('Descobertas 0 de 5')
  await before.getByRole('button', { name: 'Tocar no arbusto', exact: true }).click()
  await expect(before.locator('[data-current-value]')).toHaveText('1')
  await proposal()
  await expect(after).toContainText('5 de 5 descobertas')
  console.log(
    'PASS contagem / vazio primeiro / repetição / reinício antes do segundo / liberdade depois da conclusão',
  )
  for (const width of [390, 768, 1440]) {
    await p.setViewportSize({ width, height: 950 })
    for (const name of [/Ação e reação/, /Contagem/]) {
      await p.getByRole('navigation').getByRole('button', { name }).click()
      for (const show of [original, proposal]) {
        await show()
        expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        )
      }
      if (width === 390) {
        await p.evaluate(() => scrollTo(0, 0))
        await p.screenshot({
          path:
            '.cache/cade-mobile-' + (name.source.includes('Contagem') ? 'count' : 'touch') + '.png',
          fullPage: true,
        })
      }
    }
  }
  const primary = () =>
    p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-primary'))
  const blue = await primary()
  await p.getByLabel('Tema do protótipo').selectOption('green')
  expect(await primary()).not.toBe(blue)
  expect(errors).toEqual([])
  expect(network).toEqual([])
  console.log('PASS dois modos / duas experiências / três larguras / tema / sem erros JS ou rede')
} finally {
  await browser.close()
}
