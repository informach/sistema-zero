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

  test('depois de Rodar, as setas chegam ao jogo sem clicar no palco', async ({
    page,
    browserName,
  }) => {
    // Conferência em staging (20/11/2026): o editor focava o quadro da casca, a casca trocava o
    // quadro do jogo e as setas iam para a casca vazia. Sem a casca, a prévia já focava o jogo.
    await createProject(page)
    await replaceBridgeScript(
      page,
      `${CONSERTADO}
document.addEventListener("keydown", (e) => console.log("tecla " + e.key));
addEventListener("focus", () => console.log("jogo com foco"));`,
    )
    await expect.poll(() => previewPixel(page), { timeout: 15_000 }).toEqual([0, 128, 0])
    await parar(page).click()
    await expect(rodar(page)).toHaveText(/^\s*Rodar\s*$/, { timeout: 5_000 })
    await rodar(page).click()
    await expect.poll(() => previewPixel(page), { timeout: 15_000 }).toEqual([0, 128, 0])
    // O editor passa o foco ao quadro da prévia quando o jogo novo carrega; a casca, ao jogo.
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.getAttribute('title')))
      .toBe('Pré-visualização')
    const saida = page.getByRole('region', { name: 'Problemas e saída do jogo' })
    // O jogo novo recebeu o foco (as mensagens recomeçam a cada Rodar: é o jogo deste Rodar). O
    // WebKit avisa o foco mais de uma vez (a casca solta e foca o quadro): basta ter chegado.
    await expect(saida.getByText('jogo com foco', { exact: true }).first()).toBeAttached({
      timeout: 10_000,
    })
    // No Firefox do Playwright (Juggler), com os quadros de outro site em outro processo, a
    // tecla sintética não chega ao quadro de dentro nem depois de um clique no palco (medido em
    // 20/11/2026: o jogo registrou o foco e `document.hasFocus()` verdadeiro, e nenhuma tecla).
    // É o mesmo limite do teste acima (quadros que o ensaio não enxerga). Lá vale o foco, que é
    // o que o Estúdio faz; a tecla é conferida no Chromium e no WebKit.
    if (browserName === 'firefox') return
    await page.keyboard.press('ArrowUp')
    await expect(saida.getByText('tecla ArrowUp', { exact: true })).toBeAttached({
      timeout: 10_000,
    })
  })
})
