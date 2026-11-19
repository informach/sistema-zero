import { expect, test } from '@playwright/test'
import {
  CONSERTADO,
  casca,
  configurePreviewShellTests,
  corpoDoJogo,
  createProject,
  parar,
  previewPixel,
  replaceBridgeScript,
  rodar,
} from './helpers/previewShell'

configurePreviewShellTests()

test.describe('prévia dentro da casca em outro site', () => {
  test.setTimeout(90_000)

  test('o jogo roda na casca, fala com o console e volta a rodar depois do Parar', async ({
    page,
    browserName,
  }) => {
    await createProject(page)
    await expect(casca(page)).toHaveAttribute('src', /\/v1\/classic-shell\/1\.html$/)
    // A casca é outro site; o jogo dentro dela leva o sandbox de sempre.
    const src = await casca(page).getAttribute('src')
    expect(new URL(src ?? '').host).not.toBe(new URL(page.url()).host)
    await replaceBridgeScript(page, `${CONSERTADO}\nconsole.log("oi da casca");`)
    await expect.poll(() => previewPixel(page), { timeout: 15_000 }).toEqual([0, 128, 0])
    await expect(
      page
        .getByRole('region', { name: 'Problemas e saída do jogo' })
        .getByText('oi da casca', { exact: true }),
    ).toBeAttached({ timeout: 15_000 })
    // O Juggler/Firefox deste ensaio devolve frames vazios mesmo com os pixels
    // do jogo na tela. O render e a comunicação acima não dependem dessa inspeção.
    const response = await page.request.get(src!)
    expect(response.status()).toBe(200)
    expect(await response.text()).toContain(
      `frame.setAttribute('sandbox', "allow-scripts allow-modals allow-pointer-lock")`,
    )
    if (browserName !== 'firefox') {
      await expect(corpoDoJogo(page)).toHaveAttribute('data-voltou', 'sim')
      const sandbox = await page
        .frameLocator('iframe[title="Pré-visualização"]')
        .locator('iframe[title="Jogo"]')
        .getAttribute('sandbox')
      expect(sandbox).toBe('allow-scripts allow-modals allow-pointer-lock')
    }

    await parar(page).click()
    await expect(rodar(page)).toHaveText(/^\s*Rodar\s*$/, { timeout: 5_000 })
    await expect.poll(() => previewPixel(page)).toEqual([255, 255, 255])
    await rodar(page).click()
    await expect.poll(() => previewPixel(page), { timeout: 15_000 }).toEqual([0, 128, 0])
  })
})
