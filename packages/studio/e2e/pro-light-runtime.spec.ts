import { expect, type Page, test } from '@playwright/test'
import type { PreviewServer } from 'vite'
import { startWorkspaceFixture, stopWorkspaceFixture } from './helpers/workspaceFixture'

/**
 * Execução leve do Pro (etapa 3 do plano): o projeto que o navegador monta igual ao Vite roda sem
 * chamar o compilador do servidor, num quadro com a mesma política do documento hospedado. Os
 * módulos viram blobs ligados por um mapa de importação criado no topo da página: o arranjo que
 * depende de cada motor (blob de módulo e mapa de importação inserido por script, num quadro de
 * origem opaca), por isso este spec roda no Chromium, no Firefox e no WebKit.
 */

let server: PreviewServer
test.beforeAll(async () => {
  test.setTimeout(180_000)
  server = await startWorkspaceFixture()
})
test.afterAll(async () => {
  await stopWorkspaceFixture(server)
})

async function open(page: Page, query: string) {
  const address = server.httpServer.address()
  if (!address || typeof address === 'string') throw new Error('Servidor indisponível')
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`http://127.0.0.1:${address.port}/?${query}`)
  return {
    errors,
    hostedBuilds: () =>
      page.evaluate(() => Number(document.documentElement.dataset.hostedBuilds ?? '0')),
    preview: page.frameLocator('iframe[title="Pré-visualização do projeto Pro"]'),
  }
}

test('monta no navegador com ES modules de verdade, sem chamar o servidor', async ({ page }) => {
  const { errors, hostedBuilds, preview } = await open(page, 'light')
  const saida = preview.locator('#saida')
  await expect(saida).toHaveText(
    JSON.stringify({
      pontos: 2,
      lidos: 2,
      ciclo: 'ida-volta',
      espera: 7,
      fases: 3,
      primeira: 'floresta',
    }),
    { timeout: 30_000 },
  )
  // O CSS importado pelo código vem depois da folha do index.html, como no Vite.
  await expect(saida).toHaveAttribute('data-cor', 'rgb(4, 5, 6)')
  // A política do documento é a do servidor: nada de rede.
  expect(
    await preview.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content'),
  ).toContain("connect-src 'none'")
  expect(await hostedBuilds()).toBe(0)
  expect(errors).toEqual([])
})

test('o projeto com biblioteca continua indo ao servidor', async ({ page }) => {
  const { hostedBuilds, preview } = await open(page, 'light&bare')
  await expect(preview.getByText(/Sessão \d+/)).toBeVisible({ timeout: 30_000 })
  expect(await hostedBuilds()).toBe(1)
})
