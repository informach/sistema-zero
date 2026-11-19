import { expect, type Page, test } from '@playwright/test'

/**
 * A prévia do Clássico dentro da casca em outro site (lote 3.2, 19/11/2026).
 *
 * `?casca=1`: o playground serve a casca na OUTRA origem local (127.0.0.1 ⇄ localhost), com os
 * mesmos cabeçalhos da rota do studio-runtime, e o host já manda COOP/COEP. O jogo roda num
 * `srcdoc` dentro da casca, com o sandbox de sempre.
 *
 * O que se prova aqui: o jogo funciona igual (roda, fala com o console do editor, Parar e Rodar
 * de novo) e, no Firefox, o editor responde enquanto o jogo faz trabalho síncrono pesado. O
 * WebKit fica de fora: nenhum arranjo de iframe o isolou na medição, e a casca não é para ele.
 */

async function createProject(page: Page): Promise<void> {
  await page.goto('/?casca=1')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//, { timeout: 15_000 })
}

/** O mesmo caminho de `preview-executes-user-code.spec.ts`, já provado no Firefox da CI. */
async function replaceBridgeScript(page: Page, code: string): Promise<void> {
  await page.getByRole('button', { name: 'Ponte' }).click()
  await page.getByRole('button', { name: 'script.js' }).first().click()
  const editor = page.locator('.monaco-editor').first()
  await editor.waitFor({ state: 'visible', timeout: 15_000 })
  const input = editor.getByRole('textbox', { name: 'Editor content' })
  await editor.locator('.view-line').first().click()
  await page.keyboard.press('Control+A')
  await page.keyboard.press('Backspace')
  await expect(input).toHaveValue('')
  await page.evaluate((text) => navigator.clipboard.writeText(text), code)
  await page.keyboard.press('Control+V')
  await expect(input).toHaveValue(code)
}

async function maiorAtrasoDaPagina(page: Page, ms: number): Promise<number> {
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

const rodar = (page: Page) => page.locator('[data-live-target="studio-run"]')
const parar = (page: Page) => page.locator('[data-live-target="studio-stop"]')
const casca = (page: Page) => page.locator('iframe[title="Pré-visualização"]')
const corpoDoJogo = (page: Page) =>
  page
    .frameLocator('iframe[title="Pré-visualização"]')
    .frameLocator('iframe[title="Jogo"]')
    .locator('body')

const CONSERTADO = 'document.body.dataset.voltou = "sim";'

test.describe('prévia dentro da casca em outro site', () => {
  test.setTimeout(90_000)

  test('o jogo roda na casca, fala com o console e volta a rodar depois do Parar', async ({
    page,
  }) => {
    await createProject(page)
    await expect(casca(page)).toHaveAttribute('src', /\/v1\/classic-shell\/1\.html$/)
    // A casca é outro site; o jogo dentro dela leva o sandbox de sempre.
    const src = await casca(page).getAttribute('src')
    expect(new URL(src ?? '').host).not.toBe(new URL(page.url()).host)
    await replaceBridgeScript(page, `${CONSERTADO}\nconsole.log("oi da casca");`)
    await expect(corpoDoJogo(page)).toHaveAttribute('data-voltou', 'sim', { timeout: 15_000 })
    await expect(page.getByText('oi da casca').first()).toBeAttached({ timeout: 15_000 })
    const sandbox = await page
      .frameLocator('iframe[title="Pré-visualização"]')
      .locator('iframe[title="Jogo"]')
      .getAttribute('sandbox')
    expect(sandbox).toBe('allow-scripts allow-modals allow-pointer-lock')

    await parar(page).click()
    await expect(rodar(page)).toHaveText(/^\s*Rodar\s*$/, { timeout: 5_000 })
    await rodar(page).click()
    await expect(corpoDoJogo(page)).toHaveAttribute('data-voltou', 'sim', { timeout: 15_000 })
  })

  test('trabalho síncrono longo do jogo não trava o editor', async ({ page }) => {
    await createProject(page)
    await replaceBridgeScript(
      page,
      [
        'const dados = Array.from({ length: 300000 }, (_, i) => (i * 7919) % 10007);',
        'const fim = Date.now() + 30000;',
        'function gastar() { if (Date.now() < fim) { dados.slice().sort((a, b) => a - b); gastar(); } }',
        'gastar();',
      ].join('\n'),
    )
    await page.waitForTimeout(1500)
    expect(await maiorAtrasoDaPagina(page, 3000), 'atraso do relógio do editor').toBeLessThan(500)
    await parar(page).click()
    await expect(rodar(page)).toHaveText(/^\s*Rodar\s*$/, { timeout: 5_000 })
    await replaceBridgeScript(page, CONSERTADO)
    await rodar(page).click()
    await expect(corpoDoJogo(page)).toHaveAttribute('data-voltou', 'sim', { timeout: 15_000 })
  })
})
