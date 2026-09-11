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
  await page.getByRole('button', { name: 'Criar modelo' }).click()
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
    const scrollerOf = (element: Element): Element | null => {
      for (let node = element.parentElement; node; node = node.parentElement) {
        const { overflowX, overflowY } = getComputedStyle(node)
        if (/(auto|scroll)/.test(overflowX + overflowY)) return node
      }
      return null
    }
    const inside = (x: number, y: number, rect: DOMRect) =>
      x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
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
      const closed = control.closest('details:not([open])')
      if (closed && !(control.tagName === 'SUMMARY' && control.parentElement === closed)) continue
      const x = rect.left + rect.width / 2
      const y = rect.top + rect.height / 2
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue
      const scroller = scrollerOf(control)
      if (scroller && !inside(x, y, scroller.getBoundingClientRect())) continue
      const hit = document.elementFromPoint(x, y)
      if (!hit || control === hit || control.contains(hit)) continue
      // Um rótulo que envolve o próprio campo não é "cobrir".
      if (hit.contains(control) && hit.tagName === 'LABEL') continue
      covered.push(`"${nameOf(control)}" coberto por "${nameOf(hit)}"`)
    }
    return covered
  })
}

async function checkEverySize(page: Page, label: string) {
  for (const size of SIZES) {
    await page.setViewportSize(size)
    // Abaixo de 1024 o painel vira gaveta. Aberta, ela cobre o palco por desenho (é uma
    // gaveta); o repouso do tablet é com ela fechada. Veio aberta porque o modelo nasceu em
    // tela larga, onde o painel fica encaixado e aberto.
    const collapse = page.getByRole('button', { name: 'Recolher peças e propriedades' })
    if (size.width < 1024 && (await collapse.isVisible())) await collapse.click()
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

async function openFreshModel(page: Page, name: string) {
  await page.goto('/?oficina=app')
  await createModel(page, name)
  await expect(page.getByRole('button', { name: 'Meus projetos' })).toBeVisible()
  // O aviso "… criado!" some sozinho em segundos; enquanto dura, a pílula dele recebe clique.
  await expect(page.getByText(name, { exact: false }).and(page.locator('[aria-live]'))).toHaveCount(
    0,
    { timeout: 15_000 },
  )
}

test('nenhum controle da oficina fica coberto, e o palco tem área de desenho em todo tamanho', async ({
  page,
}) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await openFreshModel(page, 'layout-e2e')
  await checkEverySize(page, 'Modelar')
  expect(pageErrors).toEqual([])
})

test('na aba Pintar, a coluna de ferramentas e a faixa de cores não cobrem nada nem o palco', async ({
  page,
}) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await openFreshModel(page, 'layout-pinta-e2e')
  await page.getByText('Adicionar forma ou ponto').click()
  await page.getByRole('button', { name: 'Caixa', exact: true }).click()
  await page.getByRole('button', { name: 'Pintar', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Cores' })).toBeVisible()
  await checkEverySize(page, 'Pintar')
  expect(pageErrors).toEqual([])
})
