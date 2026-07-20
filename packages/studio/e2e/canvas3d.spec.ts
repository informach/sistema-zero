import { expect, type Page, test } from '@playwright/test'

async function createProject(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//)
}

async function pasteBlocks(page: Page, block: Record<string, unknown>): Promise<void> {
  await page.evaluate(
    ([payload]) => localStorage.setItem('sz:block-clipboard', payload as string),
    [JSON.stringify({ version: 1, block, requiredExtensions: [], copiedAt: Date.now() })],
  )
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
  await page.getByText('Colar blocos', { exact: true }).click()
}

async function openCanvas3DGroup(page: Page, group: string): Promise<void> {
  const canvas2D = page.getByRole('treeitem', { name: 'Canvas', exact: true })
  const root = page.getByRole('treeitem', { name: 'Canvas 3D', exact: true })
  // O Blockly fecha os filhos depois de escolher um grupo. Trocar para uma
  // categoria irmã permite reabrir a árvore como a criança faria.
  await canvas2D.click()
  await root.click()
  const subgroup = page.getByRole('treeitem', { name: group, exact: true })
  await expect(subgroup).toBeVisible()
  await subgroup.click()
  await expect(page.locator('.blocklyToolboxFlyout:visible'), group).toBeVisible()
  await expect(
    page.locator('.blocklyToolboxFlyout:visible .blocklyDraggable').first(),
    group,
  ).toBeVisible()
}

async function flyoutLayout(page: Page): Promise<{
  viewport: number
  flyoutWidth: number
  widest: { width: number; text: string }
}> {
  return page.locator('.blocklyToolboxFlyout:visible').evaluate((visibleFlyout) => {
    const blocks = Array.from(
      visibleFlyout.querySelectorAll<SVGGraphicsElement>('.blocklyDraggable'),
    )
    const rects = blocks.map((block) => block.getBoundingClientRect())
    const flyout = visibleFlyout.getBoundingClientRect()
    const widest = rects.reduce(
      (current, rect, index) =>
        rect.width > current.width
          ? { width: rect.width, text: blocks[index]?.textContent ?? '' }
          : current,
      { width: 0, text: '' },
    )
    return {
      viewport: window.innerWidth,
      flyoutWidth: flyout.width,
      widest,
    }
  })
}

test.describe('Canvas 3D — experiência infantil', () => {
  for (const group of [
    '🧊 Biblioteca 3D',
    '🎯 Transformar',
    '🎬 Cena e material',
    '💡 Luz e sombra',
    '🖥️ Tela 3D',
    '🌳 Cópias em massa',
    '📦 Modelos e sons',
    '✨ Efeitos',
    '🧱 Mundo automático',
    '🧲 Física leve',
  ]) {
    test(`grupo ${group} cabe na largura de um celular`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await createProject(page)
      await openCanvas3DGroup(page, group)
      const layout = await flyoutLayout(page)
      expect(layout.flyoutWidth, `${group}: ${JSON.stringify(layout)}`).toBeGreaterThan(0)
      expect(layout.flyoutWidth, `${group}: ${JSON.stringify(layout)}`).toBeLessThanOrEqual(
        layout.viewport,
      )
      expect(layout.widest.width, `${group}: ${JSON.stringify(layout)}`).toBeLessThanOrEqual(
        layout.flyoutWidth,
      )
    })
  }

  test('cidade e visão à frente também cabem no desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await createProject(page)
    for (const group of ['🧱 Mundo automático', '🧲 Física leve']) {
      await openCanvas3DGroup(page, group)
      const layout = await flyoutLayout(page)
      expect(layout.widest.width, `${group}: ${JSON.stringify(layout)}`).toBeLessThanOrEqual(
        layout.flyoutWidth,
      )
    }
  })

  test('seletores de classe e ferramenta têm alvos de toque de 44 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await createProject(page)
    await pasteBlocks(page, {
      type: 'sz_frame_start',
      inputs: {
        CHILDREN: {
          block: {
            type: 'sz_t3d_import_named',
            fields: { NAMES: 'GLTFLoader', MODULE: 'automático' },
            next: {
              block: {
                type: 'sz_t3d_new_var',
                fields: { VARNAME: 'cena', CLASS: 'THREE.Scene' },
              },
            },
          },
        },
      },
    })

    const workspace = page.locator('.blocklyWorkspace .blocklyBlockCanvas')
    const classField = workspace.locator('text.blocklyText', { hasText: 'THREE.Scene' }).last()
    await expect(classField).toBeVisible()
    await classField.click()
    const classButtons = page.locator('.blocklyDropDownDiv:visible button')
    await expect(classButtons.first()).toBeVisible()
    for (const box of await classButtons.evaluateAll((buttons) =>
      buttons.map((button) => {
        const { width, height } = button.getBoundingClientRect()
        return { width, height }
      }),
    )) {
      expect(box.width).toBeGreaterThanOrEqual(44)
      expect(box.height).toBeGreaterThanOrEqual(44)
    }

    await page.keyboard.press('Escape')
    const addonField = workspace.locator('text.blocklyText', { hasText: 'GLTFLoader' }).last()
    await expect(addonField).toBeVisible()
    await addonField.click()
    const addonButtons = page.locator('.blocklyDropDownDiv:visible button')
    await expect(addonButtons.first()).toBeVisible()
    for (const box of await addonButtons.evaluateAll((buttons) =>
      buttons.map((button) => {
        const { width, height } = button.getBoundingClientRect()
        return { width, height }
      }),
    )) {
      expect(box.height).toBeGreaterThanOrEqual(44)
    }
  })
})
