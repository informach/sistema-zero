import { expect, type Page } from '@playwright/test'

export async function expectToolboxGroupsToFit(
  page: Page,
  category: string,
  groups: readonly string[],
): Promise<void> {
  await page.getByRole('treeitem', { name: category, exact: true }).click()

  for (const group of groups) {
    await page.getByRole('treeitem', { name: group, exact: true }).click()
    const flyout = page.locator('.blocklyToolboxFlyout:visible')
    await expect(flyout).toBeVisible()
    const layout = await flyout.evaluate((element) => {
      const bounds = element.getBoundingClientRect()
      const blocks = [...element.querySelectorAll<SVGGraphicsElement>('.blocklyDraggable')].map(
        (block) => ({
          width: block.getBoundingClientRect().width,
          text: block.textContent ?? '',
        }),
      )
      return { viewport: window.innerWidth, flyout: bounds.width, blocks }
    })
    const evidence = JSON.stringify({
      category,
      group,
      viewport: layout.viewport,
      flyout: layout.flyout,
    })
    expect.soft(layout.flyout, evidence).toBeLessThanOrEqual(layout.viewport)
    for (const block of layout.blocks) {
      expect
        .soft(block.width, JSON.stringify({ category, group, ...block, flyout: layout.flyout }))
        .toBeLessThanOrEqual(layout.flyout)
    }
  }
}
