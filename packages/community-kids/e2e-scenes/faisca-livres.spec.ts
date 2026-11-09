import { expect, test } from '@playwright/test'
import { abrir, andar2d, andar3d, feitas } from './faisca-helpers'

/**
 * As telas livres do Faísca (08/11/2026, proposta "Experiências do Faísca" aprovada), com os
 * manifestos reais: a Ilha do Farol (as quatro experiências 3D) e os quatro Poderes. O personagem
 * ANDA até as coisas com as setas (os botões de gesto saíram), e chegar perto é o gesto do jogo.
 * Aqui, uma descoberta por experiência num navegador de verdade, e a tela no celular.
 */
test.describe('os Poderes: andar até as coisas é o gesto do jogo', () => {
  test('ponte: ir até a ponte sem puxar a alavanca', async ({ page }) => {
    await abrir(page, 'ponte', 'experiencia')
    await expect(page.getByRole('button', { name: 'Puxar a alavanca' })).toHaveCount(0)
    await page.mouse.click(5, 5)
    await andar2d(page, [200, 141], [200, 262])
    await expect(feitas(page)).toHaveCount(1)
    await expect(page.getByText('A ponte está aberta?')).toBeVisible()
  })

  test('moedas: passar em duas moedas soma no número do jogo', async ({ page }) => {
    await abrir(page, 'moedas', 'experiencia')
    await page.mouse.click(5, 5)
    await andar2d(page, [21, 134], [140, 134])
    // Duas descobertas: cada moeda soma 1, e sair da primeira mostra o número guardado.
    await expect(feitas(page)).toHaveCount(2)
    await expect(page.locator('.sz-discovery-livre-caderno')).toContainText('2')
    // A pergunta do baú é uma peça que se troca.
    const troca = page.locator('.sz-discovery-livre-troca')
    await expect(troca).toContainText('pelo menos')
    await troca.click()
    await expect(troca).toContainText('exatamente')
  })

  test('símbolos: o sol e depois a lua andam o passo da placa', async ({ page }) => {
    await abrir(page, 'simbolos', 'experiencia')
    await page.mouse.click(5, 5)
    await andar2d(page, [12, 150], [12, 230], [12, 150], [92, 150], [92, 230])
    await expect(feitas(page)).toHaveCount(1)
    await expect(page.locator('.sz-discovery-livre-caderno')).toContainText('2 de 3')
  })

  test('cabana: ir até a porta sem nenhuma peça', async ({ page }) => {
    await abrir(page, 'cabana', 'experiencia')
    await page.mouse.click(5, 5)
    await andar2d(page, [24, 150], [24, 272])
    await expect(feitas(page)).toHaveCount(1)
    await expect(page.locator('.sz-discovery-livre-troca')).toContainText(/Tem a chave\s*e\s*⇄/)
  })
})

test.describe('a Ilha do Farol: a cena é o jogo 3D do curso', () => {
  test('ponto de vista: trocar a câmera mostra a chave', async ({ page }) => {
    await abrir(page, 'ilha', 'experiencia-ponto-de-vista')
    const lado = page.getByRole('group', { name: 'Onde fica a câmera' }).getByRole('button', {
      name: 'Lado',
    })
    await expect(lado).toBeEnabled({ timeout: 30_000 })
    await lado.click()
    await expect(feitas(page)).toHaveCount(1)
    await expect(page.locator('.sz-discovery-palpite-grande')).toBeVisible()
  })

  test('os três números: o x para os dois lados mostra o papel dele', async ({ page }) => {
    await abrir(page, 'ilha', 'experiencia-posicao-3d')
    const mais = page.getByRole('button', { name: 'x mais meio' })
    await expect(mais).toBeEnabled({ timeout: 30_000 })
    await mais.click()
    await page.getByRole('button', { name: 'x menos meio' }).click()
    await expect(feitas(page)).toHaveCount(1)
    await expect(page.getByText('anda no chão').first()).toBeVisible()
  })

  test('contato: o resultado fica na cena, e olhar de lado mostra o espaço', async ({ page }) => {
    await abrir(page, 'ilha', 'experiencia-contato-3d')
    await expect(page.locator('.sz-discovery-livre-encontro')).toHaveText(/Não encostou/)
    const lado = page.getByRole('group', { name: 'Onde fica a câmera' }).getByRole('button', {
      name: 'Lado',
    })
    await expect(lado).toBeEnabled({ timeout: 30_000 })
    await lado.click()
    await expect(feitas(page)).toHaveCount(1)
    await page.getByRole('button', { name: 'y menos meio' }).click()
    await page.getByRole('button', { name: 'y menos meio' }).click()
    await expect(page.locator('.sz-discovery-livre-encontro')).toHaveText(/Encostou/)
    await expect(feitas(page)).toHaveCount(2)
  })

  test('a porta com o não: na ilha 3D, o "não" troca a resposta da porta', async ({ page }) => {
    await abrir(page, 'ilha', 'experiencia-pergunta-com-nao')
    await expect(page.locator('.sz-discovery-livre-ilha-jogo[data-ready="true"]')).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByText('Dar a chave ao personagem')).toHaveCount(0)
    await page.mouse.click(5, 5)
    await andar3d(page, 0.5, 0.75)
    await andar3d(page, 4.2, 0.75)
    // Sem a chave e sem o "não", a porta obedece ao SIM e abre.
    await expect(page.locator('.sz-discovery-livre-balao3d')).toContainText('SIM')
    // Parado no farol, encaixar o "não" faz a porta responder de novo, na hora.
    await page.locator('.sz-discovery-livre-encaixe').click()
    await expect(page.locator('.sz-discovery-livre-balao3d')).toContainText('NÃO')
    await expect(feitas(page)).toHaveCount(1)
  })
})

test.describe('no celular (390 px), nada passa da largura da tela', () => {
  for (const [curso, bloco] of [
    ['ponte', 'experiencia'],
    ['moedas', 'experiencia'],
    ['simbolos', 'experiencia'],
    ['cabana', 'experiencia'],
    ['ilha', 'experiencia-ponto-de-vista'],
    ['ilha', 'experiencia-posicao-3d'],
    ['ilha', 'experiencia-contato-3d'],
    ['ilha', 'experiencia-pergunta-com-nao'],
  ] as const) {
    test(`${curso} · ${bloco}`, async ({ page }) => {
      const erros: string[] = []
      page.on('pageerror', (e) => erros.push(e.message))
      await abrir(page, curso, bloco, 390)
      // Na Ilha, mede com a cena 3D já montada (o canvas, o aviso e os controles de verdade).
      if (curso === 'ilha')
        await expect(page.locator('.sz-island-world[data-ready="true"]')).toBeVisible({
          timeout: 30_000,
        })
      const medida = await page.evaluate(() => ({
        conteudo: document.documentElement.scrollWidth,
        janela: innerWidth,
      }))
      expect(medida.conteudo, JSON.stringify(medida)).toBeLessThanOrEqual(medida.janela)
      expect(erros).toEqual([])
    })
  }
})
