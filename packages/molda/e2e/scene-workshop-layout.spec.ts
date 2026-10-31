/**
 * O LAYOUT da oficina em navegador real: nenhum controle coberto por outro, palco com área de
 * desenho e página sem rolagem lateral, nos tamanhos que a criança usa.
 *
 * ⚠️ É o único lugar que prova isso. Os testes de unidade rodam no happy-dom, que não calcula
 * layout: lá um botão escondido embaixo de outro continua "alcançável" pela consulta por papel.
 * Foi assim que o gatilho da "Imagem de apoio" ficou embaixo das ferramentas flutuantes no
 * lote 7a (10/09/2026) sem nenhum teste reprovar.
 *
 * Coberto = o ponto central do controle, no navegador, cai em OUTRO elemento que não é ele nem
 * está dentro dele. Controle fora da parte visível do painel que rola não conta: rolar até ele é
 * o jeito normal de chegar.
 */
import { expect, type Page, test } from '@playwright/test'

const SIZES = [
  { width: 1366, height: 768 },
  { width: 1024, height: 600 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
] as const

async function createModel(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: 'Criar novo' }).click()
  await page.getByText('Mais opções para começar', { exact: true }).click()
  await page.getByRole('button', { name: 'Configurar modelo' }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByLabel('Nome', { exact: true }).fill(name)
  await page.getByRole('button', { name: 'Criar', exact: true }).click()
}

/** Os controles cujo centro, visível, cai em outro elemento. Nome e quem cobre, para o erro. */
async function coveredControls(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const nameOf = (element: Element) =>
      (
        element.getAttribute('aria-label') ||
        (element as HTMLElement).innerText ||
        element.getAttribute('name') ||
        element.tagName
      )
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 40)
    const inside = (x: number, y: number, rect: DOMRect) =>
      x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
    const clippedByAncestor = (element: Element, x: number, y: number) => {
      for (let node = element.parentElement; node; node = node.parentElement) {
        const { overflowX, overflowY } = getComputedStyle(node)
        if (
          /(auto|scroll|hidden|clip)/.test(overflowX + overflowY) &&
          !inside(x, y, node.getBoundingClientRect())
        )
          return true
      }
      return false
    }
    const covered: string[] = []
    const controls = document.querySelectorAll(
      'section[aria-label] button, section[aria-label] summary, section[aria-label] select, section[aria-label] input:not([type="file"]):not([type="hidden"])',
    )
    for (const control of controls) {
      const rect = control.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) continue
      if (getComputedStyle(control).visibility === 'hidden') continue
      // Dentro de um <details> fechado o Chrome guarda a caixa sem desenhar (é
      // `content-visibility: hidden`): o controle não está na tela, então não pode estar coberto.
      if (!control.checkVisibility()) continue
      // Escondido de propósito (o seletor nativo do "+ Nova cor", aberto pelo botão "+"): não é
      // um controle que a criança alcança, então não tem como estar coberto.
      if (control.closest('[aria-hidden="true"]')) continue
      const closed = control.closest('details:not([open])')
      if (closed && !(control.tagName === 'SUMMARY' && control.parentElement === closed)) continue
      const x = rect.left + rect.width / 2
      const y = rect.top + rect.height / 2
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue
      if (clippedByAncestor(control, x, y)) continue
      const hit = document.elementFromPoint(x, y)
      if (!hit || control === hit || control.contains(hit) || hit.contains(control)) continue
      // Um rótulo que envolve o próprio campo não é "cobrir".
      // Its icon/switch also activates that input through native label behavior.
      if (hit.closest('label')?.control === control) continue
      covered.push(`"${nameOf(control)}" coberto por "${nameOf(hit)}"`)
    }
    return covered
  })
}

async function checkEverySize(page: Page, label: string) {
  for (const size of SIZES) {
    await page.setViewportSize(size)
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible()
    // O palco assenta depois do resize; a conta só vale com o layout parado.
    await expect
      .poll(async () => (await canvas.boundingBox())?.width ?? 0, { timeout: 5_000 })
      .toBeGreaterThan(200)
    const rect = await canvas.boundingBox()
    expect(rect?.height ?? 0, `${label} ${size.width}px: altura do palco`).toBeGreaterThan(150)
    expect(await coveredControls(page), `${label} ${size.width}×${size.height}`).toEqual([])
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow, `${label} ${size.width}px: rolagem lateral`).toBeLessThanOrEqual(1)
  }
}

async function openFreshModel(page: Page, name: string, query = '') {
  await page.goto(`/?${query}`)
  await createModel(page, name)
  await expect(page.getByRole('button', { name: 'Meus projetos' })).toBeVisible()
  // O aviso "… criado!" some sozinho em segundos; enquanto dura, a pílula dele recebe clique.
  await expect(page.getByText(name, { exact: false }).and(page.locator('[aria-live]'))).toHaveCount(
    0,
    { timeout: 15_000 },
  )
}

test('o menu de ajustes do palco cabe inteiro e seus campos recebem clique', async ({
  page,
}, testInfo) => {
  await openFreshModel(page, 'layout-ajustes-e2e', 'nivel=god')
  await page.getByText('Adicionar', { exact: true }).click()
  await page.getByRole('button', { name: 'Caixa', exact: true }).click()
  const trigger = page.locator('summary').filter({ hasText: 'Mais ajustes do palco' })
  const menu = page.locator('details').filter({ has: trigger }).locator('.mld-drop')

  for (const activity of ['Modelar', 'Pintar', 'Animar']) {
    await page.getByRole('button', { name: activity, exact: true }).click()
    for (const size of SIZES) {
      await page.setViewportSize(size)
      await trigger.click()
      await expect(menu).toBeVisible()
      const bounds = await menu.boundingBox()
      const stage = await page.locator('.mld-stage-viewport').boundingBox()
      if (!bounds || !stage) throw new Error('Menu ou palco sem área visível')
      const label = `${activity} ${size.width}px`
      expect.soft(bounds.x, `${label}: borda esquerda`).toBeGreaterThanOrEqual(stage.x)
      expect
        .soft(bounds.x + bounds.width, `${label}: borda direita`)
        .toBeLessThanOrEqual(stage.x + stage.width)
      expect
        .soft(bounds.y + bounds.height, `${label}: borda inferior`)
        .toBeLessThanOrEqual(stage.y + stage.height)
      const covered: string[] = []
      // A short drawing area may need a scrolling menu. Each control must remain
      // reachable and uncovered after scrolling it into that menu's visible area.
      for (const control of await menu.locator('select, button, input').all()) {
        await control.scrollIntoViewIfNeeded()
        const hidden = await control.evaluate((control) => {
          const rect = control.getBoundingClientRect()
          const points = [
            { x: rect.left + 2, y: rect.top + rect.height / 2 },
            { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
            { x: rect.right - 2, y: rect.top + rect.height / 2 },
          ]
          return points.every(({ x, y }) => control.contains(document.elementFromPoint(x, y)))
            ? null
            : control.getAttribute('name') || control.textContent?.trim() || 'Unnamed control'
        })
        if (hidden) covered.push(hidden)
      }
      expect.soft(covered, `${label}: campos descobertos`).toEqual([])
      await trigger.click()
    }
  }

  await page.getByRole('button', { name: 'Modelar', exact: true }).click()
  await page.setViewportSize(SIZES[0])
  await trigger.click()
  await menu.getByLabel('Eixos de Mover e Girar').selectOption('local')
  await menu.getByLabel('Passo ao mover e redimensionar').selectOption('0.01')
  await trigger.click()
  await trigger.click()
  await expect(menu.getByLabel('Eixos de Mover e Girar')).toHaveValue('local')
  await expect(menu.getByLabel('Passo ao mover e redimensionar')).toHaveValue('0.01')
  await page.screenshot({ path: testInfo.outputPath('menu-ajustes-desktop.png') })
  await page.setViewportSize(SIZES[3])
  await page.screenshot({ path: testInfo.outputPath('menu-ajustes-mobile.png') })
})

test('nenhum controle da oficina fica coberto, e o palco tem área de desenho em todo tamanho', async ({
  page,
}) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await openFreshModel(page, 'layout-e2e')
  await checkEverySize(page, 'Modelar')
  expect(pageErrors).toEqual([])
})

for (const hasTouch of [false, true]) {
  test.describe(`painel com ${hasTouch ? 'toque' : 'mouse'}`, () => {
    test.use({ hasTouch })
    test('o painel direito mostra as cores e seus contornos inteiros', async ({ page }) => {
      await openFreshModel(page, 'layout-cores-e2e', 'nivel=god')
      await page.getByText('Adicionar', { exact: true }).click()
      await page.getByRole('button', { name: 'Caixa', exact: true }).click()
      const colors = page.locator('.mld-inspector-properties .mld-paint-swatches > button')
      await expect(colors).toHaveCount(15)
      for (const size of [{ width: 1810, height: 900 }, ...SIZES]) {
        await page.setViewportSize(size)
        for (let index = 0; index < 15; index++) {
          const color = colors.nth(index)
          await color.scrollIntoViewIfNeeded()
          await color.click()
          await color.press('Shift+Tab')
          await page.keyboard.press('Tab')
          await expect(color).toBeFocused()
          const clipped = await color.evaluate((button) => {
            const rect = button.getBoundingClientRect()
            const style = getComputedStyle(button)
            const halo = Math.max(
              4,
              Number.parseFloat(style.outlineWidth) + Number.parseFloat(style.outlineOffset),
            )
            const result: string[] = []
            for (let parent = button.parentElement; parent; parent = parent.parentElement) {
              if (!/(auto|scroll|hidden|clip)/.test(getComputedStyle(parent).overflowX)) continue
              const bounds = parent.getBoundingClientRect()
              if (rect.left - halo < bounds.left || rect.right + halo > bounds.right)
                result.push(
                  `${parent.className}: ${rect.left - halo},${rect.right + halo} / ${bounds.left},${bounds.right}`,
                )
            }
            return result
          })
          expect(clipped, `${size.width}px, cor ${index}: seleção e foco`).toEqual([])
        }
      }
      await page.setViewportSize({ width: 1810, height: 900 })
      await colors.nth(7).click()
      await page.locator('.mld-workshop-inspector').screenshot({
        path: `.cache/painel-direito-${hasTouch ? 'toque' : 'mouse'}.png`,
      })
    })
  })
}

test('na aba Pintar, a coluna de ferramentas e a faixa de cores não cobrem nada nem o palco', async ({
  page,
}) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await openFreshModel(page, 'layout-pinta-e2e')
  await page.getByText('Adicionar', { exact: true }).click()
  await page.getByRole('button', { name: 'Caixa', exact: true }).click()
  await page.getByRole('button', { name: 'Pintar', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Peça e ajustes de pintura' })).toBeVisible()
  await checkEverySize(page, 'Pintar')
  expect(pageErrors).toEqual([])
})

/**
 * A aba Animar: os movimentos na barra da aba e a vista flutuando no palco, com o cartão da pose
 * embaixo. No celular em pé os movimentos ficavam espremidos ao lado das abas (fora da tela) e o
 * cartão da pose cobria o "Mais ajustes do palco" (full review do lote 10, 11/09/2026).
 */
test('na aba Animar, os movimentos, a vista e a pose cabem sem cobrir nada', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await openFreshModel(page, 'layout-anima-e2e')
  await page.getByRole('button', { name: 'Animar', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Criar movimento', exact: true })).toBeVisible()
  await checkEverySize(page, 'Animar')
  for (const size of SIZES) {
    await page.setViewportSize(size)
    if (size.width <= 1100) {
      await page.getByRole('tab', { name: 'Movimentos', exact: true }).click()
    }
    const create = await page
      .getByRole('button', { name: 'Criar movimento', exact: true })
      .boundingBox()
    expect(create, `Animar ${size.width}px: "Criar movimento" na tela`).not.toBeNull()
    expect(
      (create?.x ?? 0) + (create?.width ?? 0),
      `Animar ${size.width}px: cabe`,
    ).toBeLessThanOrEqual(size.width)
  }
  expect(pageErrors).toEqual([])
})

/**
 * O nível de entrada (`?nivel=explorer`, o portão por jornada): o que a criança de fato encara.
 * Somem a malha, o laço, o ponto de giro, os ossos e o "Trazer arquivo 3D", e entra a linha
 * "Ferramentas que vêm por aí". Nada coberto, em nenhum tamanho, nas duas abas.
 */
test('no nível de entrada, a oficina padrão não cobre nada', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await openFreshModel(page, 'layout-explorador-e2e', '&nivel=explorer')
  await page.locator('summary').filter({ hasText: 'Seleção e organização' }).click()
  await expect(page.getByText('Ferramentas que vêm por aí')).toBeVisible()
  await page.locator('summary').filter({ hasText: 'Seleção e organização' }).click()
  await expect(page.getByRole('button', { name: 'Trazer arquivo 3D' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Editar malha', exact: true })).toHaveCount(0)
  await checkEverySize(page, 'Modelar no básico')
  await page.getByText('Adicionar', { exact: true }).click()
  await page.getByRole('button', { name: 'Caixa', exact: true }).click()
  await page.getByRole('button', { name: 'Pintar', exact: true }).click()
  await page.setViewportSize({ width: 1366, height: 768 })
  await expect(page.getByRole('region', { name: 'Peça e ajustes de pintura' })).toBeVisible()
  await checkEverySize(page, 'Pintar no básico')
  expect(pageErrors).toEqual([])
})

test('o painel direito mantém peças acima do conteúdo de cada modo', async ({ page }, testInfo) => {
  await openFreshModel(page, 'painel-organizado-e2e', 'nivel=god')
  await page.getByText('Adicionar', { exact: true }).click()
  await page.getByRole('button', { name: 'Caixa', exact: true }).click()
  await page.setViewportSize({ width: 1366, height: 768 })

  for (const mode of ['Modelar', 'Pintar', 'Animar'] as const) {
    await page.getByRole('button', { name: mode, exact: true }).click()
    await page.locator('.mld-workshop-inspector').screenshot({
      path: testInfo.outputPath(`painel-${mode.toLowerCase()}-desktop.png`),
    })
    const pieces = await page.locator('.mld-inspector-pieces').boundingBox()
    const overview = (await page.locator('.mld-inspector-overview').count())
      ? await page.locator('.mld-inspector-overview').boundingBox()
      : null
    const details =
      mode === 'Pintar' ? null : await page.locator('.mld-inspector-properties').boundingBox()
    expect(pieces).not.toBeNull()
    if (mode !== 'Pintar') expect(details).not.toBeNull()
    if (overview) {
      expect(pieces!.y + pieces!.height, mode).toBeLessThanOrEqual(overview.y)
      if (details) expect(overview.y + overview.height, mode).toBeLessThanOrEqual(details.y)
    } else {
      expect(pieces!.y + pieces!.height, mode).toBeLessThanOrEqual(details!.y)
    }
  }

  await page.getByRole('button', { name: 'Pintar', exact: true }).click()
  await page.setViewportSize({ width: 1024, height: 768 })
  const tabs = page.getByRole('tablist', { name: 'Painel da criação' }).getByRole('tab')
  await expect(tabs).toHaveText(['Peças', 'Pintura'])
  await expect(page.getByRole('tabpanel', { name: 'Pintura' })).toBeVisible()
  await page.locator('.mld-workshop-inspector').screenshot({
    path: testInfo.outputPath('painel-pintar-compacto.png'),
  })
  await tabs.getByText('Peças').click()
  await expect(page.getByRole('tabpanel', { name: 'Peças' })).toBeVisible()

  await page.getByRole('button', { name: 'Animar', exact: true }).click()
  await expect(tabs).toHaveText(['Peças', 'Movimentos', 'Pose'])
  await expect(page.getByRole('tabpanel', { name: 'Peças' })).toBeVisible()
  await expect(page.getByRole('tabpanel', { name: 'Pose' })).toBeHidden()
})
