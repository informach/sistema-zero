import { expect, type Page, test } from '@playwright/test'

/**
 * Regressão do bug "no Firefox o preview abre mas nada acontece" (08/2026).
 *
 * O JS do aluno é externalizado para `data:text/javascript;base64,…` e a CSP
 * interna do srcdoc o autorizava SÓ por fonte de hash SHA-256 + `integrity`.
 * Casar fonte de hash com script EXTERNO é CSP nível 3 que apenas o Chromium
 * implementa (https://bugzilla.mozilla.org/show_bug.cgi?id=1409200): no Firefox
 * hash só casa com script INLINE. Resultado — os guardas e o CSS (inline) rodavam,
 * o preview parecia vivo, e o PROGRAMA do aluno nunca executava.
 *
 * O teste é deliberadamente mínimo: se o código do aluno roda, o preview funciona.
 * Rodar isto no projeto `firefox` é o ponto — em Chromium ele já passava antes da
 * correção, então é a execução cross-browser que dá o sinal.
 */
async function createProject(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//)
}

async function replaceBridgeScript(page: Page, code: string): Promise<void> {
  await page.getByRole('button', { name: 'Ponte' }).click()
  await page.getByRole('button', { name: 'script.js' }).first().click()
  const editor = page.locator('.monaco-editor').first()
  await editor.waitFor({ state: 'visible', timeout: 15_000 })
  await page.locator('.monaco-editor .view-line').first().click()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.insertText(code)
}

test.describe('preview executa o código do aluno', () => {
  test('o script canônico roda e pinta a tela', async ({ page }) => {
    await createProject(page)
    await replaceBridgeScript(
      page,
      [
        'document.body.style.background = "rgb(0, 128, 0)";',
        'document.body.dataset.rodouCodigoDoAluno = "sim";',
      ].join('\n'),
    )

    const body = page.frameLocator('iframe').locator('body')
    // O atributo prova a EXECUÇÃO; a cor prova que o efeito chegou à tela — que é
    // o que a criança relatou não acontecer ("pus uma cor e não pintou nada").
    await expect(body).toHaveAttribute('data-rodou-codigo-do-aluno', 'sim', { timeout: 15_000 })
    await expect(body).toHaveCSS('background-color', 'rgb(0, 128, 0)')
  })

  test('um `<script>` inline no index.html do aluno também executa', async ({ page }) => {
    // Caminho irmão: `<script>` inline do index.html é externalizado para `data:`
    // pelo mesmo instrumentInlineScripts, então quebrava junto no Firefox.
    await createProject(page)
    await page.getByRole('button', { name: 'Ponte' }).click()
    await page.getByRole('button', { name: 'index.html' }).first().click()
    const editor = page.locator('.monaco-editor').first()
    await editor.waitFor({ state: 'visible', timeout: 15_000 })
    await page.locator('.monaco-editor .view-line').first().click()
    await page.keyboard.press('ControlOrMeta+A')
    await page.keyboard.insertText(
      '<p id="alvo">oi</p>\n<script>document.getElementById("alvo").dataset.inline = "rodou"</script>',
    )

    const target = page.frameLocator('iframe').locator('#alvo')
    await expect(target).toHaveAttribute('data-inline', 'rodou', { timeout: 15_000 })
  })
})
