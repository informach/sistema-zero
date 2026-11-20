import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, type Page, test } from '@playwright/test'
import { replaceBridgeScript } from './helpers/previewShell'

/**
 * A aba Meus testes no navegador (proposta aprovada em 20/11/2026): o formulário cria os testes
 * com os nomes do jogo, "Rodar os testes" roda cada um num palco escondido (o documento da prévia
 * com o leitor das variáveis e o piloto, sob a mesma CSP), os resultados aparecem como nas
 * pranchas, o teste que não passou mostra como o jogo terminou, e os testes ficam no projeto.
 * Roda também no Firefox (a CSP do documento, com os scripts em `data:`) e no WebKit (o iPad).
 */

// Curto de propósito: no WebKit a caixa acessível do Monaco só guarda as linhas perto do cursor, e
// o ajudante da colagem confere o texto inteiro por ela.
const GAME = [
  'let pontos = 0;',
  "document.addEventListener('keydown', function (e) { if (e.key === 'Enter') pontos = pontos + 1; });",
  "const tela = document.createElement('canvas'); tela.width = 200; tela.height = 100; document.body.append(tela); tela.getContext('2d').fillRect(0, 0, 200, 100);",
].join('\n')

async function createProject(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//, { timeout: 15_000 })
}

async function newTest(page: Page, name: string, value: string): Promise<void> {
  await page.getByRole('button', { name: '+ Novo teste' }).click()
  const form = page.getByRole('form', { name: 'Novo teste' })
  await form.getByLabel('Nome do teste').fill(name)
  await form.getByLabel('Qual variável').selectOption('pontos')
  await form.getByLabel('Como comparar').selectOption('equals')
  await form.getByLabel('Valor para comparar').fill(value)
  await form.getByRole('button', { name: 'Salvar teste' }).click()
  await expect(form).toBeHidden()
}

test('Meus testes: cria, roda no palco escondido, mostra o resultado e guarda no projeto', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await createProject(page)
  await replaceBridgeScript(page, GAME)
  await page.getByRole('tab', { name: 'Meus testes' }).click()
  await newTest(page, 'Enter dá um ponto', '1')
  await newTest(page, 'Enter dá dois pontos', '2')
  await expect(page.getByText('Quando eu apertar Enter. No fim, pontos é igual a 1.')).toBeVisible()

  await page.getByRole('button', { name: 'Rodar os testes' }).click()
  const status = page.locator('[data-sz-devtools="tests"] [role="status"]')
  await expect(status).toContainText('1 de 2 testes passou.', { timeout: 60_000 })
  const cards = page.locator('[data-sz-devtools="tests"] article')
  await expect(cards.nth(0)).toHaveAttribute('data-sz-test-status', 'passed')
  await expect(cards.nth(0)).toContainText('Passou: pontos ficou 1.')
  await expect(cards.nth(1)).toHaveAttribute('data-sz-test-status', 'failed')
  await expect(cards.nth(1)).toContainText('Não passou: pontos terminou em 1.')
  // O palco escondido saiu da página no fim.
  await expect(page.locator('iframe[title="Teste do jogo"]')).toHaveCount(0)

  await cards.nth(1).getByRole('button', { name: 'Ver como o jogo terminou' }).click()
  const ending = page.getByRole('img', {
    name: 'Como o jogo terminou no teste "Enter dá dois pontos"',
  })
  await expect(ending).toBeVisible()
  expect(await ending.getAttribute('src')).toMatch(/^data:image\//)

  // Os testes ficam guardados no projeto.
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible({ timeout: 15_000 })
  await page.reload()
  await page.getByRole('tab', { name: 'Meus testes' }).click()
  await expect(page.getByText('Enter dá um ponto', { exact: true })).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByText('Enter dá dois pontos', { exact: true })).toBeVisible()
})

const CADE_FINAL = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/aulas-interativas/faisca/cade-todo-mundo/projeto-final.szproject.json',
)

test('Meus testes: clicar no sprite de um grupo, no jogo final do Cadê Todo Mundo', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await page.goto('/')
  await page.getByLabel('Importar projeto').setInputFiles(CADE_FINAL)
  await expect(page).toHaveURL(/\/editor\//, { timeout: 20_000 })
  await page.getByRole('tab', { name: 'Meus testes' }).click()

  await page.getByRole('button', { name: '+ Novo teste' }).click()
  const form = page.getByRole('form', { name: 'Novo teste' })
  await form.getByLabel('Nome do teste').fill('Achar a raposa conta um achado')
  await form.getByLabel('Passo 1', { exact: true }).selectOption('click')
  await form.getByLabel('Sprite do passo 1').selectOption('esconderijo2')
  await form.getByLabel('Grupo do passo 1').selectOption('esconderijos')
  await form.getByLabel('Qual variável').selectOption('achados')
  await form.getByLabel('Como comparar').selectOption('increased')
  await form.getByRole('button', { name: 'Salvar teste' }).click()
  await expect(form).toBeHidden()
  await expect(
    page.getByText('Quando eu clicar no esconderijo2. No fim, achados aumentou.'),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Rodar os testes' }).click()
  const card = page.locator('[data-sz-devtools="tests"] article').first()
  await expect(card).toHaveAttribute('data-sz-test-status', 'passed', { timeout: 60_000 })
  await expect(card).toContainText('Passou: achados foi de 0 para 1.')
})
