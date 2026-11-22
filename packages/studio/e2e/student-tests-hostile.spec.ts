import { expect, type Page, test } from '@playwright/test'
import { requireRetainedHostFocus } from './helpers/cleanBrowser'
import { PROGRAMAS_HOSTIS } from './helpers/hostilePrograms'
import { replaceBridgeScript } from './helpers/previewShell'

requireRetainedHostFocus('Teste do jogo')

/**
 * A aba Meus testes com o jogo quebrado (lote 3 da conclusão, 22/11/2026). A criança escreve o
 * teste com o jogo funcionando e depois quebra o código: o teste roda e diz o que aconteceu, sem
 * ficar esperando para sempre. Fora do `student-tests.spec.ts` porque estes jogos deixam erro no
 * navegador de propósito (a regra daquele arquivo é nenhum erro). Roda nos três navegadores.
 */

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
  // A URL troca antes de o editor montar ("Carregando projeto…"): no WebKit os cartões da lista
  // ainda estavam na página, e o "Ponte" da colagem achava os cartões com "Ponte" no nome.
  await expect(page.getByRole('button', { name: 'Ponte', exact: true })).toBeVisible({
    timeout: 30_000,
  })
}

/** Abre a aba só se ela não está à vista: clicar na aba aberta fecha a gaveta. */
async function openTests(page: Page): Promise<void> {
  if (await page.locator('[data-sz-devtools="tests"]').isVisible()) return
  await page.getByRole('tab', { name: 'Meus testes' }).click()
  await expect(page.locator('[data-sz-devtools="tests"]')).toBeVisible()
}

async function runOnce(page: Page): Promise<{ status: string; text: string }> {
  await openTests(page)
  await page.getByRole('button', { name: 'Rodar os testes' }).click()
  const summary = page.locator('[data-sz-devtools="tests"] [role="status"]')
  await expect(summary).toContainText('0 de 1 teste passou.', { timeout: 90_000 })
  const card = page.locator('[data-sz-devtools="tests"] article').first()
  return {
    status: (await card.getAttribute('data-sz-test-status')) ?? '',
    text: await card.innerText(),
  }
}

// O WebKit não interrompe o JavaScript síncrono de um quadro já removido: o jogo que trava segue
// ocupando o processo do navegador depois do fim do teste, e a página do teste seguinte abria
// ocupada (o editor não chegava a aparecer). Antes de liberar o próximo teste, uma página nova do
// mesmo navegador tem de responder.
test.afterEach(async ({ browser, baseURL }) => {
  const probe = await browser.newPage()
  try {
    await probe.goto(baseURL ?? '/', { timeout: 60_000 })
    await probe.evaluate(() => document.readyState)
  } finally {
    await probe.close()
  }
})

test.beforeEach(async ({ page }) => {
  await createProject(page)
  await replaceBridgeScript(page, GAME)
  await openTests(page)
  await page.getByRole('button', { name: '+ Novo teste' }).click()
  const form = page.getByRole('form', { name: 'Novo teste' })
  await form.getByLabel('Nome do teste').fill('Enter dá um ponto')
  await form.getByLabel('Qual variável').selectOption('pontos')
  await form.getByLabel('Como comparar').selectOption('equals')
  await form.getByLabel('Valor para comparar').fill('1')
  await form.getByRole('button', { name: 'Salvar teste' }).click()
  await expect(form).toBeHidden()
})

test('Meus testes: o código que não compila diz que o jogo deu erro', async ({ page }) => {
  test.setTimeout(150_000)
  await replaceBridgeScript(page, PROGRAMAS_HOSTIS.compilacao)
  const result = await runOnce(page)
  expect(result.status).toBe('failed')
  expect(result.text).toContain('Não passou: o jogo deu erro durante o teste.')
})

test('Meus testes: o jogo que trava não deixa o teste esperando para sempre', async ({ page }) => {
  test.setTimeout(150_000)
  await replaceBridgeScript(page, PROGRAMAS_HOSTIS.trabalhoSincrono)
  const result = await runOnce(page)
  expect(result.status).toBe('timeout')
  expect(result.text).toContain('Não passou: o jogo não respondeu a tempo.')
})
