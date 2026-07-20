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

function structureArea(): Record<string, unknown> {
  return {
    type: 'sz_frame_structure',
    inputs: {
      CHILDREN: {
        block: {
          type: 'sz_html_canvas',
          fields: {
            ID: 'tela',
            CLASS: 'jogo',
            DESCRIPTION: 'Arena colorida controlada pelo teclado.',
          },
          next: {
            block: {
              type: 'sz_html_form',
              fields: { ID: 'cadastro' },
              inputs: {
                CHILDREN: {
                  block: {
                    type: 'sz_html_label',
                    fields: { FOR: 'aceite', TEXT: 'Aceitar as regras?' },
                    next: {
                      block: {
                        type: 'sz_html_input',
                        fields: {
                          ID: 'aceite',
                          NAME: 'termos',
                          TYPE: 'checkbox',
                          PLACEHOLDER: '',
                          VALUE: 'sim',
                          CHECKED: 'TRUE',
                        },
                        next: {
                          block: {
                            type: 'sz_html_textarea',
                            fields: {
                              ID: 'recado',
                              NAME: 'mensagem',
                              TEXT: 'Olá',
                              PLACEHOLDER: 'Conte aqui',
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              next: {
                block: {
                  type: 'sz_html_svg',
                  fields: {
                    ID: 'vetor',
                    WIDTH: '160',
                    HEIGHT: '100',
                    VIEWBOX: '0 0 160 100',
                    CLASS: 'vetor',
                  },
                  inputs: {
                    CHILDREN: {
                      block: {
                        type: 'sz_svg_circle',
                        fields: { ID: 'bola', CX: '40', CY: '50', R: '24', FILL: '#a78bfa' },
                        next: {
                          block: {
                            type: 'sz_svg_use',
                            fields: {
                              ID: 'copia',
                              HREF: '#bola',
                              TRANSFORM: 'translate(70 0)',
                              CLASS: 'forma',
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

function startArea(): Record<string, unknown> {
  return {
    type: 'sz_frame_start',
    inputs: {
      CHILDREN: {
        block: {
          type: 'sz_canvas_setup',
          fields: { CANVAS_ID: 'tela', CTX: 'ctx' },
          next: {
            block: {
              type: 'sz_canvas_fill_style',
              fields: { CTX: 'ctx' },
              inputs: {
                COLOR: { shadow: { type: 'sz_val_color', fields: { COLOR: '#22d3ee' } } },
              },
              next: {
                block: {
                  type: 'sz_canvas_fill_rect',
                  fields: { CTX: 'ctx' },
                  inputs: {
                    X: numberShadow(10),
                    Y: numberShadow(10),
                    W: numberShadow(50),
                    H: numberShadow(50),
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

function appearanceArea(): Record<string, unknown> {
  return {
    type: 'sz_frame_appearance',
    inputs: {
      CHILDREN: {
        block: {
          type: 'sz_css_rule',
          fields: { SELECTOR: '#tela' },
          inputs: {
            CHILDREN: {
              block: {
                type: 'sz_css_decl',
                fields: { PROP: 'display', VALUE: 'block' },
                next: {
                  block: {
                    type: 'sz_css_decl',
                    fields: { PROP: 'display', VALUE: 'grid' },
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

test.describe('HTML, CSS, SVG e Canvas — blocos reais', () => {
  test('monta, executa e reabre o projeto sem perda ou erro de primeiro frame', async ({
    page,
  }) => {
    test.setTimeout(60_000)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })

    await createProject(page)
    await pasteBlocks(page, structureArea())
    await expect(page.locator('.blocklyBlockCanvas').getByText('🧱 Estrutura: HTML')).toHaveCount(1)
    await pasteBlocks(page, startArea())
    await expect(page.locator('.blocklyBlockCanvas').getByText('⚙️ Ao iniciar')).toHaveCount(1)
    await pasteBlocks(page, appearanceArea())
    await expect(page.locator('.blocklyBlockCanvas').getByText('🎨 Aparência: CSS')).toHaveCount(1)

    const preview = page.frameLocator('iframe')
    const canvas = preview.locator('canvas#tela')
    await expect(canvas).toBeVisible({ timeout: 15_000 })
    await expect(canvas).toHaveText('Arena colorida controlada pelo teclado.')
    await expect(preview.locator('label[for="aceite"]')).toHaveText('Aceitar as regras?')
    await expect(preview.locator('input#aceite')).toHaveAttribute('name', 'termos')
    await expect(preview.locator('input#aceite')).toHaveAttribute('value', 'sim')
    await expect(preview.locator('input#aceite')).toBeChecked()
    await expect(preview.locator('textarea#recado')).toHaveAttribute('name', 'mensagem')
    await expect(preview.locator('svg#vetor use#copia')).toHaveAttribute('href', '#bola')
    await expect
      .poll(() =>
        canvas.evaluate(
          (node) =>
            (node as HTMLCanvasElement).getContext('2d')?.getImageData(20, 20, 1, 1).data[3],
        ),
      )
      .toBe(255)
    await expect(canvas).toHaveCSS('display', 'grid')

    await page.getByRole('button', { name: 'Ponte' }).click()
    await page.getByRole('button', { name: 'index.html' }).first().click()
    await expect(page.locator('.monaco-editor .view-lines').first()).toContainText(
      'Arena colorida controlada pelo teclado.',
    )
    await page.getByRole('button', { name: 'style.css' }).first().click()
    await expect(page.locator('.monaco-editor .view-lines').first()).toContainText(
      'display: block;',
    )
    await expect(page.locator('.monaco-editor .view-lines').first()).toContainText('display: grid;')
    await page.getByRole('button', { name: 'script.js' }).first().click()
    await expect(page.locator('.monaco-editor .view-lines').first()).toContainText(
      "canvas?.getContext?.('2d')",
    )

    await page.getByRole('button', { name: 'Blocos' }).click()
    await expect(page.locator('.blocklyBlockCanvas .sz_canvas_setup')).toBeVisible()
    expect(errors).toEqual([])
  })

  test('mostra no bloco que a tela escolhida não existe e preserva o preview', async ({ page }) => {
    await createProject(page)
    await pasteBlocks(page, startArea())

    const setup = page
      .locator('.blocklyBlockCanvas .blocklyDraggable')
      .filter({ hasText: 'Preparar tela de desenho' })
      .first()
    const warning = setup.locator('.blocklyWarningIcon')
    await expect(warning).toBeVisible({ timeout: 10_000 })
    await warning.click()
    await expect(page.getByText(/Não achei uma tela Canvas com o id “tela”/)).toBeVisible()
  })

  for (const [category, group] of [
    ['HTML', '✏️ Formulário'],
    ['CSS', '🧰 Regra'],
    ['Canvas', '🖥️ Tela'],
  ] as const) {
    test(`${category} cabe no layout estreito`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 })
      await createProject(page)
      await page.getByRole('treeitem', { name: category, exact: true }).click()
      await page.getByRole('treeitem', { name: group, exact: true }).click()
      const flyout = page.locator('.blocklyToolboxFlyout:visible')
      await expect(flyout).toBeVisible()
      const layout = await flyout.evaluate((element) => {
        const bounds = element.getBoundingClientRect()
        const widest = [...element.querySelectorAll<SVGGraphicsElement>('.blocklyDraggable')]
          .map((block) => ({
            width: block.getBoundingClientRect().width,
            text: block.textContent ?? '',
          }))
          .reduce((max, current) => (current.width > max.width ? current : max), {
            width: 0,
            text: '',
          })
        return { viewport: window.innerWidth, flyout: bounds.width, widest }
      })
      expect(layout.flyout, JSON.stringify(layout)).toBeLessThanOrEqual(layout.viewport)
      expect(layout.widest.width, JSON.stringify(layout)).toBeLessThanOrEqual(layout.flyout)
    })
  }
})
