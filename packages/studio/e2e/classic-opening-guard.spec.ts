import { expect, test } from '@playwright/test'

/**
 * A espera pela fonte na abertura do Clássico (revisão completa da missão, Clássico item 2).
 *
 * Entre agendar a carga dos blocos e o `workspaces.load`, a abertura espera a fonte dos blocos
 * por até 1,5 s (`waitForOpeningFonts`). A camada "carregando" deixava o clique passar: um bloco
 * arrastado para o canvas ainda vazio virava edição, a carga pendente era descartada e o
 * autosave gravava só aquele bloco. Agora a camada segura o canvas durante a espera e nada feito
 * nele conta como edição.
 *
 * A fonte dos blocos aqui nunca termina de carregar, então a abertura fica na espera máxima.
 */
test('a espera pela fonte segura o canvas e os blocos salvos chegam inteiros', async ({ page }) => {
  await page.addInitScript(() => {
    const fonts = document.fonts
    Object.defineProperty(fonts, 'load', {
      configurable: true,
      value: () => {
        ;(window as unknown as { __szFonteEsperando?: boolean }).__szFonteEsperando = true
        return new Promise(() => {})
      },
    })
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/aula?aula=desafio-primeiro-jogo/desafio-dia-1')
  // A carga dos blocos pediu a fonte: estamos dentro da espera, antes do `load`.
  await page.waitForFunction(
    () => (window as unknown as { __szFonteEsperando?: boolean }).__szFonteEsperando === true,
    undefined,
    { timeout: 60_000 },
  )
  const alvo = await page.evaluate(() => {
    const canvas = document.querySelector('svg.blocklySvg')
    const camada = document.querySelector('[data-sz-blocks-loading]')
    if (!canvas) return 'sem canvas'
    if (!camada) return 'sem camada'
    const caixa = canvas.getBoundingClientRect()
    const ponto = document.elementFromPoint(
      caixa.left + caixa.width / 2,
      caixa.top + caixa.height / 2,
    )
    return ponto && camada.contains(ponto) ? 'camada' : (ponto?.tagName ?? 'nada')
  })
  expect(alvo).toBe('camada')
  // Passada a espera máxima, os blocos salvos da aula chegam ao canvas e a camada sai.
  await expect(page.locator('[data-sz-blocks-loading]')).toHaveCount(0, { timeout: 30_000 })
  const blocos = page.locator('svg.blocklySvg .blocklyBlockCanvas .blocklyDraggable')
  await expect(blocos.first()).toBeVisible()
  expect(await blocos.count()).toBeGreaterThan(10)
})
