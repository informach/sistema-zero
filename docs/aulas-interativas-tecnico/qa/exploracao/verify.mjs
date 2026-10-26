import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const { chromium, expect } = createRequire(
  resolve(import.meta.dirname, '../../../../packages/studio/package.json'),
)('@playwright/test')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
try {
  await page.goto(pathToFileURL(resolve('.cache/experiencias-reais.html')).href)
  const nav = (name) =>
    page.getByRole('navigation').getByRole('button', { name, exact: true }).click()
  const click = (name) => page.getByRole('button', { name, exact: true }).click()
  await click('Ligar a reação ao toque')
  await click('Tocar nas pedras')
  await expect(page.locator('.sz-discovery-count')).toHaveText('1 de 3 descobertas')
  await click('Desligar a reação ao toque')
  await click('Tocar no arbusto')
  await click('Esconder de novo')
  await click('Ligar a reação ao toque')
  await click('Tocar no arbusto')
  await expect(page.locator('.sz-discovery-count')).toHaveText('3 de 3 descobertas')
  await click('Desfazer')
  await expect(page.locator('.sz-discovery-count')).toHaveText('2 de 3 descobertas')
  await click('Recomeçar experiência')
  await expect(page.locator('.sz-discovery-count')).toHaveText('0 de 3 descobertas')
  console.log('PASS jardim real: pedras primeiro, ambos os modos, repetir, desfazer e reset')
  await nav('experiencia-achados')
  await page.getByText('Procurar aqui', { exact: true }).click()
  await click('Tocar nas flores')
  await page.getByRole('button', { name: /Tocar de novo/ }).click()
  await click('Recomeçar a busca')
  await click('Tocar nas pedras')
  await click('Tocar no arbusto')
  await expect(page.locator('.sz-discovery-count')).toHaveText('5 de 5 descobertas')
  console.log('PASS contagem real: vazio primeiro e reinício antes de concluir')
  await nav('experiencia-quadro')
  await click('Apertar tecla →')
  await click('Avançar 10 quadros')
  await expect(page.locator('[data-walk-hero]')).toHaveAttribute('data-walk-hero', '208')
  await click('Adicionar bloco de mover')
  for (let i = 0; i < 15; i++) await click('Avançar 10 quadros')
  await expect(page.locator('[data-walk-hero]')).toHaveAttribute('data-walk-hero', '658')
  await click('Soltar tecla →')
  await click('Avançar 1 quadro')
  await expect(page.locator('.sz-discovery-count')).toHaveText('4 de 4 descobertas')
  await click('Avançar 10 quadros')
  await expect(page.locator('[data-start-anchor]')).toBeVisible()
  await page.evaluate(() => scrollTo(0, 0))
  await page.screenshot({ path: '.cache/real-frames.png', fullPage: true })
  console.log('PASS quadros reais: comando, tecla, tempo e 150 quadros')
  await click('Apertar tecla →')
  await click('Passar quadros automaticamente')
  await expect
    .poll(async () => Number(await page.locator('[data-walk-hero]').getAttribute('data-walk-hero')))
    .toBeGreaterThan(670)
  await click('Pausar quadros')
  await click('Ampliar experiência')
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Recomeçar experiência', exact: true }),
  ).toBeVisible()
  await page.screenshot({ path: '.cache/real-frames-expanded.png', fullPage: true })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  console.log('PASS relógio automático fora da tela e modo ampliado')

  await nav('experiencia-limite')
  await click('Adicionar bloco de limite')
  await click('Apertar tecla →')
  for (let i = 0; i < 10; i++) await click('Avançar 10 quadros')
  await click('Retirar bloco de limite')
  for (let i = 0; i < 4; i++) await click('Avançar 10 quadros')
  await page.getByText('Experimentar a ordem dos comandos', { exact: true }).click()
  await click('Avançar nessa ordem')
  await click('Limitar → mover')
  await click('Avançar nessa ordem')
  await expect(page.locator('.sz-discovery-count')).toHaveText('3 de 3 descobertas')
  console.log('PASS limite real e comparação das ordens')
  await nav('experiencia-memoria')
  await click('Adicionar ação de guardar')
  await click('Encostar na chave')
  await click('Retirar ação de guardar')
  await expect(page.locator('.memory-change')).toContainText('temChave = verdadeiro')
  await click('Afastar')
  await click('Recomeçar a partida')
  await click('Encostar na chave')
  await expect(page.locator('.sz-discovery-count')).toHaveText('4 de 4 descobertas')
  console.log('PASS memória real, edição posterior e reinício')
  await nav('experiencia-porta')
  await click('Dar a chave ao personagem')
  await click('Testar a porta')
  await click('Tirar a chave do personagem')
  await click('Testar a porta')
  await expect(page.locator('.sz-discovery-count')).toHaveText('2 de 2 descobertas')
  await nav('experiencia-posicao')
  await click('Mais y ↓')
  await click('↑ Menos y')
  await click('Mais x →')
  await click('← Menos x')
  await expect(page.locator('.sz-discovery-count')).toHaveText('4 de 4 descobertas')
  await click('Mostrar um alvo')
  await page.getByText('Escolher os números', { exact: true }).click()
  await page.getByLabel('Horizontal x', { exact: true }).fill('280')
  await page.getByLabel('Vertical y', { exact: true }).fill('250')
  await expect(page.locator('body')).toContainText('Você chegou ao alvo!')
  console.log('PASS porta e eixos reais fora de ordem, alvo opcional')
  await nav('quiz-revisao-final')
  await page.getByRole('radio').nth(0).click()
  await click('Ver o que acontece')
  await click('Tentar de novo')
  for (const answer of [1, 1, 2, 1]) {
    await page.getByRole('radio').nth(answer).click()
    await click('Ver o que acontece')
    await expect(page.locator('.sz-discovery-quiz-scene')).toBeVisible()
    const next = page.getByRole('button', {
      name: /Próxima pergunta|Concluir revisão/,
      exact: true,
    })
    await expect(next).toBeEnabled()
    await next.click()
  }
  await expect(page.locator('[data-complete]')).toHaveText('Quiz conferido')
  console.log('PASS quiz real: quatro cenas, erro, correção e submissão completa na prévia')
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 950 })
    for (const name of [
      'experiencia-toque',
      'experiencia-achados',
      'experiencia-quadro',
      'experiencia-limite',
      'experiencia-memoria',
      'experiencia-porta',
      'experiencia-posicao',
      'quiz-revisao-final',
    ]) {
      await nav(name)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      if (width === 390 && name === 'experiencia-quadro')
        await page.screenshot({ path: '.cache/real-frames-mobile.png', fullPage: true })
    }
  }
  expect(errors).toEqual([])
  console.log('PASS três larguras e ausência de erros JavaScript')
} finally {
  await browser.close()
}
