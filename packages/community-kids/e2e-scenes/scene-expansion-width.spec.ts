import { expect, type Page, test } from '@playwright/test'

async function expectLarguraToda(page: Page) {
  await expect
    .poll(() =>
      page.locator('.sz-scene-console-mundo').evaluate((mundo) => {
        const moldura = mundo.querySelector('.sz-scene-frame')
        if (!moldura) throw new Error('Palco ausente')
        return Math.abs(mundo.clientWidth - moldura.getBoundingClientRect().width)
      }),
    )
    .toBeLessThanOrEqual(1)
}

for (const [course, block] of [
  ['farol', 'experiencia-limite'],
  ['', 'experiencia-camadas'],
  ['dino', 'experiencia-velocidade'],
  ['dino', 'experiencia-variavel'],
  ['dino', 'experiencia-hitbox'],
]) {
  test(`${course || 'nave'}: ${block} mantém o encaixe estável em janela baixa`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 600 })
    await page.goto(`/?course=${course}&block=${block}&width=680`)
    await page.getByRole('button', { name: 'Ampliar experiência' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect
      .poll(() =>
        page.locator('.sz-scene-console-mundo').evaluate((mundo) => ({
          rola:
            mundo.scrollHeight > mundo.clientHeight + 1 ||
            mundo.scrollWidth > mundo.clientWidth + 1,
          overflow: getComputedStyle(mundo).overflowY,
        })),
      )
      .toEqual({ rola: false, overflow: 'visible' })
    await expect
      .poll(() =>
        page.locator('.sz-scene-frame > svg').evaluate(async (svg) => {
          const larguras: number[] = []
          for (let quadro = 0; quadro < 12; quadro++) {
            await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
            larguras.push(svg.getBoundingClientRect().width)
          }
          return {
            estavel: Math.max(...larguras) - Math.min(...larguras) <= 1,
            legivel: svg.getBoundingClientRect().height >= 150,
          }
        }),
      )
      .toEqual({ estavel: true, legivel: true })
  })
}

for (const block of ['experiencia-quadro', 'experiencia-limite']) {
  test(`Farol: ${block} usa a largura disponível ao ampliar e redimensionar`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto(`/?course=farol&block=${block}&width=680`)
    await expectLarguraToda(page)
    await page.getByRole('button', { name: 'Ampliar experiência' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expectLarguraToda(page)

    // O mesmo palco passa pelo celular e volta ao computador, sem reiniciar a experiência.
    await page.setViewportSize({ width: 390, height: 844 })
    await expectLarguraToda(page)
    if (block === 'experiencia-limite') {
      await expect(page.locator('.sz-scene-frame > svg')).toHaveAttribute(
        'viewBox',
        '150 44 426 232',
      )
    }
    await page.setViewportSize({ width: 1440, height: 1000 })
    await expectLarguraToda(page)
    if (block === 'experiencia-limite') {
      await expect(page.locator('.sz-scene-frame > svg')).toHaveAttribute('viewBox', '0 0 576 360')
    }
    await page.getByRole('button', { name: 'Voltar à aula' }).click()
    await expectLarguraToda(page)
  })
}

// Todas as outras experiências do Farol e as demais famílias que usam recorte estreito:
// caminhada, camadas, velocidade, variável e área de contato, em manifestos reais.
for (const [course, block] of [
  ['farol', 'experiencia-memoria'],
  ['farol', 'experiencia-porta'],
  ['farol', 'experiencia-posicao'],
  ['', 'experiencia-seta-e-velocidade'],
  ['', 'experiencia-tamanho-do-passinho'],
  ['', 'experiencia-limite-da-tela'],
  ['', 'experiencia-camadas'],
  ['dino', 'experiencia-camadas'],
  ['dino', 'experiencia-velocidade'],
  ['dino', 'experiencia-variavel'],
  ['dino', 'experiencia-hitbox'],
]) {
  test(`${course || 'nave'}: ${block} ocupa a coluna quando há altura para o desenho`, async ({
    page,
  }) => {
    // Reserva altura para a figura da descoberta abaixo do palco (três cartões na velocidade).
    await page.setViewportSize({ width: 1440, height: 1440 })
    await page.goto(`/?course=${course}&block=${block}&width=680`)
    await expectLarguraToda(page)
    await page.getByRole('button', { name: 'Ampliar experiência' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expectLarguraToda(page)
  })
}
