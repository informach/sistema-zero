import { expect, test } from '@playwright/test'
import { heroi2d, ilha } from './faisca-helpers'

test.use({ hasTouch: true, isMobile: true })

for (const width of [320, 390]) {
  for (const [curso, bloco] of [
    ['ponte', 'experiencia'],
    ['moedas', 'experiencia'],
    ['simbolos', 'experiencia'],
    ['cabana', 'experiencia'],
    ['ilha', 'experiencia-contato-3d'],
    ['ilha', 'experiencia-pergunta-com-nao'],
  ] as const) {
    test(`${width}px: ${curso} ${bloco} mantém palco e setas visíveis durante o toque`, async ({
      page,
      context,
    }, info) => {
      await page.setViewportSize({ width, height: width === 320 ? 740 : 844 })
      await page.goto(`/?course=${curso}&block=${bloco}&width=900`)
      await expect(page.locator('.sz-discovery-movimento')).toBeVisible()
      if (curso === 'ilha')
        await expect(page.locator('.sz-island-world[data-ready="true"]')).toBeVisible({
          timeout: 30_000,
        })
      const palco = page.locator('.sz-discovery-palco')
      const direita = page.getByRole('button', { name: 'Andar para a direita', exact: true })
      const posicao = async () => {
        if (curso !== 'ilha') return JSON.stringify(await heroi2d(page))
        if (bloco === 'experiencia-pergunta-com-nao') return JSON.stringify(await ilha(page))
        return (await page.locator('.sz-discovery-foto').allTextContents()).join('\n')
      }
      const cdp = await context.newCDPSession(page)
      try {
        for (const ampliada of [false, true]) {
          if (ampliada) await page.getByRole('button', { name: 'Ampliar experiência' }).tap()
          await page.locator('.sz-discovery-movimento').scrollIntoViewIfNeeded()
          await expect(palco).toBeInViewport({ ratio: 1 })
          await expect(direita).toBeInViewport({ ratio: 1 })
          const box = await direita.boundingBox()
          if (!box) throw Error('Seta sem área de toque')
          expect(box.width).toBeGreaterThanOrEqual(44)
          expect(box.height).toBeGreaterThanOrEqual(44)
          const antes = await posicao()
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
          })
          try {
            await expect.poll(posicao).not.toBe(antes)
            await expect(palco).toBeInViewport({ ratio: 1 })
            await expect(direita).toBeInViewport({ ratio: 1 })
          } finally {
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
          }
          await expect(direita).toHaveAttribute('aria-pressed', 'false')
          await page.screenshot({ path: info.outputPath(ampliada ? 'ampliada.png' : 'normal.png') })
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          ).toBe(true)
        }
      } finally {
        await cdp.detach()
      }
    })
  }
}
