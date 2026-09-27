import { expect, test } from '@playwright/test'
import manifesto from '../../../docs/aulas-interativas/aulas/cade-todo-mundo-aula-1.manifesto.json' with {
  type: 'json',
}

const project = manifesto.blocks.find((block) => block.key === 'jogo-pronto')?.content?.activity
  ?.project
if (!project) throw new Error('Projeto ausente do manifesto')
const projectName = project.name
const upload = {
  name: 'jogo.szproject.json',
  mimeType: 'application/json',
  buffer: Buffer.from(JSON.stringify(project)),
}

test('trocar entre cena e jogo preserva a decisão sobre a pergunta final', async ({ page }) => {
  await page.goto('/project-play-authoring?scene=1')
  const noQuestion = page.getByRole('checkbox', { name: /sem a pergunta do fim/ })
  await noQuestion.check()
  await page.getByRole('radio', { name: /^Jogo pronto para jogar/ }).check()
  await expect(noQuestion).toHaveCount(0)
  await page.getByRole('radio', { name: /^Experimentação/ }).check()
  await expect(noQuestion).toBeChecked()
  await noQuestion.uncheck()
  await page.getByRole('radio', { name: /^Jogo pronto para jogar/ }).check()
  await page.getByRole('radio', { name: /^Experimentação/ }).check()
  await expect(noQuestion).not.toBeChecked()
})

test('autora importa, cancela e aplica alterações na cópia real do Estúdio', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/project-play-authoring')
  await page.getByLabel('Arquivo do projeto', { exact: true }).setInputFiles(upload)
  await expect(page.getByRole('status')).toHaveText(`Projeto carregado: ${projectName}`)

  await page.getByRole('button', { name: 'Editar cópia no Estúdio' }).click()
  await page.getByTitle('Renomear projeto', { exact: true }).click()
  await page
    .getByRole('textbox', { name: 'Nome do projeto', exact: true })
    .fill('Edição descartada')
  await page.getByRole('textbox', { name: 'Nome do projeto', exact: true }).press('Enter')
  await page.getByRole('button', { name: 'Cancelar edição', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText(`Projeto carregado: ${projectName}`)

  await page.getByRole('button', { name: 'Editar cópia no Estúdio' }).click()
  await page.getByTitle('Renomear projeto', { exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Nome do projeto', exact: true })).toHaveValue(
    projectName,
  )
  await page
    .getByRole('textbox', { name: 'Nome do projeto', exact: true })
    .fill('Jogo da minha aula')
  await page.getByRole('textbox', { name: 'Nome do projeto', exact: true }).press('Enter')
  await page.getByRole('button', { name: 'Aplicar edição ao bloco', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Projeto carregado: Jogo da minha aula')
})

test('autoria móvel preserva o jogo após arquivo inválido e permite configurar alvos', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/project-play-authoring')
  const file = page.getByLabel('Arquivo do projeto', { exact: true })
  await file.setInputFiles(upload)
  await expect(page.getByRole('status')).toHaveText(`Projeto carregado: ${projectName}`)
  await file.setInputFiles({ ...upload, buffer: Buffer.from('{') })
  await expect(page.getByRole('alert')).toContainText('Não foi possível ler o JSON')
  await expect(page.getByRole('status')).toHaveText(`Projeto carregado: ${projectName}`)

  await page.getByLabel('Largura do palco', { exact: true }).fill('640')
  await page.getByLabel('Altura do palco', { exact: true }).fill('360')
  await page.getByLabel('Conclusão do jogo', { exact: true }).selectOption('targets')
  await page.getByRole('button', { name: 'Adicionar alvo', exact: true }).click()
  const targetId = page.getByLabel('Identificador', { exact: true })
  await targetId.fill('coelho')
  await expect(targetId).toBeFocused()
  await expect(targetId).toHaveValue('coelho')
  await page.getByLabel('Nome do alvo', { exact: true }).fill('Coelho')
  await expect(page.getByText('inclua pelo menos um', { exact: false })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('autoria-mobile.png'), fullPage: true })
})
