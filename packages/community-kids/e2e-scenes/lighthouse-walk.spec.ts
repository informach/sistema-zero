import { expect, type Page, test } from '@playwright/test'

/**
 * O andar do personagem do Farol (`lighthouse-walk`, Dia 1 do Desafio), nos dois usos do
 * manifesto. A régua é o navegador de verdade: os controles de cada caso com os nomes que os roteiros
 * citam, o "Rodar" que para SOZINHO (o relógio do player com `sceneClockShouldStop`), e o palco e a
 * bancada inteiros à vista, sem rolagem de lado no celular. A comparação de velocidade saiu do curso.
 */
const abrir = async (page: Page, bloco: string) => {
  await page.goto(`/?course=farol&block=${bloco}&width=680`)
  await expect(page.getByRole('button', { name: 'Rodar' })).toBeVisible()
}
const faixa = (page: Page, rotulo: string) =>
  page.locator('.sz-scene-hud-tile').filter({ has: page.locator('dt', { hasText: rotulo }) })

test('o andar: só a seta e o tempo; um quadro com a seta anda 3, sem a seta não anda', async ({
  page,
}) => {
  await abrir(page, 'experiencia-quadro')
  await expect(page.getByRole('button', { name: /^Velocidade 1$/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Manter dentro da tela/ })).toHaveCount(0)
  // O tempo é o da bancada: nem o ▶ "Tempo" nem o Recomeçar geral.
  await expect(page.getByRole('button', { name: 'Soltar o tempo' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Recomeçar', exact: true })).toHaveCount(1)
  const x = faixa(page, 'x').locator('dd')
  await page.getByRole('button', { name: 'Avançar 1 quadro' }).click()
  await expect(faixa(page, 'quadro').locator('dd')).toHaveText('1')
  await expect(x).toHaveText('208')
  await page.getByRole('button', { name: /^Segurar a seta para a direita/ }).click()
  await page.getByRole('button', { name: 'Avançar 1 quadro' }).click()
  await expect(x).toHaveText('211')
})

test('o limite: sem ele o Rodar leva o personagem para fora e para sozinho; com ele, fica na borda', async ({
  page,
}) => {
  await abrir(page, 'experiencia-limite')
  await page.getByRole('button', { name: /^Segurar a seta para a direita/ }).click()
  await page.getByRole('button', { name: 'Rodar' }).click()
  await expect(page.getByRole('button', { name: 'Parar' })).toBeVisible()
  // Sai inteiro em ~3 s e o Rodar fecha: o próximo passo é o Recomeçar.
  await expect(page.locator('[data-personagem="fora"]')).toBeVisible({ timeout: 8000 })
  await expect(page.getByRole('button', { name: 'Rodar' })).toHaveAttribute('aria-disabled', 'true')
  // Fechado não é escondido: a nota à vista diz o caminho, e o leitor a ouve no próprio Rodar.
  await expect(page.getByRole('button', { name: 'Rodar' })).toHaveAccessibleDescription(
    'O personagem saiu da tela. Clique em Recomeçar ou ligue Manter dentro da tela.',
  )
  await page.getByRole('button', { name: 'Recomeçar', exact: true }).click()
  await page.getByRole('button', { name: /^Manter dentro da tela/ }).click()
  await page.getByRole('button', { name: 'Rodar' }).click()
  // Na borda o x para em 416 e, 2 s parado, o Rodar para sozinho.
  await expect(faixa(page, 'x').locator('dd')).toHaveText('416', { timeout: 8000 })
  await expect(page.getByRole('button', { name: 'Rodar' })).toBeVisible({ timeout: 6000 })
  await expect(page.locator('[data-personagem="dentro"]')).toBeVisible()
})

/**
 * ⚠️ No celular os rótulos longos QUEBRAM linha (`.sz-scene-quebra`, scene.css): "Segurar a seta para a
 * direita: desligado" tem 273px numa linha só e passava da bancada a 390 e 360; a 320 a página rolava de
 * lado. A régua mede a caixa de CADA controle contra a caixa do console, nas duas experiências e nas três
 * larguras, e confere que a página não rola de lado.
 */
for (const largura of [320, 360, 390]) {
  test(`no celular de ${largura}px, cada controle cabe no console e a página não rola de lado`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: largura, height: 844 })
    for (const bloco of ['experiencia-quadro', 'experiencia-limite']) {
      await abrir(page, bloco)
      const medida = await page.evaluate(() => {
        const caixa = document.querySelector('.sz-scene-console')?.getBoundingClientRect()
        const controles = [...document.querySelectorAll('.sz-scene-prancha button')].map((b) => {
          const r = b.getBoundingClientRect()
          return { nome: b.textContent?.trim() ?? '', esquerda: r.left, direita: r.right }
        })
        return {
          caixa: caixa ? { esquerda: caixa.left, direita: caixa.right } : null,
          controles,
          pagina: document.documentElement.scrollWidth,
          janela: document.documentElement.clientWidth,
        }
      })
      const caixa = medida.caixa
      if (!caixa) throw new Error(`${bloco}: sem o console`)
      expect(medida.controles.map((c) => c.nome)).toContain(
        'Segurar a seta para a direita: desligado',
      )
      const fora = medida.controles
        .filter((c) => c.esquerda < caixa.esquerda - 0.5 || c.direita > caixa.direita + 0.5)
        .map((c) => `${c.nome} (${Math.round(c.esquerda)}..${Math.round(c.direita)})`)
      expect({ bloco, largura, fora }).toEqual({ bloco, largura, fora: [] })
      expect({ bloco, largura, pagina: medida.pagina }).toEqual({
        bloco,
        largura,
        pagina: medida.janela,
      })
    }
  })
}
