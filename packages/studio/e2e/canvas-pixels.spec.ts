import { expect, test } from '@playwright/test'
import { hasCompositedCanvasPixels } from './helpers/canvasPixels'

test('reconhece o quadro WebGL composto depois de o back buffer ser descartado', async ({
  page,
}) => {
  await page.setContent(
    '<body style="background:red"><iframe style="background:blue;width:320px;height:200px;border:0"></iframe></body>',
  )
  const frame = page.locator('iframe')
  await frame.evaluate((element) => {
    element.srcdoc =
      '<body style="margin:0;background:green"><canvas width="320" height="200" style="background:orange"></canvas>'
  })
  const canvas = page.frameLocator('iframe').locator('canvas')
  await canvas.evaluate((element) => {
    const gl = (element as HTMLCanvasElement).getContext('webgl', { preserveDrawingBuffer: false })
    if (!gl) throw new Error('WebGL indisponível')
    gl.clearColor(0.2, 0.7, 0.9, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
  })
  // Sem novos desenhos: esperar o descarte prova que o teste não depende da ordem dos callbacks RAF.
  await expect
    .poll(() =>
      canvas.evaluate((element) => {
        const gl = (element as HTMLCanvasElement).getContext('webgl')
        if (!gl) throw new Error('WebGL indisponível')
        const pixel = new Uint8Array(4)
        gl.readPixels(5, 5, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
        return [...pixel]
      }),
    )
    .toEqual([0, 0, 0, 0])
  expect(await hasCompositedCanvasPixels(page, canvas)).toBe(true)

  // O canvas vazio, mesmo com fundos coloridos e sombra, precisa continuar sendo rejeitado.
  await frame.evaluate((element) => {
    element.srcdoc =
      '<body style="margin:0;background:green"><div style="background:purple"><canvas width="320" height="200" style="background:orange;border:2px solid red;box-shadow:0 0 10px blue"></canvas></div>'
  })
  await canvas.evaluate((element) => {
    if (!(element as HTMLCanvasElement).getContext('webgl')) throw new Error('WebGL indisponível')
  })
  expect(await hasCompositedCanvasPixels(page, canvas)).toBe(false)
})
