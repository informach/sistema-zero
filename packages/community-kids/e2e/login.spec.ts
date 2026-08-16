import { expect, test } from '@playwright/test'

test('login oferece os dois modos e valida o formulário sem depender do backend', async ({
  page,
}) => {
  await page.goto('/login')

  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible()
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
