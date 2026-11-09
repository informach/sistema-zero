import { expect, type Page, test } from '@playwright/test'
import { abrir, andar2d, andar3d, feitas } from './faisca-helpers'

test.describe('Faísca: percursos completos e escolhas fora da ordem', () => {
  test.setTimeout(90_000)
  const novoJogo = (page: Page) => page.getByRole('button', { name: /Jogar de novo/ }).click()
  const trocar = (page: Page) => page.locator('.sz-discovery-livre-troca').click()
  const completo = async (page: Page, metas: number) => {
    await expect(feitas(page)).toHaveCount(metas)
    await expect(page.getByText('A ideia que você descobriu')).toBeVisible()
  }

  test('Ponte: atravessa, espera subir, puxa novamente e compara o relógio da partida', async ({
    page,
  }) => {
    await abrir(page, 'ponte', 'experiencia')
    await andar2d(page, [210, 141], [210, 262], [250, 262])
    await page.keyboard.down('ArrowLeft')
    try {
      await expect(page.locator('[data-sino="tocando"]')).toBeVisible()
    } finally {
      await page.keyboard.up('ArrowLeft')
    }
    await novoJogo(page)
    await andar2d(page, [250, 141], [250, 262])
    await expect(feitas(page)).toHaveCount(4, { timeout: 6000 })
    await andar2d(page, [310, 262], [250, 262])
    await expect(feitas(page)).toHaveCount(5)
    await trocar(page)
    await andar2d(page, [250, 141], [250, 262])
    await expect(page.locator('[data-relogio="parado"]')).toBeVisible({ timeout: 6000 })
    await andar2d(page, [310, 262], [250, 262])
    await completo(page, 6)
  })

  test('Moedas: soma, conserva, compara sumiço e testa as duas perguntas do baú', async ({
    page,
  }) => {
    await abrir(page, 'moedas', 'experiencia')
    await andar2d(page, [130, 134], [80, 134])
    await page.getByRole('switch').click()
    await andar2d(page, [180, 134], [240, 134], [180, 134])
    await novoJogo(page)
    await andar2d(page, [80, 134], [20, 134], [20, 250])
    await andar2d(page, [20, 134], [312, 134], [80, 134], [80, 40], [20, 40], [20, 250])
    await trocar(page)
    await completo(page, 6)
  })

  test('Símbolos: conclui a ordem, erra, recupera e compara com a contagem', async ({ page }) => {
    await abrir(page, 'simbolos', 'experiencia')
    await andar2d(page, [12, 230], [92, 230], [172, 230])
    await expect(page.locator('.sz-discovery-livre-caderno')).toContainText('3 de 3')
    await expect(page.getByRole('img', { name: 'A ordem dos símbolos' })).toHaveAccessibleName(
      /Passo 3 de 3/,
    )
    await novoJogo(page)
    await expect(page.locator('.sz-discovery-livre-caderno')).toContainText('0 de 3')
    await andar2d(
      page,
      [12, 230],
      [12, 170],
      [172, 170],
      [172, 230],
      [92, 230],
      [12, 230],
      [92, 230],
      [172, 230],
    )
    await trocar(page)
    await andar2d(page, [172, 141], [172, 230], [92, 230], [12, 230])
    await completo(page, 6)
  })

  test('Cabana: nenhuma peça, uma peça, as duas em ambas as ordens e a troca para ou', async ({
    page,
  }) => {
    await abrir(page, 'cabana', 'experiencia')
    await andar2d(
      page,
      [24, 150],
      [24, 272],
      [24, 150],
      [195, 150],
      [195, 40],
      [24, 150],
      [24, 272],
    )
    await andar2d(page, [180, 248], [24, 272])
    await novoJogo(page)
    await andar2d(page, [180, 248], [195, 40], [24, 150], [24, 272])
    await novoJogo(page)
    await trocar(page)
    await andar2d(page, [24, 150], [195, 150], [195, 40], [24, 150], [24, 272])
    await completo(page, 5)
  })

  test('Cabana: trocar ou por e na porta com uma peça fecha e registra a mesma resposta', async ({
    page,
  }) => {
    await abrir(page, 'cabana', 'experiencia')
    await trocar(page)
    await andar2d(page, [195, 141], [195, 40], [24, 150], [24, 272])
    const palco = page.getByRole('img', { name: 'A porta com duas peças' })
    await expect(palco).toHaveAccessibleName(/cabana está aberta/)
    await trocar(page)
    await expect(palco).toHaveAccessibleName(/cabana está fechada/)
    await expect(
      page.locator('.sz-discovery-foto').filter({ hasText: 'Com uma peça ("e")' }),
    ).toContainText('ficou fechada')
    await expect(page.locator('.sz-discovery-moldura')).not.toContainText(
      'Você tinha as duas peças',
    )
    await trocar(page)
    await expect(palco).toHaveAccessibleName(/cabana está aberta/)
  })

  test('Moedas: após pegar todas, a orientação permite reiniciar e comparar', async ({ page }) => {
    await abrir(page, 'moedas', 'experiencia')
    await andar2d(page, [312, 134], [80, 134], [80, 40], [80, 134])
    await page.getByRole('switch').click()
    await expect(page.locator('.sz-discovery-fala-bloco')).toContainText(
      'As moedas acabaram. Jogue de novo',
    )
    const antes = await feitas(page).count()
    await novoJogo(page)
    await expect(feitas(page)).toHaveCount(antes)
    await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
    await andar2d(page, [80, 134], [20, 134], [80, 134])
    await expect(feitas(page).filter({ hasText: 'a mesma moeda conta de novo' })).toHaveCount(1)
  })

  test('Ilha: ponto de vista aceita explorar uma resposta errada e descobrir a câmera', async ({
    page,
  }) => {
    await abrir(page, 'ilha', 'experiencia-ponto-de-vista')
    const camera = page.getByRole('group', { name: 'Onde fica a câmera' })
    await expect(camera.getByRole('button', { name: 'Lado' })).toBeEnabled({ timeout: 30_000 })
    await camera.getByRole('button', { name: 'Lado' }).click()
    await page.getByRole('button', { name: /O lugar da chave/ }).click()
    await camera.getByRole('button', { name: 'Frente' }).click()
    await page.getByRole('button', { name: /O lugar da câmera/ }).click()
    await completo(page, 2)
  })

  test('Ilha: os três eixos nos dois sentidos', async ({ page }) => {
    await abrir(page, 'ilha', 'experiencia-posicao-3d')
    await expect(page.getByRole('button', { name: 'x mais meio' })).toBeEnabled({ timeout: 30_000 })
    for (const eixo of ['x', 'y', 'z']) {
      await page.getByRole('button', { name: `${eixo} mais meio` }).click()
      await page.getByRole('button', { name: `${eixo} menos meio` }).click()
    }
    await completo(page, 3)
  })

  test('Ilha: observa a separação e aproxima até encostar', async ({ page }) => {
    await abrir(page, 'ilha', 'experiencia-contato-3d')
    const lado = page
      .getByRole('group', { name: 'Onde fica a câmera' })
      .getByRole('button', { name: 'Lado' })
    await expect(lado).toBeEnabled({ timeout: 30_000 })
    await lado.click()
    await page.getByRole('button', { name: 'y menos meio' }).click()
    await page.getByRole('button', { name: 'y menos meio' }).click()
    await expect(page.locator('.sz-discovery-livre-encontro')).toHaveText(/Encostou/)
    await completo(page, 2)
  })

  test('Ilha: compara o não sem chave e com chave', async ({ page }) => {
    await abrir(page, 'ilha', 'experiencia-pergunta-com-nao')
    await expect(page.locator('.sz-island-world[data-ready="true"]')).toBeVisible({
      timeout: 30_000,
    })
    await andar3d(page, 0.5, 0.75)
    await andar3d(page, 4.2, 0.75)
    await page.locator('.sz-discovery-livre-encaixe').click()
    await expect(feitas(page)).toHaveCount(1)
    for (const [x, z] of [
      [0.5, 0.75],
      [-3.4, 0.75],
      [-3.4, -2],
      [-3.4, 0.75],
      [0.5, 0.75],
      [4.2, 0.75],
    ])
      await andar3d(page, x!, z!)
    await page.locator('.sz-discovery-livre-encaixe').click()
    await completo(page, 2)
  })
})
