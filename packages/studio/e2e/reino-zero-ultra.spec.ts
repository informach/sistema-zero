import { expect, type FrameLocator, type Page, test } from '@playwright/test'

function card(page: Page) {
  return page
    .locator('button')
    .filter({ has: page.getByText('Reino Zero Ultra (na mão)', { exact: true }) })
    .first()
}

async function openGame(page: Page): Promise<FrameLocator> {
  await page.goto('/')
  await expect(card(page)).toBeVisible()
  await card(page).click()
  await expect(page).toHaveURL(/\/editor\//, { timeout: 20_000 })

  const iframe = page.locator('iframe[title="Pré-visualização"]')
  await expect(iframe).toHaveAttribute('srcdoc', /reino-zero-ultra/, { timeout: 25_000 })
  const preview = page.frameLocator('iframe[title="Pré-visualização"]')
  await expect(preview.locator('#reino-zero-ultra')).toBeVisible({ timeout: 25_000 })
  await expect(preview.locator('#reino-status')).toHaveText(/^title\|1-1\|2\|0$/, {
    timeout: 25_000,
  })
  return preview
}

async function reloadPreview(preview: FrameLocator): Promise<void> {
  await preview.locator('body').evaluate(() => {
    window.setTimeout(() => window.location.reload(), 0)
  })
  await expect(preview.locator('#reino-zero-ultra')).toBeVisible({ timeout: 25_000 })
}

async function focus(preview: FrameLocator): Promise<void> {
  await preview.locator('#reino-zero-ultra').click({ position: { x: 120, y: 120 } })
  await preview.locator('body').evaluate((body) => {
    window.focus()
    body.tabIndex = -1
    body.focus()
  })
}

async function tapKey(page: Page, key: string): Promise<void> {
  await page.keyboard.down(key)
  await page.waitForTimeout(60)
  await page.keyboard.up(key)
  await page.waitForTimeout(30)
}

test('Reino Zero Ultra roda a campanha nativa com teclado, toque e Canvas vetorial', async ({
  page,
}) => {
  test.setTimeout(90_000)
  const diagnostics: string[] = []
  page.on('pageerror', (error) => diagnostics.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') diagnostics.push(`console: ${message.text()}`)
  })

  const preview = await openGame(page)
  const canvas = preview.locator('#reino-zero-ultra')

  const nativeState = await preview.locator('body').evaluate(() => ({
    hasClassicExtension: 'SZGame2D' in window,
    hasAdvancedExtension: 'SZGameKit' in window,
    externalImages: Array.from(document.images).filter((image) => /^https?:/.test(image.src))
      .length,
    touchLabels: Array.from(document.querySelectorAll('.touch-controls button'), (button) =>
      button.getAttribute('aria-label'),
    ),
  }))
  expect(nativeState).toEqual({
    hasClassicExtension: false,
    hasAdvancedExtension: false,
    externalImages: 0,
    touchLabels: ['Esquerda', 'Direita', 'Começar', 'Ação', 'Pular'],
  })

  const rendered = await canvas.evaluate((element) => {
    const target = element as HTMLCanvasElement
    const blank = document.createElement('canvas')
    blank.width = target.width
    blank.height = target.height
    return target.width === 960 && target.height === 540 && target.toDataURL() !== blank.toDataURL()
  })
  expect(rendered).toBe(true)

  await focus(preview)
  await tapKey(page, '1')
  await expect(preview.locator('#reino-status')).toHaveText(/^title\|1-1\|1\|0$/)
  await tapKey(page, 'Enter')
  await expect(preview.locator('#reino-status')).toHaveText(/^playing\|1-1\|1\|\d+$/, {
    timeout: 10_000,
  })

  await page.keyboard.down('ArrowRight')
  await page.waitForTimeout(220)
  await page.keyboard.up('ArrowRight')
  const replayFrames = Number((await preview.locator('#reino-status').textContent())?.split('|')[3])
  expect(replayFrames).toBeGreaterThan(3)

  await tapKey(page, 'p')
  await expect(preview.locator('#reino-status')).toHaveText(/^paused\|1-1\|1\|\d+$/)
  await tapKey(page, 'p')
  await expect(preview.locator('#reino-status')).toHaveText(/^playing\|1-1\|1\|\d+$/)

  const right = preview.locator('#touch-right')
  await right.dispatchEvent('pointerdown', { bubbles: true, pointerId: 7, pointerType: 'touch' })
  await page.waitForTimeout(120)
  await right.dispatchEvent('pointerup', { bubbles: true, pointerId: 7, pointerType: 'touch' })
  await expect(preview.locator('#reino-status')).toHaveText(/^playing\|1-1\|1\|\d+$/)

  expect(diagnostics, diagnostics.join('\n')).toEqual([])
})

test('Reino Zero Ultra migra saves antigos e recupera o backup quando o principal corrompe', async ({
  page,
}) => {
  test.setTimeout(90_000)
  const preview = await openGame(page)

  await preview.locator('body').evaluate(() => {
    localStorage.setItem(
      'reino-zero-ultra-save',
      JSON.stringify({
        version: 1,
        stageId: '2-1',
        unlocked: 8,
        score: 12_340,
        coins: 21,
        gems: [],
        lives: 4,
        playerCount: 1,
        replay: [],
        replaySnapshot: null,
        replayChecksum: 0,
      }),
    )
  })

  await reloadPreview(preview)
  await expect(preview.locator('#reino-status')).toHaveText(/^title\|2-1\|1\|0$/)
  await expect(preview.locator('#reino-announcement')).toHaveText(
    'O progresso antigo foi migrado com segurança.',
  )

  const migrated = await preview.locator('body').evaluate(() => {
    const raw = localStorage.getItem('reino-zero-ultra-save')
    return raw === null ? null : JSON.parse(raw)
  })
  expect(migrated).toMatchObject({
    version: 2,
    data: {
      stageId: '2-1',
      unlocked: 8,
      score: 12_340,
      coins: 21,
      lives: 4,
      playMode: 'solo',
    },
  })
  expect(migrated?.checksum).toEqual(expect.any(Number))

  await preview.locator('body').evaluate(() => {
    const valid = localStorage.getItem('reino-zero-ultra-save')
    if (valid === null) throw new Error('save migrado ausente')
    localStorage.setItem('reino-zero-ultra-save-backup', valid)
    localStorage.setItem('reino-zero-ultra-save', '{save-corrompido')
  })

  await reloadPreview(preview)
  await expect(preview.locator('#reino-status')).toHaveText(/^title\|2-1\|1\|0$/)
  await expect
    .poll(() =>
      preview.locator('body').evaluate(() => localStorage.getItem('reino-zero-ultra-save-corrupt')),
    )
    .toBe('{save-corrompido')
  await expect
    .poll(() =>
      preview.locator('body').evaluate(() => localStorage.getItem('reino-zero-ultra-save-notice')),
    )
    .toBe('O último progresso válido foi recuperado.')
  await expect(preview.locator('#reino-announcement')).toHaveText(
    'O último progresso válido foi recuperado.',
  )
})
