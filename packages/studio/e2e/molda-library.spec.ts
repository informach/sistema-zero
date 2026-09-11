import { expect, test } from '@playwright/test'

test('traz os três formatos do Molda para o projeto escolhido e preserva o vínculo ao reabrir', async ({
  page,
}) => {
  test.setTimeout(90_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//)
  await page.getByRole('button', { name: 'Mais opções' }).click()
  await page.getByRole('menuitem', { name: 'Extensões', exact: true }).click()
  const kit = page
    .getByRole('listitem')
    .filter({ has: page.getByText('Jogo 3D Avançado', { exact: true }) })
  await kit.getByRole('button', { name: 'Instalar', exact: true }).click()
  await expect(kit.getByText('Instalada', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  async function openAssets() {
    await page.getByRole('button', { name: 'Mais opções' }).click()
    await page.getByRole('menuitem', { name: 'Imagens', exact: true }).click()
  }
  await openAssets()
  await page.getByRole('button', { name: /Trazer do Molda/ }).click()
  const modal = page.getByRole('dialog', { name: 'Trazer do Molda', exact: true })
  for (const name of ['nave-do-molda', 'grama-do-molda', 'ceu-do-molda']) {
    const card = modal.getByRole('listitem').filter({ has: page.getByText(name, { exact: true }) })
    await card.getByRole('button', { name: 'Adicionar ao projeto', exact: true }).click()
    await expect(card.getByText('✓ no projeto', { exact: true })).toBeVisible()
  }
  await modal.getByRole('button', { name: 'Fechar', exact: true }).last().click()
  await page.keyboard.press('Escape')
  // Recarregar só depois de o autosave gravar. As quatro mudanças acima caem na mesma
  // janela do debounce (1 s), e a gravação que o flush dispara ao sair da página nem
  // sempre sobrevive à troca de documento (medido em 11/09: perdeu 9 de 16 recargas).
  // O que este teste prova é o vínculo depois de reabrir, não o flush de saída.
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible({ timeout: 10_000 })
  await page.reload()
  await openAssets()
  await expect(page.getByLabel('Nome do modelo 3D nave-do-molda')).toHaveValue('nave-do-molda')
  await expect(page.getByLabel('Nome da imagem grama-do-molda')).toHaveValue('grama-do-molda')
  await expect(page.getByLabel('Nome do modelo 3D ceu-do-molda')).toHaveValue('ceu-do-molda')
  await page.getByRole('button', { name: /Trazer do Molda/ }).click()
  await expect(modal.getByText('✓ no projeto', { exact: true })).toHaveCount(3)
  expect(errors).toEqual([])
})
