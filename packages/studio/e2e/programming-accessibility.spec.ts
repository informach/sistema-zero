import { expect, test } from '@playwright/test'
import { pasteBlocklyBlocks } from './helpers/blockly'

async function createProject(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//)
}

test('Programação mantém foco visível e contraste AA no uso por teclado', async ({ page }) => {
  await createProject(page)

  const programming = page.getByRole('treeitem', { name: 'Programação', exact: true })
  await expect(programming).toBeVisible()
  await programming.focus()
  await expect
    .poll(() =>
      programming.locator(':scope > .blocklyToolboxCategory').evaluate((row) => {
        const style = getComputedStyle(row)
        return `${style.outlineStyle} ${style.outlineWidth}`
      }),
    )
    .toBe('solid 3px')

  await programming.click()
  const events = page.getByRole('treeitem', { name: '⚡ Eventos', exact: true })
  await events.click()
  await expect
    .poll(() =>
      events
        .locator(':scope > .blocklyToolboxCategory .sz-toolbox-programming-label')
        .evaluate((label) => getComputedStyle(label).color),
    )
    .toBe('rgb(255, 255, 255)')

  await page.keyboard.press('Escape')
  await pasteBlocklyBlocks(page, {
    type: 'sz_js_on_click',
    fields: { TARGET_KIND: 'id', TARGET: 'meuBotao' },
  })
  const eventBlock = page.locator('.blocklyBlockCanvas .sz_js_on_click').first()
  await expect(eventBlock).toBeVisible()
  await expect
    .poll(() =>
      eventBlock.evaluate((block) => {
        const text = block.querySelector('text.blocklyText')
        const path = block.querySelector(':scope > .blocklyPath')
        if (!text || !path) return 0
        const rgb = (value: string): number[] =>
          value
            .match(/[\d.]+/g)
            ?.slice(0, 3)
            .map(Number) ?? []
        const luminance = (value: string): number => {
          const channels = rgb(value).map((channel) => channel / 255)
          const linear = channels.map((channel) =>
            channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
          )
          return 0.2126 * (linear[0] ?? 0) + 0.7152 * (linear[1] ?? 0) + 0.0722 * (linear[2] ?? 0)
        }
        const foreground = luminance(getComputedStyle(text).fill)
        const background = luminance(getComputedStyle(path).fill)
        return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)
      }),
    )
    .toBeGreaterThanOrEqual(4.5)

  await page.getByRole('treeitem', { name: '🔎 Pesquisar', exact: true }).click()
  const search = page.locator('input[placeholder="Pesquisar blocos..."]')
  await expect(search).toBeVisible()
  await search.focus()
  await expect
    .poll(() => search.evaluate((input) => getComputedStyle(input).outlineStyle))
    .toBe('solid')
})

test('campos infantis de CSS, Canvas e SVG têm nome, foco e erros acessíveis', async ({ page }) => {
  await createProject(page)
  await pasteBlocklyBlocks(page, {
    type: 'sz_frame_appearance',
    inputs: {
      CHILDREN: {
        block: {
          type: 'sz_css_body_background',
          fields: { COLOR: '#0b1020' },
          next: {
            block: {
              type: 'sz_css_background_image',
              fields: { SELECTOR: 'body', URL: 'fundo.png' },
            },
          },
        },
      },
    },
  })
  const colourBlock = page.locator('.blocklyBlockCanvas .sz_css_body_background').first()
  await expect(colourBlock).toBeVisible()
  await colourBlock.locator(':scope > .blocklyEditableField').click()
  const hexInput = page.locator('.sz-hex-input-row input[type="text"]')
  await expect(hexInput).toHaveAttribute('aria-label', 'Cor em hexadecimal')
  await expect(hexInput).not.toBeFocused()
  await hexInput.focus()
  await expect
    .poll(() => hexInput.evaluate((input) => getComputedStyle(input).outlineStyle))
    .not.toBe('none')
  await hexInput.fill('#ruim')
  await page.locator('.sz-hex-input-row button', { hasText: 'OK' }).click()
  await expect(hexInput).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('.sz-field-picker__error')).toContainText('Use o formato #rrggbb')
  await page.keyboard.press('Escape')

  const assetBlock = page.locator('.blocklyBlockCanvas .sz_css_background_image').first()
  await assetBlock.getByText('fundo.png', { exact: true }).click()
  const assetInput = page.locator('.sz-asset-picker__input')
  await expect(assetInput).toHaveAttribute('aria-label', 'Nome da imagem')
  await expect(assetInput).not.toBeFocused()
  await assetInput.focus()
  await expect
    .poll(() => assetInput.evaluate((input) => getComputedStyle(input).outlineStyle))
    .not.toBe('none')
  await page.keyboard.press('Escape')

  await pasteBlocklyBlocks(page, {
    type: 'sz_frame_structure',
    inputs: {
      CHILDREN: {
        block: {
          type: 'sz_html_svg',
          fields: { ID: 'arte', WIDTH: '200', HEIGHT: '200', VIEWBOX: '0 0 200 200' },
          inputs: {
            CHILDREN: {
              block: {
                type: 'sz_svg_circle',
                fields: { ID: 'bola', CX: '100', CY: '100', R: '40', FILL: '#a78bfa' },
              },
            },
          },
        },
      },
    },
  })
  const svgBlock = page.locator('.blocklyBlockCanvas .sz_svg_circle').first()
  await svgBlock.getByText('#a78bfa', { exact: true }).click()
  const svgPalette = page.getByRole('group', { name: 'Cores prontas' })
  await expect(svgPalette).toBeVisible()
  await expect(page.locator('[role="listbox"]')).toHaveCount(0)
  const svgInput = page.getByRole('textbox', { name: 'Cor em texto' })
  await svgInput.fill('')
  await page.locator('.sz-svg-paint-picker__confirm').click()
  await expect(svgInput).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('.sz-field-picker__error')).toContainText('Escolha uma cor')
})
