import { expect, type Page } from '@playwright/test'

/**
 * Ajudantes neutros do editor, sem `test.use`: colar um programa na Ponte e medir o relógio da
 * página. Moram fora de `previewShell.ts` porque aquele chama `test.use` (configurePreviewShellTests)
 * e um arquivo de teste que o importasse junto da suíte da casca fazia o Playwright recusar o
 * `test.use` ("did not expect test.use() to be called here").
 */

export async function replaceBridgeScript(page: Page, code: string): Promise<void> {
  await page.getByRole('button', { name: 'Ponte' }).click()
  await page.getByRole('button', { name: 'script.js' }).first().click()
  const editor = page.locator('.monaco-editor').first()
  await editor.waitFor({ state: 'visible', timeout: 15_000 })
  const input = editor.getByRole('textbox', { name: 'Editor content' })
  await editor.locator('.view-line').first().click()
  // Monaco escolhe o SO pelo user-agent, inclusive no perfil Safari emulado.
  const modifier = await page.evaluate(() =>
    navigator.userAgent.includes('Macintosh') ? 'Meta' : 'Control',
  )
  await page.keyboard.press(`${modifier}+A`)
  await page.keyboard.press('Backspace')
  await expect(input).toHaveValue('')
  // A inserção artificial multilinha altera o texto no Monaco/Firefox; use a
  // mesma colagem nativa dos ensaios de segurança, conferindo o programa inteiro.
  if (page.context().browser()?.browserType().name() === 'webkit') {
    // WebKit Windows aceita a inserção direta original; Meta+V não cola nele.
    await page.keyboard.insertText(code)
  } else {
    await page.evaluate((text) => navigator.clipboard.writeText(text), code)
    await page.keyboard.press(`${modifier}+V`)
  }
  if (page.context().browser()?.browserType().name() !== 'webkit') {
    // Chromium e Firefox podem manter no textarea apenas a janela acessível
    // perto do cursor (inclusive no Chromium Linux da CI).
    // Copiar a seleção pelo teclado lê o programa real, inclusive as linhas fora
    // dessa janela. Limpar antes evita confundir a colagem anterior com a cópia.
    // A cópia vai DENTRO de cada leitura: logo depois da colagem a Ponte ainda
    // sincroniza o código, e uma seleção feita no meio dessa troca copiou só um
    // trecho (Windows da homologação 44854588851). Reler a mesma cópia tirada uma
    // vez conferia um retrato velho; o que se confere é o texto de agora do editor.
    await expect
      .poll(async () => {
        await page.evaluate(() => navigator.clipboard.writeText('conferencia-da-copia'))
        await page.keyboard.press(`${modifier}+A`)
        await page.keyboard.press(`${modifier}+C`)
        return (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n')
      })
      .toBe(code.replace(/\r\n/g, '\n'))
    await page.keyboard.press('ArrowRight')
  } else {
    await expect(input).toHaveValue(code)
  }
}

export async function maiorAtrasoDaPagina(page: Page, ms: number): Promise<number> {
  return page.evaluate(
    (duracao) =>
      new Promise<number>((resolve) => {
        let ultimo = performance.now()
        let maior = 0
        const relogio = setInterval(() => {
          const agora = performance.now()
          maior = Math.max(maior, agora - ultimo)
          ultimo = agora
        }, 50)
        setTimeout(() => {
          clearInterval(relogio)
          resolve(Math.round(maior))
        }, duracao)
      }),
    ms,
  )
}
