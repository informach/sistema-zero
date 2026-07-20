import { expect, type Page, test } from '@playwright/test'

async function createProject(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//)
}

/** Cola pelo mesmo clipboard durável usado pela interface. */
async function pasteBlocks(
  page: Page,
  block: Record<string, unknown>,
  requiredExtensions: string[] = [],
): Promise<void> {
  await page.evaluate(
    ([payload]) => localStorage.setItem('sz:block-clipboard', payload as string),
    [JSON.stringify({ version: 1, block, requiredExtensions, copiedAt: Date.now() })],
  )
  await openWorkspaceContextMenu(page)
  await page.getByText('Colar blocos', { exact: true }).click()
}

async function openWorkspaceContextMenu(page: Page): Promise<void> {
  const background = page.locator('.blocklyMainBackground').first()
  const box = await background.boundingBox()
  if (!box) throw new Error('Workspace do Blockly sem fundo')
  const point = await page.evaluate(
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
  if (!point) throw new Error('Workspace do Blockly sem ponto vazio')
  await page.mouse.click(point.x, point.y, { button: 'right' })
}

const startArea = (text: string) => ({
  type: 'sz_frame_start',
  inputs: {
    CHILDREN: {
      block: {
        type: 'sz_js_console_log_text',
        fields: { VALUE: text },
      },
    },
  },
})

test.describe('Áreas de comportamento — lifecycle completo', () => {
  test('excluir uma área preserva o filho como rascunho e desfazer reconecta', async ({ page }) => {
    await createProject(page)
    await pasteBlocks(page, startArea('não apagar'))

    const area = page
      .locator('.blocklyWorkspace .blocklyBlockCanvas .blocklyDraggable')
      .filter({ hasText: 'Ao iniciar' })
      .first()
    await expect(area).toBeVisible()
    await area.click({ button: 'right', position: { x: 24, y: 12 } })
    await page.getByText(/^(Excluir|Deletar)/).click()

    await expect(page.getByText(/1 pilha está salva como rascunho/)).toBeVisible()
    await expect(
      page
        .locator('.blocklyWorkspace .blocklyBlockCanvas .blocklyDraggable')
        .filter({ hasText: 'não apagar' }),
    ).toBeVisible()

    await page.locator('.blocklyMainBackground').click()
    await page.keyboard.press('ControlOrMeta+z')
    await expect(
      page
        .locator('.blocklyWorkspace .blocklyBlockCanvas .blocklyDraggable')
        .filter({ hasText: 'Ao iniciar' }),
    ).toBeVisible()
    await expect(page.getByText(/pilha está salva como rascunho/)).toHaveCount(0)
  })

  test('a pesquisa não oferece o bloco legado de carregar a página', async ({ page }) => {
    await createProject(page)
    const input = page.locator('input#toolbox-search-input')
    const searchCategory = page
      .locator('.blocklyToolboxCategory')
      .filter({ hasText: 'Pesquisar' })
      .first()
    for (let attempt = 0; attempt < 3 && !(await input.isVisible()); attempt += 1) {
      await searchCategory.click()
      await page.waitForTimeout(200)
    }
    await expect(input).toBeVisible()
    await input.fill('Quando a página carregar')

    await expect(page.locator('.blocklyToolboxFlyout')).not.toContainText(
      'Quando a página carregar',
    )
  })

  test('o Composer orienta a criar Ao iniciar e só adiciona depois da escolha da criança', async ({
    page,
  }) => {
    await createProject(page)
    await pasteBlocks(page, { type: 'sz_w3d_setup' }, ['world-3d'])
    const composerTab = page.getByRole('tab', { name: 'Editor de mundo 3D' })
    await expect(composerTab).toBeVisible({ timeout: 10_000 })
    await composerTab.click()

    await page.getByRole('button', { name: 'Distrito', exact: true }).click()
    await expect(page.getByRole('status')).toHaveText(
      'Crie a área “⚙️ Ao iniciar” em Áreas do projeto para adicionar ao mundo.',
    )

    await page.getByRole('tab', { name: 'Blocos', exact: true }).click()
    await pasteBlocks(page, { type: 'sz_frame_start' })
    await composerTab.click()
    await page.getByRole('button', { name: 'Distrito', exact: true }).click()

    await expect(page.getByRole('status')).toHaveCount(0)
    await expect(
      page
        .getByRole('navigation', { name: 'Objetos do mundo' })
        .getByRole('button', { name: /Distrito/ }),
    ).toBeVisible()
  })
})
