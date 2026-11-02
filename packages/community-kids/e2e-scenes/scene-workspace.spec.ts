import { expect, type Locator, type Page, test } from '@playwright/test'

/**
 * ⭐ Exploração livre (02/11/2026): a `experiencia-areas` deixou a bancada das fichas e das áreas do
 * Estúdio. A criança escolhe QUANDO a nave anda ("Uma vez, no começo" × "Sempre, em todo quadro") e
 * começa o jogo; a faixa diz quantas vezes a nave andou e quantas descobertas já caíram.
 */
const UMA_VEZ = 'Uma vez, no começo'
const SEMPRE = 'Sempre, em todo quadro'
const jeito = (page: Page, nome: string) => page.getByRole('button', { name: nome, exact: true })
const jogo = (page: Page) =>
  page.getByRole('button', {
    name: /^(Começar o jogo|Continuar o jogo|Pausar o jogo|Jogo terminado)$/,
  })
const terminado = (page: Page) => page.getByRole('button', { name: 'Jogo terminado', exact: true })
const andou = (page: Page) => page.locator('.sz-discovery-simple-hud .position-hud')
const descobertas = (page: Page) => page.locator('.sz-discovery-count')
const expand = (page: Page) => page.getByRole('button', { name: 'Ampliar experiência' })
const close = (page: Page) => page.getByRole('button', { name: 'Voltar à aula' })

test('retorno foca o gatilho mesmo com foco anterior fora da experiência', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Antes da experiência', exact: true }).focus()
  await expand(page).click()
  await page.keyboard.press('Escape')
  await expect(expand(page)).toBeFocused()
})

/** WebKit trunca dimensões da interseção para pixels inteiros (ex.: 318.515625 → 318).
 * Tolerar menos de 1px por borda, sem aceitar recorte proporcional em palcos grandes. */
async function expectFullyVisible(locator: Locator) {
  await expect
    .poll(() =>
      locator.evaluate(
        (el) =>
          new Promise<boolean>((resolve) => {
            const observer = new IntersectionObserver(([entry]) => {
              if (!entry) return
              observer.disconnect()
              const box = entry.boundingClientRect
              const visible = entry.intersectionRect
              resolve(
                entry.isIntersecting &&
                  box.width > 0 &&
                  box.height > 0 &&
                  visible.left - box.left < 1 &&
                  visible.top - box.top < 1 &&
                  box.right - visible.right < 1 &&
                  box.bottom - visible.bottom < 1,
              )
            })
            observer.observe(el)
          }),
      ),
    )
    .toBe(true)
}

/**
 * O mundo do console NUNCA rola por dentro (01/10/2026, regra dela): a cena inteira à vista, ou é o
 * CARTÃO do mundo (`.sz-scene-console-visual`) que rola. Antes, o encaixe pela altura errava a borda
 * da moldura por 4px (um rolinho em toda cena simples) e nem alcançava palco com rodapé ou recorte.
 */
async function expectMundoSemRolagem(page: Page) {
  await expect
    .poll(() =>
      page.locator('.sz-scene-console-mundo').evaluate((el) => ({
        rola: el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1,
        overflow: getComputedStyle(el).overflowY,
      })),
    )
    .toEqual({ rola: false, overflow: 'visible' })
}

/**
 * ⚠️ A tela livre (`.sz-discovery-proposed`, a do Cadê e do Farol, aprovada em 27/10/2026) fica em
 * duas colunas a partir de uma JANELA de 1100px, qualquer que seja a largura do painel, além da
 * regra do painel de 52rem (a da bancada antiga e do palpite). Por isso, nos testes da tela livre,
 * quem garante que nada corta é o `fits`.
 */

/**
 * Lado a lado = a grade do console tem duas colunas, com a cena antes das ações. ⚠️ Não compara o
 * topo das duas: na tela livre a coluna da cena é `sticky`, e com a página rolada o topo dela anda.
 */
async function expectLayout(page: Page, sideBySide: boolean) {
  await expect
    .poll(() =>
      page.locator('.sz-scene-console').evaluate((el) => {
        const visual = el.querySelector('.sz-scene-console-visual')?.getBoundingClientRect()
        const actions = el.querySelector('.sz-scene-console-actions')?.getBoundingClientRect()
        if (!visual || !actions) throw new Error('Regiões da experiência ausentes')
        const estilo = getComputedStyle(el)
        const colunas =
          estilo.display === 'grid' ? estilo.gridTemplateColumns.trim().split(/\s+/).length : 1
        return colunas >= 2 && visual.right <= actions.left + 1
      }),
    )
    .toBe(sideBySide)
}

async function fits(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  // Os controles da tela livre cabem na coluna das ações, sem texto cortado.
  for (const button of await page.locator('.sz-scene-prancha button').all()) {
    expect(
      await button.evaluate((el) => {
        const coluna = el.closest('.sz-scene-console-actions')?.getBoundingClientRect()
        const box = el.getBoundingClientRect()
        return (
          !!coluna &&
          box.left >= coluna.left - 0.5 &&
          box.right <= coluna.right + 0.5 &&
          el.scrollWidth <= el.clientWidth + 1
        )
      }),
    ).toBe(true)
  }
  expect(
    await page.locator('.sz-scene-workspace-header').evaluate((el) => {
      const heading = el.firstElementChild!.getBoundingClientRect()
      const button = el.lastElementChild!.getBoundingClientRect()
      const title = el.firstElementChild as HTMLElement
      return (
        title.scrollWidth <= title.clientWidth &&
        (heading.right <= button.left || heading.bottom <= button.top)
      )
    }),
  ).toBe(true)
}

test('margens laterais da cena ficam equilibradas no painel dividido', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('/?width=900')
  await expectLayout(page, true)

  await expectBalancedSceneMargins(page)
})

async function expectBalancedSceneMargins(page: Page) {
  await expect(page.locator('.sz-scene-console-visual .sz-scene-frame')).toBeVisible()
  const edges = await page.locator('.sz-scene-console-visual').evaluate((visual) => {
    const frame = visual.querySelector('.sz-scene-frame')
    if (!frame) throw new Error('Cena ausente')
    const panel = visual.getBoundingClientRect()
    const scene = frame.getBoundingClientRect()
    return {
      left: scene.left - panel.left,
      right: panel.right - scene.right,
      gutter: getComputedStyle(visual).scrollbarGutter,
    }
  })
  expect(Math.abs(edges.left - edges.right)).toBeLessThan(1)
  expect(edges.gutter).toBe('stable both-edges')
}

test('a divisória muda o painel sem ampliar nem perder seleção e progresso', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('/?split')
  await expectLayout(page, true)
  await fits(page)
  await jeito(page, UMA_VEZ).click()
  await page.evaluate(() => window.scrollTo(0, 0))
  const divider = page.getByRole('separator', { name: 'Mudar o tamanho dos dois lados' })
  const box = await divider.boundingBox()
  if (!box) throw new Error('Divisória ausente')
  await page.mouse.move(box.x + box.width / 2, box.y + 24)
  await page.mouse.down()
  await page.mouse.move(360, box.y + 24, { steps: 20 })
  await page.mouse.up()
  await expectLayout(page, true)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText('Vídeo da aula', { exact: true })).toBeInViewport({ ratio: 1 })
  await expect(jeito(page, UMA_VEZ)).toHaveAttribute('aria-pressed', 'true')
  const run = jogo(page)
  await run.click()
  await expect(terminado(page)).toBeVisible()
  await expect(andou(page)).toContainText('1 vez')
  await expect(descobertas(page)).toHaveText('1 de 2 descobertas')
  await expectFullyVisible(page.locator('.sz-scene-console-mundo svg').first())
  await expect(run).toBeInViewport({ ratio: 1 })
  await fits(page)
  await page.screenshot({ path: info.outputPath('inline-wide.png') })

  await divider.focus()
  await divider.press('End')
  // No painel mínimo a tela livre empilha (a grade dela não cabe em duas colunas).
  await expectLayout(page, false)
  await expect(andou(page)).toContainText('1 vez')
  await expect(descobertas(page)).toHaveText('1 de 2 descobertas')
  await fits(page)
  await expand(page).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toHaveCSS('position', 'fixed')
  expect(await dialog.boundingBox()).toEqual({ x: 0, y: 0, width: 1366, height: 768 })
  await expectLayout(page, true)
  await page.keyboard.press('Escape')
  await expect(expand(page)).toBeFocused()
  await expectLayout(page, false)
  await fits(page)
  await expect(andou(page)).toContainText('1 vez')
  await divider.focus()
  await divider.press('Home')
  await expectLayout(page, true)
  await expect(jeito(page, UMA_VEZ)).toHaveAttribute('aria-pressed', 'true')
  await expect(andou(page)).toContainText('1 vez')
  await expect(descobertas(page)).toHaveText('1 de 2 descobertas')
})

test('o palpite também adapta pela largura do painel e preserva a resposta', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('/?split&block=experiencia-coordenadas')
  const divider = page.getByRole('separator', { name: 'Mudar o tamanho dos dois lados' })
  await expectLayout(page, false)
  await divider.focus()
  await divider.press('Home')
  await expectLayout(page, true)
  await expect(page.locator('.sz-scene-prancha')).toHaveCount(0)
  await expect(page.locator('.sz-scene-console-actions')).toContainText('Se o y AUMENTAR')
  await page.getByRole('button', { name: 'Para baixo', exact: true }).click()
  await expect(page.locator('.sz-scene-prancha')).toBeVisible()
  await expectLayout(page, true)
  await divider.focus()
  await divider.press('End')
  await expectLayout(page, false)
  await expect(page.locator('.sz-scene-prancha')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Para baixo', exact: true })).toHaveCount(0)
})

test('fontes maiores não cortam os controles no modo ampliado', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('/?width=1000')
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '32px'
  })
  await fits(page)
  await expand(page).click()
  await fits(page)
  // Antes de escolher um jeito o botão do jogo fica fechado (mas no Tab e à vista).
  const run = page.getByRole('button', { name: 'Começar o jogo', exact: true })
  await expect(run).toHaveAttribute('aria-disabled', 'true')
  await run.scrollIntoViewIfNeeded()
  await expect(run).toBeInViewport({ ratio: 1 })
  await expect(close(page)).toBeInViewport({ ratio: 1 })
  await close(page).click()
  await expect(expand(page)).toBeFocused()
})

test('HUD cabe em 320px com fonte de sistema larga, sem cortar números ou descobertas', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/?width=620')
  await page.addStyleTag({
    content:
      '.sz-discovery-simple-hud { font-family: monospace; letter-spacing: .12em; word-spacing: .16em; }',
  })
  await expect(jeito(page, SEMPRE)).toBeVisible()
  const geometry = await page.evaluate(() => ({
    page: document.documentElement.scrollWidth,
    viewport: innerWidth,
    hud: [...document.querySelectorAll('.position-hud, .sz-discovery-simple-hud-top')].map(
      (el) => ({
        width: el.clientWidth,
        content: el.scrollWidth,
      }),
    ),
  }))
  expect(geometry.page, JSON.stringify(geometry)).toBeLessThanOrEqual(geometry.viewport)
  for (const box of geometry.hud)
    expect(box.content, JSON.stringify(geometry)).toBeLessThanOrEqual(box.width)
  await fits(page)
})

for (const size of [
  { width: 1366, panel: 860, height: 768, sideBySide: true },
  { width: 1366, panel: 900, height: 768, sideBySide: true },
  { width: 1366, panel: 1000, height: 480, sideBySide: true },
  // Abaixo de 1100px quem decide é o painel (52rem): 900 cabe em duas colunas, 700 empilha.
  { width: 1024, panel: 900, height: 768, sideBySide: true },
  { width: 1024, panel: 700, height: 768, sideBySide: false },
]) {
  test(`layout inline: janela ${size.width}, painel ${size.panel}, altura ${size.height}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: size.width, height: size.height })
    await page.goto(`/?width=${size.panel}`)
    await expectLayout(page, size.sideBySide)
    await fits(page)
    await page.screenshot({ path: info.outputPath('inline-adaptive.png'), fullPage: true })
  })
}

test('ampliar/recolher preserva escolha, execução e descobertas', async ({ page }, info) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('/')
  await jeito(page, UMA_VEZ).click()
  await expand(page).click()
  await expect(page.getByRole('dialog', { name: 'Uma vez ou sempre?' })).toBeVisible()
  await expect(jeito(page, UMA_VEZ)).toHaveAttribute('aria-pressed', 'true')
  const run = jogo(page)
  await run.click()
  await expect(terminado(page)).toBeVisible({ timeout: 20_000 })
  await expect(andou(page)).toContainText('1 vez')
  await expect(descobertas(page)).toHaveText('1 de 2 descobertas')
  await expectFullyVisible(page.locator('.sz-scene-console-mundo svg').first())
  await expect(run).toBeInViewport({ ratio: 1 })
  const visual = await page.locator('.sz-scene-console-visual').boundingBox()
  const actions = await page.locator('.sz-scene-console-actions').boundingBox()
  expect(visual!.x + visual!.width).toBeLessThanOrEqual(actions!.x + 1)
  await fits(page)
  await page.screenshot({ path: info.outputPath('expanded.png') })

  await page.keyboard.press('Escape')
  await expect(expand(page)).toBeFocused()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(andou(page)).toContainText('1 vez')
  await expect(descobertas(page)).toHaveText('1 de 2 descobertas')
  await expect(jeito(page, UMA_VEZ)).toHaveAttribute('aria-pressed', 'true')
  await expand(page).click()
  // Trocar de jeito começa uma partida nova (o que a bancada antiga fazia com "Voltar ao começo").
  await jeito(page, SEMPRE).click()
  await expect(run).toHaveText(/Começar o jogo/)
  await run.click()
  await expect(terminado(page)).toBeVisible({ timeout: 20_000 })
  await expect(andou(page)).toContainText(/[1-9]\d* vezes/)
  await expect(descobertas(page)).toHaveText('2 de 2 descobertas')
  const count = await andou(page).textContent()
  await close(page).click()
  await expect(andou(page)).toHaveText(count ?? '')
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
})

test('foco fica dentro da experiência ampliada e Escape devolve ao gatilho', async ({ page }) => {
  await page.goto('/')
  await expand(page).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  for (let n = 0; n < 15; n++) {
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(expand(page)).toBeFocused()
})

test('o palpite mantém pergunta e alternativas juntas, sem controles, ao ampliar', async ({
  page,
}) => {
  await page.goto('/?block=experiencia-coordenadas')
  const choices = page.getByRole('button', { name: 'Para baixo', exact: true })
  await expect(choices).toBeVisible()
  await expand(page).click()
  await expect(page.locator('.sz-scene-prancha')).toHaveCount(0)
  await expect(page.locator('.sz-scene-console-actions')).toContainText('Se o y AUMENTAR')
  await close(page).click()
  await expect(choices).toBeVisible()
  await expand(page).click()
  await choices.click()
  await expect(page.locator('.sz-scene-prancha')).toBeVisible()
  await expect(page.getByRole('dialog')).toBeVisible()
  await close(page).click()
  await expect(page.locator('.sz-scene-prancha')).toBeVisible()
})

for (const block of [
  'experiencia-coordenadas',
  'experiencia-criar-mostrar',
  'experiencia-quadro',
  'experiencia-camadas',
]) {
  test(`outra experiência do piloto: ${block}`, async ({ page }, info) => {
    await page.goto(`/?block=${block}&width=900`)
    await expectLayout(page, true)
    if (block === 'experiencia-coordenadas')
      await page.getByRole('button', { name: 'Para baixo', exact: true }).click()
    if (block === 'experiencia-criar-mostrar')
      await page.getByRole('button', { name: 'A tela fica vazia', exact: true }).click()
    await expectBalancedSceneMargins(page)
    await page.screenshot({ path: info.outputPath('inline.png') })
    for (const region of await page
      .locator('.sz-scene-console-visual, .sz-scene-console-actions')
      .all()) {
      expect(await region.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    }
    await expand(page).click()
    await expectFullyVisible(page.locator('.sz-scene-console-visual'))
    await expectBalancedSceneMargins(page)
    await expect(page.locator('.sz-scene-console-actions')).toBeVisible()
    await close(page).click()
    await expect(expand(page)).toBeFocused()
    await expectLayout(page, true)
  })
}

for (const viewport of [
  { width: 1366, height: 768, panel: 900 },
  { width: 390, height: 844, panel: 620 },
]) {
  test(`camadas começa com parte da nave à vista em ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto(`/?block=experiencia-camadas&width=${viewport.panel}`)
    const composition = await page.locator('.sz-scene-console-mundo svg').evaluate((svg) => {
      const ship = svg.querySelector('[data-figure="nave"]')?.getBoundingClientRect()
      const starCard = svg.querySelector('[data-figure="estrelas"] rect')?.getBoundingClientRect()
      if (!ship || !starCard) throw new Error('Nave ou cartão de estrelas ausente')
      const caption = [...svg.querySelectorAll('text')]
        .find((text) => text.textContent?.includes('Quem fica na frente'))
        ?.getBoundingClientRect()
      return {
        visibleFraction: (starCard.left - ship.left) / ship.width,
        captionCovered: Boolean(
          caption &&
            caption.left < starCard.right &&
            caption.right > starCard.left &&
            caption.top < starCard.bottom &&
            caption.bottom > starCard.top,
        ),
      }
    })
    expect(composition.visibleFraction).toBeGreaterThan(0.35)
    expect(composition.visibleFraction).toBeLessThan(0.8)
    expect(composition.captionCovered).toBe(false)
  })
}

for (const size of [
  { width: 1366, height: 768, panel: 320 },
  { width: 390, height: 844, panel: 620 },
  { width: 320, height: 568, panel: 620 },
  { width: 1280, height: 600, panel: 620 },
  { width: 1920, height: 600, panel: 620 },
]) {
  test(`os controles cabem em ${size.width}x${size.height}, painel ${size.panel}`, async ({
    page,
  }, info) => {
    await page.setViewportSize(size)
    await page.goto(`/?width=${size.panel}`)
    await expect(jeito(page, SEMPRE)).toBeVisible()
    await fits(page)
    await jeito(page, SEMPRE).click()
    await fits(page)
    await page.screenshot({ path: info.outputPath('inline.png'), fullPage: true })
    await expand(page).click()
    await fits(page)
    await expectMundoSemRolagem(page)
    if (size.width >= 960) {
      await expectFullyVisible(page.locator('.sz-scene-console-mundo svg').first())
    }
    await expect(close(page)).toBeInViewport({ ratio: 1 })
    await page.getByRole('button', { name: 'Começar o jogo', exact: true }).click()
    await expect(terminado(page)).toBeVisible({ timeout: 20_000 })
    await expect(andou(page)).toContainText(/[1-9]\d* vezes/)
    await expect(close(page)).toBeInViewport({ ratio: 1 })
    await close(page).click()
  })
}

/* O encaixe pela altura vale para TODO palco (01/10/2026): o simples (`areas`), a COMPARAÇÃO lado a
 * lado com títulos (`criar-mostrar`, mundo `world`, que começa num palpite) e o que tem recorte
 * estreito (`camadas`). Antes só o simples encaixava, e errando a borda; os outros ficavam com a
 * altura natural e o mundo rolava por dentro (até 270px). A 1366×657 (um notebook de 768 com a barra
 * do navegador) tudo cabe sem rolagem nenhuma; a 1280×600 o desenho bate no piso de 160px (ou a
 * comparação na largura mínima do lado a lado) e o CARTÃO do mundo pode rolar, mas o mundo por dentro
 * nunca, e o desenho fica inteiro à vista. */
const CABE = { cartaoRola: false }
const CARTAO_ROLA = { cartaoRola: true }
for (const caso of [
  {
    // ⚠️ Na tela livre a figura da ideia mora embaixo do palco, no mesmo cartão: a 1366×657 o
    // desenho chega ao piso e o cartão rola (a regra dela), e numa janela alta tudo cabe.
    block: 'experiencia-areas',
    nome: 'palco simples',
    janelas: [
      { width: 1920, height: 937, ...CABE },
      { width: 1366, height: 657, ...CARTAO_ROLA },
    ],
  },
  {
    // A comparação para na largura mínima do lado a lado (os dois lados legíveis) e, com o HUD
    // desta cena, só cabe sem rolar numa janela alta; abaixo disso o cartão rola, mas ela não
    // empilha nem encolhe além do mínimo (medido: antes espiralava até 117px).
    block: 'experiencia-criar-mostrar',
    nome: 'comparação lado a lado, depois do palpite',
    ladoALado: true,
    janelas: [
      { width: 1920, height: 937, ...CABE },
      { width: 1366, height: 657, ...CARTAO_ROLA },
    ],
  },
  {
    block: 'experiencia-camadas',
    nome: 'recorte estreito',
    janelas: [
      { width: 1920, height: 937, ...CABE },
      { width: 1366, height: 657, ...CARTAO_ROLA },
    ],
  },
]) {
  for (const size of caso.janelas) {
    test(`ampliado: ${caso.nome} cabe inteiro em ${size.width}x${size.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(size)
      await page.goto(`/?block=${caso.block}&width=900`)
      await expand(page).click()
      await expectLayout(page, true)
      // No palpite o mundo mostra o retrato: ele também encaixa. Responder abre o palco de verdade
      // (o palpite da `world` vem do modelo da cena, não do manifesto: a opção é achada pela estrutura).
      await expectMundoSemRolagem(page)
      if (await page.getByTestId('scene-prediction-preview').isVisible()) {
        await page
          .locator('fieldset', { hasText: 'Escolha o que você acha' })
          .locator('button')
          .first()
          .click()
        await expect(page.locator('.sz-discovery-proposed')).toBeVisible()
      }
      await expectMundoSemRolagem(page)
      const desenho = page.locator('.sz-scene-console-mundo svg').first()
      if (size.cartaoRola) {
        // O cartão do mundo pode rolar, mas o desenho não é esmagado: fica no piso de 160px (ou a
        // comparação na largura mínima do lado a lado), inteiro, por dentro de um mundo que não rola.
        expect(
          await desenho.evaluate((el) => el.getBoundingClientRect().height),
        ).toBeGreaterThanOrEqual(150)
        if (caso.ladoALado) await expect(page.locator('[data-lado-a-lado]')).toBeVisible()
      } else {
        await expectFullyVisible(desenho)
        expect(
          await page
            .locator('.sz-scene-console-visual')
            .evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
        ).toBe(true)
      }
      // ⚠️ O pé do mundo (Desfazer, Recomeçar e a frase da situação numa linha) era da bancada
      // antiga: na tela livre, Desfazer e Uma pista ficam na coluna das ações, e embaixo do palco
      // fica a figura da ideia, no mesmo cartão do mundo.
      await expect(page.locator('.sz-scene-console-visual .sz-discovery-evidence')).toBeVisible()
    })
  }
}
