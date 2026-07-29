import { expect, type Locator, type Page, test } from '@playwright/test'
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

const colorShadow = (value: string) => ({
  shadow: { type: 'sz_val_color', fields: { COLOR: value } },
})

function blockChain(blocks: Array<Record<string, unknown>>): Record<string, unknown> {
  const [first, ...rest] = blocks
  if (!first) throw new Error('A corrente precisa de pelo menos um bloco')
  let current = first
  for (const nextBlock of rest) {
    current.next = { block: nextBlock }
    current = nextBlock
  }
  return first
}

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
                      type: 'sz_t3d_set_position',
                      fields: { OBJ: 'camera' },
                      inputs: {
                        X: numberShadow(0),
                        Y: numberShadow(1),
                        Z: numberShadow(5),
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
                          next: {
                            block: {
                              type: 'sz_t3d_set_background',
                              fields: { SCENE: 'cena' },
                              inputs: {
                                COLOR: {
                                  shadow: {
                                    type: 'sz_val_color',
                                    fields: { COLOR: '#102030' },
                                  },
                                },
                              },
                              next: {
                                block: {
                                  type: 'sz_t3d_primitive',
                                  fields: { SHAPE: 'box', SCENE: 'cena', MESH: 'cubo' },
                                  inputs: {
                                    W: numberShadow(1.5),
                                    H: numberShadow(1.5),
                                    D: numberShadow(1.5),
                                    COLOR: {
                                      shadow: {
                                        type: 'sz_val_color',
                                        fields: { COLOR: '#ff8844' },
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

function manualCanvas3DLoopArea(): Record<string, unknown> {
  return {
    type: 'sz_frame_loops',
    inputs: {
      CHILDREN: {
        block: {
          type: 'sz_canvas_anim_loop',
          inputs: {
            BODY: {
              block: {
                type: 'sz_t3d_render',
                fields: { SCENE: 'cena', CAMERA: 'camera', R: 'renderizador' },
              },
            },
          },
        },
      },
    },
  }
}

function proceduralPhysicsStartArea(): Record<string, unknown> {
  return {
    type: 'sz_frame_start',
    inputs: {
      CHILDREN: {
        block: blockChain([
          { type: 'sz_t3d_scene_create', fields: { SCENE: 'cena' } },
          { type: 'sz_t3d_renderer_create', fields: { RENDERER: 'renderizador' } },
          {
            type: 'sz_t3d_camera_create',
            fields: { CAMERA: 'camera' },
            inputs: { FOV: numberShadow(60), NEAR: numberShadow(0.1), FAR: numberShadow(1000) },
          },
          {
            type: 'sz_t3d_set_position',
            fields: { OBJ: 'camera' },
            inputs: { X: numberShadow(0), Y: numberShadow(18), Z: numberShadow(24) },
          },
          {
            type: 'sz_t3d_look_at',
            fields: { OBJ: 'camera' },
            inputs: { X: numberShadow(0), Y: numberShadow(0), Z: numberShadow(0) },
          },
          {
            type: 'sz_t3d_light_create',
            fields: { LIGHT: 'luz', SCENE: 'cena', KIND: 'ambient' },
            inputs: { COLOR: colorShadow('#ffffff'), INTENSITY: numberShadow(1.5) },
          },
          {
            type: 'sz_t3d_terrain',
            fields: { SCENE: 'cena', TERRAIN: 'terreno', HEIGHT_FN: 'alturaChao' },
            inputs: {
              SIZE: numberShadow(80),
              SEGMENTS: numberShadow(24),
              HILLS: numberShadow(3),
              SMOOTH: numberShadow(12),
              COLOR: colorShadow('#3f8f4f'),
            },
          },
          {
            type: 'sz_t3d_primitive',
            fields: { SHAPE: 'capsule', SCENE: 'cena', MESH: 'jogadorVisual' },
            inputs: {
              W: numberShadow(1),
              H: numberShadow(2),
              D: numberShadow(1),
              COLOR: colorShadow('#38bdf8'),
            },
          },
          {
            type: 'sz_t3d_physics_setup',
            fields: { WORLD: 'fisica', HEIGHT_FN: 'alturaChao' },
            inputs: { GRAVITY: numberShadow(-22), SUBSTEPS: numberShadow(3) },
          },
          {
            type: 'sz_t3d_physics_body',
            fields: {
              WORLD: 'fisica',
              OBJECT: 'jogadorVisual',
              ID: 'jogador',
              KIND: 'character',
            },
            inputs: {
              W: numberShadow(1),
              H: numberShadow(2),
              D: numberShadow(1),
              FRICTION: numberShadow(0.82),
              BOUNCE: numberShadow(0),
            },
          },
        ]),
      },
    },
  }
}

function proceduralPhysicsLoopArea(): Record<string, unknown> {
  return {
    type: 'sz_frame_loops',
    inputs: {
      CHILDREN: {
        block: {
          type: 'sz_canvas_anim_loop',
          inputs: {
            BODY: {
              block: blockChain([
                {
                  type: 'sz_t3d_physics_move',
                  fields: { ID: 'jogador', WORLD: 'fisica' },
                  inputs: { X: numberShadow(0.35), Z: numberShadow(0), SPEED: numberShadow(2) },
                },
                {
                  type: 'sz_t3d_physics_step',
                  fields: { WORLD: 'fisica' },
                  inputs: { DT: numberShadow(1 / 60) },
                },
                {
                  type: 'sz_t3d_render',
                  fields: { SCENE: 'cena', CAMERA: 'camera', R: 'renderizador' },
                },
              ]),
            },
          },
        },
      },
    },
  }
}

async function canvasColorCount(page: Page, canvas: Locator): Promise<number> {
  const screenshot = await canvas.screenshot()
  const dataUrl = `data:image/png;base64,${screenshot.toString('base64')}`
  return page.evaluate(async (source) => {
    const image = new Image()
    image.src = source
    await image.decode()

    const snapshot = document.createElement('canvas')
    snapshot.width = image.naturalWidth
    snapshot.height = image.naturalHeight
    const context = snapshot.getContext('2d')
    if (!context) return 0

    context.drawImage(image, 0, 0)
    const pixels = context.getImageData(0, 0, snapshot.width, snapshot.height).data
    const colors = new Set<string>()
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 3] === 0) continue
      colors.add(`${pixels[index]},${pixels[index + 1]},${pixels[index + 2]}`)
      if (colors.size > 1) break
    }
    return colors.size
  }, dataUrl)
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
  test('monta e desenha uma cena real sobre o canvas do núcleo', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))

    await createProject(page)
    await pasteBlocks(page, canvasStructureArea())
    await pasteBlocks(page, manualCanvas3DStartArea())
    await pasteBlocks(page, manualCanvas3DLoopArea())

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
    await expect.poll(() => canvasColorCount(page, canvas), { timeout: 15_000 }).toBeGreaterThan(1)
    expect(errors).toEqual([])
  })

  test('executa terreno e personagem com a física leve no preview real', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))

    await createProject(page)
    await pasteBlocks(page, canvasStructureArea())
    await pasteBlocks(page, proceduralPhysicsStartArea())
    await pasteBlocks(page, proceduralPhysicsLoopArea())

    const canvas = page.frameLocator('iframe[title="Pré-visualização"]').locator('canvas#tela')
    await expect(canvas).toBeVisible({ timeout: 15_000 })
    await expect.poll(() => canvasColorCount(page, canvas), { timeout: 15_000 }).toBeGreaterThan(1)
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
