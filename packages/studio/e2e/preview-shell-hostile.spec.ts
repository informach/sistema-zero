import { expect, type Page, test } from '@playwright/test'
import {
  CONSERTADO,
  configurePreviewShellTests,
  createProject,
  maiorAtrasoDaPagina,
  parar,
  previewPixel,
  replaceBridgeScript,
  rodar,
} from './helpers/previewShell'

/**
 * Os programas hostis com a prévia dentro da casca em outro site (etapa 4 da missão do Estúdio).
 *
 * O mesmo pedido da `preview-hostile-programs.spec.ts`, que roda o jogo no `srcdoc` direto e só
 * vale no Chromium: enquanto o jogo faz o pior, o relógio do editor não atrasa, o Parar para, e o
 * código consertado volta a rodar. Com a casca o pedido vale também no Firefox, desde que o Firefox
 * isole por site como o de mesa (o projeto `firefox` do `playwright.config.ts` devolve essa
 * preferência; medição em `docs/qa/2026-11-20-studio-firefox-site-isolation.md`).
 *
 * O conserto é conferido pelo pixel da prévia (verde), não pelo DOM do jogo: no Firefox o Juggler
 * não lê frames de outro processo.
 */

configurePreviewShellTests()

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
  await expect.poll(() => previewPixel(page), { timeout: 15_000 }).toEqual([0, 128, 0])
}

test.describe('programas hostis na prévia dentro da casca', () => {
  test.setTimeout(120_000)
  test.skip(
    ({ browserName }) => browserName === 'webkit',
    'no WebKit nenhum arranjo de iframe isolou (medido em 18/11); segue o estudo B4',
  )

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
