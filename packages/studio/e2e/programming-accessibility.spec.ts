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
  const search = page.locator('input[name="block-search"]')
  await expect(search).toBeVisible()
  await expect(search).toHaveAttribute('type', 'search')
  await expect(search).toHaveAttribute('autocomplete', 'off')
  await expect(search).toHaveAttribute('aria-label', 'Pesquisar blocos')
  await expect(search).toHaveAttribute('placeholder', 'Pesquisar blocos…')
  await expect(search).toHaveJSProperty('spellcheck', false)
  await search.focus()
  await expect
    .poll(() => search.evaluate((input) => getComputedStyle(input).outlineStyle))
    .toBe('solid')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  const programmingRow = programming.locator(':scope > .blocklyToolboxCategory')
  await programmingRow.hover()
  await expect
    .poll(() =>
      programmingRow.evaluate((row) => {
        const style = getComputedStyle(row)
        return `${style.transitionDuration} ${style.transform}`
      }),
    )
    .toBe('0s none')
})

test('Programação mantém o flyout interativo em celular', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await createProject(page)

  await page.getByRole('treeitem', { name: 'Programação', exact: true }).click()
  await page.getByRole('treeitem', { name: '⚡ Eventos', exact: true }).click()

  const flyout = page.locator('.blocklyToolboxFlyout')
  const firstBlock = flyout.locator('.blocklyDraggable').first()
  await expect(flyout).toBeVisible()
  await expect(firstBlock).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(() => {
        const injection = document.querySelector('.injectionDiv')?.getBoundingClientRect()
        const flyoutRect = document.querySelector('.blocklyToolboxFlyout')?.getBoundingClientRect()
        if (!injection || !flyoutRect) return false
        return (
          flyoutRect.top >= injection.top &&
          flyoutRect.bottom <= Math.min(injection.bottom, window.innerHeight)
        )
      }),
    )
    .toBe(true)

  const countWorkspaceBlocks = (): Promise<number> =>
    page.evaluate(
      () =>
        [...document.querySelectorAll('.blocklyBlockCanvas .blocklyDraggable')].filter(
          (block) => !block.closest('.blocklyFlyout'),
        ).length,
    )
  const countBefore = await countWorkspaceBlocks()
  const source = await firstBlock.boundingBox()
  const target = await page.evaluate(() => {
    const background = document.querySelector('.blocklyMainBackground')?.getBoundingClientRect()
    if (!background) return null
    for (let y = background.top + 48; y < background.bottom - 48; y += 32) {
      for (let x = background.right - 48; x > background.left + 48; x -= 32) {
        if (document.elementFromPoint(x, y)?.classList.contains('blocklyMainBackground')) {
          return { x, y }
        }
      }
    }
    return null
  })
  if (!source || !target) throw new Error('Flyout ou workspace sem ponto interativo no celular')

  // Blocos de evento têm uma cavidade central; o centro geométrico cai no
  // fundo do flyout e não inicia o gesto. A quina sólida exercita o arraste real.
  await page.mouse.move(source.x + 5, source.y + 5)
  await page.mouse.down()
  await page.mouse.move(target.x, target.y, { steps: 8 })
  await page.mouse.up()
  await expect.poll(countWorkspaceBlocks).toBeGreaterThan(countBefore)
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

test('entrada livre do seletor de nomes desativa o preenchimento automático', async ({ page }) => {
  await createProject(page)
  await pasteBlocklyBlocks(page, {
    type: 'sz_frame_start',
    inputs: {
      CHILDREN: {
        block: {
          type: 'sz_canvas_setup',
          fields: { CANVAS_ID: 'tela', CTX: 'pincel' },
        },
      },
    },
  })

  const setup = page.locator('.blocklyBlockCanvas .sz_canvas_setup').first()
  await setup.getByText('tela', { exact: true }).click()
  const input = page.locator('.sz-name-picker__input')
  await expect(input).toBeVisible()
  await expect(input).toHaveAttribute('name', 'blockly-name-canvas')
  await expect(input).toHaveAttribute('autocomplete', 'off')
})
