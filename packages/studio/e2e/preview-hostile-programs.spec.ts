import { expect, type Page, test } from '@playwright/test'
import { maiorAtrasoDaPagina, replaceBridgeScript } from './helpers/bridgeEditor'
import { applyCpuThrottle } from './helpers/cpuThrottle'
import {
  abrirMensagensDoJogo,
  instalarJogo2D,
  PROGRAMAS_HOSTIS,
  salvarDuranteOPior,
} from './helpers/hostilePrograms'

// A homologação de isolamento usa o Chromium completo, como measure-preview-isolation.mjs.
// O headless shell padrão tem outro modelo de processos e não representa essa capacidade.
test.use({ channel: 'chromium' })

/**
 * Programas hostis na prévia do Clássico (pacote B da evolução do Estúdio).
 *
 * O que se exige do EDITOR enquanto o jogo da criança faz o pior: a página continua respondendo
 * (o relógio dela não atrasa), o projeto ainda salva, o Parar funciona, e depois de consertar o
 * código o jogo volta a rodar. Não se exige que o programa hostil "funcione". Os programas são os
 * da seção 5 da missão, em `helpers/hostilePrograms.ts`.
 *
 * Só Chromium por enquanto: a medição de `scripts/measure-preview-isolation.mjs` mostrou que ali
 * o iframe `srcdoc` com sandbox mantém o editor responsivo ali. Firefox/WebKit foram medidos
 * no experimento mínimo e ainda apresentam limitações; esta suíte não os homologa.
 */

async function createProject(
  page: Page,
  opcoes: { segurarAutosave?: boolean } = {},
): Promise<void> {
  // `segurarAutosave`: só o Salvar explícito grava (ver `salvarDuranteOPior`).
  await page.goto(opcoes.segurarAutosave ? '/?autosave-ms=600000' : '/')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//, { timeout: 15_000 })
}

// O ajudante de colar confere o programa INTEIRO pela área de transferência: o campo do Monaco
// guarda só o trecho perto do cursor, e um programa longo (a física) não cabia na conferência.
const rodar = (page: Page) => page.locator('[data-live-target="studio-run"]')
const parar = (page: Page) => page.locator('[data-live-target="studio-stop"]')
const corpoDoJogo = (page: Page) =>
  page.frameLocator('iframe[title="Pré-visualização"]').locator('body')

const CONSERTADO = 'document.body.dataset.voltou = "sim";'
const palco = (page: Page) => page.locator('#bridge-preview')

/**
 * Com o programa hostil rodando: a página responde, salva o projeto, o Parar para, e o conserto
 * volta a rodar.
 */
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
  await expect(corpoDoJogo(page)).toHaveAttribute('data-voltou', 'sim', { timeout: 15_000 })
}

test.describe('programas hostis na prévia', () => {
  test.setTimeout(90_000)
  test.skip(({ browserName }) => browserName !== 'chromium', 'medido só no Chromium')
  // Aparelho modesto emulado (frente 5): sem `STUDIO_CPU_THROTTLE`, nada muda.
  test.beforeEach(async ({ page, browserName }) => {
    await applyCpuThrottle(page, browserName)
  })

  test('trabalho síncrono longo que não é laço não trava o editor', async ({ page }) => {
    await createProject(page, { segurarAutosave: true })
    await replaceBridgeScript(page, PROGRAMAS_HOSTIS.trabalhoSincrono)
    await editorSobrevive(page)
  })

  test('laço infinito: a guarda corta e avisa nas mensagens do jogo', async ({ page }) => {
    await createProject(page, { segurarAutosave: true })
    await replaceBridgeScript(page, PROGRAMAS_HOSTIS.laco)
    await editorSobrevive(page, 500, async () => {
      await abrirMensagensDoJogo(page)
      await expect(page.getByText(/O código ficou preso em um laço/).first()).toBeVisible({
        timeout: 10_000,
      })
    })
  })

  test('recursão sem fim vira erro do jogo, não do editor', async ({ page }) => {
    await createProject(page, { segurarAutosave: true })
    await replaceBridgeScript(page, PROGRAMAS_HOSTIS.recursao)
    await expect(palco(page).getByText('Opa, a página parou')).toBeVisible({ timeout: 15_000 })
    await editorSobrevive(page)
  })

  test('enxurrada de mensagens não trava o editor', async ({ page }) => {
    await createProject(page, { segurarAutosave: true })
    await replaceBridgeScript(page, PROGRAMAS_HOSTIS.enxurradaDeMensagens)
    await editorSobrevive(page, 1000)
  })

  test('enxurrada de eventos e de mensagens forjadas não trava o editor', async ({ page }) => {
    await createProject(page, { segurarAutosave: true })
    await replaceBridgeScript(page, PROGRAMAS_HOSTIS.eventos)
    await editorSobrevive(page, 1000)
  })

  test('renderização pesada a cada quadro não trava o editor', async ({ page }) => {
    await createProject(page, { segurarAutosave: true })
    await replaceBridgeScript(page, PROGRAMAS_HOSTIS.renderizacao)
    await editorSobrevive(page)
  })

  test('erro de compilação é do jogo, com o lugar, e o conserto roda', async ({ page }) => {
    await createProject(page, { segurarAutosave: true })
    await replaceBridgeScript(page, PROGRAMAS_HOSTIS.compilacao)
    await expect(palco(page).getByText('Opa, a página parou')).toBeVisible({ timeout: 15_000 })
    await editorSobrevive(page)
  })

  test('erros de física no motor do Jogo 2D: o editor segue e aponta o bloco', async ({ page }) => {
    await createProject(page, { segurarAutosave: true })
    await instalarJogo2D(page)
    await replaceBridgeScript(page, PROGRAMAS_HOSTIS.fisica)
    await expect(palco(page).getByText('Opa, o jogo parou')).toBeVisible({ timeout: 15_000 })
    await palco(page).getByText('O que o computador disse').click()
    await expect(palco(page).getByText(/parei o bloco “Quando encostar”/)).toBeVisible()
    await editorSobrevive(page)
  })

  // Em navegador que não isola a prévia, a aba congela junto com o jogo, e o projeto travaria de
  // novo a cada abertura. Aqui a marca que uma aba congelada deixa é posta à mão.
  test('depois de uma execução interrompida, a prévia espera o Rodar', async ({ page }) => {
    await createProject(page)
    await replaceBridgeScript(page, CONSERTADO)
    await expect(corpoDoJogo(page)).toHaveAttribute('data-voltou', 'sim', { timeout: 15_000 })
    await expect(page.getByText('Salvo', { exact: true })).toBeVisible({ timeout: 15_000 })
    const id = decodeURIComponent(new URL(page.url()).pathname.replace('/editor/', ''))
    const chave = `sz:run-tripwire:${id}`
    // Mesmo depois dos primeiros batimentos, um travamento tardio precisa deixar a marca (a da
    // aba, `<chave>#<aba>`, renovada enquanto o jogo roda).
    await page.waitForTimeout(3500)
    expect(
      await page.evaluate(
        (k) => Object.keys(window.localStorage).filter((key) => key.startsWith(`${k}#`)).length,
        chave,
      ),
    ).toBe(1)

    // Recarregar com a página viva não deixa marca: a prévia roda sozinha, como sempre.
    await page.reload()
    await expect(corpoDoJogo(page)).toHaveAttribute('data-voltou', 'sim', { timeout: 20_000 })

    // A marca de uma aba que congelou (aqui no formato sem dono, que conta como parada): na
    // abertura seguinte a prévia fica parada.
    await page.evaluate((k) => window.localStorage.setItem(k, String(Date.now())), chave)
    await page.addInitScript((k) => {
      if (!window.sessionStorage.getItem('marca-posta')) {
        window.sessionStorage.setItem('marca-posta', '1')
        window.localStorage.setItem(k, String(Date.now()))
      }
    }, chave)
    await page.reload()
    await expect(rodar(page)).toHaveText(/^\s*Rodar\s*$/, { timeout: 20_000 })
    await page.waitForTimeout(1500)
    await expect(corpoDoJogo(page)).not.toHaveAttribute('data-voltou', 'sim')

    await rodar(page).click()
    await expect(corpoDoJogo(page)).toHaveAttribute('data-voltou', 'sim', { timeout: 15_000 })
  })

  test('memória crescendo sem parar não derruba o editor', async ({ page }) => {
    await createProject(page, { segurarAutosave: true })
    await replaceBridgeScript(page, PROGRAMAS_HOSTIS.memoria)
    await editorSobrevive(page, 1000)
  })
})
