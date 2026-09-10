/**
 * A oficina da geração seguinte DENTRO do app, em navegador real: criar pelo fluxo de
 * sempre, promover ao abrir, modelar, voltar com miniatura e sobreviver ao recarregar.
 *
 * O playground liga a capacidade com `?oficina=app`; ligá-la de verdade para a criança é
 * decisão de rollout, não deste teste.
 */
import { expect, type Page, test } from '@playwright/test'

/** Chaves do IndexedDB do playground: é assim que se prova a promoção, não pela tela. */
async function storageKeys(page: Page): Promise<string[]> {
  return page.evaluate(
    () =>
      new Promise<string[]>((resolve, reject) => {
        const request = indexedDB.open('sistema-zero-molda-playground')
        request.onsuccess = () => {
          const db = request.result
          const tx = db.transaction('assets', 'readonly')
          const keys = tx.objectStore('assets').getAllKeys()
          tx.oncomplete = () => {
            db.close()
            resolve(keys.result.map(String))
          }
          tx.onerror = () => reject(tx.error)
        }
        request.onerror = () => reject(request.error)
      }),
  )
}

/** A foto é derivada e sai depois que o desenho assenta: esperar por ela é esperar o disco. */
async function waitForThumb(page: Page, id: string): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(
          (key) =>
            new Promise<boolean>((resolve, reject) => {
              const request = indexedDB.open('sistema-zero-molda-playground')
              request.onsuccess = () => {
                const db = request.result
                const tx = db.transaction('assets', 'readonly')
                const row = tx.objectStore('assets').get(key)
                tx.oncomplete = () => {
                  db.close()
                  resolve(
                    typeof (row.result as { thumbDataUrl?: unknown })?.thumbDataUrl === 'string',
                  )
                }
                tx.onerror = () => reject(tx.error)
              }
              request.onerror = () => reject(request.error)
            }),
          `molda:scene-summary:${id}`,
        ),
      { timeout: 15_000 },
    )
    .toBe(true)
}

async function createModel(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: 'Criar novo' }).click()
  await page.getByRole('button', { name: 'Criar modelo' }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  // Pelo RÓTULO: se o campo perder a associação, este teste reprova junto.
  await page.getByLabel('Nome', { exact: true }).fill(name)
  await page.getByRole('button', { name: 'Criar', exact: true }).click()
}

/** Sai da oficina guardando: a volta é para a galeria do APP, não para a lista da oficina. */
async function backToGallery(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Meus projetos' }).click()
  const save = page.getByRole('button', { name: 'Guardar e voltar' })
  if (await save.isVisible().catch(() => false)) await save.click()
  await expect(page.getByRole('heading', { name: 'Minhas criações 3D' })).toBeVisible()
}

test('criar pelo fluxo de sempre abre a oficina nova já promovida, e voltar traz a miniatura', async ({
  page,
}) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.goto('/?oficina=app')
  await expect(page.getByRole('heading', { name: 'Minhas criações 3D' })).toBeVisible()

  await createModel(page, 'robo-e2e')
  // A oficina montou: estes controles não existem no editor antigo.
  await expect(page.getByRole('button', { name: 'Editar malha' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Baixar projeto' })).toBeVisible()
  await expect(page.locator('canvas').first()).toBeVisible()

  const keys = await storageKeys(page)
  const scene = keys.filter((key) => key.startsWith('molda:scene:'))
  expect(scene.length).toBe(1)
  const id = scene[0]?.slice('molda:scene:'.length) ?? ''
  // Promover preserva o original e deixa as lápides: uma aba antiga não ressuscita o v1.
  expect(keys).toContain(`molda:scene-summary:${id}`)
  expect(keys).toContain(`molda:scene-originals:${id}`)
  expect(keys).toContain(`molda:record-deleted:${id}`)
  expect(keys.some((key) => key.startsWith(`molda:record:${id}`))).toBe(false)

  await waitForThumb(page, id)
  await backToGallery(page)
  await expect(page.getByRole('button', { name: 'Modelo robo-e2e' })).toBeVisible()
  // A foto do palco chega à galeria como imagem de verdade, não como o cubo de reserva.
  const photo = page.getByRole('img', { name: /robo-e2e/ })
  await expect(photo).toBeVisible({ timeout: 10_000 })
  expect(await photo.getAttribute('src')).toMatch(/^data:image\//)

  // Recarregar mantém a criação na geração seguinte, sem voltar para o editor antigo.
  await page.reload()
  await expect(page.getByRole('button', { name: 'Modelo robo-e2e' })).toBeVisible()
  await page.getByRole('button', { name: 'Modelo robo-e2e' }).click()
  await expect(page.getByRole('button', { name: 'Editar malha' })).toBeVisible()
  expect(pageErrors).toEqual([])
})

test('modelar e desfazer valem um passo cada, com o palco 3D vivo', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.goto('/?oficina=app')
  await createModel(page, 'peca-e2e')
  const undo = page.getByRole('button', { name: 'Desfazer' })
  await expect(undo).toBeDisabled()
  // O painel de formas nasce recolhido: abrir faz parte do caminho da criança.
  await page.getByText('Adicionar forma ou ponto').click()
  await page.getByRole('button', { name: 'Caixa', exact: true }).click()
  await expect(undo).toBeEnabled()
  await undo.click()
  await expect(undo).toBeDisabled()
  expect(pageErrors).toEqual([])
})

test('a oficina cabe em tablet e em celular sem esconder as ferramentas', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.goto('/?oficina=app')
  await createModel(page, 'toque-e2e')
  await expect(page.getByRole('button', { name: 'Editar malha' })).toBeVisible()

  for (const size of [
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size)
    // O palco continua com área de desenho e a saída continua alcançável em qualquer tamanho.
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible()
    const rect = await canvas.boundingBox()
    expect(rect?.width ?? 0).toBeGreaterThan(200)
    expect(rect?.height ?? 0).toBeGreaterThan(150)
    await expect(page.getByRole('button', { name: 'Meus projetos' })).toBeVisible()
    // Nada pode empurrar a página para uma barra horizontal num celular.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  }
  expect(pageErrors).toEqual([])
})
