import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const { chromium, expect } = createRequire(resolve('packages/studio/package.json'))(
  '@playwright/test',
)
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1480, height: 1050 } })
await page.context().setOffline(true)
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
const click = (name) => page.getByRole('button', { name, exact: true }).click()
const nav = (name) =>
  page
    .getByRole('navigation')
    .getByRole('button', { name: new RegExp(name) })
    .click()
try {
  await page.goto(pathToFileURL(resolve('docs/design/a-ilha-do-farol-prototipo.html')).href)
  await expect(page.locator('.ilha-world')).toHaveAttribute('data-ready', 'true')
  await click('O lugar de onde olhamos')
  await expect(page.locator('.farol-count')).toHaveText('0 de 2 descobertas')
  await click('Ver de cima')
  await click('O lugar da chave')
  await click('O lugar de onde olhamos')
  await expect(page.locator('.farol-count')).toHaveText('2 de 2 descobertas')
  await click('Ver de lado')
  await page.evaluate(() => scrollTo(0, 0))
  await page.waitForTimeout(120)
  await page.screenshot({ path: '.cache/ilha-do-farol/view.png', fullPage: true })
  await click('Desfazer')
  await click('Recomeçar experiência')
  await expect(page.locator('.farol-count')).toHaveText('0 de 2 descobertas')
  console.log('PASS ponto de vista: comparação, resposta, liberdade, desfazer, reset')
  await nav('Posição em 3D')
  await expect(page.locator('.ilha-world')).toHaveAttribute('data-ready', 'true')
  for (const axis of ['y', 'z', 'x']) {
    await click(`Aumentar ${axis}`)
    await click(`Diminuir ${axis}`)
  }
  await expect(page.locator('.farol-count')).toHaveText('3 de 3 descobertas')
  await page.getByLabel('Valor x', { exact: true }).fill('4')
  await page.getByLabel('Valor z', { exact: true }).fill('-4')
  await click('Ver de cima')
  await page.evaluate(() => scrollTo(0, 0))
  await page.waitForTimeout(120)
  await page.screenshot({ path: '.cache/ilha-do-farol/position.png', fullPage: true })
  await click('Voltar à posição inicial')
  await expect(page.locator('.farol-count')).toHaveText('3 de 3 descobertas')
  console.log('PASS x/y/z: ordem alternativa, extremos e reinício da tentativa preserva evidências')
  await nav('Contato em 3D')
  await expect(page.locator('.ilha-world')).toHaveAttribute('data-ready', 'true')
  await click('Testar o encontro')
  await expect(page.locator('.farol-count')).toHaveText('1 de 2 descobertas')
  await page.getByLabel('Valor y', { exact: true }).fill('1')
  await click('Testar o encontro')
  await expect(page.locator('.farol-count')).toHaveText('2 de 2 descobertas')
  await click('Mostrar onde encosta')
  await click('Ver de lado')
  await page.evaluate(() => scrollTo(0, 0))
  await page.waitForTimeout(120)
  await page.screenshot({ path: '.cache/ilha-do-farol/contact.png', fullPage: true })
  await click('Mover personagem X +')
  await click('Mover personagem X +')
  await click('Mover personagem X +')
  await click('Testar o encontro')
  await expect(page.locator('.farol-note')).toContainText('Ainda estão separados.')
  await click('Ampliar experiência')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  console.log(
    'PASS contato: detecção real do Jogo 3D, alturas, movimento, contornos, modo ampliado',
  )
  await nav('Quiz visual')
  await expect(page.getByRole('button', { name: 'Ver o que acontece', exact: true })).toBeDisabled()
  await page.getByRole('radio').nth(0).check()
  await click('Ver o que acontece')
  await expect(
    page.getByRole('button', { name: 'Tentar outra resposta', exact: true }),
  ).toBeDisabled()
  await click('Tentar outra resposta')
  for (const [n, correct] of [1, 0, 1, 2].entries()) {
    await page.getByRole('radio').nth(correct).check()
    await click('Ver o que acontece')
    await click(n === 3 ? 'Concluir revisão' : 'Próxima pergunta')
  }
  await expect(page.getByText('Agora você enxerga a ilha de outro jeito.')).toBeVisible()
  await expect(page.getByRole('button', { name: /certificado/i })).toHaveCount(0)
  console.log('PASS quiz: erro, correção, animação, quatro questões e conclusão sem certificado')
  await nav('Objetivos do Estúdio')
  for (let n = 1; n <= 3; n++) {
    await click(`Aula ${n}`)
    await page.getByLabel('Exemplo de projeto').selectOption('error')
    await click('Verificar projeto')
    await expect(page.locator('.ilha-objectives [data-status=error]').first()).toBeVisible()
    await page.getByLabel('Exemplo de projeto').selectOption('correct')
    await click('Verificar projeto')
    await expect(page.locator('.ilha-objectives [data-status=ok]')).toHaveCount(n === 3 ? 4 : 3)
    await click('Enviar meu projeto')
    await expect(page.getByText(/Projeto enviado!/)).toBeVisible()
  }
  await page.evaluate(() => scrollTo(0, 0))
  await page.waitForTimeout(120)
  await page.screenshot({ path: '.cache/ilha-do-farol/objectives.png', fullPage: true })
  console.log('PASS objetivos: três aulas, casos incorretos, correção e entrega simulada')
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const name of [
      'Ponto de vista',
      'Posição em 3D',
      'Contato em 3D',
      'Quiz visual',
      'Objetivos do Estúdio',
    ]) {
      await nav(name)
      await expect(page.locator('.ilha-world')).toHaveAttribute('data-ready', 'true')
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true)
      if (width === 390 && name === 'Contato em 3D') {
        await page.evaluate(() => scrollTo(0, 0))
        await page.waitForTimeout(120)
        await page.screenshot({ path: '.cache/ilha-do-farol/mobile.png', fullPage: true })
      }
    }
  }
  for (const theme of ['purple', 'green', 'blue'])
    await page.getByLabel('Tema do protótipo').selectOption(theme)
  expect(errors).toEqual([])
  console.log('PASS cinco painéis em 390/768/1440, três temas e nenhum erro JavaScript')
} finally {
  await browser.close()
}
