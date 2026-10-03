import { expect, type Page, test } from '@playwright/test'

/**
 * "Assistir ao vídeo antes da atividade" e o vídeo flutuante (03/10/2026), no Chromium, com a
 * aula de verdade: vídeo nativo curto à esquerda e o jogo pronto do Cadê Todo Mundo? à direita.
 */

async function fonts(page: Page) {
  // Os nomes vêm do next/font no app; o ensaio usa os mesmos tokens sem rede.
  await page.addStyleTag({ content: ':root { --font-baloo: "Baloo 2"; --font-nunito: Nunito; }' })
}

/** Toca mudo: o navegador sempre aceita, e o ensaio não depende de gesto. */
async function play(page: Page, rate = 1) {
  await page.locator('video').evaluate(async (video: HTMLVideoElement, playbackRate) => {
    video.muted = true
    video.playbackRate = playbackRate
    await video.play()
  }, rate)
}

const videoTime = (page: Page) =>
  page.locator('video').evaluate((video: HTMLVideoElement) => video.currentTime)

test('a atividade abre depois de ver o vídeo uma vez', async ({ page }, info) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('/lesson-video?gate')
  await fonts(page)
  const aviso = page.getByRole('heading', { name: 'Primeiro, assista ao vídeo' })
  await expect(aviso).toBeVisible()
  // O jogo está atrás do véu e inerte: o clique no botão de ampliar cai no aviso.
  const ampliar = page.getByRole('button', { name: 'Ampliar jogo' })
  expect(await ampliar.evaluate((el) => el.closest('[inert]') !== null)).toBe(true)
  const alvo = await ampliar.boundingBox()
  if (!alvo) throw new Error('Botão sem caixa')
  const noTopo = await page.evaluate(
    ({ x, y }) => document.elementFromPoint(x, y)?.closest('[inert]') === null,
    { x: alvo.x + alvo.width / 2, y: alvo.y + alvo.height / 2 },
  )
  expect(noTopo).toBe(true)
  await page.screenshot({ path: info.outputPath('aviso-1366.png') })
  await page.getByRole('button', { name: 'Ver o vídeo' }).click()
  await page.locator('video').evaluate((video: HTMLVideoElement) => {
    video.muted = true
    video.playbackRate = 3
  })
  await expect(aviso).toHaveCount(0, { timeout: 15_000 })
  await expect(page.getByText('Pronto! Agora assista de novo e faça junto')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ampliar jogo' })).toBeVisible()
  await page.screenshot({ path: info.outputPath('liberado-1366.png') })
})

test('o aviso cabe no celular', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/lesson-video?gate')
  await fonts(page)
  const card = page.locator('.sz-lesson-video-gate-card')
  await card.scrollIntoViewIfNeeded()
  await expect(card).toBeInViewport({ ratio: 1 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('aviso-390.png'), fullPage: true })
})

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 390, height: 844 },
  // Celular deitado (o Safari deixa ~340px úteis): o caso em que o vídeo cobria a saída.
  { width: 844, height: 340 },
]) {
  test(`ampliar com o vídeo tocando faz o MESMO vídeo flutuar (${viewport.width}px)`, async ({
    page,
  }, info) => {
    await page.setViewportSize(viewport)
    await page.goto('/lesson-video')
    await fonts(page)
    const video = await page.locator('video').elementHandle()
    const lugar = page.locator('.sz-lesson-video-slot')
    const alturaDoLugar = await lugar.evaluate((el) => el.getBoundingClientRect().height)
    await play(page)
    await page.getByRole('button', { name: 'Ampliar jogo' }).click()
    const flutuante = page.getByRole('region', { name: 'Vídeo da aula' })
    await expect(flutuante).toBeVisible()
    await expect(flutuante).toBeInViewport({ ratio: 1 })
    // ⚠️⚠️ Nunca por cima da SAÍDA da tela ampliada, em nenhuma janela.
    const saida = await page.getByRole('button', { name: 'Voltar à aula' }).boundingBox()
    const caixa = await flutuante.boundingBox()
    if (!saida || !caixa) throw new Error('Sem caixa')
    const cobre =
      caixa.x < saida.x + saida.width &&
      caixa.x + caixa.width > saida.x &&
      caixa.y < saida.y + saida.height &&
      caixa.y + caixa.height > saida.y
    expect(cobre).toBe(false)
    // O lugar do vídeo na aula guarda a altura enquanto ele flutua (a rolagem não pula na volta).
    expect(await lugar.evaluate((el) => el.getBoundingClientRect().height)).toBeCloseTo(
      alturaDoLugar,
      0,
    )
    // Por cima da tela ampliada de verdade: quem está no centro dele é ele mesmo.
    const box = await flutuante.boundingBox()
    if (!box) throw new Error('Flutuante sem caixa')
    const topo = await page.evaluate(
      ({ x, y }) => document.elementFromPoint(x, y)?.closest('[role="region"]')?.ariaLabel ?? null,
      { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    )
    expect(topo).toBe('Vídeo da aula')
    expect(box.width).toBeGreaterThanOrEqual(viewport.width < 640 ? 160 : 200)
    // ⚠️⚠️ O MESMO elemento, tocando sem recomeçar.
    expect(await video?.evaluate((el) => el.isConnected)).toBe(true)
    const antes = await videoTime(page)
    await page.waitForTimeout(700)
    expect(await videoTime(page)).toBeGreaterThan(antes)
    expect(await page.locator('video').evaluate((el: HTMLVideoElement) => el.paused)).toBe(false)
    await page.screenshot({ path: info.outputPath(`flutuante-${viewport.width}.png`) })

    await page.getByRole('button', { name: 'Minimizar o vídeo' }).click()
    await expect(flutuante).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Abrir o vídeo da aula' })).toBeVisible()
    await page.screenshot({ path: info.outputPath(`pilula-${viewport.width}.png`) })
    await page.getByRole('button', { name: 'Abrir o vídeo da aula' }).click()
    await expect(flutuante).toBeVisible()

    await page.getByRole('button', { name: 'Voltar à aula' }).click()
    await expect(flutuante).toHaveCount(0)
    expect(await page.locator('video').evaluate((el: HTMLVideoElement) => el.paused)).toBe(false)
    expect(await video?.evaluate((el) => el.isConnected)).toBe(true)
  })
}

test('arrastar encaixa no canto, a alça muda o tamanho, e o Tab passa pelo flutuante', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('/lesson-video')
  await fonts(page)
  await play(page)
  await page.getByRole('button', { name: 'Ampliar jogo' }).click()
  const flutuante = page.getByRole('region', { name: 'Vídeo da aula' })
  await expect(flutuante).toHaveAttribute('data-corner', 'top-right')

  const mover = page.getByRole('button', { name: 'Vídeo da aula: mover para outro canto' })
  const alca = await mover.boundingBox()
  if (!alca) throw new Error('Alça sem caixa')
  await page.mouse.move(alca.x + alca.width / 2, alca.y + alca.height / 2)
  await page.mouse.down()
  await page.mouse.move(200, 600, { steps: 8 })
  await page.mouse.up()
  await expect(flutuante).toHaveAttribute('data-corner', 'bottom-left')
  // Encostado no canto, com o respiro.
  await expect
    .poll(async () => {
      const box = await flutuante.boundingBox()
      return box ? Math.round(box.x) : -1
    })
    .toBe(16)

  const largura = (await flutuante.boundingBox())?.width ?? 0
  const tamanho = page.getByRole('slider', { name: 'Tamanho do vídeo' })
  const grip = await tamanho.boundingBox()
  if (!grip) throw new Error('Alça de tamanho sem caixa')
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2)
  await page.mouse.down()
  await page.mouse.move(grip.x + grip.width / 2 + 120, grip.y + grip.height / 2, { steps: 6 })
  await page.mouse.up()
  await expect
    .poll(async () => (await flutuante.boundingBox())?.width ?? 0)
    .toBeGreaterThan(largura + 100)

  // Teclado: o Tab roda pelo flutuante (inclusive os controles do vídeo) e volta à tela
  // ampliada. Começa no flutuante porque o iframe do jogo tem Tab próprio.
  await mover.focus()
  const alcançados: string[] = []
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Tab')
    alcançados.push(
      await page.evaluate(() => {
        const ativo = document.activeElement
        return ativo?.getAttribute('aria-label') ?? ativo?.textContent?.trim() ?? ''
      }),
    )
  }
  expect(alcançados.slice(0, 2)).toEqual(['Minimizar o vídeo', 'Tamanho do vídeo'])
  expect(alcançados[3]).toBe('Jogar de novo')
  // O lugar fica guardado: reabrir a página volta ao canto escolhido.
  await page.keyboard.press('Escape')
  await page.reload()
  await fonts(page)
  await play(page)
  await page.getByRole('button', { name: 'Ampliar jogo' }).click()
  await expect(page.getByRole('region', { name: 'Vídeo da aula' })).toHaveAttribute(
    'data-corner',
    'bottom-left',
  )
})
