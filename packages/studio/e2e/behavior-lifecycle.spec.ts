import { expect, type Page, test } from '@playwright/test'
import { openWorkspaceContextMenu, pasteBlocklyBlocks as pasteBlocks } from './helpers/blockly'

async function createProject(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//)
}

async function dragProjectAreaFromFlyout(page: Page, label: string): Promise<void> {
  const category = page
    .locator('.blocklyToolboxCategory')
    .filter({ hasText: 'Áreas do projeto' })
    .first()
  const source = page
    .locator('.blocklyToolboxFlyout .blocklyDraggable')
    .filter({ hasText: label })
    .first()
  if (!(await source.isVisible())) await category.click()
  await expect(source).toBeVisible()

  const sourceBox = await source.boundingBox()
  const target = await page.evaluate(() => {
    const background = document.querySelector('.blocklyMainBackground')?.getBoundingClientRect()
    if (!background) return null
    for (let y = background.bottom - 48; y > background.top + 48; y -= 32) {
      for (let x = background.right - 48; x > background.left + 48; x -= 32) {
        if (document.elementFromPoint(x, y)?.classList.contains('blocklyMainBackground')) {
          return { x, y }
        }
      }
    }
    return null
  })
  if (!sourceBox || !target) throw new Error('Área ou workspace sem ponto interativo')

  await page.mouse.move(sourceBox.x + 5, sourceBox.y + 5)
  await page.mouse.down()
  await page.mouse.move(target.x, target.y, { steps: 8 })
  await page.mouse.up()
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

const logBlock = (text: string) => ({
  type: 'sz_js_console_log_text',
  fields: { VALUE: text },
})

const eventArea = (text: string) => ({
  type: 'sz_frame_events',
  inputs: {
    CHILDREN: {
      block: {
        type: 'sz_js_on_click_anywhere',
        inputs: { DO: { block: logBlock(text) } },
      },
    },
  },
})

const oneFrameLoopArea = (text: string) => ({
  type: 'sz_frame_loops',
  inputs: {
    CHILDREN: {
      block: {
        type: 'sz_canvas_anim_loop',
        extraState: { handle: 'cicloE2E' },
        inputs: {
          BODY: {
            block: {
              ...logBlock(text),
              next: {
                block: {
                  type: 'sz_canvas_cancel_anim',
                  inputs: {
                    HANDLE: {
                      shadow: { type: 'sz_val_variable', fields: { NAME: 'cicloE2E' } },
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
})

test.describe('Áreas de comportamento — lifecycle completo', () => {
  test('cria cada área pela paleta e mantém apenas uma de cada tipo', async ({ page }) => {
    await createProject(page)
    const countStarts = () =>
      page.evaluate(
        () =>
          [...document.querySelectorAll('.blocklyBlockCanvas .sz_frame_start')].filter(
            (block) => !block.closest('.blocklyFlyout'),
          ).length,
      )

    await dragProjectAreaFromFlyout(page, 'Ao iniciar')
    await expect.poll(countStarts).toBe(1)

    await dragProjectAreaFromFlyout(page, 'Ao iniciar')
    await expect.poll(countStarts).toBe(1)
  })

  test('organiza as cinco áreas nas duas linhas pedagógicas', async ({ page }) => {
    await createProject(page)
    for (const [type, x, y] of [
      ['sz_frame_loops', 640, 80],
      ['sz_frame_structure', 620, 440],
      ['sz_frame_events', 80, 420],
      ['sz_frame_appearance', 100, 80],
      ['sz_frame_start', 360, 260],
    ] as const) {
      await pasteBlocks(page, { type, x, y })
    }

    await openWorkspaceContextMenu(page)
    await page.getByText('Organizar blocos', { exact: true }).click()

    const blockBox = (type: string) =>
      page
        .locator(`.blocklyWorkspace .blocklyBlockCanvas .${type}.blocklyDraggable`)
        .first()
        .boundingBox()
    await expect
      .poll(async () => {
        const [structure, appearance, start, events, loops] = await Promise.all([
          blockBox('sz_frame_structure'),
          blockBox('sz_frame_appearance'),
          blockBox('sz_frame_start'),
          blockBox('sz_frame_events'),
          blockBox('sz_frame_loops'),
        ])
        if (!structure || !appearance || !start || !events || !loops) return null
        const sameFirstRow = Math.abs(structure.y - appearance.y) < 12
        const sameSecondRow =
          Math.max(start.y, events.y, loops.y) - Math.min(start.y, events.y, loops.y) < 12
        return {
          firstRowOrder: structure.x < appearance.x,
          secondRowOrder: start.x < events.x && events.x < loops.x,
          sameFirstRow,
          sameSecondRow,
          secondRowBelow: start.y > Math.max(structure.y, appearance.y) + 24,
        }
      })
      .toEqual({
        firstRowOrder: true,
        secondRowOrder: true,
        sameFirstRow: true,
        sameSecondRow: true,
        secondRowBelow: true,
      })
  })

  test('recusa evento na área de início e preserva o bloco como rascunho', async ({ page }) => {
    await createProject(page)
    await pasteBlocks(page, {
      type: 'sz_frame_start',
      inputs: {
        CHILDREN: {
          block: {
            type: 'sz_js_on_click_anywhere',
            inputs: { DO: { block: logBlock('não conectar') } },
          },
        },
      },
    })

    const eventDraft = page.locator(
      '.blocklyWorkspace .blocklyBlockCanvas .sz_js_on_click_anywhere.blocklyDraggable',
    )
    await expect(eventDraft).toBeVisible()
    await expect(eventDraft).toHaveClass(/sz-draft-block/)
    await expect(
      page.locator('.blocklyWorkspace .blocklyBlockCanvas .sz_frame_events'),
    ).toHaveCount(0)
  })

  test('áreas continuam navegáveis por teclado e cabem no celular', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await createProject(page)

    const areas = page.getByRole('treeitem', { name: /Áreas do projeto/ }).first()
    await areas.focus()
    await expect(areas).toBeFocused()
    await page.keyboard.press('Enter')

    const flyout = page.locator('.blocklyToolboxFlyout')
    await expect(flyout).toBeVisible()
    await expect(flyout.locator('.blocklyDraggable')).toHaveCount(5)
    await expect(flyout).toContainText('Ao iniciar')
    await expect(flyout).toContainText('Quando acontecer')
    await expect(flyout).toContainText('Enquanto estiver rodando')
    await expect
      .poll(() =>
        page.evaluate(() => {
          const injection = document.querySelector('.injectionDiv')?.getBoundingClientRect()
          const visibleFlyout = document
            .querySelector('.blocklyToolboxFlyout')
            ?.getBoundingClientRect()
          if (!injection || !visibleFlyout) return false
          return (
            visibleFlyout.top >= injection.top &&
            visibleFlyout.bottom <= Math.min(injection.bottom, window.innerHeight)
          )
        }),
      )
      .toBe(true)
  })

  test('executa início, registra eventos e remonta loops ao atualizar o preview', async ({
    page,
  }) => {
    await createProject(page)
    await pasteBlocks(page, startArea('lifecycle:start'))
    await pasteBlocks(page, eventArea('lifecycle:event'))
    await pasteBlocks(page, oneFrameLoopArea('lifecycle:loop'))

    const logMessages = page.locator('span.whitespace-pre-wrap.break-all')
    const previewFrame = page.locator('iframe[title="Pré-visualização"]')
    await expect
      .poll(
        async () => {
          const srcdoc = (await previewFrame.getAttribute('srcdoc')) ?? ''
          const scripts = [...srcdoc.matchAll(/src="data:text\/javascript;base64,([^"]+)"/gi)]
            .map((match) => Buffer.from(match[1] ?? '', 'base64').toString('utf8'))
            .join('\n')
          return ['lifecycle:start', 'lifecycle:event', 'lifecycle:loop'].map((text) =>
            scripts.includes(text),
          )
        },
        { timeout: 15_000 },
      )
      .toEqual([true, true, true])

    await page.getByRole('button', { name: 'Mais opções' }).click()
    await page.getByRole('menuitem', { name: 'Console' }).click()
    await expect(page.getByRole('tab', { name: 'Console' })).toBeVisible()
    await page.getByRole('button', { name: 'Limpar' }).click()
    await page.getByRole('button', { name: 'Atualizar o preview' }).click()
    await expect
      .poll(() => logMessages.allTextContents(), { timeout: 15_000 })
      .toEqual(['lifecycle:start', 'lifecycle:loop'])

    await page
      .frameLocator('iframe[title="Pré-visualização"]')
      .locator('html')
      .dispatchEvent('click')
    await expect
      .poll(() => logMessages.allTextContents())
      .toEqual(['lifecycle:start', 'lifecycle:loop', 'lifecycle:event'])

    await page.getByRole('button', { name: 'Limpar' }).click()
    await page.getByRole('button', { name: 'Atualizar o preview' }).click()
    await expect
      .poll(() => logMessages.allTextContents())
      .toEqual(['lifecycle:start', 'lifecycle:loop'])
  })

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

    const draft = page
      .locator('.blocklyWorkspace .blocklyBlockCanvas .sz_js_console_log_text.blocklyDraggable')
      .filter({ hasText: 'não apagar' })
    await expect(draft).toBeVisible()
    await expect(draft).toHaveClass(/sz-draft-block/)
    await expect(page.getByText(/pilha está salva como rascunho/)).toHaveCount(0)

    await page.locator('.blocklyMainBackground').click()
    await page.keyboard.press('ControlOrMeta+z')
    await expect(
      page
        .locator('.blocklyWorkspace .blocklyBlockCanvas .blocklyDraggable')
        .filter({ hasText: 'Ao iniciar' }),
    ).toBeVisible()
    await expect(draft).not.toHaveClass(/sz-draft-block/)
  })

  test('a pesquisa não oferece o bloco legado de carregar a página', async ({ page }) => {
    await createProject(page)
    const input = page.locator('input#toolbox-search-input')
    const searchCategory = page
      .locator('.blocklyToolboxCategory')
      .filter({ hasText: 'Pesquisar' })
      .first()
    await expect
      .poll(
        async () => {
          if (!(await input.isVisible())) await searchCategory.click()
          return input.isVisible()
        },
        { timeout: 5_000, message: 'A categoria Pesquisar não abriu o campo de busca' },
      )
      .toBe(true)
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
