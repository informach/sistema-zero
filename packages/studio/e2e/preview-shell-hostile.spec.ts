import { expect, type Page, test } from '@playwright/test'
import {
  abrirMensagensDoJogo,
  instalarJogo2D,
  PROGRAMAS_HOSTIS,
  salvarDuranteOPior,
} from './helpers/hostilePrograms'
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
 * vale no Chromium: enquanto o jogo faz o pior, o relógio do editor não atrasa, o projeto ainda
 * salva, o Parar para, e o código consertado volta a rodar. Com a casca o pedido vale também no
 * Firefox, desde que o Firefox isole por site como o de mesa (o projeto `firefox` do
 * `playwright.config.ts` devolve essa preferência; medição em
 * `docs/qa/2026-11-20-studio-firefox-site-isolation.md`).
 *
 * O conserto é conferido pelo pixel da prévia (verde), não pelo DOM do jogo: no Firefox o Juggler
 * não lê frames de outro processo. Os cartões de erro e as mensagens são do editor, então valem
 * nos dois.
 */

configurePreviewShellTests()

const palco = (page: Page) => page.locator('#bridge-preview')

async function editorSobrevive(
  page: Page,
  limiteDeAtrasoMs = 500,
  /** Conferência do programa hostil, feita antes do Parar (o conserto limpa as mensagens). */
  antesDeParar?: () => Promise<void>,
): Promise<void> {
  // A prévia recarrega um instante depois de o código mudar; o pior já começou quando se mede.
  await page.waitForTimeout(1500)
  expect(await maiorAtrasoDaPagina(page, 3000), 'atraso do relógio do editor').toBeLessThan(
    limiteDeAtrasoMs,
  )
  await salvarDuranteOPior(page)
  await antesDeParar?.()
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
    await replaceBridgeScript(page, PROGRAMAS_HOSTIS.trabalhoSincrono)
    await editorSobrevive(page)
  })

  test('laço infinito: a guarda corta e avisa nas mensagens do jogo', async ({ page }) => {
    await createProject(page)
    await replaceBridgeScript(page, PROGRAMAS_HOSTIS.laco)
    await editorSobrevive(page, 500, async () => {
      await abrirMensagensDoJogo(page)
      await expect(page.getByText(/O código ficou preso em um laço/).first()).toBeVisible({
        timeout: 10_000,
      })
    })
  })

  test('recursão sem fim vira erro do jogo, não do editor', async ({ page }) => {
    await createProject(page)
    await replaceBridgeScript(page, PROGRAMAS_HOSTIS.recursao)
    await expect(palco(page).getByText('Opa, a página parou')).toBeVisible({ timeout: 15_000 })
    await editorSobrevive(page)
  })

  test('enxurrada de mensagens não trava o editor', async ({ page }) => {
    await createProject(page)
    await replaceBridgeScript(page, PROGRAMAS_HOSTIS.enxurradaDeMensagens)
    await editorSobrevive(page, 1000)
  })

  test('enxurrada de eventos e de mensagens forjadas não trava o editor', async ({ page }) => {
    await createProject(page)
    await replaceBridgeScript(page, PROGRAMAS_HOSTIS.eventos)
    await editorSobrevive(page, 1000)
  })

  test('renderização pesada a cada quadro não trava o editor', async ({ page }) => {
    await createProject(page)
    await replaceBridgeScript(page, PROGRAMAS_HOSTIS.renderizacao)
    await editorSobrevive(page)
  })

  test('erro de compilação é do jogo, com o lugar, e o conserto roda', async ({ page }) => {
    await createProject(page)
    await replaceBridgeScript(page, PROGRAMAS_HOSTIS.compilacao)
    await expect(palco(page).getByText('Opa, a página parou')).toBeVisible({ timeout: 15_000 })
    await editorSobrevive(page)
  })

  test('erros de física no motor do Jogo 2D: o editor segue e aponta o bloco', async ({ page }) => {
    await createProject(page)
    await instalarJogo2D(page)
    await replaceBridgeScript(page, PROGRAMAS_HOSTIS.fisica)
    await expect(palco(page).getByText('Opa, o jogo parou')).toBeVisible({ timeout: 15_000 })
    await palco(page).getByText('O que o computador disse').click()
    await expect(palco(page).getByText(/parei o bloco “Quando encostar”/)).toBeVisible()
    await editorSobrevive(page)
  })

  test('memória crescendo sem parar não derruba o editor', async ({ page }) => {
    await createProject(page)
    await replaceBridgeScript(page, PROGRAMAS_HOSTIS.memoria)
    await editorSobrevive(page, 1000)
  })
})
