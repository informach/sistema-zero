import { expect, test } from '@playwright/test'
import { createEmptyProject } from '../src/core/project'
import { buildClassicFileMap } from '../src/export/fileMap'
import { defaultMinifiers } from '../src/export/minify'
import { generateProjectFiles } from '../src/generators/project'
import { gameTwoDRecipes } from '../src/official-extensions/game-2d/recipes.generated'
import { advancedRecipeExamples } from '../src/official-extensions/game-2d-advanced/examples/recipes/generated'

test.use({ serviceWorkers: 'block' })

const cases = [
  { id: 'game-2d', version: '2.1.0', name: 'Meu personagem do Pinta', key: 'ArrowRight' },
  { id: 'game-2d-advanced', version: '0.64.0', name: 'Oficina de animações e som', key: 'l' },
] as const

for (const sample of cases) {
  test(`${sample.id}: receita com arte do Pinta funciona no site exportado e minificado`, async ({
    page,
  }, info) => {
    const example = [...gameTwoDRecipes, ...advancedRecipeExamples].find(
      (entry) => entry.name === sample.name,
    )
    if (!example) throw new Error(`Receita ausente: ${sample.name}`)
    const project = {
      ...createEmptyProject(`export-${sample.id}`, sample.name),
      ir: example.ir,
      assets: example.assets,
      files: generateProjectFiles({ ir: example.ir, projectName: sample.name }),
      installedExtensions: [{ id: sample.id, version: sample.version, installedAt: 0 }],
    }
    // Exercise the actual ZIP composition and minifiers, outside the preview host.
    const { files, warnings } = await buildClassicFileMap(project, await defaultMinifiers())
    expect(warnings).toEqual([])
    const diagnostics: string[] = []
    page.on('pageerror', (error) => diagnostics.push(error.message))
    page.on('console', (message) => {
      if (
        ['warning', 'error'].includes(message.type()) &&
        !message.text().includes('Service Worker registration blocked by Playwright')
      ) {
        diagnostics.push(`${message.text()} (${message.location().url})`)
      }
    })
    await page.route('https://receita-exportada.test/**', async (route) => {
      const path = new URL(route.request().url()).pathname.slice(1) || 'index.html'
      const body = files[`public/${path}`]
      if (body === undefined) {
        diagnostics.push(`Arquivo ausente no pacote: ${path}`)
        return route.fulfill({ status: 404, body: path })
      }
      const extension = path.split('.').pop() ?? ''
      const types: Record<string, string> = {
        html: 'text/html',
        js: 'text/javascript',
        css: 'text/css',
        json: 'application/json',
        webmanifest: 'application/manifest+json',
        svg: 'image/svg+xml',
        png: 'image/png',
        wav: 'audio/wav',
      }
      await route.fulfill({
        contentType: types[extension] ?? 'application/octet-stream',
        body: typeof body === 'string' ? body : Buffer.from(body),
      })
    })
    await page.goto('https://receita-exportada.test/index.html')
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible()
    if (sample.id === 'game-2d-advanced') {
      await page.getByRole('button', { name: 'Experimentar', exact: true }).click()
    }
    await expect
      .poll(() =>
        canvas.evaluate((node) => {
          const image = (node as HTMLCanvasElement).getContext('2d')?.getImageData(0, 0, 100, 100)
          return image?.data.some((value) => value > 0) ?? false
        }),
      )
      .toBe(true)
    const frame = await canvas.evaluate((node) => (node as HTMLCanvasElement).toDataURL())
    await canvas.focus()
    await page.keyboard.down(sample.key)
    try {
      await expect
        .poll(() => canvas.evaluate((node) => (node as HTMLCanvasElement).toDataURL()))
        .not.toBe(frame)
    } finally {
      await page.keyboard.up(sample.key)
    }
    if (sample.id === 'game-2d-advanced') {
      await page.keyboard.press('h')
      await expect(page.getByRole('button', { name: 'Continuar', exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Continuar', exact: true }).click()
    } else {
      await page.keyboard.press('r')
      const imagePixel = () =>
        canvas.evaluate((node) => {
          const target = node as HTMLCanvasElement
          const readback = document.createElement('canvas')
          readback.width = readback.height = 1
          const context = readback.getContext('2d', { willReadFrequently: true })
          if (!context) throw new Error('Leitor de imagem indisponível')
          // This point is in the blue background of the fixed Pinta image,
          // outside the walking sheet's figure. R restores the hero to (260, 180).
          context.drawImage(
            target,
            Math.round((270 / 640) * target.width),
            Math.round((210 / 360) * target.height),
            1,
            1,
            0,
            0,
            1,
            1,
          )
          return Array.from(context.getImageData(0, 0, 1, 1).data)
        })
      const fixedImageBlue = [37, 99, 235, 255]
      await expect.poll(imagePixel).not.toEqual(fixedImageBlue)
      await page.keyboard.press('i')
      await expect.poll(imagePixel).toEqual(fixedImageBlue)
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      )
      expect(await imagePixel()).toEqual(fixedImageBlue)
      await page.screenshot({ path: info.outputPath('pinta-imagem-fixa-exportada.png') })
    }
    expect(diagnostics, diagnostics.join('\n')).toEqual([])
  })
}
