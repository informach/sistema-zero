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
    // ⭐ Moldura nova (08/11/2026): ampliada, a tela do jogo divide a altura com o filme dos quadros
    // e os controles, e encolhe para os três caberem juntos (a criança segura a tecla olhando a
    // cena e o filme). Por isso aqui ela não ocupa a largura toda: fica inteira, legível, e a tecla
    // de seta continua à vista.
    await expect
      .poll(() =>
        page
          .locator('.sz-scene-console-mundo .sz-scene-frame')
          .evaluate((el) => Math.round(el.getBoundingClientRect().width)),
      )
      .toBeGreaterThanOrEqual(300)
    await expect(
      page.getByRole('button', { name: 'Seta para a direita: segure para o personagem andar' }),
    ).toBeInViewport({ ratio: 1 })

    // O mesmo palco passa pelo celular e volta ao computador, sem reiniciar a experiência.
    await page.setViewportSize({ width: 390, height: 844 })
    await expectLarguraToda(page)
    if (block === 'experiencia-limite') {
      // A tela do jogo inteira mais a faixa fora da tela (480 + 96), sem recorte.
      await expect(page.locator('.sz-scene-frame > svg')).toHaveAttribute('viewBox', '0 0 576 360')
    }
    await page.setViewportSize({ width: 1440, height: 1000 })
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
