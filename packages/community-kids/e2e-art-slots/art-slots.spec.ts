import { expect, type Page, test } from '@playwright/test'

async function arrastar(page: Page, de: [number, number], ate: [number, number]) {
  const palco = page.getByRole('img', { name: 'Área de desenho' })
  const box = await palco.boundingBox()
  if (!box) throw new Error('Palco do Pinta sem tamanho')
  const ponto = ([x, y]: [number, number]) =>
    [box.x + box.width * x, box.y + box.height * y] as const
  const [x0, y0] = ponto(de)
  const [x1, y1] = ponto(ate)
  await page.mouse.move(x0, y0)
  await page.mouse.down()
  await page.mouse.move(x1, y1, { steps: 8 })
  await page.mouse.up()
}

test('o desenho do Pinta da aula entra no jogo do Estúdio', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const proxima = page.getByRole('button', { name: 'Próxima parte' })

  // 1. O jogo pronto: uma entrada de verdade no jogo conta a participação.
  const jogo = page.frameLocator('iframe[title="A Chave do Farol"]')
  await jogo.locator('canvas').first().click()
  await page.keyboard.press('ArrowRight')
  await expect(proxima).toBeEnabled({ timeout: 30_000 })
  await proxima.click()

  // 2. O Pinta: argola com Círculo, haste com Retângulo, e o envio.
  await expect(page.getByRole('button', { name: 'Enviar meu desenho' })).toBeVisible({
    timeout: 30_000,
  })
  await page.getByRole('button', { name: 'Entendi!' }).click()
  await page.getByRole('button', { name: 'Expandir' }).click()
  await expect(page.getByRole('img', { name: 'Área de desenho' })).toBeVisible()
  await page.getByRole('button', { name: 'Círculo', exact: true }).click()
  await arrastar(page, [0.08, 0.3], [0.45, 0.7])
  await page.getByRole('button', { name: 'Retângulo', exact: true }).click()
  await arrastar(page, [0.4, 0.44], [0.95, 0.56])
  await page.screenshot({ path: '.cache/art-slots-02.png' })
  await page.getByRole('button', { name: 'Reduzir' }).click()
  await page.getByRole('button', { name: 'Enviar meu desenho' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Enviar', exact: true }).click()
  await expect(page.getByText('Desenho enviado!')).toBeVisible({ timeout: 30_000 })
  await expect(proxima).toBeEnabled()
  await proxima.click()

  // 3. O Estúdio: o desenho chegou aos materiais com o nome da vaga.
  await expect(page.locator('.blocklySvg').first()).toBeVisible({ timeout: 60_000 })
  await page.getByRole('button', { name: 'Mais opções' }).click()
  await page.getByRole('menuitem', { name: 'Imagens' }).click()
  const materiais = page.getByRole('dialog')
  await expect(materiais.getByText('Seu desenho da aula')).toBeVisible()
  await expect(materiais.getByText('minha-chave', { exact: true })).toBeVisible()
  const desenhoNoJogo = () =>
    page.getByRole('dialog').getByRole('img', { name: 'minha-chave' }).getAttribute('src')
  const primeiro = await desenhoNoJogo()
  expect(primeiro).toMatch(/^data:image\//)
  await page.screenshot({ path: '.cache/art-slots-03.png' })
  await materiais.getByRole('button', { name: 'Fechar' }).click()
  await expect(materiais).toHaveCount(0)

  // 4. A troca: no Criar sprite chave, a imagem passa de chave-dourada a minha-chave.
  await page.getByRole('button', { name: 'Expandir' }).click()
  // Com a prévia ao lado, o fim do bloco fica atrás dela: a criança esconde a prévia.
  await page.getByRole('button', { name: 'Ocultar pré-visualização' }).click()
  const campo = (nome: string) =>
    page
      .locator('.sz_g2d_create_image_sprite .blocklyEditableField')
      .filter({ hasText: new RegExp(`^${nome}$`) })
  await campo('chave-dourada').click()
  await page.getByRole('button', { name: 'minha-chave', exact: true }).click()
  await expect(campo('minha-chave')).toHaveCount(1)
  await expect(campo('chave-dourada')).toHaveCount(0)
  await page.screenshot({ path: '.cache/art-slots-04.png' })
  await page.getByRole('button', { name: 'Reduzir' }).click()

  // 5. Verificar (o executor de verdade roda o jogo) e enviar.
  await page.getByRole('button', { name: 'Verificar projeto' }).click()
  await expect(page.getByText('2 de 2 cumpridos')).toBeVisible({ timeout: 180_000 })
  await page.getByRole('button', { name: 'Enviar meu projeto' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Enviar', exact: true }).click()
  await expect(page.getByText('Projeto enviado!')).toBeVisible({ timeout: 30_000 })
  await page.screenshot({ path: '.cache/art-slots-05.png' })

  // 6. Redesenhar: um dente a mais, Enviar de novo, e o jogo traz a chave nova ao abrir a aula.
  await page.getByRole('button', { name: 'Anterior' }).click()
  await page.getByRole('button', { name: 'Expandir' }).click()
  await page.getByRole('button', { name: 'Retângulo', exact: true }).click()
  await arrastar(page, [0.7, 0.55], [0.8, 0.8])
  await page.getByRole('button', { name: 'Reduzir' }).click()
  await page.getByRole('button', { name: 'Enviar de novo' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Enviar', exact: true }).click()
  await expect(page.getByText(/Desenho enviado!/)).toBeVisible({ timeout: 30_000 })
  await page.reload()
  // A aula reabre onde a criança estava (a parte do desenho).
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Desenhe a sua chave')
  await proxima.click()
  await expect(page.locator('.blocklySvg').first()).toBeVisible({ timeout: 60_000 })
  await page.getByRole('button', { name: 'Mais opções' }).click()
  await page.getByRole('menuitem', { name: 'Imagens' }).click()
  const segundo = await desenhoNoJogo()
  expect(segundo).toMatch(/^data:image\//)
  expect(segundo).not.toBe(primeiro)
  await page.screenshot({ path: '.cache/art-slots-06.png' })
  expect(errors).toEqual([])
})
