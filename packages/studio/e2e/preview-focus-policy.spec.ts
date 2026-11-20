import { expect, test } from '@playwright/test'
import { CONSERTADO, createProject, replaceBridgeScript } from './helpers/previewShell'

for (const shell of [false, true]) {
  test(`o jogo recebe foco sem ativação e devolve o teclado à Ponte (${shell ? 'casca' : 'direto'})`, async ({
    page,
    browserName,
  }) => {
    // This regression concerns Chromium's new Permissions Policy. The native Firefox
    // focus chain and WebKit are covered by preview-shell.spec.ts.
    test.skip(browserName !== 'chromium')
    const errors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    page.on('pageerror', (error) => errors.push(error.message))
    if (shell) await createProject(page)
    else {
      await page.goto('/')
      await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
      await page.getByRole('button', { name: 'Criar e abrir' }).click()
      await expect(page).toHaveURL(/\/editor\//)
      await page.getByRole('tab', { name: /^Mensagens do jogo/ }).click()
    }
    await replaceBridgeScript(
      page,
      `${CONSERTADO}
const campo = document.createElement('input');
campo.id = 'controle-do-jogo';
document.body.append(campo);
addEventListener('message', e => {
  if (e.data?.qaFocus !== true) return;
  setTimeout(() => {
    campo.focus();
    console.log('controle focado ' + (document.activeElement === campo));
  }, 0);
});
campo.addEventListener('keydown', e => console.log('controle tecla ' + e.key + ' ' + e.isTrusted));
console.log('controle pronto');`,
    )
    const messages = page.getByRole('region', { name: 'Problemas e saída do jogo' })
    await expect(messages.getByText('controle pronto', { exact: true })).toBeAttached()
    const editor = page.locator('.monaco-editor').first()
    const input = editor.getByRole('textbox', { name: 'Editor content' })
    await editor.locator('.view-line').last().click()
    await expect(input).toBeFocused()
    // Neither the game nor its shell is focused; no click/activation is delivered to it.
    await page.locator('iframe[title="Pré-visualização"]').evaluate((frame) => {
      ;(frame as HTMLIFrameElement).contentWindow?.postMessage({ qaFocus: true }, '*')
    })
    await expect(messages.getByText('controle focado true', { exact: true })).toBeAttached()
    await page.keyboard.press('ArrowUp')
    await expect(messages.getByText('controle tecla ArrowUp true', { exact: true })).toBeAttached()
    // Delegation leaves editing and the existing sandbox intact.
    await editor.locator('.view-line').last().click()
    await expect(input).toBeFocused()
    await expect(page.locator('iframe[title="Pré-visualização"]')).toHaveAttribute(
      'allow',
      'fullscreen; focus-without-user-activation',
    )
    const game = shell
      ? page.frameLocator('iframe[title="Pré-visualização"]').locator('iframe[title="Jogo"]')
      : page.locator('iframe[title="Pré-visualização"]')
    await expect(game).toHaveAttribute('sandbox', 'allow-scripts allow-modals allow-pointer-lock')
    if (shell)
      await expect(game).toHaveAttribute('allow', 'fullscreen; focus-without-user-activation')
    expect(errors).toEqual([])
  })
}
