import { expect, type Page } from '@playwright/test'

/** The fixture imports Monaco before capturing; wait for the new snapshot commit. */
export async function inspectWorkspaceBuffers(page: Page) {
  const output = page.getByLabel('Buffers da sessão')
  const version = Number(await output.getAttribute('data-version'))
  await page.getByRole('button', { name: 'Inspecionar buffers' }).click()
  await expect(output).toHaveAttribute('data-version', String(version + 1))
  return output.textContent()
}
