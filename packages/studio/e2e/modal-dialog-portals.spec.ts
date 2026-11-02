import { expect, type Page, test } from '@playwright/test'
import { pasteBlocklyBlocks } from './helpers/blockly'

/**
 * Retorno de quem testou o desafio do Arquipélago (01/11/2026): dentro do Estúdio de desafio,
 * aberto num `<dialog>` com `showModal()`, "você clicava num campo do bloco e não conseguia
 * editar; o botão direito não fazia nada". O `showModal()` deixa inerte tudo o que fica fora do
 * diálogo, e o editor de campo, a lista de opções, o menu do botão direito e o menu ⋯ moravam no
 * `document.body`. Com o diálogo como contêiner de portais (`StudioPortalContainerProvider`),
 * tudo abre dentro dele. O playground com `?modal=1` monta exatamente isso.
 */

async function abrirNoDialogo(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//)
  await page.goto(`${page.url()}?modal=1`)
  await expect(page.locator('dialog[data-sz-modal-demo][open]')).toBeVisible()
  await expect(page.locator('.blocklyMainBackground').first()).toBeVisible({ timeout: 30_000 })
}

test('no diálogo modal: botão direito, campo de texto, lista de opções e menu ⋯ respondem', async ({
  page,
}) => {
  await abrirNoDialogo(page)
  // O botão direito do Blockly (o menu "Colar blocos") abre e o item responde ao clique.
  await pasteBlocklyBlocks(page, {
    type: 'sz_js_storage_set',
    fields: { STORE: 'local', KEY: 'nome' },
  })
  const bloco = page.locator('.blocklyBlockCanvas .blocklyDraggable').last()
  const portais = page.locator('dialog[data-sz-modal-demo] [data-sz-blockly-portais]')
  await expect(portais).toHaveCount(1)

  // Campo de texto: o editor abre DENTRO do diálogo e aceita digitação.
  await bloco.locator('.blocklyEditableField', { hasText: 'nome' }).click()
  const editor = page.locator('dialog .blocklyWidgetDiv input.blocklyHtmlInput')
  await expect(editor).toBeVisible()
  await editor.fill('recorde')
  await editor.press('Enter')
  await expect(bloco.locator('.blocklyEditableField', { hasText: 'recorde' })).toBeVisible()

  // Lista de opções: abre dentro do diálogo e a escolha vale.
  await bloco.locator('.blocklyEditableField', { hasText: 'permanente' }).click()
  const opcao = page.locator('dialog .blocklyDropDownDiv').getByText('só nesta sessão', {
    exact: false,
  })
  await expect(opcao).toBeVisible()
  await opcao.click()
  await expect(bloco.locator('.blocklyEditableField', { hasText: 'só nesta sessão' })).toBeVisible()

  // O menu ⋯ do Studio abre dentro do diálogo e um item responde.
  await page.getByRole('button', { name: 'Mais opções' }).click()
  const menu = page.locator('dialog [role="menu"]')
  await expect(menu).toBeVisible()
  await menu.getByRole('menuitem', { name: 'Imagens', exact: true }).click()
  await expect(page.getByRole('dialog', { name: /Materiais do jogo/ })).toBeVisible()
})
