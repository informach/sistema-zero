import { expect, type Page, test } from '@playwright/test'

/** Lê o desenho real: existir um <canvas> não prova que o Zappy apareceu. */
async function pixels(page: Page) {
  return page.locator('[data-mascot] canvas').evaluate((canvas: HTMLCanvasElement) => {
    const context = canvas.getContext('2d')!
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data
    let count = 0
    for (let i = 3; i < data.length; i += 4) if (data[i]! > 32) count++
    return count
  })
}

async function quadro(page: Page) {
  return page.locator('[data-mascot] canvas').evaluate((canvas: HTMLCanvasElement) => {
    const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
    let hash = 0
    let left = canvas.width
    let right = -1
    for (let i = 0; i < data.length; i++) hash = (hash * 31 + data[i]!) | 0
    for (let i = 3; i < data.length; i += 4) {
      if (data[i]! <= 32) continue
      const x = ((i - 3) / 4) % canvas.width
      left = Math.min(left, x)
      right = Math.max(right, x)
    }
    return { hash, left: left / canvas.width, right: right / canvas.width, width: canvas.width }
  })
}

test('o primeiro quadro aparece mesmo quando a carga termina antes do observador do canvas', async ({
  page,
}) => {
  // Controla a ordem de duas tarefas reais do navegador. O observador do canvas pode chegar
  // depois da carga do arquivo; nesse caso o runtime nunca observa o tamanho zero inicial.
  await page.addInitScript(() => {
    const NativeObserver = window.ResizeObserver
    const pending: (() => void)[] = []
    let released = false
    window.ResizeObserver = class extends NativeObserver {
      constructor(callback: ResizeObserverCallback) {
        super((entries, observer) => {
          const deliver = () => callback(entries, observer)
          if (!released && entries.some((entry) => entry.target instanceof HTMLCanvasElement))
            pending.push(deliver)
          else deliver()
        })
      }
    }
    Object.assign(window, {
      releaseCanvasResize() {
        released = true
        for (const deliver of pending.splice(0)) deliver()
      },
    })
  })
  await page.goto('/mascot-idle')
  await expect(page.locator('[data-mascot] canvas')).toHaveAttribute('width', '96')
  await page.evaluate(() => {
    const controls = window as typeof window & { releaseCanvasResize: () => void }
    controls.releaseCanvasResize()
  })
  await expect.poll(() => pixels(page)).toBeGreaterThan(1000)
  await expect(page.locator('[data-mascot] img')).toHaveCount(0)
})

test('mantém a pose inteira ao redimensionar e só anima durante a fala', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/mascot-idle')
  for (const width of [1280, 390, 1280]) {
    await page.setViewportSize({ width, height: 800 })
    await expect(page.locator('[data-mascot] canvas')).toHaveAttribute(
      'width',
      String(width < 640 ? 64 : 96),
    )
    await expect.poll(() => pixels(page)).toBeGreaterThan(500)
    const frame = await quadro(page)
    expect(frame.left).toBeGreaterThan(0.02)
    expect(frame.right).toBeLessThan(0.98)
    expect(Math.abs((frame.left + frame.right) / 2 - 0.5)).toBeLessThan(0.12)
  }
  const idle = await quadro(page)
  // Várias voltas do navegador: a boca parada não deve ficar rodando em segredo.
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => new Promise(requestAnimationFrame))
    expect((await quadro(page)).hash).toBe(idle.hash)
  }
  await page.getByRole('button', { name: 'Ouvir' }).click()
  await expect.poll(async () => (await quadro(page)).hash).not.toBe(idle.hash)
  await page.getByRole('button', { name: 'Parar' }).click()
  await page.evaluate(() => new Promise(requestAnimationFrame))
  const stopped = await quadro(page)
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => new Promise(requestAnimationFrame))
    expect((await quadro(page)).hash).toBe(stopped.hash)
  }
  expect(errors).toEqual([])
})

test('mantém a imagem enquanto o arquivo carrega e quando a rede falha', async ({ page }) => {
  let release!: () => void
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/zappy/fala.riv', async (route) => {
    await pending
    await route.abort()
  })
  const request = page.waitForRequest('**/zappy/fala.riv')
  await page.goto('/mascot-idle')
  await request
  const image = page.locator('[data-mascot] img')
  await expect(page.locator('[data-mascot] canvas')).toHaveCount(1)
  await expect(image).toBeVisible()
  release()
  await expect(page.locator('[data-mascot] canvas')).toHaveCount(0)
  await expect(image).toBeVisible()
  expect(await image.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(
    true,
  )
})
