import { expect, type Page, test } from '@playwright/test'
import { pasteBlocklyBlocks as pasteBlocks } from './helpers/blockly'

async function createProject(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//)
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
  test('executa início, registra eventos e reinicia loops no preview real', async ({ page }) => {
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
