import { expect, type Page, test } from '@playwright/test'

type ContrastResult = { label: string; ratio: number }

async function setTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  const root = page.locator('[data-sz-theme]').first()
  await expect(root).toBeVisible()
  if ((await root.getAttribute('data-sz-theme')) !== theme) {
    await page.getByRole('button', { name: 'Mudar tema' }).click()
  }
  await expect(root).toHaveAttribute('data-sz-theme', theme)
  await root.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  )
}

async function badgeContrasts(page: Page): Promise<ContrastResult[]> {
  const badges = page.locator('span.rounded-full.uppercase.tracking-wide')
  await expect(badges.first()).toBeVisible({ timeout: 15_000 })
  return badges.evaluateAll((elements) => {
    type RGBA = [number, number, number, number]

    const parse = (value: string): RGBA => {
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) throw new Error('Canvas 2D indisponível para aferir contraste.')
      context.clearRect(0, 0, 1, 1)
      context.fillStyle = value
      context.fillRect(0, 0, 1, 1)
      const [r = 0, g = 0, b = 0, a = 0] = context.getImageData(0, 0, 1, 1).data
      return [r, g, b, a / 255]
    }
    const composite = (foreground: RGBA, background: RGBA): RGBA => {
      const alpha = foreground[3] + background[3] * (1 - foreground[3])
      if (alpha === 0) return [0, 0, 0, 0]
      return [
        (foreground[0] * foreground[3] + background[0] * background[3] * (1 - foreground[3])) /
          alpha,
        (foreground[1] * foreground[3] + background[1] * background[3] * (1 - foreground[3])) /
          alpha,
        (foreground[2] * foreground[3] + background[2] * background[3] * (1 - foreground[3])) /
          alpha,
        alpha,
      ]
    }
    const effectiveBackground = (element: Element): RGBA => {
      const ancestors: Element[] = []
      for (let current: Element | null = element; current; current = current.parentElement) {
        ancestors.unshift(current)
      }
      return ancestors.reduce<RGBA>(
        (background, current) =>
          composite(parse(getComputedStyle(current).backgroundColor), background),
        [255, 255, 255, 1],
      )
    }
    const luminance = ([r, g, b]: RGBA): number => {
      const linear = [r, g, b].map((channel) => {
        const normalized = channel / 255
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
      })
      return 0.2126 * (linear[0] ?? 0) + 0.7152 * (linear[1] ?? 0) + 0.0722 * (linear[2] ?? 0)
    }

    return elements.map((element) => {
      const background = effectiveBackground(element)
      const foreground = composite(parse(getComputedStyle(element).color), background)
      const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
      return {
        label: element.textContent?.trim() ?? '',
        ratio: ((values[0] ?? 0) + 0.05) / ((values[1] ?? 0) + 0.05),
      }
    })
  })
}

test('badges da galeria mantêm contraste AA nos temas do Studio', async ({ page }) => {
  await page.goto('/')
  // A medição precisa materializar cards offscreen e observar a cor FINAL, não
  // um frame intermediário da transição de tema.
  await page.addStyleTag({
    content: `
      .sz-kit-content-group { content-visibility: visible !important; }
      [data-sz-theme] .transition-colors { transition: none !important; }
    `,
  })

  for (const theme of ['light', 'dark'] as const) {
    await setTheme(page, theme)
    const failures = (await badgeContrasts(page)).filter(({ ratio }) => ratio < 4.5)
    expect(failures, `badges sem contraste AA no tema ${theme}`).toEqual([])
  }
})
