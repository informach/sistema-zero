import { expect, type Page, test } from '@playwright/test'

/**
 * Programas hostis na prévia do Clássico (pacote B da evolução do Estúdio).
 *
 * O que se exige do EDITOR enquanto o jogo da criança faz o pior: a página continua respondendo
 * (o relógio dela não atrasa), o Parar funciona, e depois de consertar o código o jogo volta a
 * rodar. Não se exige que o programa hostil "funcione".
 *
 * Só Chromium por enquanto: a medição de `scripts/measure-preview-isolation.mjs` mostrou que ali
 * o iframe `srcdoc` com sandbox já roda em outro processo. Firefox e WebKit não foram medidos.
 */

async function createProject(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//, { timeout: 15_000 })
}

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

/** O maior intervalo entre dois batimentos de 50 ms da página do editor, em `ms` de observação. */
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
const corpoDoJogo = (page: Page) =>
  page.frameLocator('iframe[title="Pré-visualização"]').locator('body')

const CONSERTADO = 'document.body.dataset.voltou = "sim";'

/** Com o programa hostil rodando: a página responde, o Parar para, e o conserto volta a rodar. */
async function editorSobrevive(page: Page, limiteDeAtrasoMs = 500): Promise<void> {
  // A prévia recarrega um instante depois de o código mudar; o pior já começou quando se mede.
  await page.waitForTimeout(1500)
  expect(await maiorAtrasoDaPagina(page, 3000), 'atraso do relógio do editor').toBeLessThan(
    limiteDeAtrasoMs,
  )
  await expect(parar(page)).toBeEnabled()
  await parar(page).click()
  await expect(rodar(page)).toHaveText(/^\s*Rodar\s*$/, { timeout: 5_000 })
  expect(await maiorAtrasoDaPagina(page, 1000), 'atraso depois de parar').toBeLessThan(
    limiteDeAtrasoMs,
  )

  await replaceBridgeScript(page, CONSERTADO)
  await rodar(page).click()
  await expect(corpoDoJogo(page)).toHaveAttribute('data-voltou', 'sim', { timeout: 15_000 })
}

test.describe('programas hostis na prévia', () => {
  test.setTimeout(90_000)
  test.skip(({ browserName }) => browserName !== 'chromium', 'medido só no Chromium')

  test('trabalho síncrono longo que não é laço não trava o editor', async ({ page }) => {
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
    await editorSobrevive(page)
  })

  test('recursão sem fim vira erro do jogo, não do editor', async ({ page }) => {
    await createProject(page)
    await replaceBridgeScript(page, 'function cair(n) { return cair(n + 1) + 1; }\ncair(0);')
    await editorSobrevive(page)
  })

  test('enxurrada de mensagens não trava o editor', async ({ page }) => {
    await createProject(page)
    await replaceBridgeScript(
      page,
      'setInterval(() => { for (let i = 0; i < 2000; i++) console.log("mensagem " + i); }, 0);',
    )
    await editorSobrevive(page, 1000)
  })

  test('memória crescendo sem parar não derruba o editor', async ({ page }) => {
    await createProject(page)
    await replaceBridgeScript(
      page,
      'const tudo = [];\nsetInterval(() => { tudo.push(new Array(500000).fill(Math.random())); }, 5);',
    )
    await editorSobrevive(page, 1000)
  })
})
