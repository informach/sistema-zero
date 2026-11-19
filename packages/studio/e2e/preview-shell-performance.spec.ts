import { writeFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
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

// Timing measurements retain API/source/network tracing without DOM snapshots or
// screencast work on every action. Functional coverage keeps full trace capture.
test.use({
  trace: { mode: 'retain-on-failure', snapshots: false, screenshots: false, sources: true },
})
configurePreviewShellTests()

test.describe('prévia isolada: resposta durante CPU ocupada', () => {
  test.setTimeout(90_000)
  test('trabalho síncrono longo do jogo não trava o editor', async ({
    page,
    browserName,
  }, info) => {
    test.skip(browserName === 'webkit', 'no WebKit nenhum arranjo de iframe isolou (medido)')
    await createProject(page)
    const submittedAt = Date.now()
    await replaceBridgeScript(
      page,
      [
        'document.body.style.background = "rgb(128, 0, 0)"; document.body.style.minHeight = "100vh";',
        'console.log("carga-casca-iniciou");',
        'const dados = Array.from({ length: 300000 }, (_, i) => (i * 7919) % 10007);',
        'const fim = Date.now() + 30000;',
        'function gastar() { if (Date.now() < fim) { dados.slice().sort((a, b) => a - b); gastar(); } }',
        'setTimeout(() => { gastar(); console.log("carga-casca-terminou"); }, 150);',
      ].join('\n'),
    )
    await expect(
      page
        .getByRole('region', { name: 'Problemas e saída do jogo' })
        .getByText('carga-casca-iniciou', { exact: true }),
    ).toBeAttached({ timeout: 15_000 })
    await page.waitForTimeout(1500)
    // A medição precisa ocorrer DURANTE a carga de 30 s, não depois dela.
    const startMs = Date.now() - submittedAt
    expect(startMs).toBeLessThan(10_000)
    const observationStartedAt = Date.now()
    const latencyMs = await maiorAtrasoDaPagina(page, 3000)
    const observationWallMs = Date.now() - observationStartedAt
    const receipt = JSON.stringify({
      browserName,
      startMs,
      observationWallMs,
      latencyMs,
      workMs: 30000,
      observationMs: 3000,
      limitMs: 500,
    })
    const receiptPath = info.outputPath('latencia-do-editor.json')
    await writeFile(receiptPath, receipt)
    await info.attach('latencia-do-editor', {
      contentType: 'application/json',
      path: receiptPath,
    })
    expect(latencyMs, 'atraso do relógio do editor').toBeLessThan(500)
    expect(
      observationWallMs,
      'a chamada de medição não pode ficar presa atrás da carga',
    ).toBeLessThan(5000)
    await expect(
      page
        .getByRole('region', { name: 'Problemas e saída do jogo' })
        .getByText('carga-casca-terminou', { exact: true }),
    ).toHaveCount(0)
    await parar(page).click()
    await expect(rodar(page)).toHaveText(/^\s*Rodar\s*$/, { timeout: 5_000 })
    await replaceBridgeScript(page, CONSERTADO)
    await rodar(page).click()
    await expect.poll(() => previewPixel(page), { timeout: 15_000 }).toEqual([0, 128, 0])
  })
})
