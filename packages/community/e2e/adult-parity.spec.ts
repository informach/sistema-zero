import { expect, test } from '@playwright/test'

// Genuine local auth/members/gateway; no browser route mocks or forged authentication.
test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page
    .getByLabel('E-mail', { exact: true })
    .fill(process.env.COMMUNITY_PARITY_EMAIL ?? 'qa-adult@example.invalid')
  await page
    .getByLabel('Senha', { exact: true })
    .fill(process.env.COMMUNITY_PARITY_PASSWORD ?? 'Local-QA-adult-2026!')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByText('Quem vai criar hoje?', { exact: true })).toHaveCount(0)
})

test('adult enters as the account, sees persisted progress and foundation tools while advanced AI stays locked', async ({
  page,
}) => {
  await page.goto('/progresso')
  await expect(page.getByRole('heading', { name: 'Seu progresso', exact: true })).toBeVisible()
  const progress = await page.evaluate(async () => {
    const response = await fetch('/api/members/gamification/me')
    return { status: response.status, body: await response.json() }
  })
  expect(progress.status).toBe(200)
  expect(progress.body.journey.capabilities).toContain('studio')
  await page.goto('/criar')
  await expect(page.getByRole('heading', { name: 'Criar', exact: true })).toBeVisible()
  await expect(
    page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Estúdio', exact: true }) })
      .getByText('Disponível na sua conta'),
  ).toBeVisible()
  await page.goto('/pensa')
  await expect(
    page.getByText('Esta ferramenta ainda não está liberada para sua conta.', { exact: false }),
  ).toBeVisible()
})

test('public identity opt-in persists and can be revoked without exposing account data', async ({
  page,
}) => {
  await page.goto('/perfil')
  await page.getByLabel('Nome de exibição', { exact: true }).fill('Criador QA')
  const publicOptIn = page.getByRole('checkbox', { name: /Exibir meu perfil/ })
  await publicOptIn.check()
  await page.getByRole('button', { name: 'Salvar preferências', exact: true }).click()
  await expect(page.getByText('Preferências salvas.', { exact: true })).toBeVisible()
  await page.reload()
  await expect(publicOptIn).toBeChecked()
  await expect(page.getByLabel('Nome de exibição', { exact: true })).toHaveValue('Criador QA')
  await publicOptIn.uncheck()
  await page.getByRole('button', { name: 'Salvar preferências', exact: true }).click()
  await expect(page.getByText('Preferências salvas.', { exact: true })).toBeVisible()
  await page.reload()
  await expect(publicOptIn).not.toBeChecked()
})

test('shared Studio, Pinta and Molda galleries open in the adult host', async ({ page }) => {
  await page.goto('/estudio')
  await expect(page.getByRole('button', { name: /Novo projeto/ }).first()).toBeVisible()
  await page.goto('/pinta')
  await expect(page.getByRole('button', { name: 'Criar novo', exact: true })).toBeVisible()
  await page.goto('/molda')
  await expect(page.getByRole('button', { name: /Criar|Novo/ }).first()).toBeVisible()
})

test('adult creates a block project, reloads and resumes it from its own local namespace', async ({
  page,
}) => {
  const name = `Jogo QA ${Date.now()}`
  await page.goto('/estudio')
  await page
    .getByRole('button', { name: /Novo projeto/ })
    .first()
    .click()
  await page.locator('input[name="new-project-name"]').fill(name)
  await page.getByRole('button', { name: 'Criar e abrir', exact: true }).click()
  await expect(page.locator('.blocklySvg').first()).toBeVisible()
  await page.reload()
  await expect(page.getByText(name, { exact: true }).first()).toBeVisible()
  const databases = await page.evaluate(async () =>
    (await indexedDB.databases()).map((database) => database.name),
  )
  expect(databases.some((database) => database?.startsWith('sistema-zero-studio-adult:'))).toBe(
    true,
  )
  // The shared settings migration may read/open the legacy DB. The project itself
  // must exist only in the adult store, never in that legacy anonymous database.
  const copies = await page.evaluate(async (projectName) => {
    const matches: string[] = []
    for (const entry of await indexedDB.databases()) {
      if (!entry.name?.startsWith('sistema-zero-studio')) continue
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(entry.name!)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      try {
        for (const storeName of database.objectStoreNames) {
          const values = await new Promise<unknown[]>((resolve, reject) => {
            const request = database.transaction(storeName).objectStore(storeName).getAll()
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
          })
          if (values.some((value) => JSON.stringify(value)?.includes(projectName)))
            matches.push(entry.name)
        }
      } finally {
        database.close()
      }
    }
    return [...new Set(matches)]
  }, name)
  expect(copies).toHaveLength(1)
  expect(copies[0]).toMatch(/^sistema-zero-studio-adult:/)
  await page.getByRole('button', { name: `Abrir projeto ${name}`, exact: true }).click()
  await expect(page.locator('.blocklySvg').first()).toBeVisible()
})

test('shared avatar assets and personal room render from the adult origin', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  let loadedAssets = 0
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('response', (response) => {
    if (!new URL(response.url()).pathname.startsWith('/avatar3d/')) return
    if (response.status() >= 400) errors.push(`Avatar asset HTTP ${response.status()}`)
    else loadedAssets++
  })
  await page.goto('/meu-avatar')
  await expect(page.getByRole('button', { name: 'Salvar', exact: true })).toBeEnabled()
  await expect(page.locator('canvas').first()).toBeVisible()
  await expect.poll(() => loadedAssets).toBeGreaterThan(0)
  // A mounted WebGL canvas can still be empty while GLB pieces load. Read the
  // preserved drawing buffer and wait for the skin to actually render.
  await expect
    .poll(async () =>
      page
        .locator('canvas')
        .first()
        .evaluate((canvas) => {
          if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Avatar canvas missing')
          const copy = document.createElement('canvas')
          copy.width = canvas.width
          copy.height = canvas.height
          const context = copy.getContext('2d')
          if (!context) throw new Error('Canvas readback unavailable')
          context.drawImage(canvas, 0, 0)
          const pixels = context.getImageData(0, 0, copy.width, copy.height).data
          let skinPixels = 0
          for (let offset = 0; offset < pixels.length; offset += 32)
            if (pixels[offset]! > pixels[offset + 2]! + 20) skinPixels++
          return skinPixels
        }),
    )
    .toBeGreaterThan(50)
  await page.screenshot({ path: testInfo.outputPath('adult-avatar.png') })
  await page.goto('/quarto')
  await expect(page.getByRole('heading', { name: 'Meu espaço 3D', exact: true })).toBeVisible()
  await expect(page.locator('canvas').first()).toBeVisible()
  expect(errors).toEqual([])
})
