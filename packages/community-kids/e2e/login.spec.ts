import { expect, test } from '@playwright/test'

// Desde o acesso infantil por aparelho (10/10/2026), `/login` é a escolha entre as duas entradas;
// o formulário com e-mail mora na entrada dos responsáveis. A entrada do aluno depende do servidor
// (reconhecer o navegador), então este smoke sem backend cobre a escolha e o formulário adulto.
test('login oferece as duas entradas e o formulário do responsável valida sem depender do backend', async ({
  page,
}) => {
  await page.goto('/login')

  await expect(page.getByRole('heading', { name: 'Quem vai entrar?' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Eu sou criador\(a\)/ })).toBeVisible()
  await page.getByRole('link', { name: /Eu sou responsável/ }).click()

  await expect(page).toHaveURL(/\/login\/responsavel/)
  await expect(page.getByText('Área dos pais', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'E-mail' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Enviar código' })).toBeVisible()

  await page.getByRole('button', { name: 'Entrar com senha' }).click()
  const passwordInput = page.getByLabel('Senha', { exact: true })
  await expect(passwordInput).toHaveAttribute('type', 'password')
  await page.getByRole('button', { name: 'Mostrar senha' }).click()
  await expect(passwordInput).toHaveAttribute('type', 'text')

  await page.getByLabel('E-mail').fill('email-invalido')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByText('E-mail inválido')).toBeVisible()
})
