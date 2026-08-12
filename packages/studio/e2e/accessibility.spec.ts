import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('lista de projetos não tem violações Axe sérias ou críticas', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: '+ Novo projeto' }).first()).toBeVisible()

  const results = await new AxeBuilder({ page }).analyze()
  const blocking = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  )

  expect(blocking).toEqual([])
})
