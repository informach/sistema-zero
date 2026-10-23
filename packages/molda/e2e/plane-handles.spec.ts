import { expect, test } from '@playwright/test'
import { COPY } from '../src/core/copy'

test('the flat plane responds to size and move handles with one undo per gesture', async ({
  page,
}) => {
  await page.goto('/?nivel=god')
  await page.getByRole('button', { name: 'Criar novo', exact: true }).click()
  await page.getByRole('button', { name: 'Criar modelo', exact: true }).click()
  await page.getByRole('button', { name: COPY.scene.plane, exact: true }).click()
  const width = page.getByRole('spinbutton', { name: 'Tamanho X', exact: true })
  const position = page.getByRole('spinbutton', { name: 'Posição X', exact: true })
  await position.fill('4')
  await position.press('Enter')
  const before = await position.inputValue()
  await page
    .getByRole('button', { name: 'Tamanho', exact: true })
    .and(page.locator('[aria-keyshortcuts="S"]'))
    .click()
  await page.getByRole('button', { name: 'Tamanho no eixo X', exact: true }).press('ArrowRight')
  await expect(width).toHaveValue('3')
  await expect(page.getByRole('spinbutton', { name: 'Tamanho Y', exact: true })).toHaveValue('0')
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  await expect(width).toHaveValue('2')
  await page
    .getByRole('button', { name: 'Mover', exact: true })
    .and(page.locator('[aria-keyshortcuts="G"]'))
    .click()
  await page.getByRole('button', { name: 'Mover no eixo X', exact: true }).press('ArrowRight')
  await expect(position).toHaveValue(String(Number(before) + 1))
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  await expect(position).toHaveValue(before)
})
