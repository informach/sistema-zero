import { expect, type Page } from '@playwright/test'

interface WorkspacePoint {
  x: number
  y: number
}

async function findEmptyWorkspacePoint(page: Page): Promise<WorkspacePoint | null> {
  const box = await page.locator('.blocklyMainBackground').first().boundingBox()
  if (!box) return null
  return page.evaluate(
    ({ left, top, width, height }) => {
      for (let y = top + height - 16; y >= top + 16; y -= 32) {
        for (let x = left + width - 16; x >= left + 16; x -= 32) {
          if (document.elementFromPoint(x, y)?.classList.contains('blocklyMainBackground')) {
            return { x, y }
          }
        }
      }
      return null
    },
    { left: box.x, top: box.y, width: box.width, height: box.height },
  )
}

/** Abre o menu somente depois que fundo, hit-test e menu estão prontos. */
export async function openWorkspaceContextMenu(page: Page): Promise<void> {
  const pasteItem = page.getByText('Colar blocos', { exact: true })
  await expect
    .poll(
      async () => {
        if (await pasteItem.isVisible()) return true
        const point = await findEmptyWorkspacePoint(page)
        if (!point) return false
        await page.mouse.click(point.x, point.y, { button: 'right' })
        return pasteItem.isVisible()
      },
      { timeout: 5_000, message: 'Workspace do Blockly sem ponto vazio interativo' },
    )
    .toBe(true)
}

/** Cola pelo mesmo clipboard durável e pelo mesmo comando usados pela interface. */
export async function pasteBlocklyBlocks(
  page: Page,
  block: Record<string, unknown>,
  requiredExtensions: string[] = [],
): Promise<void> {
  const workspaceBlocks = page.locator('.blocklyWorkspace .blocklyBlockCanvas .blocklyDraggable')
  const blockCountBeforePaste = await workspaceBlocks.count()
  await page.evaluate(
    ([payload]) => localStorage.setItem('sz:block-clipboard', payload as string),
    [JSON.stringify({ version: 1, block, requiredExtensions, copiedAt: Date.now() })],
  )
  await openWorkspaceContextMenu(page)
  const pasteItem = page.getByText('Colar blocos', { exact: true })
  await pasteItem.click()
  await expect(pasteItem).toBeHidden()
  await expect
    .poll(() => workspaceBlocks.count(), {
      timeout: 5_000,
      message: 'O comando de colar terminou, mas o bloco não apareceu no workspace',
    })
    .toBeGreaterThan(blockCountBeforePaste)

  // A colagem só está pronta para uma troca de aba/rota depois que o listener do
  // Blockly serializa o workspace e o autosave confirma esse snapshot.
  await expect(page.getByText('Alterações não salvas', { exact: true })).toBeVisible({
    timeout: 5_000,
  })
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible({ timeout: 15_000 })
}
