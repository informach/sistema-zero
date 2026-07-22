import { expect, type Page, test } from '@playwright/test'
import { pasteBlocklyBlocks as pasteBlocks } from './helpers/blockly'

async function createProject(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//)
}

const numberShadow = (value: number) => ({
  shadow: { type: 'sz_val_number', fields: { NUM: value } },
})

function canvasStructureArea(): Record<string, unknown> {
  return {
    type: 'sz_frame_structure',
    inputs: {
      CHILDREN: {
        block: {
          type: 'sz_html_canvas',
          fields: {
            ID: 'tela',
            CLASS: 'tela-3d',
            DESCRIPTION: 'Cena 3D criada manualmente.',
          },
        },
      },
    },
  }
}

function manualCanvas3DStartArea(): Record<string, unknown> {
  return {
    type: 'sz_frame_start',
    inputs: {
      CHILDREN: {
        block: {
          type: 'sz_t3d_scene_create',
          fields: { SCENE: 'cena' },
          next: {
            block: {
              type: 'sz_t3d_renderer_create',
              fields: { RENDERER: 'renderizador' },
              next: {
                block: {
                  type: 'sz_t3d_camera_create',
                  fields: { CAMERA: 'camera' },
                  inputs: {
                    FOV: numberShadow(60),
                    NEAR: numberShadow(0.1),
                    FAR: numberShadow(1000),
                  },
                  next: {
                    block: {
                      type: 'sz_t3d_light_create',
                      fields: {
                        LIGHT: 'luz',
                        SCENE: 'cena',
                        KIND: 'ambient',
                      },
                      inputs: {
                        COLOR: {
                          shadow: { type: 'sz_val_color', fields: { COLOR: '#ffffff' } },
                        },
                        INTENSITY: numberShadow(1),
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  }
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
      flyoutWidth: flyout.width,
      widest,
    }
  })
}

test.describe('Canvas 3D — experiência infantil', () => {
  test('monta cena, renderizador, câmera e luz sobre o canvas do núcleo', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))

    await createProject(page)
    await pasteBlocks(page, canvasStructureArea())
    await pasteBlocks(page, manualCanvas3DStartArea())

    const canvas = page.frameLocator('iframe[title="Pré-visualização"]').locator('canvas#tela')
    await expect(canvas).toBeVisible({ timeout: 15_000 })
    await expect
      .poll(
        () =>
          canvas.evaluate((element) => {
            const target = element as HTMLCanvasElement
            return target.getContext('webgl2') !== null || target.getContext('webgl') !== null
          }),
        { timeout: 15_000 },
      )
      .toBe(true)
    expect(errors).toEqual([])
  })

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
})
