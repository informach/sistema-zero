import { mkdir, writeFile } from 'node:fs/promises'
import { expect, type Page, test } from '@playwright/test'
import { maiorAtrasoDaPagina, replaceBridgeScript } from './bridgeEditor'

export { maiorAtrasoDaPagina, replaceBridgeScript }

export function configurePreviewShellTests() {
  // A capacidade de isolamento é homologada no Chromium completo, como a suíte
  // preview-hostile-programs. Firefox/WebKit continuam nos respectivos engines.
  test.use({
    channel: async ({ browserName }, use) => {
      await use(browserName === 'chromium' ? 'chromium' : undefined)
    },
  })

  const browserErrors = new WeakMap<Page, string[]>()
  test.beforeEach(({ page }) => {
    const errors: string[] = []
    browserErrors.set(page, errors)
    page.on('pageerror', (error) => {
      if (errors.length < 20) errors.push(error.message)
    })
    page.on('console', (message) => {
      if (message.type() === 'error' && errors.length < 60) errors.push(message.text())
    })
    page.on('requestfailed', (request) => {
      if (errors.length < 60)
        errors.push(JSON.stringify({ requestFailed: request.url(), reason: request.failure() }))
    })
  })
  test.afterEach(async ({ page }, info) => {
    if (info.status === info.expectedStatus) return
    const frames = await Promise.all(
      page.frames().map(async (frame) => {
        const url = frame.url()
        let timer: ReturnType<typeof setTimeout> | undefined
        try {
          const state = await Promise.race([
            frame
              .evaluate(() => ({
                ready: document.readyState,
                bytes: document.documentElement.outerHTML.length,
                userCode: document.documentElement.outerHTML.includes('dataset.voltou'),
                body: document.body?.innerHTML.slice(0, 1200),
                csp: document
                  .querySelector('meta[http-equiv="Content-Security-Policy"]')
                  ?.getAttribute('content'),
              }))
              .catch(() => null),
            new Promise<null>((resolve) => {
              timer = setTimeout(() => resolve(null), 2000)
            }),
          ])
          return { url, document: state }
        } finally {
          clearTimeout(timer)
        }
      }),
    )
    await mkdir(info.outputDir, { recursive: true })
    const file = info.outputPath('diagnostico-da-casca.json')
    await writeFile(file, JSON.stringify({ errors: browserErrors.get(page), frames }, null, 2))
    await info.attach('diagnostico-da-casca', { path: file, contentType: 'application/json' })
  })
}

/**
 * A prévia do Clássico dentro da casca em outro site (lote 3.2, 19/11/2026).
 *
 * `?casca=1`: o playground serve a casca na OUTRA origem local (127.0.0.1 ⇄ localhost), com os
 * mesmos cabeçalhos da rota do studio-runtime, e o host já manda COOP/COEP. O jogo roda num
 * `srcdoc` dentro da casca, com o sandbox de sempre.
 *
 * O que se prova aqui: o jogo funciona igual (roda, fala com o console do editor, Parar e Rodar
 * de novo) e, no Firefox, o editor responde enquanto o jogo faz trabalho síncrono pesado. No
 * WebKit nenhum arranjo de iframe isolou na medição: lá só o funcionamento é conferido.
 */

/**
 * `segurarAutosave`: o salvamento automático do playground fica segurado (`?autosave-ms=`), e só
 * o Salvar explícito grava. É o que deixa "salvar durante o pior" provar alguma coisa.
 */
export async function createProject(
  page: Page,
  opcoes: { segurarAutosave?: boolean } = {},
): Promise<void> {
  await page.goto(opcoes.segurarAutosave ? '/?casca=1&autosave-ms=600000' : '/?casca=1')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//, { timeout: 15_000 })
  await page.getByRole('tab', { name: /^Mensagens do jogo/ }).click()
}

export const rodar = (page: Page) => page.locator('[data-live-target="studio-run"]')
export const parar = (page: Page) => page.locator('[data-live-target="studio-stop"]')
export const casca = (page: Page) => page.locator('iframe[title="Pré-visualização"]')
export const corpoDoJogo = (page: Page) =>
  page
    .frameLocator('iframe[title="Pré-visualização"]')
    .frameLocator('iframe[title="Jogo"]')
    .locator('body')

export const CONSERTADO =
  'document.body.dataset.voltou = "sim"; document.body.style.background = "rgb(0, 128, 0)"; document.body.style.minHeight = "100vh";'

export async function previewPixel(page: Page): Promise<number[]> {
  const box = await casca(page).boundingBox()
  if (!box) return []
  const png = await page.screenshot({
    clip: { x: box.x + box.width * 0.75, y: box.y + box.height * 0.75, width: 1, height: 1 },
  })
  return page.evaluate(
    async (data) => {
      const image = new Image()
      image.src = data
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 1
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(image, 0, 0)
      return Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3)
    },
    `data:image/png;base64,${png.toString('base64')}`,
  )
}
