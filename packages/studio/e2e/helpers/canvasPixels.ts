import type { Locator, Page } from '@playwright/test'

/** O compositor conserva o quadro WebGL mesmo quando o navegador já descartou o back buffer. */
export async function hasCompositedCanvasPixels(page: Page, canvas: Locator): Promise<boolean> {
  const png = await canvas.screenshot({
    omitBackground: true,
    // Fundo CSS, borda e sombra não provam que o programa desenhou. O estilo temporário também
    // alcança os ancestrais e os iframes, para que o fundo do editor não apareça através do canvas.
    style:
      '* { background: transparent !important; background-image: none !important; box-shadow: none !important; } canvas { border: none !important; outline: none !important; }',
  })
  return page.evaluate(
    async (src) => {
      const image = new Image()
      image.src = src
      await image.decode()
      const copy = document.createElement('canvas')
      copy.width = image.width
      copy.height = image.height
      const context = copy.getContext('2d')
      if (!context) return false
      context.drawImage(image, 0, 0)
      const pixels = context.getImageData(0, 0, copy.width, copy.height).data
      return pixels.some((value, index) => index % 4 === 3 && value > 0)
    },
    `data:image/png;base64,${png.toString('base64')}`,
  )
}
